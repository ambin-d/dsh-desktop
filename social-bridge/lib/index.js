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

import { mkdirSync, readFileSync, renameSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'
import * as wechat from './wechat.js'
import { transcribeFile, voiceExt } from './asr.js'

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
 * 来源标记为 kind:'user'：微信消息就是用户本人说的，标记成 user 才能被
 * 官方标题生成（session/title 只认 kind:'user' 的消息）、目标授权
 * （create_goal 只认直接真人请求）、以及 GUI 会话列表的「非空白」判定识别。
 * @param content - 内容块数组（文本/图片附件块），传字符串时包成单文本块。
 */
function createWechatUserMessage(content) {
  const blocks = (Array.isArray(content) && content.length > 0)
    ? content
    : [{ type: 'text', text: typeof content === 'string' ? content : '（空消息）' }]
  return Object.freeze({
    id: randomUUID(),
    role: 'user',
    content: Object.freeze(blocks.map((block) => Object.freeze({
      ...block,
      ...(block?.attachment ? { attachment: Object.freeze({ ...block.attachment }) } : {}),
    }))),
    source: Object.freeze({ kind: 'user' }),
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

  /** 解析接收会话：优先配置记住的 sessionId；不在线时从持久化恢复；再退到第一个根会话。 */
  async function resolveTargetAgent() {
    const svc = ctx.get('agents')
    if (!svc) return null
    if (config.wechat.sessionId) {
      const agent = svc.get?.(config.wechat.sessionId)
      if (agent) return agent
      // 记住的会话不在线（宿主重启后的冷会话）：按持久化头恢复，
      // 保持「消息继续进同一会话」而不是静默改投别的会话
      const resumed = await resumeColdSession(svc, config.wechat.sessionId)
      if (resumed) return resumed
    }
    const roots = svc.roots?.() || []
    return roots[0] ?? null
  }

  /**
   * 从持久化恢复一个冷会话（与 GUI 打开旧会话同路径）：
   * 按会话头记录的预设挂载 + 默认模型选择。失败返回 null，由调用方退回默认会话。
   */
  async function resumeColdSession(svc, sessionId) {
    if (typeof svc.resume !== 'function') return null
    const persistence = ctx.get('sessionPersistence')
    if (!persistence || typeof persistence.inspect !== 'function') return null
    let presetId
    try {
      const inspected = await persistence.inspect(sessionId)
      presetId = inspected?.meta?.agentPreset
    } catch { /* 检查失败则按默认预设处理 */ }
    let setup
    try {
      const presets = ctx.get('agentPresets')
      if (presets && typeof presets.resolve === 'function' && typeof presets.mount === 'function') {
        const resolved = await presets.resolve(presetId || undefined)
        const id = String(resolved?.id ?? '').trim() || undefined
        if (id) {
          setup = async (agentCtx) => { await presets.mount(agentCtx, id) }
        }
      }
    } catch (error) {
      console.warn(`[微信桥] 恢复会话预设解析失败（${sessionId}）: ${error?.message ?? error}`)
    }
    const selection = defaultModelSelection()
    try {
      const handle = await svc.resume({
        resumeSessionId: sessionId,
        ...(selection ? { agentOptions: selection } : {}),
        ...(setup ? { setup } : {}),
      })
      return handle?.agent ?? null
    } catch (error) {
      console.warn(`[微信桥] 恢复会话 ${sessionId} 失败（退回默认会话）: ${error?.message ?? error}`)
      return null
    }
  }

  /**
   * 当前默认模型选择（与 GUI 新建会话同源：agentDefaultModel 服务）。
   * 程序化新建的会话必须带上它——缺省时 {{model}} 提示词变量为空，
   * 回合在组装阶段就抛错，表现为「微信无回复、会话日志无记录」。
   */
  function defaultModelSelection() {
    const service = ctx.get('agentDefaultModel')
    const selection = typeof service?.currentSelection === 'function'
      ? service.currentSelection()
      : undefined
    if (!selection?.provider || !selection?.model) return undefined
    return { provider: selection.provider, model: selection.model }
  }

  /**
   * 把新建会话挂到工作区（与 GUI 新建同路径；不挂会显示在「未分组」）。
   * 失败只影响左侧分组显示，不阻断会话本身。
   */
  async function attachToWorkspace(sessionId, cwd) {
    const registry = ctx.get('workspaceRegistry')
    if (!registry || !cwd) return null
    try {
      let ws = typeof registry.resolveByPath === 'function'
        ? await registry.resolveByPath(cwd)
        : undefined
      if (ws === undefined && typeof registry.create === 'function') {
        ws = await registry.create(cwd)
      }
      if (ws && typeof ws.attachSession === 'function') {
        await ws.attachSession(sessionId)
      }
      return ws
    } catch (error) {
      console.warn(`[微信桥] 会话 ${sessionId} 挂接工作区失败（仅影响分组显示）: ${error?.message ?? error}`)
      return null
    }
  }

  /**
   * 取一个会话的友好名称：官方标题服务 → 会话头标题 → 首条用户消息摘要 →
   * 创建时间（纯空白会话）。保证「列出会话」里每个会话都可区分。
   */
  function sessionLabel(agent) {
    try {
      const titled = ctx.get('sessionTitle')?.get?.(agent?.session)?.title
      if (titled) return String(titled)
    } catch { /* 标题服务不可用时继续兜底 */ }
    const session = agent?.session
    const header = String(session?.header?.title || '').trim()
    if (header) return header
    // 未命名但有消息的会话：用首条用户消息摘要区分（微信上识别度高）
    const events = session?.events ?? []
    const firstUser = events.find((event) => event?.type === 'user/message')
    if (firstUser) {
      const summary = extractAssistantText(firstUser?.data?.message)
        .replace(/\s+/g, ' ')
        .trim()
      if (summary) return summary.length > 14 ? `${summary.slice(0, 14)}…` : summary
    }
    // 纯空白会话：显示创建时间，避免一堆「未命名会话」无法区分
    const stamp = session?.header?.createdAt ? new Date(session.header.createdAt) : new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `新会话 · ${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())} ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}`
  }

  // ---- 入站媒体（图片/文件/视频）：下载 → 落盘 → 图片进视觉链路 --------------

  /** 媒体落盘目录：$DSH_HOME/storages/social-bridge/media/<日期>/。 */
  function mediaDir() {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    return join(storageDir(), 'media', date)
  }

  /** 文件名字段清洗：去掉路径分隔符与控制字符，防目录穿越/脏名。 */
  function safeFileName(name) {
    const base = String(name || '').replace(/[/\\:*?"<>|\u0000-\u001f]/g, '_').trim()
    return base || 'unnamed'
  }

  /** 图片字节嗅探媒体类型（attachments.saveImage 要求声明与字节一致）。 */
  function sniffImageType(data) {
    if (data.length > 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'image/png'
    if (data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
    if (data.length > 5 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) return 'image/gif'
    if (data.length > 12 && data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
      && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return 'image/webp'
    return undefined
  }

  /** 图片媒体类型 → 文件扩展名。 */
  const IMAGE_EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' }

  /**
   * 处理入站媒体条目（IMAGE=2 / FILE=4 / VIDEO=5）：
   * 下载 + AES 解密 → 落盘媒体目录；图片另经 attachments.saveImage 注册，
   * 生成图片内容块交给 vision-router 在 pre-step 转写。
   * 单个条目失败不阻断其余条目，失败原因写进备注文本。
   * @returns { imageBlocks, imagePaths, fileNotes }
   */
  async function ingestWechatMedia(items) {
    const imageBlocks = []
    const imagePaths = []
    const fileNotes = []
    if (!Array.isArray(items) || items.length === 0) return { imageBlocks, imagePaths, fileNotes }
    const attachments = ctx.get('attachments')
    const dir = mediaDir()
    const stamp = Date.now()
    let index = 0
    for (const item of items) {
      const type = Number(item?.type)
      if (type !== 2 && type !== 4 && type !== 5) continue // 只处理图片/文件/视频（语音走 ASR 链路）
      index += 1
      const typeName = type === 2 ? '图片' : type === 5 ? '视频' : '文件'
      try {
        const media = await wechat.downloadMediaItem(item)
        const data = Buffer.isBuffer(media.data) ? media.data : Buffer.from(media.data)
        if (data.length === 0) throw new Error('下载结果为空')
        mkdirSync(dir, { recursive: true })
        if (media.kind === 'image' || (media.kind === undefined && type === 2)) {
          const mediaType = sniffImageType(data) || 'image/jpeg'
          const ext = IMAGE_EXT[mediaType] || '.jpg'
          const name = `wx-img-${stamp}-${index}${ext}`
          const path = join(dir, name)
          writeFileSync(path, data)
          imagePaths.push(path)
          // 注册进 attachments：vision-router 在 agent/pre-step 按 attachmentId 转写
          if (typeof attachments?.saveImage === 'function') {
            try {
              const ref = await attachments.saveImage({ data, mediaType, name })
              imageBlocks.push({ type: 'image', attachment: { ...ref } })
            } catch (error) {
              fileNotes.push(`${typeName}已保存到 ${path}，但未能进入视觉链路（${error?.message ?? error}）`)
            }
          } else {
            fileNotes.push(`${typeName}已保存到 ${path}（当前环境无图片附件服务，本轮按文件处理）`)
          }
        } else {
          const name = media.kind === 'file'
            ? safeFileName(item?.file_item?.file_name)
            : `wx-video-${stamp}-${index}.mp4`
          const path = join(dir, name)
          writeFileSync(path, data)
          fileNotes.push(`${typeName}已保存：${path}`)
        }
      } catch (error) {
        fileNotes.push(`${typeName}下载失败：${error?.message ?? error}`)
      }
    }
    return { imageBlocks, imagePaths, fileNotes }
  }

  /**
   * 微信内指令：不需要碰设置页，直接在微信上管理接收会话。
   * 支持：「列出会话」查看列表；「切换会话 N」按编号切换；「切换会话 关键词」按标题切换；
   * 「新会话 [预设关键词]」按预设新建并切换；「列出预设」查看可用预设。
   * 指令命中时直接回复微信（不进会话流）；未命中返回 null，走正常消息流。
   */

  /** 预设关键词 → 预设 id 别名表（大小写不敏感；键全部小写）。 */
  const PRESET_ALIASES = {
    当当: 'dangdang',
    dangdang: 'dangdang',
    秘书: 'dangdang-secretary',
    当当秘书: 'dangdang-secretary',
    'dangdang-secretary': 'dangdang-secretary',
    丁丁: 'dingding',
    dingding: 'dingding',
  }

  async function handleWechatCommand(userId, text) {
    const command = text.trim()
    if (command === '列出会话' || command === '会话列表' || command === '会话') {
      const svc = ctx.get('agents')
      // 只列根会话（用户聊天会话），不含子代理
      const roots = svc?.roots?.() || []
      const rows = roots.map((agent, index) => {
        const label = sessionLabel(agent)
        const mark = config.wechat.sessionId === agent.id ? '  ← 当前接收' : ''
        return `${index + 1}. ${label}${mark}`
      })
      return rows.length
        ? `当前会话列表：\n${rows.join('\n')}\n回复「切换会话 编号」切换；回复「新会话」自动新建并切换`
        : '当前没有活跃会话'
    }
    const match = command.match(/^切换会话\s*(.+)$/)
    if (match) {
      const key = match[1].trim()
      const svc = ctx.get('agents')
      const roots = svc?.roots?.() || []
      let target = null
      const number = Number(key)
      if (Number.isInteger(number) && number >= 1 && number <= roots.length) {
        target = roots[number - 1]
      } else {
        target = roots.find((agent) => sessionLabel(agent).includes(key))
      }
      if (!target) return '没找到该会话，回复「列出会话」查看编号'
      config.wechat.sessionId = target.id
      pending = null // 切换后未完成的回发状态作废
      saveConfig(config)
      return `已切换接收会话：${sessionLabel(target)}`
    }
    if (command === '列出预设' || command === '预设列表' || command === '预设') {
      const presets = ctx.get('agentPresets')
      let rows = []
      try {
        const list = (await presets?.list?.()) ?? []
        rows = list.map((p) => `${p?.id}${p?.id === 'lucky' ? '（默认）' : ''}`)
      } catch { /* 列表失败按空处理 */ }
      return rows.length
        ? `可用预设：${rows.join(' / ')}\n用法：新会话 [预设关键词]，如「新会话 当当」「新会话 秘书」`
        : '当前没有可用的预设'
    }
    const newSessionMatch = command.match(/^新会话(?:\s+(.+))?$/)
    if (newSessionMatch) {
      // 程序化新建会话（与 GUI 新建同路径）：指定预设（可带关键词）+ 默认模型 + 继承当前接收会话的工作目录
      const svc = ctx.get('agents')
      if (!svc?.create) return '当前环境不支持程序化新建会话'
      const keyword = newSessionMatch[1] ?? ''
      const presets = ctx.get('agentPresets')
      let presetId
      let presetLabel = ''
      if (presets && typeof presets.resolve === 'function') {
        const clean = keyword.trim().toLowerCase()
        const aliasTarget = clean === '' ? undefined : PRESET_ALIASES[clean]
        const target = clean === '' ? undefined : (aliasTarget ?? clean)
        try {
          const resolved = await presets.resolve(target) // 无参数=默认预设；别名/关键词=指定预设
          presetId = String(resolved?.id ?? '').trim() || undefined
          presetLabel = String(resolved?.name ?? resolved?.id ?? presetId ?? '').trim()
        } catch (error) {
          if (clean !== '') {
            // 指定了预设但解析失败 → 列出可用预设，不创建会话
            let available = ''
            try {
              const list = (await presets.list?.()) ?? []
              available = list.map((p) => String(p?.id ?? '')).filter(Boolean).join(' / ')
            } catch { /* 列表失败走兜底文案 */ }
            if (!available) available = 'lucky / dangdang / dangdang-secretary'
            return `没找到预设「${keyword.trim()}」。可用预设：${available}\n用法：新会话 [预设关键词]，不带关键词=默认预设`
          }
          // 无参数时默认预设解析失败 → 降级不挂载（保持现状行为）
          console.warn(`[微信桥] 预设解析失败（新会话降级不挂载）: ${error?.message ?? error}`)
        }
      }
      const current = svc.get?.(config.wechat.sessionId)
      const cwd = current?.session?.header?.cwd || homedir()
      const sessionId = `session-${randomUUID()}`
      let setup
      if (presets && presetId && typeof presets.mount === 'function') {
        setup = async (agentCtx) => { await presets.mount(agentCtx, presetId) }
      }
      // 默认模型选择（与 GUI 新建同源）：缺省时新会话回合在提示词组装阶段抛错
      const selection = defaultModelSelection()
      try {
        await svc.create({
          sessionId,
          ...(selection ? { agentOptions: selection } : {}),
          meta: {
            cwd,
            ...(presetId ? { agentPreset: presetId } : {}),
          },
          ...(setup ? { setup } : {}),
        })
      } catch (error) {
        return `新建会话失败：${error?.message ?? error}`
      }
      // 挂到工作区（左侧「项目」分组可见，与 GUI 新建一致）
      await attachToWorkspace(sessionId, cwd)
      config.wechat.sessionId = sessionId
      pending = null
      saveConfig(config)
      return presetLabel
        ? `已新建会话并切换为接收会话（预设：${presetLabel}），之后的微信消息都进新会话`
        : '已新建会话并切换为接收会话，之后的微信消息都进新会话'
    }
    return null
  }

  /**
   * 微信语音 → 本地 ASR 转写：
   * 下载语音字节（CDN+解密）→ 落临时文件 → ffmpeg 解成 16k PCM → DashScope 转写。
   * @returns { ok, text } 或 { ok:false, reason }
   */
  async function transcribeWechatVoice(item) {
    let dir = null
    try {
      const downloaded = await wechat.downloadMediaItem(item)
      dir = mkdtempSync(join(tmpdir(), 'dsh-voice-'))
      const file = join(dir, `voice${voiceExt(item?.voice_item?.encode_type ?? 0)}`)
      writeFileSync(file, Buffer.from(downloaded.data))
      const credentials = ctx.get('credentials')
      const resolved = typeof credentials?.resolve === 'function'
        ? await credentials.resolve('ALIYUN_ASR_KEY')
        : undefined
      if (!resolved?.value) return { ok: false, reason: 'ASR 凭据未配置（缺少 ALIYUN_ASR_KEY）' }
      const text = await transcribeFile(file, resolved.value)
      const clean = text.trim()
      return clean ? { ok: true, text: clean } : { ok: false, reason: '转写结果为空' }
    } catch (error) {
      return { ok: false, reason: error?.message ?? String(error) }
    } finally {
      if (dir) {
        try { rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略清理失败 */ }
      }
    }
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
    // 微信内指令优先：命中则直接回复微信，不进会话流
    const commandReply = await handleWechatCommand(parsed.userId, parsed.text)
    if (commandReply !== null) {
      try {
        await wechat.sendReply(parsed.userId, commandReply, '')
      } catch (error) {
        console.error(`[微信桥] 指令回复发送失败: ${error?.message ?? error}`)
      }
      return
    }
    // 语音处理：优先服务端转写（voice_item.text，库的 extractText 已取出），
    // 没有则走本地 ASR 链路（下载 → ffmpeg 解码 → DashScope 转写）
    const voiceItem = (parsed.items || []).find((item) => Number(item?.type) === 3)
    if (voiceItem) {
      if (parsed.text) {
        // 服务端已转写：直接标注使用，不再误报"媒体未下载"
        parsed.text = `【微信语音】${parsed.text}`
      } else {
        const transcript = await transcribeWechatVoice(voiceItem)
        if (transcript.ok) {
          parsed.text = `【微信语音】${transcript.text}`
        } else {
          // 转写失败：直接回微信说明原因（不静默），并在会话流中留记录
          try {
            await wechat.sendReply(parsed.userId, `语音已收到，但自动转写失败：${transcript.reason}`, '')
          } catch (error) {
            console.error(`[微信桥] 转写失败说明发送失败: ${error?.message ?? error}`)
          }
          parsed.text = `（收到一条微信语音，自动转写失败：${transcript.reason}）`
        }
      }
    }
    const agent = await resolveTargetAgent()
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
    // 媒体下载：图片进视觉链路（vision-router 在 pre-step 转写），文件/视频落盘并告知路径
    const media = await ingestWechatMedia(parsed.items)
    const prefix = `【微信消息 · 来自 ${parsed.userId}】`
    const contentBlocks = []
    if (parsed.text) contentBlocks.push({ type: 'text', text: `${prefix}\n${parsed.text}` })
    for (const block of media.imageBlocks) contentBlocks.push(block)
    const notes = []
    if (media.imagePaths.length > 0) {
      notes.push(`图片原图已保存：${media.imagePaths.join('、')}`)
    }
    notes.push(...media.fileNotes)
    if (notes.length > 0) {
      contentBlocks.push({ type: 'text', text: `【微信媒体】\n${notes.join('\n')}` })
    }
    if (contentBlocks.length === 0) {
      contentBlocks.push({ type: 'text', text: `${prefix}\n（空消息）` })
    }
    agent.followup(createWechatUserMessage(contentBlocks))
    pending = { sessionId: agent.id, userId: parsed.userId, lastText: '' }
    lastInbound = { userId: parsed.userId, text: parsed.text.slice(0, 200), at: Date.now() }
    console.log(`[微信桥] 入站消息已投递到会话 ${agent.id}（from=${parsed.userId}，内容块 ${contentBlocks.length} 个）`)
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

  // 回合报错（模型调用失败等）→ 把原因发回微信，避免「消息石沉大海」
  ctx.on('agent/error', async (payload) => {
    const agentId = payload?.agent?.id
    if (!pending || agentId !== pending.sessionId) return
    const p = pending
    pending = null
    const reason = payload?.error?.message ?? String(payload?.error ?? '未知错误')
    try {
      await wechat.sendReply(p.userId, `本轮处理出错，未生成回复：${reason}`, config.wechat.signature)
      lastSendResult = { ok: true, at: Date.now() }
    } catch (err) {
      console.error(`[微信桥] 错误说明发送失败: ${err?.message ?? String(err)}`)
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
