/**
 * dsh-social-bridge — 语音转写模块（阿里云 DashScope 实时 ASR）。
 *
 * 链路：微信语音（silk/amr/mp3 等）→ ffmpeg 解码为 16k 单声道 PCM
 * → DashScope paraformer-realtime-v2 WebSocket 流式转写 → 返回文本。
 *
 * 协议要点（实测通过）：
 *   - 连接：wss://dashscope.aliyuncs.com/api-ws/v1/inference/
 *     鉴权用 Authorization: bearer <apiKey> 头（Node 原生 WebSocket 支持 headers）；
 *   - run-task 必须带 payload（task_group/task/function/model/parameters/input）；
 *   - 事件流：task-started → task-ready → 分片发 continue-task
 *     → finish-task → result-generated（payload.output.text）→ task-finished。
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'
const MODEL = 'paraformer-realtime-v2'
/** 单次转写总超时（毫秒）。 */
const ASR_TIMEOUT_MS = 30_000
/** 每片 PCM 约 100ms（16k 采样 × 2 字节 = 32KB/s → 3200 字节/片）。 */
const CHUNK_BYTES = 3200

/**
 * 用 ffmpeg 把任意格式音频解码为 16k 单声道 s16le PCM。
 * @param inputFile - 输入音频文件（silk/amr/mp3/ogg 等）
 * @returns PCM Buffer；失败抛错。
 */
export function pcmFromFile(inputFile) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-i', inputFile,
      '-f', 's16le', '-ar', '16000', '-ac', '1', '-',
    ])
    const chunks = []
    let stderr = ''
    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk))
    ffmpeg.stderr.on('data', (chunk) => { stderr += chunk })
    ffmpeg.on('error', (err) => reject(new Error(`ffmpeg 启动失败: ${err.message}`)))
    ffmpeg.on('close', (code) => {
      if (code !== 0) reject(new Error(`ffmpeg 解码失败（code=${code}）: ${stderr.slice(0, 200)}`))
      else if (chunks.length === 0) reject(new Error('ffmpeg 输出为空'))
      else resolve(Buffer.concat(chunks))
    })
  })
}

/**
 * 把 PCM 转写为文本（DashScope 流式）。
 * @param pcm - 16k 单声道 s16le PCM 数据
 * @param apiKey - DashScope API Key
 * @returns 转写文本；失败抛错。
 */
export function transcribePcm(pcm, apiKey) {
  return new Promise((resolve, reject) => {
    const taskId = `dsh-asr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
    let settled = false
    const texts = []
    const finish = (fn, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { ws.close() } catch { /* 忽略关闭异常 */ }
      fn(value)
    }
    const timer = setTimeout(() => finish(reject, new Error('语音转写超时（30 秒）')), ASR_TIMEOUT_MS)

    const ws = new WebSocket(WS_URL, { headers: { Authorization: `bearer ${apiKey}` } })
    ws.onerror = () => finish(reject, new Error('ASR WebSocket 连接失败'))
    ws.onmessage = (ev) => {
      let msg
      try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString()) } catch {
        return
      }
      const event = msg?.header?.event
      if (event === 'task-failed') {
        finish(reject, new Error(`ASR 任务失败: ${msg.header?.error_message || JSON.stringify(msg.header)}`))
        return
      }
      if (event === 'task-ready') {
        // 分片发送音频
        for (let offset = 0; offset < pcm.length; offset += CHUNK_BYTES) {
          const slice = pcm.subarray(offset, Math.min(offset + CHUNK_BYTES, pcm.length))
          ws.send(JSON.stringify({
            header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
            payload: { audio: slice.toString('base64') },
          }))
        }
        // 通知服务端音频发送完毕
        ws.send(JSON.stringify({
          header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
          payload: { input: {} },
        }))
        return
      }
      if (event === 'result-generated') {
        const text = msg?.payload?.output?.text
        if (typeof text === 'string' && text.trim()) texts.push(text)
        return
      }
      if (event === 'task-finished') {
        finish(resolve, texts.join(''))
      }
    }
    ws.onopen = () => {
      ws.send(JSON.stringify({
        header: { task_id: taskId, action: 'run-task', streaming: 'duplex' },
        payload: {
          task_group: 'audio',
          task: 'asr',
          function: 'recognition',
          model: MODEL,
          parameters: { format: 'pcm', sample_rate: 16000, language_hints: ['zh'] },
          input: {},
        },
      }))
    }
  })
}

/**
 * 完整链路：音频文件 → PCM → 转写文本。
 * @param inputFile - 音频文件路径
 * @param apiKey - DashScope API Key
 * @returns 转写文本。
 */
export async function transcribeFile(inputFile, apiKey) {
  const pcm = await pcmFromFile(inputFile)
  if (pcm.length === 0) throw new Error('解码后音频为空')
  return transcribePcm(pcm, apiKey)
}

/** 语音 encode_type → 文件扩展名（微信 iLink 协议定义）。 */
export function voiceExt(encodeType) {
  switch (Number(encodeType)) {
    case 5: return '.amr'
    case 6: return '.silk'
    case 7: return '.mp3'
    case 8: return '.ogg'
    case 1: return '.pcm'
    default: return '.bin'
  }
}

/** 把语音字节落盘为临时文件（返回文件路径；用完记得删）。 */
export function writeVoiceTemp(data) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-voice-'))
  const file = join(dir, `voice${voiceExt(0)}`)
  writeFileSync(file, Buffer.from(data))
  return { file, dir }
}

/** 清理语音临时目录。 */
export function cleanupVoiceTemp(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略清理失败 */ }
}
