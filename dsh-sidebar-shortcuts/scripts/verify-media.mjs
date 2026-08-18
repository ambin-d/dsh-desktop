/**
 * CDP 验收：知识库媒体嵌入（图片内嵌+放大、视频 Range 播放）。
 * 用法：node verify-media.mjs <输出文件>
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9342
const APP = 'http://127.0.0.1:13800'
const OUT = process.argv[2] ?? join(tmpdir(), 'dss-media.txt')
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
  `--user-data-dir=${join(tmpdir(), 'dss-cdp-media')}`,
  '--no-first-run', '--disable-gpu', '--autoplay-policy=no-user-gesture-required', 'about:blank',
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
  for (let i = 0; i < 40; i += 1) {
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

  // 逐级展开目录到 05-项目/AI短剧出海/案例库，再打开《闺阁·朝暮》EP2 文章
  const expandAndWait = async (titleSuffix) => {
    await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.endsWith('${titleSuffix}')); if (row) { row.click(); return true } return false })()`)
    await sleep(900)
  }
  await expandAndWait('05-项目')
  await expandAndWait('AI短剧出海')
  await expandAndWait('案例库')
  await evaluate(cdp, `(() => {
    const row = [...document.querySelectorAll('.dss-tree-row')].find((b) => b.title.includes('《闺阁·朝暮》EP2_逐镜拆解与提示词体系.md'))
    if (row) { row.click(); return true }
    return false
  })()`)
  let imgOk = false
  for (let i = 0; i < 60; i += 1) {
    await sleep(1000)
    imgOk = await evaluate(cdp, `(() => { const img = document.querySelector('.dss-md-img'); return !!img && img.complete && img.naturalWidth > 0 })()`)
    if (imgOk) break
  }
  const imgInfo = await evaluate(cdp, `(() => { const img = document.querySelector('.dss-md-img'); return img ? JSON.stringify({ src: img.src.split('?path=')[1]?.slice(0, 80), w: img.naturalWidth, h: img.naturalHeight }) : '无 img' })()`)
  log(`[图片] 内嵌渲染=${imgOk} ${imgInfo}`)

  // 点击放大
  await evaluate(cdp, `document.querySelector('.dss-md-img')?.click(); true`)
  await sleep(600)
  const zoomOk = await evaluate(cdp, `!!document.querySelector('.dss-zoom img')`)
  log(`[图片] 点击放大浮层=${zoomOk}`)
  await evaluate(cdp, `document.querySelector('.dss-zoom')?.click(); true`)
  await sleep(400)

  // 视频 Range 播放：直接注入 <video>（全库无 ![[...mp4]] 文章，验证播放器链路本身）
  const videoTest = await evaluate(cdp, `new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'auto'
    v.src = '/sidebar-shortcuts/api/vault/media?path=' + encodeURIComponent('05-项目/AI短剧出海/案例库/20260809_潮汐代码_30s成片.mp4')
    document.body.appendChild(v)
    const timer = setTimeout(() => resolve(JSON.stringify({ ok: false, reason: '超时' })), 20000)
    v.addEventListener('loadedmetadata', () => {
      v.currentTime = 10
    })
    v.addEventListener('seeked', () => {
      clearTimeout(timer)
      resolve(JSON.stringify({ ok: true, duration: v.duration.toFixed(1), seekedTo: v.currentTime.toFixed(1), readyState: v.readyState }))
    })
    v.addEventListener('error', () => { clearTimeout(timer); resolve(JSON.stringify({ ok: false, reason: 'error' })) })
    v.load()
  })`)
  log(`[视频] Range 播放=${videoTest}`)

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
