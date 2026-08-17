/**
 * dsh-social-bridge — 微信（iLink/OpenClaw 通道）连接器（宿主半）。
 *
 * 机制参考同类 wechat-clawbot 桥接：同一 wechat-ilink-client 库
 * （v0.1.0，逆向自 @tencent-weixin/openclaw-weixin），iLink 协议独立实现，
 * 不依赖 OpenClaw 框架、不 hook 微信客户端、不用 WeChatFerry。
 *
 * 关键机制：
 *   1. 二维码登录：client.login({ onQRCode }) 返回 { connected, botToken,
 *      accountId, baseUrl }；登录超时/取消不会 reject，必须显式检查
 *      result.connected，否则会把超时误判为扫码成功；
 *   2. 凭据（botToken/accountId/baseUrl）由调用方持久化，重启后直接
 *      构造 client 不再扫码；
 *   3. 长轮询：client.start({ loadSyncBuf, saveSyncBuf }) 游标持久化，
 *      重启后从上次位置续读不丢消息；
 *   4. context_token 回填：库内部用内存 Map 缓存每个用户的会话令牌，
 *      重启后必须从持久化恢复，否则只能等对方先发消息才能回复；
 *   5. apiFetch 补丁：库的 sendMessage 只 await HTTP 层，HTTP 200 但
 *      body 里 ret != 0 的业务失败会被吞掉——拦截 sendmessage 端点，
 *      发现非零 ret 显式抛错，让上层拿到真实失败原因；
 *   6. 只处理 MessageType.USER 的 1 对 1 私聊；文本用
 *      WeChatClient.extractText 提取。
 *
 * 本轮范围：文本收发 + 状态机 + 持久化；媒体收发不在本轮（库已提供
 * sendMedia/downloadMedia，后续可扩展）。
 */

import { MessageType, WeChatClient } from '../vendor/wechat-ilink-client/dist/index.mjs'

// ---- 运行态（进程内单实例） -------------------------------------------------

/** 连接器状态机：idle | qr_pending | qr_ready | connected | error */
let client = null
let status = 'idle'
let currentQrUrl = null
let lastError = ''

/** 返回当前状态快照（供 API/设置页轮询）。 */
export function getState() {
  return { status, qrUrl: currentQrUrl, error: lastError }
}

/**
 * 给库的 apiFetch 打补丁：
 * 库内部 sendMessage 只 await apiFetch、丢掉响应文本，而 apiFetch 仅在
 * HTTP !res.ok 时抛错——HTTP 200 + body {"ret": -1} 的业务失败被完全吞掉。
 * 这里拦下 sendmessage 端点的响应，解析出非零 ret/code 时显式抛错。
 */
function applyApiFetchPatch(target) {
  try {
    const rawApiFetch = target.api?.apiFetch?.bind(target.api)
    if (typeof rawApiFetch !== 'function') {
      console.warn('[微信桥] client.api.apiFetch 不可访问，跳过响应校验（库实现可能已变化）')
      return
    }
    target.api.apiFetch = async (params) => {
      const rawText = await rawApiFetch(params)
      if (params?.endpoint === 'ilink/bot/sendmessage') {
        let body = null
        try { body = JSON.parse(rawText) } catch { /* 非 JSON 响应按原样放行 */ }
        if (body && typeof body === 'object') {
          const ret = body.ret ?? body.code ?? body.errcode
          if (ret != null && ret !== 0) {
            const errMsg = body.err_msg || body.errmsg || body.message || body.msg || ''
            console.error(`[微信桥] sendMessage 服务端拒绝 ret=${ret} ${errMsg}`)
            throw new Error(`iLink sendmessage rejected: ret=${ret} ${errMsg}`)
          }
        }
      }
      return rawText
    }
    console.log('[微信桥] sendMessage 响应校验已启用')
  } catch (err) {
    console.warn(`[微信桥] 安装响应校验失败（不致命，继续启动）: ${err?.message ?? err}`)
  }
}

/**
 * 启动时把上次落盘的 context_token 回填到内存 Map：
 * 库 sendText 用 this.contextTokens.get(to)，重启后这个 Map 是空的，
 * 不回填则只能等用户先发一条新消息才能回复。
 * contextTokens 在类型声明里是 private 但运行时是普通 class field
 * （加 guard 防库作者改成 # 真私有）。
 */
function restoreContextTokens(target, tokens) {
  try {
    if (target.contextTokens instanceof Map) {
      for (const [userId, token] of Object.entries(tokens || {})) {
        if (userId && token) target.contextTokens.set(userId, token)
      }
      console.log(`[微信桥] 已从持久化恢复 ${Object.keys(tokens || {}).length} 条 context_token`)
    } else {
      console.warn('[微信桥] client.contextTokens 不可访问（库实现可能已变化），跳过 token 恢复')
    }
  } catch (err) {
    console.warn(`[微信桥] 恢复 context_token 失败（不致命，继续启动）: ${err?.message ?? err}`)
  }
}

/** 停掉当前连接器并复位内存状态（不清理持久化凭据）。 */
export function stopConnector() {
  try { client?.stop?.() } catch { /* 忽略停止异常 */ }
  client = null
  status = 'idle'
  currentQrUrl = null
}

/** 断开并清理持久化凭据（重新扫码登录用）。 */
export function logoutConnector(persist) {
  stopConnector()
  lastError = ''
  persist?.clearCredentials?.()
}

/**
 * 用已保存凭据启动长轮询（登录成功后与重启恢复共用这一条路径）。
 * @param options.credentials - { accountId, botToken, baseUrl }
 * @param options.persist - { saveSyncBuf } 游标落盘
 * @param options.onMessage - 入站消息回调（USER 私聊文本已提取）
 * @param options.onStatus - 状态变化回调（刷新设置页）
 */
export function startWithCredentials({ credentials, persist, onMessage, onStatus }) {
  stopConnector()
  client = new WeChatClient({
    accountId: credentials.accountId,
    token: credentials.botToken,
    baseUrl: credentials.baseUrl || undefined,
  })
  applyApiFetchPatch(client)
  restoreContextTokens(client, persist?.contextTokens?.() || {})

  client.on('message', (msg) => {
    void Promise.resolve(onMessage?.(msg)).catch((err) => {
      console.error(`[微信桥] 入站消息处理失败: ${err?.message ?? err}`)
    })
  })
  client.on('error', (err) => {
    console.error(`[微信桥] 错误: ${err?.message ?? err}`)
    status = 'error'
    lastError = err?.message ?? String(err)
    onStatus?.(getState())
  })
  client.on('sessionExpired', () => {
    // 服务端 errcode -14：会话过期，需重新扫码；清凭据并回 idle
    console.warn('[微信桥] 会话已过期，请重新扫码登录')
    persist?.clearCredentials?.()
    stopConnector()
    lastError = '会话已过期，请重新扫码'
    onStatus?.(getState())
  })

  // 长轮询：游标经 loadSyncBuf/saveSyncBuf 持久化，重启续读不丢消息。
  // start() 的 Promise 直到 stop() 才 settle，失败走 error 事件与 catch。
  status = 'connected'
  onStatus?.(getState())
  console.log(`[微信桥] 使用已保存凭证启动（accountId: ${credentials.accountId}）`)
  client.start({
    loadSyncBuf: () => persist?.loadSyncBuf?.() || undefined,
    saveSyncBuf: (buf) => { persist?.saveSyncBuf?.(buf) },
  }).catch((err) => {
    // start 失败说明凭证失效或后端连不上——同步把内存状态打回去，
    // 否则设置页仍显示"已连接"但实际啥都不通（同类教训）
    status = 'error'
    lastError = err?.message ?? String(err)
    console.error(`[微信桥] start 失败: ${lastError}`)
    onStatus?.(getState())
  })
}

/**
 * 发起二维码登录（首次连接）。成功后保存凭据并进入长轮询。
 * @param options.onStatus - 状态变化回调（qr_ready 时携带二维码 URL）
 * @param options.onLoginSuccess - 登录成功回调（凭据交回宿主持久化）
 * @param options.onMessage - 入站消息回调
 * @param options.persist - 持久化回调集合
 */
export function loginWithQR({ onStatus, onLoginSuccess, onMessage, persist }) {
  if (status === 'connected') return
  stopConnector()
  lastError = ''
  client = new WeChatClient()
  status = 'qr_pending'
  onStatus?.(getState())
  console.log('[微信桥] 未找到已保存凭证，开始扫码登录...')

  client.login({
    onQRCode(url) {
      currentQrUrl = url
      status = 'qr_ready'
      console.log('[微信桥] 二维码已就绪，请在设置页扫码')
      onStatus?.(getState())
    },
  }).then((result) => {
    currentQrUrl = null
    // 库的 login() 在超时/取消等情况下不会 reject，而是 resolve 一个
    // { connected: false, message }——必须显式检查 connected 字段（同类教训）
    if (!result?.connected || !result?.accountId || !result?.botToken) {
      status = 'idle'
      lastError = result?.message || '未知原因'
      console.warn(`[微信桥] 扫码登录未完成: ${lastError}`)
      onStatus?.(getState())
      return
    }
    console.log('[微信桥] 扫码登录成功，已保存凭证')
    onLoginSuccess?.({
      accountId: result.accountId,
      botToken: result.botToken,
      baseUrl: result.baseUrl || '',
    })
    // 登录成功后立即进入长轮询（复用已存凭据的启动路径）
    startWithCredentials({
      credentials: { accountId: result.accountId, botToken: result.botToken, baseUrl: result.baseUrl },
      persist,
      onMessage,
      onStatus,
    })
  }).catch((err) => {
    status = 'error'
    lastError = err?.message ?? String(err)
    console.error(`[微信桥] 扫码登录失败: ${lastError}`)
    onStatus?.(getState())
  })
}

/**
 * 提取入站文本：只处理 USER 消息（1 对 1 私聊），文本用库的静态方法提取。
 * @returns { ok, userId, text, hasMedia, contextToken } 或 { ok:false }
 */
export function parseInbound(msg) {
  if (!msg) return { ok: false }
  if (msg.message_type != null && Number(msg.message_type) !== MessageType.USER) return { ok: false }
  const userId = String(msg.from_user_id || '').trim()
  if (!userId) return { ok: false }
  const text = String(WeChatClient.extractText?.(msg) ?? '').trim()
  // 检测媒体条目（本轮不下载媒体，仅提示）
  const items = Array.isArray(msg.item_list) ? msg.item_list : []
  const hasMedia = items.some((item) => WeChatClient.isMediaItem?.(item))
  return { ok: true, userId, text, hasMedia, contextToken: String(msg.context_token || '') }
}

/** 给指定微信用户回复文本（自动追加署名）。 */
export async function sendReply(userId, text, signature) {
  if (!client || status !== 'connected') throw new Error('微信未连接，无法回复')
  const body = signature && !String(text).includes(signature)
    ? `${text}\n\n${signature}`
    : String(text)
  await client.sendText(userId, body)
  return body
}
