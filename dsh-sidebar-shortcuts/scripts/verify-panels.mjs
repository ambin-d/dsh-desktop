/**
 * CDP 验收：内嵌版插件市场与知识库两个大面板。
 * 无头 Chrome + 原生 WebSocket，DOM 文本断言（模型无视觉）。
 * 用法：node verify-panels.mjs <输出文件路径>
 */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9341
const APP = 'http://127.0.0.1:13800'
const OUT = process.argv[2] ?? join(tmpdir(), 'dss-panels.txt')
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
  if (raw.result?.exceptionDetails) throw new Error(`页面异常: ${raw.result.exceptionDetails.exception?.description ?? raw.result.exceptionDetails.text}`)
  return raw.result?.result?.value
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), 'dss-cdp-panels')}`,
  '--no-first-run', '--disable-gpu', 'about:blank',
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
  // 等入口按钮
  for (let i = 0; i < 40; i += 1) {
    const count = await evaluate(cdp, `[...document.querySelectorAll('button')].filter((b) => b.textContent.includes('插件市场')).length`)
    if (count > 0) break
    await sleep(500)
  }
  log('[cdp] 应用与入口按钮就绪')

  // ===== 插件市场 =====
  await evaluate(cdp, `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('插件市场'))?.click(); true`)
  for (let i = 0; i < 60; i += 1) {
    const ready = await evaluate(cdp, `!!document.querySelector('.dss-modal--wide') && document.querySelectorAll('.dss-mp-row').length > 0`)
    if (ready) break
    await sleep(500)
  }
  const marketInfo = await evaluate(cdp, `JSON.stringify({
    wide: !!document.querySelector('.dss-modal--wide'),
    cats: document.querySelectorAll('.dss-cat').length,
    rows: document.querySelectorAll('.dss-mp-row').length,
    tabText: [...document.querySelectorAll('.dss-tab')].map((t) => t.textContent.trim()),
    footer: document.querySelector('.dss-modal-foot')?.innerText.slice(0, 120) ?? '',
    translateBtns: [...document.querySelectorAll('.dss-mp-row .dss-mini-btn')].filter((b) => b.textContent.trim() === '翻译').length,
    installBtns: [...document.querySelectorAll('.dss-mp-row .dss-mini-btn')].filter((b) => b.textContent.includes('一键安装')).length,
  })`)
  const mi = JSON.parse(marketInfo)
  log(`[市场] 大面板=${mi.wide} 分类chips=${mi.cats} 列表行=${mi.rows} 翻译按钮=${mi.translateBtns} 安装按钮=${mi.installBtns}`)
  log(`[市场] 页签=${JSON.stringify(mi.tabText)} 底部=${mi.footer}`)

  // 搜索过滤
  await evaluate(cdp, `(() => { const input = document.querySelector('.dss-panel-search'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, '微信'); input.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await sleep(600)
  const filteredRows = await evaluate(cdp, `document.querySelectorAll('.dss-mp-row').length`)
  log(`[市场] 搜索「微信」后行数=${filteredRows}`)

  // 清空搜索 → 点分类
  await evaluate(cdp, `(() => { const input = document.querySelector('.dss-panel-search'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await sleep(400)
  await evaluate(cdp, `document.querySelectorAll('.dss-cat')[1]?.click(); true`)
  await sleep(500)
  const catRows = await evaluate(cdp, `document.querySelectorAll('.dss-mp-row').length`)
  log(`[市场] 点第 2 个分类后行数=${catRows}`)

  // 翻译：点第一条英文行的翻译按钮，等译文出现
  await evaluate(cdp, `(() => { const row = [...document.querySelectorAll('.dss-mp-row')].find((r) => [...r.querySelectorAll('.dss-mini-btn')].some((b) => b.textContent.trim() === '翻译')); const btn = [...row.querySelectorAll('.dss-mini-btn')].find((b) => b.textContent.trim() === '翻译'); btn.click(); return true })()`)
  let translatedOk = false
  for (let i = 0; i < 40; i += 1) {
    await sleep(1000)
    translatedOk = await evaluate(cdp, `[...document.querySelectorAll('.dss-mp-row')].some((r) => [...r.querySelectorAll('.dss-mini-btn')].some((b) => b.textContent.trim() === '看原文'))`)
    if (translatedOk) break
  }
  log(`[市场] 翻译后就地切换按钮出现=${translatedOk}`)

  // 已装插件页签
  await evaluate(cdp, `[...document.querySelectorAll('.dss-tab')].find((t) => t.textContent.includes('已装插件'))?.click(); true`)
  await sleep(800)
  const installedRows = await evaluate(cdp, `document.querySelectorAll('.dss-row').length`)
  log(`[市场] 已装插件页签行数=${installedRows}`)

  // 关闭
  await evaluate(cdp, `document.querySelector('.dss-modal-close')?.click(); true`)
  await sleep(500)

  // ===== 知识库 =====
  await evaluate(cdp, `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('知识库'))?.click(); true`)
  for (let i = 0; i < 60; i += 1) {
    const ready = await evaluate(cdp, `document.querySelectorAll('.dss-tree-row').length > 0`)
    if (ready) break
    await sleep(500)
  }
  const kbInfo = await evaluate(cdp, `JSON.stringify({
    wide: !!document.querySelector('.dss-modal--wide'),
    treeRows: document.querySelectorAll('.dss-tree-row').length,
    corner: document.querySelector('.dss-kb-corner')?.innerText.replace(/\\n/g, ' ') ?? '',
    fileNames: [...document.querySelectorAll('.dss-tree-row--file')].map((n) => n.textContent.trim()).slice(0, 5),
  })`)
  const ki = JSON.parse(kbInfo)
  log(`[知识库] 大面板=${ki.wide} 树行=${ki.treeRows} 角落入口=${ki.corner}`)
  log(`[知识库] 根目录文件=${JSON.stringify(ki.fileNames)}`)

  // 展开第一个目录
  await evaluate(cdp, `document.querySelectorAll('.dss-tree-row')[0]?.click(); true`)
  await sleep(800)
  // 点第一个文件
  const opened = await evaluate(cdp, `(() => { const f = document.querySelector('.dss-tree-row--file'); if (!f) return false; f.click(); return true })()`)
  let previewOk = false
  for (let i = 0; i < 30; i += 1) {
    await sleep(500)
    previewOk = await evaluate(cdp, `!!document.querySelector('.dss-md') && document.querySelector('.dss-md').children.length > 0`)
    if (previewOk) break
  }
  log(`[知识库] 点开文件=${opened} Markdown 预览渲染=${previewOk}`)
  if (previewOk) {
    const mdSample = await evaluate(cdp, `document.querySelector('.dss-md').innerText.slice(0, 150).replace(/\\n/g, ' | ')`)
    log(`[知识库] 预览片段=${mdSample}`)
  }

  // 过滤
  await evaluate(cdp, `(() => { const input = document.querySelector('.dss-kb-tree-head .dss-search'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, '不存在xyz'); input.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await sleep(500)
  const treeRowsAfterFilter = await evaluate(cdp, `document.querySelectorAll('.dss-tree-row').length`)
  log(`[知识库] 过滤「不存在xyz」后树行=${treeRowsAfterFilter}`)

  await evaluate(cdp, `document.querySelector('.dss-modal-close')?.click(); true`)
  await sleep(500)
  const closed = await evaluate(cdp, `!document.querySelector('.dss-overlay')`)
  log(`[收尾] 面板关闭=${closed}`)

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
