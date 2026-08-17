/**
 * dsh-social-bridge — 社交渠道桥接插件（宿主半）。
 *
 * 职责：
 *   1. 五渠道配置持久化到用户数据目录 JSON
 *      （$DSH_HOME/storages/social-bridge/config.json，原子写入，
 *      密钥只存在于该文件，代码零硬编码）；
 *   2. 微信（iLink/OpenClaw 通道）真实桥接：二维码登录、凭据持久化、
 *      长轮询游标续读、context_token 回填、apiFetch 业务失败补丁——
 *      机制说明详见 lib/wechat.js；
 *   3. 消息流对接：微信入站 → agent.followup 进入现有会话流；
 *      会话回合结束 → 把助手最终回复经微信发回，并自动追加署名；
 *      收发失败均记录原因并在设置页展示，不静默丢消息；
 *   4. Web API（前缀 /social-bridge）供设置页读写。
 *
 * 本轮明确不做：群聊（iLink 仅 1 对 1 私聊）、媒体收发、
 * 任何微信 hook 依赖（wcferry 等）、其他渠道的真实接入。
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
import * as wechat from './wechat.js'

// ---- 插件身份（loader 读取 name/inject/apply） ------------------------------
export const name = 'dsh-social-bridge'
export const inject = []

// ---- 配置模型 -------------------------------------------------------------

/** 各渠道允许写入的字段白名单：未知字段一律忽略，防止脏数据落盘。 */
const CHANNEL_KEYS = {
  wechat: [
    'enabled', 'accountId', 'botToken', 'baseUrl', 'signature',
    'sessionId', 'syncBuf', 'contextTokens',
  ],
  telegram: ['enabled', 'token'],
  feishu: ['enabled', 'appId', 'appSecret'],
  dingtalk: ['enabled', 'appKey', 'appSecret'],
  whatsapp: ['enabled', 'pairingCode'],
}
/** 全部渠道 id。 */
const CHANNEL_IDS = Object.keys(CHANNEL_KEYS)

/**
 * 署名规则（用户拍板）：平时微信私聊回复**不署名**；
 * 仅当多个 AI 协作同一账号/Agent 时，才在配置里设置署名以区分说话人。
 * 默认空串 = 不署名（注意：发送路径不得用 || 兜底，否则空签名会被顶回默认值）。
 */
const DEFAULT_SIGNATURE = ''

/** 全新安装时的默认配置。 */
function defaultConfig() {
  return {
    // 微信（iLink/OpenClaw 通道）：凭据 + 游标 + context_token 表 + 接收会话
    wechat: {
      enabled: false,
      accountId: '',
      botToken: '',
      baseUrl: '',
      signature: DEFAULT_SIGNATURE,
      sessionId: '',
      syncBuf: '',
      contextTokens: {},
    },
    // 其余四个渠道沿用占位配置（本轮不接真实 SDK）
    telegram: { enabled: false, token: '' },
    feishu: { enabled: false, appId: '', appSecret: '' },
    dingtalk: { enabled: false, appKey: '', appSecret: '' },
    whatsapp: { enabled: false, pairingCode: '' },
  }
}

/** 配置目录：用户数据目录（$DSH_HOME/storages/social-bridge/）。 */
function storageDir() {
  return join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages', 'social-bridge')
}

/** 配置文件绝对路径。 */
function configPath() {
  return join(storageDir(), 'config.json')
}

/** 读取配置：文件缺失或损坏时退回默认值，并逐字段白名单过滤。 */
function loadConfig() {
  const base = defaultConfig()
  let parsed
  try {
    parsed = JSON.parse(readFileSync(configPath(), 'utf8'))
  } catch {
    return base
  }
  for (const id of CHANNEL_IDS) {
    const source = parsed?.[id]
    if (source === null || typeof source !== 'object') continue
    for (const key of CHANNEL_KEYS[id]) {
      const value = source[key]
      // 类型不匹配的字段按未提供处理（例如旧版本遗留字段）
      if (typeof value === typeof base[id][key]) base[id][key] = value
    }
  }
  return base
}

/** 原子落盘：先写临时文件再改名，避免中途崩溃留下半个 JSON。 */
function saveConfig(config) {
  mkdirSync(storageDir(), { recursive: true })
  const target = configPath()
  const temp = `${target}.tmp`
  writeFileSync(temp, JSON.stringify(config, null, 2), 'utf8')
  renameSync(temp, target)
}

// ---- HTTP 工具 -------------------------------------------------------------

/** 输出 JSON 响应。 */
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** 读取 JSON 请求体（带大小上限）。 */
async function readBody(req, maxBytes = 64 * 1024) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('请求体不是合法 JSON')
  }
}

/**
 * 同源校验（与 dsh-memory-evolve 同款）：写操作要求 Content-Type 精确为
 * application/json、Origin 存在且与 Host 一致、请求体为 JSON 对象——
 * 防止跨站表单/脚本伪造本地写请求。
 */
function sameOriginGuard(req, body) {
  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (contentType !== 'application/json') return '请求必须为 application/json'
  const host = String(req.headers.host ?? '')
  const origin = String(req.headers.origin ?? '')
  if (origin === '') return '缺少 Origin 头，已拒绝（写操作必须由 Web UI 发起）'
  let originHost = ''
  try {
    originHost = new URL(origin).host
  } catch {
    return '跨站请求已拒绝'
  }
  if (originHost !== host) return '跨站请求已拒绝'
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return '请求体必须是 JSON 对象'
  }
  return null
}

/** 从 assistant 消息的内容块中提取纯文本（出站回复用）。 */
function extractAssistantText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : []
  const parts = []
  for (const block of blocks) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      parts.push(block.text)
    }
  }
  return parts.join('\n').trim()
}

/**
 * 构造一条可注入 agent.followup 的用户消息。
 * 插件保持零依赖（loader 只在插件自身 node_modules 链上解析导入），
 * 这里按 dsh-llm 的 createUserMessage 语义本地构造：
 * 新鲜 UUID 作为稳定身份、内容与来源深冻结（发布会话日志前不可变）。
 */
function createWechatUserMessage(text) {
  return Object.freeze({
    id: randomUUID(),
    role: 'user',
    content: Object.freeze([Object.freeze({ type: 'text', text })]),
    source: Object.freeze({ kind: 'plugin', plugin: 'dsh-social-bridge' }),
  })
}

// ---- 插件主体 --------------------------------------------------------------

/**
 * 宿主插件入口：
 *   1. 启动时若已启用且凭据齐全，自动恢复微信长轮询；
 *   2. 入站：微信消息 → agent.followup 注入现有会话流；
 *   3. 出站：目标会话回合结束 → 助手最终回复 + 署名发回微信；
 *   4. 注册 /social-bridge 前缀路由（配置 + 微信状态/登录/断开）。
 */
export function apply(ctx, rawConfig = {}) {
  const config = loadConfig()

  // 运行期消息流转状态（进程内，不落盘）
  let pending = null // { sessionId, userId, lastText }
  let lastInbound = null // { userId, text, at } 最近一条入站（设置页展示）
  let lastSendResult = null // { ok, error?, at } 最近一次回发结果

  // ---- 持久化回调（连接器专用） -------------------------------------------
  const persist = {
    loadSyncBuf: () => config.wechat.syncBuf || undefined,
    saveSyncBuf: (buf) => {
      config.wechat.syncBuf = String(buf)
      saveConfig(config)
    },
    contextTokens: () => config.wechat.contextTokens || {},
    saveCredentials: (cred) => {
      config.wechat.accountId = cred.accountId
      config.wechat.botToken = cred.botToken
      config.wechat.baseUrl = cred.baseUrl || ''
      saveConfig(config)
    },
    clearCredentials: () => {
      config.wechat.accountId = ''
      config.wechat.botToken = ''
      config.wechat.baseUrl = ''
      config.wechat.contextTokens = {}
      config.wechat.syncBuf = ''
      saveConfig(config)
    },
  }

  // ---- 入站：微信消息 → 现有会话消息流 --------------------------------------

  /** 解析接收会话：优先配置记住的 sessionId，否则取第一个根会话。 */
  function resolveTargetAgent() {
    const svc = ctx.get('agents')
    if (!svc) return null
    if (config.wechat.sessionId) {
      const agent = svc.get?.(config.wechat.sessionId)
      if (agent) return agent
    }
    const roots = svc.roots?.() || []
    return roots[0] ?? null
  }

  async function onWechatMessage(msg) {
    const parsed = wechat.parseInbound(msg)
    if (!parsed.ok) return
    // 持久化 context_token（重启后无需等对方先发消息即可回复）
    if (parsed.contextToken) {
      config.wechat.contextTokens = {
        ...(config.wechat.contextTokens || {}),
        [parsed.userId]: parsed.contextToken,
      }
      saveConfig(config)
    }
    const agent = resolveTargetAgent()
    if (!agent) {
      lastInbound = { userId: parsed.userId, text: parsed.text.slice(0, 200), at: Date.now() }
      console.warn(`[微信桥] 收到消息但当前没有活跃会话可接收（from=${parsed.userId}）`)
      return
    }
    // 记住接收会话，重启后直接投递到同一会话
    if (config.wechat.sessionId !== agent.id) {
      config.wechat.sessionId = agent.id
      saveConfig(config)
    }
    let text = parsed.text
    if (parsed.hasMedia) {
      text = text
        ? `${text}\n\n（用户发来媒体内容，本轮仅支持文本，暂未下载）`
        : '（用户发来媒体内容，本轮仅支持文本，暂未下载）'
    }
    const content = `【微信消息 · 来自 ${parsed.userId}】\n${text || '（空消息）'}`
    agent.followup(createWechatUserMessage(content))
    pending = { sessionId: agent.id, userId: parsed.userId, lastText: '' }
    lastInbound = { userId: parsed.userId, text: parsed.text.slice(0, 200), at: Date.now() }
    console.log(`[微信桥] 入站消息已投递到会话 ${agent.id}（from=${parsed.userId}）`)
  }

  // ---- 出站：回合结束 → 助手最终回复发回微信（自动署名） --------------------

  // 记录本回合助手最后一段文本（assistant/message 每步一条，取最后一条）
  ctx.on('session/event', (session, event) => {
    if (!pending || event?.type !== 'assistant/message') return
    if (session?.id !== pending.sessionId) return
    const text = extractAssistantText(event?.data?.message)
    if (text) pending.lastText = text
  })

  // 回合即将关闭（模型无更多输出）→ 若本轮由微信消息驱动，回发最终回复
  ctx.on('agent/turn-stopping', async (payload) => {
    if (!pending) return
    if (payload?.agent?.id !== pending.sessionId) return
    const p = pending
    pending = null
    if (!p.lastText) return
    try {
      const signature = config.wechat.signature
      await wechat.sendReply(p.userId, p.lastText, signature)
      lastSendResult = { ok: true, at: Date.now() }
      console.log(`[微信桥] 回复已发回微信（to=${p.userId}）`)
    } catch (err) {
      // 发送失败必须留下可查原因，不静默丢消息
      lastSendResult = { ok: false, error: err?.message ?? String(err), at: Date.now() }
      console.error(`[微信桥] 回复发送失败: ${lastSendResult.error}`)
    }
  })

  // 插件卸载时停掉长轮询
  ctx.effect(() => () => wechat.stopConnector(), 'dsh-social-bridge: wechat stop')

  // ---- 启动恢复：已启用且凭据齐全 → 自动恢复长轮询（重启不丢） --------------
  if (config.wechat.enabled && config.wechat.botToken) {
    wechat.startWithCredentials({
      credentials: {
        accountId: config.wechat.accountId,
        botToken: config.wechat.botToken,
        baseUrl: config.wechat.baseUrl,
      },
      persist,
      onMessage: onWechatMessage,
      onStatus: () => { /* 状态经 GET /api/wechat 拉取，无需推送 */ },
    })
  }

  // ---- Web API --------------------------------------------------------------
  ctx.inject(['webServer'], (webCtx) => {
    const handler = async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname
      try {
        // GET /social-bridge/api/config → 五渠道配置 + 简化状态
        if (req.method === 'GET' && path === '/social-bridge/api/config') {
          sendJson(res, 200, {
            ok: true,
            channels: config,
            status: {
              wechat: wechat.getState().status === 'connected' ? 'connected' : 'unconfigured',
              telegram: config.telegram.token !== '' ? 'connected' : 'unconfigured',
              feishu: config.feishu.appId !== '' && config.feishu.appSecret !== '' ? 'connected' : 'unconfigured',
              dingtalk: config.dingtalk.appKey !== '' && config.dingtalk.appSecret !== '' ? 'connected' : 'unconfigured',
              whatsapp: config.whatsapp.pairingCode !== '' ? 'paired' : 'unpaired',
            },
          })
          return
        }

        // GET /social-bridge/api/wechat → 微信桥完整状态（设置页轮询）
        if (req.method === 'GET' && path === '/social-bridge/api/wechat') {
          const state = wechat.getState()
          sendJson(res, 200, {
            ok: true,
            enabled: Boolean(config.wechat.enabled),
            status: state.status,
            qrUrl: state.qrUrl || '',
            accountId: config.wechat.accountId || '',
            error: state.error || '',
            signature: config.wechat.signature,
            lastInbound,
            lastSendResult,
          })
          return
        }

        // POST /social-bridge/api/wechat/login → 启用并弹出二维码登录
        if (req.method === 'POST' && path === '/social-bridge/api/wechat/login') {
          const body = await readBody(req)
          const guard = sameOriginGuard(req, body)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          config.wechat.enabled = true
          saveConfig(config)
          if (wechat.getState().status === 'connected') {
            sendJson(res, 200, { ok: true, status: wechat.getState().status })
            return
          }
          wechat.loginWithQR({
            persist,
            onMessage: onWechatMessage,
            onLoginSuccess: persist.saveCredentials,
            onStatus: () => { /* 轮询 GET 获取 */ },
          })
          sendJson(res, 200, { ok: true, status: wechat.getState().status })
          return
        }

        // GET /social-bridge/api/wechat/sessions → 活跃会话列表（手机消息接收会话切换用）
        if (req.method === 'GET' && path === '/social-bridge/api/wechat/sessions') {
          const svc = ctx.get('agents')
          const rows = []
          if (svc) {
            for (const agent of svc.list?.() || []) {
              const id = agent?.id
              if (!id) continue
              const title = String(agent?.session?.header?.title || '').trim()
              rows.push({ id, title: title || id })
            }
          }
          // 当前选择若不在活跃列表里（会话已关闭），也保留一行便于用户知情
          if (config.wechat.sessionId && !rows.some((row) => row.id === config.wechat.sessionId)) {
            rows.push({ id: config.wechat.sessionId, title: config.wechat.sessionId })
          }
          sendJson(res, 200, { ok: true, sessions: rows, current: config.wechat.sessionId })
          return
        }

        // POST /social-bridge/api/wechat/session { sessionId } → 切换手机消息接收会话
        if (req.method === 'POST' && path === '/social-bridge/api/wechat/session') {
          const body = await readBody(req)
          const guard = sameOriginGuard(req, body)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          const sessionId = String(body?.sessionId ?? '').trim()
          if (!sessionId) {
            sendJson(res, 400, { ok: false, error: 'sessionId 不能为空' })
            return
          }
          // 校验目标会话确实活跃，避免把消息投到不存在的会话
          const svc = ctx.get('agents')
          if (!svc?.get?.(sessionId)) {
            sendJson(res, 400, { ok: false, error: '目标会话不存在或已关闭' })
            return
          }
          config.wechat.sessionId = sessionId
          pending = null // 会话切换后，未完成的回发状态作废
          saveConfig(config)
          sendJson(res, 200, { ok: true, sessionId })
          return
        }

        // POST /social-bridge/api/wechat/logout → 断开并清理凭据
        if (req.method === 'POST' && path === '/social-bridge/api/wechat/logout') {
          const body = await readBody(req)
          const guard = sameOriginGuard(req, body)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          config.wechat.enabled = false
          saveConfig(config)
          wechat.logoutConnector(persist)
          lastInbound = null
          lastSendResult = null
          sendJson(res, 200, { ok: true, status: wechat.getState().status })
          return
        }

        // POST /social-bridge/api/wechat/status → 「检查连接」刷新真实状态
        if (req.method === 'POST' && path === '/social-bridge/api/wechat/status') {
          const body = await readBody(req)
          const guard = sameOriginGuard(req, body)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          const state = wechat.getState()
          sendJson(res, 200, {
            ok: true,
            status: state.status,
            qrUrl: state.qrUrl || '',
            error: state.error || '',
            accountId: config.wechat.accountId || '',
          })
          return
        }

        // POST /social-bridge/api/config { channel, patch } → 其他渠道配置保存
        if (req.method === 'POST' && path === '/social-bridge/api/config') {
          const body = await readBody(req)
          const guard = sameOriginGuard(req, body)
          if (guard !== null) {
            sendJson(res, 403, { ok: false, error: guard })
            return
          }
          const channel = String(body?.channel ?? '').trim()
          if (!CHANNEL_IDS.includes(channel)) {
            sendJson(res, 400, { ok: false, error: `未知渠道：${channel}` })
            return
          }
          const patch = body?.patch
          if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
            sendJson(res, 400, { ok: false, error: 'patch 必须是 JSON 对象' })
            return
          }
          // 按白名单合并：布尔字段取布尔值，字符串字段取字符串值，其余忽略
          const target = config[channel]
          for (const [key, value] of Object.entries(patch)) {
            if (!CHANNEL_KEYS[channel].includes(key)) continue
            if (key === 'enabled') {
              target[key] = Boolean(value)
            } else if (typeof value === 'string') {
              target[key] = value
            }
          }
          saveConfig(config)
          sendJson(res, 200, { ok: true, channels: config })
          return
        }

        sendJson(res, 404, { ok: false, error: 'not found' })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error?.message ?? String(error) })
      }
    }
    // register 返回注销函数，交给 effect 管理生命周期（插件卸载时路由随之移除）
    webCtx.effect(() => webCtx.webServer.register({ kind: 'prefix', path: '/social-bridge', handler }))
  })
}
