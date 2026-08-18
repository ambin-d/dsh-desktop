/**
 * dsh-sidebar-shortcuts — 宿主半。
 *
 * 职责：
 *   1. GET  /sidebar-shortcuts/api/plugins —— 已装插件清单（profile bundles + 版本）；
 *   2. GET  /sidebar-shortcuts/api/market —— Oh-My-DSH 插件市场数据
 *      （PLUGINS.md 抓取 + 解析 + 磁盘/内存缓存，超 1 小时才刷新，
 *      刷新失败退回旧缓存，前端搜索走本地缓存不依赖网络）；
 *   3. POST /sidebar-shortcuts/api/market/translate —— 单条描述翻译
 *      （阿里云百炼 DashScope qwen-turbo，复用 ALIYUN_ASR_KEY 凭据）；
 *   4. POST /sidebar-shortcuts/api/plugins/install —— 一键安装插件：
 *      同源校验 + 规格白名单校验后，转发给 `dsh plugin --profile web add <spec>`；
 *   5. GET  /sidebar-shortcuts/api/vault —— 第二大脑（Obsidian 库）路径与存在性；
 *   6. GET  /sidebar-shortcuts/api/vault/tree?dir= —— 库目录树（懒加载分目录读，排除隐藏目录）；
 *   7. GET  /sidebar-shortcuts/api/vault/read?path= —— 读取 .md/.txt 内容
 *      （路径必须落在 Vault 内，防目录穿越；只读，绝不提供任何写接口）；
 *   8. POST /sidebar-shortcuts/api/vault/open —— 用资源管理器打开库文件夹。
 *
 * 安全纪律：写操作（install/translate/open）同源守卫；安装规格白名单
 * （npm 包名或 GitHub HTTPS），单 argv 直传子进程不开 shell。
 */

import { spawn } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'

export const name = 'dsh-sidebar-shortcuts'
export const inject = []

/** 默认第二大脑（Obsidian 库）路径：公开仓不带真实路径，由 profile 补丁 config.vault 配置。 */
const DEFAULT_VAULT = ''
/** 插件市场数据源（用户下午定案：Oh-My-DSH）。 */
const MARKET_URL = 'https://raw.githubusercontent.com/like-study1/Oh-My-DSH/main/PLUGINS.md'
const MARKET_REPO = 'https://github.com/like-study1/Oh-My-DSH'
/** 市场缓存有效期：1 小时。 */
const MARKET_TTL_MS = 60 * 60 * 1000
/** 翻译服务：阿里云百炼 DashScope OpenAI 兼容接口。 */
const TRANSLATE_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const TRANSLATE_MODEL = 'qwen-turbo'
/** 单文件预览上限：2MB。 */
const VAULT_READ_MAX_BYTES = 2 * 1024 * 1024
/** 媒体类型表（知识库内嵌预览支持的文件扩展名）。 */
const MEDIA_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
}

/** 用户数据目录（$DSH_HOME）。 */
function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

/** 桌面客户端版本号：主进程注入的环境变量优先，其次读桌面工程 package.json（开发布局）。 */
function desktopVersion() {
  if (process.env.DSH_DESKTOP_VERSION) return String(process.env.DSH_DESKTOP_VERSION)
  try {
    // 插件位于 <桌面工程>/dsh-sidebar-shortcuts/lib → 上两级即桌面工程目录
    const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const desktopDir = resolve(pluginDir, '..')
    return String(JSON.parse(readFileSync(join(desktopDir, 'package.json'), 'utf8'))?.version ?? '')
  } catch { /* 读不到（打包布局等）→ 空 */ }
  return ''
}

/** 输出 JSON 响应。 */
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** 读取请求体 JSON（同步收集）。 */
function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => resolveBody(raw))
    req.on('error', rejectBody)
  })
}

/** 同源守卫：写操作必须由本站页面发起（Origin 与 Host 一致）。 */
function sameOriginGuard(req) {
  const host = String(req.headers.host ?? '')
  const origin = String(req.headers.origin ?? '')
  if (origin === '') return '缺少 Origin 头，已拒绝'
  try {
    if (new URL(origin).host !== host) return '跨站请求已拒绝'
  } catch {
    return '跨站请求已拒绝'
  }
  return null
}

// ---- 已装插件清单 -----------------------------------------------------------

/** 读取一个插件的版本号：先按模块解析（覆盖内置 @deepseek-ai/*），再按 profile 目录直读。 */
function pluginVersion(name) {
  const candidates = []
  try {
    candidates.push(fileURLToPath(import.meta.resolve(`${name}/package.json`)))
  } catch { /* 包未导出 package.json 子路径 → 用直读兜底 */ }
  candidates.push(join(dshHome(), 'profiles', 'web', 'node_modules', name, 'package.json'))
  for (const path of candidates) {
    try {
      return String(JSON.parse(readFileSync(path, 'utf8'))?.version ?? '')
    } catch { /* 该路径读不到 → 试下一个 */ }
  }
  return ''
}

/** 收集 web profile 的已装插件：bundle 名单 + 各包版本。 */
function listPlugins() {
  const rows = []
  const profileRoot = join(dshHome(), 'profiles', 'web')
  let bundles = []
  try {
    const pkg = JSON.parse(readFileSync(join(profileRoot, 'package.json'), 'utf8'))
    bundles = Array.isArray(pkg?.dsh?.profile?.bundles) ? pkg.dsh.profile.bundles : []
  } catch { /* profile 缺失/损坏 → 空表 */ }
  for (const name of bundles) {
    rows.push({
      name: String(name),
      version: pluginVersion(String(name)),
      builtin: String(name).startsWith('@deepseek-ai/'),
    })
  }
  return rows
}

// ---- 插件市场（Oh-My-DSH 抓取 + 缓存） --------------------------------------

/**
 * 解析 PLUGINS.md：
 *   ## 分类（数量） → | [name](url) | 类型 | 活跃 | 语言 | ⭐ | 说明 |
 * 转义竖线 \| 先占位后还原；描述是否英文按含不含 CJK 判断（决定前端是否显示翻译按钮）。
 */
function parsePluginsMarkdown(md) {
  const lines = String(md).split(/\r?\n/)
  const categories = []
  const plugins = []
  let stats = null
  let sourceUpdatedAt = ''
  let currentCategory = -1
  for (const raw of lines) {
    const line = raw.trim()
    const statMatch = /精选条目[^\d]*(\d+)[^\d]*生态快照[^\d]*(\d+)[^\d]*总\s*Star[^\d]*(\d+)/.exec(line)
    if (statMatch) {
      stats = { total: Number(statMatch[1]), snapshot: Number(statMatch[2]), stars: Number(statMatch[3]) }
      continue
    }
    const updatedMatch = /更新于\s*([\d-]+\s+[\d:]+)/.exec(line)
    if (updatedMatch) sourceUpdatedAt = updatedMatch[1]
    const catMatch = /^## (.+?)（(\d+)）/.exec(line)
    if (catMatch) {
      categories.push({ title: catMatch[1], count: Number(catMatch[2]) })
      currentCategory = categories.length - 1
      continue
    }
    if (!line.startsWith('| [')) continue
    if (/^\|[\s:-]+\|$/.test(line)) continue
    const cells = line.replace(/\\\|/g, '\u0001').split('|').map((cell) => cell.replace(/\u0001/g, '|').trim())
    if (cells.length < 7) continue
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(cells[1] ?? '')
    if (!linkMatch) continue
    const starsRaw = cells[5] ?? ''
    const activityRaw = cells[3] ?? ''
    const description = cells[6] ?? ''
    plugins.push({
      name: linkMatch[1],
      url: linkMatch[2],
      type: cells[2] || '',
      activity: activityRaw.includes('🟢') ? 'active' : activityRaw.includes('🔴') ? 'inactive' : 'unknown',
      language: cells[4] || '',
      stars: /^\d+$/.test(starsRaw) ? Number(starsRaw) : null,
      description,
      category: currentCategory,
      english: !/[\u4e00-\u9fff]/.test(description),
    })
  }
  return { stats, categories, plugins, sourceUpdatedAt }
}

/** 市场缓存文件路径。 */
function marketCachePath() {
  return join(dshHome(), 'storages', 'sidebar-shortcuts', 'market.json')
}

/** 运行期市场状态：内存缓存 + 抓取中的 Promise。 */
let marketState = null
let marketFetching = null

/** 从磁盘恢复缓存（宿主刚启动、网络不可用时的兜底）。 */
function loadMarketCacheFromDisk() {
  try {
    const raw = JSON.parse(readFileSync(marketCachePath(), 'utf8'))
    if (raw && Array.isArray(raw.plugins)) {
      marketState = raw
      console.log(`[侧栏] 插件市场缓存已从磁盘恢复（${raw.plugins.length} 条）`)
    }
  } catch { /* 无缓存/损坏 → 首次访问时现抓 */ }
}

/** 抓取并解析市场数据，成功后落盘。 */
async function fetchMarket() {
  const res = await fetch(MARKET_URL, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`插件市场抓取失败：HTTP ${res.status}`)
  const parsed = parsePluginsMarkdown(await res.text())
  if (!Array.isArray(parsed.plugins) || parsed.plugins.length === 0) throw new Error('插件市场数据解析为空')
  const state = { ...parsed, fetchedAt: Date.now(), source: MARKET_REPO }
  try {
    mkdirSync(join(dshHome(), 'storages', 'sidebar-shortcuts'), { recursive: true })
    writeFileSync(marketCachePath(), JSON.stringify(state), 'utf8')
  } catch { /* 落盘失败不阻断 */ }
  return state
}

/** 取市场数据：1 小时内直接回内存缓存；过期则刷新，失败退回旧缓存。 */
async function getMarket() {
  if (marketState && Date.now() - (marketState.fetchedAt ?? 0) < MARKET_TTL_MS) return marketState
  if (!marketFetching) {
    marketFetching = fetchMarket()
      .then((state) => {
        marketState = state
        return state
      })
      .catch((error) => {
        if (marketState) {
          console.warn(`[侧栏] 插件市场刷新失败，退回旧缓存：${error?.message ?? error}`)
          return marketState
        }
        throw error
      })
      .finally(() => {
        marketFetching = null
      })
  }
  return marketFetching
}

// ---- 翻译（DashScope qwen-turbo） -------------------------------------------

async function translateText(ctx, text) {
  const credentials = ctx.get('credentials')
  const resolved = typeof credentials?.resolve === 'function'
    ? await credentials.resolve('ALIYUN_ASR_KEY')
    : undefined
  if (!resolved?.value) throw new Error('缺少翻译凭据（ALIYUN_ASR_KEY）')
  const res = await fetch(TRANSLATE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resolved.value}`,
    },
    body: JSON.stringify({
      model: TRANSLATE_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是专业翻译。把用户提供的英文内容翻译成简体中文，只输出译文，不要任何解释。保留 Markdown 链接、反引号、加粗等格式；插件名、GitHub、API 等专有名词保留原文。',
        },
        { role: 'user', content: String(text).slice(0, 4000) },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`翻译服务 HTTP ${res.status}: ${detail.slice(0, 200)}`)
  }
  const json = await res.json()
  const out = json?.choices?.[0]?.message?.content
  if (typeof out !== 'string' || !out.trim()) throw new Error('翻译服务返回为空')
  return out.trim()
}

// ---- 一键安装 ---------------------------------------------------------------

/** 安装规格白名单：GitHub HTTPS 地址（可带 .git 与 #分支）或 npm 包名。 */
const SPEC_PATTERN = /^(?:(?:git\+)?https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?(?:#[\w.-]+)?|@?[a-z0-9][\w.-]*(\/[\w.-]+)?)$/

/** 把规格转交给 `dsh plugin --profile web add`（与命令行同路径）。 */
function runInstall(spec) {
  return new Promise((resolveResult) => {
    const bin = process.argv[1] // 宿主自身的 CLI 入口（dsh 命令）
    let child
    try {
      child = spawn(process.execPath, [bin, 'plugin', '--profile', 'web', 'add', spec], {
        cwd: dshHome(),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      resolveResult({ ok: false, code: -1, out: '', err: `无法启动安装进程：${error?.message ?? error}` })
      return
    }
    let out = ''
    let err = ''
    const tail = (text) => (text.length > 4000 ? `…${text.slice(-4000)}` : text)
    child.stdout.on('data', (chunk) => { out += String(chunk) })
    child.stderr.on('data', (chunk) => { err += String(chunk) })
    const timer = setTimeout(() => {
      try { child.kill() } catch { /* 忽略 */ }
      resolveResult({ ok: false, code: -2, out: tail(out), err: '安装超时（3 分钟），已终止' })
    }, 180_000)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolveResult({ ok: false, code: -1, out: tail(out), err: error?.message ?? String(error) })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolveResult({ ok: code === 0, code, out: tail(out), err: tail(err) })
    })
  })
}

// ---- 第二大脑（Obsidian 库，只读） ------------------------------------------

/** 校验相对路径并解析到库内绝对路径（防目录穿越）。 */
function vaultResolve(vaultRoot, rel) {
  if (typeof rel !== 'string' || rel.includes('\0')) throw new Error('路径非法')
  const root = resolve(vaultRoot)
  const abs = resolve(root, rel || '.')
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error('路径越界，已拒绝')
  return abs
}

/** 媒体类型分类（目录树 kind 字段用）。 */
function mediaKindOf(name) {
  const ext = extname(String(name)).toLowerCase()
  if (MEDIA_TYPES[ext] === undefined) return 'other'
  const type = MEDIA_TYPES[ext]
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  return 'other'
}

/** 单目录懒加载：直接子目录 + Markdown/文本 + 媒体文件，排除隐藏项与无关文件。 */
function vaultTree(vaultRoot, rel) {
  const abs = vaultResolve(vaultRoot, rel)
  const entries = readdirSync(abs, { withFileTypes: true })
  const dirs = []
  const files = []
  for (const entry of entries) {
    const name = entry.name
    if (name.startsWith('.')) continue
    if (entry.isDirectory()) {
      let hasChildren = false
      try {
        hasChildren = readdirSync(join(abs, name)).some((child) => !child.startsWith('.'))
      } catch { /* 不可读目录按无子项处理 */ }
      dirs.push({ name, hasChildren })
    } else if (entry.isFile()) {
      const kind = /\.(md|markdown|txt)$/i.test(name) ? 'md' : mediaKindOf(name)
      if (kind === 'other') continue // 无关文件（pdf 等）不进目录树
      let size = 0
      try { size = statSync(join(abs, name)).size } catch { /* 大小未知 */ }
      files.push({ name, size, kind })
    }
  }
  const byName = (a, b) => a.name.localeCompare(b.name, 'zh-CN')
  dirs.sort(byName)
  files.sort(byName)
  return { rel: rel || '', dirs, files }
}

/** 读取库内单个 Markdown/文本文件（只读）。 */
function vaultRead(vaultRoot, rel) {
  const abs = vaultResolve(vaultRoot, rel)
  const stat = statSync(abs)
  if (!stat.isFile()) throw new Error('不是文件')
  if (!/\.(md|markdown|txt)$/i.test(abs)) throw new Error('只支持 Markdown/文本文件')
  if (stat.size > VAULT_READ_MAX_BYTES) throw new Error('文件超过 2MB，不予预览')
  return { rel, content: readFileSync(abs, 'utf8') }
}

// ---- 库内媒体（![[wiki]] 引用解析 + 字节流，只读） ---------------------------

/** 归一化到 / 分隔的相对路径。 */
function slashRel(vaultRoot, abs) {
  return relative(vaultRoot, abs).split(sep).join('/')
}

/**
 * 解析文章里的 Obsidian 媒体链接（![[target]]）：
 *   1. 文章同目录；2. 文章目录下 assets/ 子目录；
 *   3. 99-素材库/附件资源/<文章名>/（Obsidian 附件默认约定）；
 *   4. Vault 根相对路径；
 *   5. 兜底：全库按路径后缀查找（Obsidian 的「最短路径优先」行为，
 *      仅在以上四者都未命中时按需触发一次，并缓存结果，绝不预加载媒体）。
 * @returns 命中的 Vault 相对路径，或 undefined。
 */
const resolveMediaCache = new Map()

function resolveMediaLink(vaultRoot, noteRel, target) {
  const clean = String(target).split('|')[0].trim().replace(/\\/g, '/')
  if (!clean) return undefined
  const cacheKey = `${noteRel}\u0000${clean}`
  const cached = resolveMediaCache.get(cacheKey)
  if (cached !== undefined) return cached || undefined
  const slashNote = String(noteRel).replace(/\\/g, '/')
  const noteDir = slashNote.includes('/') ? dirname(slashNote) : ''
  const articleBase = noteRel
    ? basename(noteRel.replace(/\\/g, '/')).replace(/\.[^.]+$/, '')
    : ''
  const candidates = [
    noteDir ? `${noteDir}/${clean}` : clean,
    noteDir ? `${noteDir}/assets/${clean}` : `assets/${clean}`,
    articleBase ? `99-素材库/附件资源/${articleBase}/${clean}` : '',
    clean,
  ].filter(Boolean)
  let found
  for (const rel of candidates) {
    const abs = resolve(vaultRoot, rel)
    if (abs.startsWith(vaultRoot + sep) && existsSync(abs) && statSyncSafe(abs)?.isFile()) {
      found = rel
      break
    }
  }
  // 兜底：全库后缀查找（最短路径优先，只找媒体扩展名）
  if (found === undefined && /\.(png|jpe?g|gif|webp|bmp|svg|mp4|mov|webm|m4v|mp3|m4a|wav|ogg)$/i.test(clean)) {
    found = findMediaBySuffix(vaultRoot, clean)
  }
  resolveMediaCache.set(cacheKey, found ?? '')
  return found
}

/** statSync 的静默版本。 */
function statSyncSafe(path) {
  try {
    return statSync(path)
  } catch {
    return undefined
  }
}

/**
 * 全库按路径后缀查找媒体文件：收集全部命中，取路径段数最少（Obsidian 最短路径优先）。
 * 按需调用一次并缓存，绝不预加载内容。
 */
function findMediaBySuffix(vaultRoot, target) {
  const suffix = String(target).replace(/\\/g, '/')
  const matches = []
  const stack = [vaultRoot]
  while (stack.length > 0) {
    const dir = stack.pop()
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue // 不可读目录跳过
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(abs)
      } else if (entry.isFile() && MEDIA_TYPES[extname(entry.name).toLowerCase()] !== undefined) {
        const rel = slashRel(vaultRoot, abs)
        if (rel.endsWith(suffix)) matches.push(rel)
      }
    }
  }
  if (matches.length === 0) return undefined
  matches.sort((a, b) => {
    const segs = a.split('/').length - b.split('/').length
    return segs !== 0 ? segs : a.length - b.length
  })
  return matches[0]
}

/** 供路由使用的媒体字节流响应（含 Range 分段）。 */
function serveMedia(req, res, abs) {
  const mediaType = MEDIA_TYPES[extname(abs).toLowerCase()]
  if (mediaType === undefined) {
    res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('不支持的媒体类型')
    return
  }
  const total = statSync(abs).size
  const rangeHeader = String(req.headers?.range ?? '')
  const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  const headers = {
    'Content-Type': mediaType,
    'Accept-Ranges': 'bytes',
    // 私有笔记媒体：让浏览器每次都校验（改文件后立即生效）
    'Cache-Control': 'no-cache',
  }
  if (rangeMatch) {
    const start = rangeMatch[1] === '' ? 0 : Number(rangeMatch[1])
    let end = rangeMatch[2] === '' ? total - 1 : Number(rangeMatch[2])
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= total) {
      res.writeHead(416, { 'Content-Range': `bytes */${total}` })
      res.end()
      return
    }
    if (end >= total) end = total - 1
    res.writeHead(206, {
      ...headers,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${total}`,
    })
    const stream = createReadStream(abs, { start, end })
    stream.pipe(res)
    stream.on('error', () => {
      try { res.destroy() } catch { /* 忽略 */ }
    })
    return
  }
  res.writeHead(200, { ...headers, 'Content-Length': total })
  const stream = createReadStream(abs)
  stream.pipe(res)
  stream.on('error', () => {
    try { res.destroy() } catch { /* 忽略 */ }
  })
}

// ---- 插件入口 ---------------------------------------------------------------

export function apply(ctx, rawConfig = {}) {
  const config = { ...(rawConfig || {}) }
  const vault = String(config.vault || DEFAULT_VAULT)
  loadMarketCacheFromDisk()

  ctx.inject(['webServer'], (webCtx) => {
    const handler = async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname
      try {
        // 已装插件清单
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/plugins') {
          sendJson(res, 200, { ok: true, profile: 'web', plugins: listPlugins() })
          return
        }

        // 关于：版本号 + 版权归属
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/about') {
          sendJson(res, 200, {
            ok: true,
            version: desktopVersion(),
            copyright: 'Ambin.D',
            email: 'ambin5566@gmail.com',
          })
          return
        }

        // 插件市场（Oh-My-DSH 缓存数据）
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/market') {
          const market = await getMarket()
          sendJson(res, 200, {
            ok: true,
            source: market.source,
            sourceUpdatedAt: market.sourceUpdatedAt ?? '',
            fetchedAt: market.fetchedAt ?? 0,
            stats: market.stats ?? null,
            categories: market.categories ?? [],
            plugins: market.plugins ?? [],
          })
          return
        }

        // 单条描述翻译
        if (req.method === 'POST' && path === '/sidebar-shortcuts/api/market/translate') {
          const guard = sameOriginGuard(req)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          let body = null
          try {
            body = JSON.parse(await readBody(req))
          } catch {
            sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' })
            return
          }
          const text = String(body?.text ?? '').trim()
          if (!text) {
            sendJson(res, 400, { ok: false, error: 'text 不能为空' })
            return
          }
          try {
            const translated = await translateText(ctx, text)
            sendJson(res, 200, { ok: true, text: translated })
          } catch (error) {
            sendJson(res, 502, { ok: false, error: error?.message ?? String(error) })
          }
          return
        }

        // 一键安装
        if (req.method === 'POST' && path === '/sidebar-shortcuts/api/plugins/install') {
          const guard = sameOriginGuard(req)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          let body = null
          try {
            body = JSON.parse(await readBody(req))
          } catch {
            sendJson(res, 400, { ok: false, error: '请求体不是合法 JSON' })
            return
          }
          const spec = String(body?.spec ?? '').trim()
          if (!spec) {
            sendJson(res, 400, { ok: false, error: '请输入插件名或 GitHub 地址' })
            return
          }
          if (!SPEC_PATTERN.test(spec)) {
            sendJson(res, 400, { ok: false, error: '规格不合法：仅支持 npm 包名或 GitHub HTTPS 地址' })
            return
          }
          const result = await runInstall(spec)
          sendJson(res, result.ok ? 200 : 502, {
            ok: result.ok,
            code: result.code,
            out: result.out,
            err: result.err,
            // 安装成功后需重启宿主，新插件的 bundle 层才会挂载
            restartRequired: result.ok,
          })
          return
        }

        // 第二大脑路径
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/vault') {
          sendJson(res, 200, { ok: true, path: vault, exists: existsSync(vault) })
          return
        }

        // 库目录树（懒加载）
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/vault/tree') {
          if (!existsSync(vault)) {
            sendJson(res, 404, { ok: false, error: `库目录不存在：${vault}` })
            return
          }
          const dir = String(url.searchParams.get('dir') ?? '')
          try {
            sendJson(res, 200, { ok: true, ...vaultTree(vault, dir) })
          } catch (error) {
            const message = error?.message ?? String(error)
            sendJson(res, /越界|非法/.test(message) ? 403 : 500, { ok: false, error: message })
          }
          return
        }

        // 读取库内文件（只读）
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/vault/read') {
          const rel = String(url.searchParams.get('path') ?? '')
          if (!rel) {
            sendJson(res, 400, { ok: false, error: '缺少 path 参数' })
            return
          }
          try {
            sendJson(res, 200, { ok: true, ...vaultRead(vault, rel) })
          } catch (error) {
            const message = error?.message ?? String(error)
            const code = /越界|非法/.test(message) ? 403
              : /ENOENT|不存在|不是文件/.test(message) ? 404
                : 500
            sendJson(res, code, { ok: false, error: message })
          }
          return
        }

        // 解析文章里的 ![[媒体链接]]（同目录/assets/附件资源/根相对/全库后缀兜底）
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/vault/resolve-media') {
          const note = String(url.searchParams.get('note') ?? '')
          const link = String(url.searchParams.get('link') ?? '')
          if (!link) {
            sendJson(res, 400, { ok: false, error: '缺少 link 参数' })
            return
          }
          const rel = resolveMediaLink(vault, note, link)
          if (rel === undefined) {
            sendJson(res, 404, { ok: false, error: '媒体未找到' })
            return
          }
          sendJson(res, 200, { ok: true, rel })
          return
        }

        // 媒体字节流（图片原图 / 视频音频支持 Range 分段，只读）
        if (req.method === 'GET' && path === '/sidebar-shortcuts/api/vault/media') {
          const rel = String(url.searchParams.get('path') ?? '')
          if (!rel) {
            sendJson(res, 400, { ok: false, error: '缺少 path 参数' })
            return
          }
          let abs
          try {
            abs = vaultResolve(vault, rel)
            if (!statSyncSafe(abs)?.isFile()) throw new Error('ENOENT')
          } catch (error) {
            const message = error?.message ?? String(error)
            const code = /越界|非法/.test(message) ? 403
              : /ENOENT|不存在|不是文件/.test(message) ? 404
                : 500
            sendJson(res, code, { ok: false, error: message })
            return
          }
          serveMedia(req, res, abs)
          return
        }

        // 打开库文件夹（资源管理器）
        if (req.method === 'POST' && path === '/sidebar-shortcuts/api/vault/open') {
          const guard = sameOriginGuard(req)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          if (!existsSync(vault)) {
            sendJson(res, 404, { ok: false, error: `库目录不存在：${vault}` })
            return
          }
          try {
            spawn('explorer.exe', [vault], { detached: true, stdio: 'ignore' }).unref()
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 500, { ok: false, error: error?.message ?? String(error) })
          }
          return
        }

        sendJson(res, 404, { ok: false, error: 'not found' })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error?.message ?? String(error) })
      }
    }
    // register 返回注销函数，交给 effect 管理生命周期（插件卸载时路由随之移除）
    webCtx.effect(() => webCtx.webServer.register({ kind: 'prefix', path: '/sidebar-shortcuts', handler }))
  })
}
