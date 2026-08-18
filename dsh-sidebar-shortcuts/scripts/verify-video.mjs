/**
 * CDP 验收：知识库视频双通道（通道 B 目录直点 + 通道 A 文章内 ![[mp4]] 引用）。
 * 用法：node verify-video.mjs <输出文件>
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9346
const APP = 'http://127.0.0.1:13800'
const OUT = process.argv[2] ?? join(tmpdir(), 'dss-video.txt')
const results = []
const log = (line) => { results.push(line); console.log(line) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function httpJson(url) { const res = await fetch(url); return res.json() }
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', () => reject(new Error('WS fail')), { once: true })
  })
  let seq = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  })
  return {
    ws,
    call: (method, params = {}) => new Promise((resolve) => {
      const id = ++seq
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    }),
  }
}
async function evaluate(cdp, expression) {
  const raw = await cdp.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (raw.error) throw new Error(`CDP: ${JSON.stringify(raw.error)}`)
  if (raw.result?.exceptionDetails) throw new Error(`页面异常: ${raw.result.exceptionDetails.exception?.description ?? ''}`)
  return raw.result?.result?.value
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), 'dss-cdp-video')}`,
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' })

try {
  let page = null
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await httpJson(`http://127.0.0.1:${PORT}/json/list`)
      page = list.find((t) => t.type === 'page')
      if (page) break
    } catch { /* 重试 */ }
    await sleep(500)
  }
  const cdp = await connect(page.webSocketDebuggerUrl)
  await cdp.call('Page.enable')
  await cdp.call('Runtime.enable')
  await cdp.call('Page.navigate', { url: APP })
  for (let i = 0; i < 90; i += 1) {
    await sleep(500)
    if (await evaluate(cdp, `document.querySelector('#root')?.children.length > 0`)) break
  }
  for (let i = 0; i < 60; i += 1) {
    const n = await evaluate(cdp, `[...document.querySelectorAll('button')].filter((b) => b.textContent.includes('知识库')).length`)
    if (n > 0) break
    await sleep(500)
  }
  log('[cdp] 就绪，打开知识库…')
  await evaluate(cdp, `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('知识库'))?.click(); true`)
  for (let i = 0; i < 60; i += 1) {
    const ready = await evaluate(cdp, `document.querySelectorAll('.dss-tree-row').length > 0`)
    if (ready) break
    await sleep(500)
  }

  const expand = async (suffix) => {
    const state = await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.endsWith('${suffix}')); if (!row) return 'missing'; const caret = row.querySelector('.dss-tree-caret'); if (caret && caret.textContent === '▾') return 'already-open'; row.click(); return 'opened' })()`)
    await sleep(900)
    return state
  }

  // ===== 通道 B：目录树点视频直接预览 =====
  await expand('05-项目')
  await expand('AI短剧出海')
  await expand('案例库')
  // 点视频文件行（title 含 .mp4）
  const clickedVid = await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.endsWith('20260809_潮汐代码_30s成片.mp4')); if (!row) return false; row.click(); return true })()`)
  let vidOk = false
  for (let i = 0; i < 30; i += 1) {
    await sleep(1000)
    vidOk = await evaluate(cdp, `(() => { const v = document.querySelector('.dss-kb-preview-body video'); return !!v && v.readyState >= 1 && v.duration > 0 })()`)
    if (vidOk) break
  }
  const vidSeek = await evaluate(cdp, `new Promise((resolve) => { const v = document.querySelector('.dss-kb-preview-body video'); if (!v) return resolve('no-video'); const t = setTimeout(() => resolve('seek-timeout'), 8000); v.addEventListener('seeked', () => { clearTimeout(t); resolve('seeked:' + v.currentTime.toFixed(1)) }); v.currentTime = 10 })`)
  const vidTitle = await evaluate(cdp, `document.querySelector('.dss-kb-file-name')?.textContent + ' | ' + document.querySelector('.dss-kb-path')?.textContent`)
  log(`[通道B] 目录点视频：点击=${clickedVid} 播放=${vidOk} 拖到10s=${vidSeek}`)
  log(`[通道B] 预览标题：${vidTitle}`)

  // 点图片直接预览 + 放大
  await expand('99-素材库')
  await expand('配图')
  await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.endsWith('插件教程.jpg')); if (row) { row.click(); return true } return false })()`)
  let imgOk = false
  for (let i = 0; i < 30; i += 1) {
    await sleep(1000)
    imgOk = await evaluate(cdp, `(() => { const img = document.querySelector('.dss-kb-preview-body img'); return !!img && img.complete && img.naturalWidth > 0 })()`)
    if (imgOk) break
  }
  await evaluate(cdp, `document.querySelector('.dss-kb-preview-body img')?.click(); true`)
  await sleep(600)
  const zoomOk = await evaluate(cdp, `!!document.querySelector('.dss-zoom img')`)
  log(`[通道B] 目录点图片：渲染=${imgOk} 点击放大=${zoomOk}`)
  await evaluate(cdp, `document.querySelector('.dss-zoom')?.click(); true`)
  await sleep(400)

  // 点音频直接预览（收件箱/抖音素材/douyin_qunxiang/qunxiang_ep1.wav）
  await expand('收件箱')
  await expand('抖音素材')
  await expand('douyin_qunxiang')
  const clickedAud = await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.endsWith('qunxiang_ep1.wav')); if (!row) return false; row.click(); return true })()`)
  await sleep(1500)
  const audioOk = await evaluate(cdp, `!!document.querySelector('.dss-kb-preview-body audio')`)
  log(`[通道B] 目录点音频：点击=${clickedAud} 音频播放器=${audioOk}`)

  // ===== 通道 A：文章内 ![[mp4]] 内嵌（临时测试文章在收件箱） =====
  await expand('收件箱')
  const clickedArt = await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.endsWith('__临时测试_视频引用.md')); if (!row) return false; row.click(); return true })()`)
  let inlineOk = false
  for (let i = 0; i < 30; i += 1) {
    await sleep(1000)
    inlineOk = await evaluate(cdp, `(() => { const v = document.querySelector('.dss-kb-preview-body video'); return !!v && v.src.includes('/api/vault/media') && v.readyState >= 1 })()`)
    if (inlineOk) break
  }
  log(`[通道A] 文章内 ![[mp4]]：点击=${clickedArt} 内嵌播放器=${inlineOk}`)

  await evaluate(cdp, `document.querySelector('.dss-modal-close')?.click(); true`)
  cdp.ws.close()
  writeFileSync(OUT, results.join('\n'), 'utf8')
} catch (error) {
  results.push(`[cdp] 失败: ${error?.message ?? error}`)
  writeFileSync(OUT, results.join('\n'), 'utf8')
  console.error('[cdp] 失败:', error)
  process.exitCode = 1
} finally {
  try { chrome.kill() } catch { /* 忽略 */ }
}
