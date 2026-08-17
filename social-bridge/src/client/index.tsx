/**
 * dsh-social-bridge — 客户端半。
 *
 * 在官方设置页注册「社交渠道桥接」分组（settings.section）：
 *   - 微信（iLink/OpenClaw 通道）卡片：真实桥接——启用开关、连接状态、
 *     登录按钮（弹出二维码）、已连接账号信息、断开连接、检查连接、
 *     最近收发记录与错误展示；
 *   - Telegram / 飞书 / 钉钉 / WhatsApp 四张占位配置卡片（沿用上轮）。
 *
 * 数据面走宿主半的 /social-bridge/api/*：
 *   GET  /social-bridge/api/wechat          微信桥状态（每 2 秒轮询）
 *   POST /social-bridge/api/wechat/login    启用 + 发起二维码登录
 *   POST /social-bridge/api/wechat/logout   断开并清理凭据
 *   POST /social-bridge/api/wechat/status   检查连接（刷新真实状态）
 *   GET/POST /social-bridge/api/config      其余渠道配置读写
 *
 * 样式纪律：只使用官方 --dsw-alias-* 色板令牌；不设置 font-family
 * （继承官方字体栈）；类名前缀 scb-（与 memory-evolve 技能浏览器的
 * sb- 前缀刻意区分，避免同名类互相覆盖）。
 */

import { useEffect, useState } from 'react'
import type { Context } from 'cordis'
import styles from './styles.css'

export const inject = ['slots']

// ---- 其余四张占位卡片的元数据 ----------------------------------------------

/** 输入字段描述。 */
interface FieldDef {
  key: string
  label: string
  type: 'text' | 'password'
  placeholder: string
}

/** 单张卡片的静态描述。 */
interface CardDef {
  id: string
  title: string
  description: string
  /** 风险提示（仅 WhatsApp 使用）。 */
  warning?: string
  fields: FieldDef[]
}

const CARDS: CardDef[] = [
  {
    id: 'telegram',
    title: 'Telegram（Bot API）',
    description: '通过 Telegram Bot API 桥接，填入机器人 Token 即可',
    fields: [
      { key: 'token', label: 'Bot Token', type: 'password', placeholder: '123456789:AA...' },
    ],
  },
  {
    id: 'feishu',
    title: '飞书（官方 API）',
    description: '通过飞书开放平台官方 API 桥接',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', placeholder: 'cli_xxxxxxxx' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    id: 'dingtalk',
    title: '钉钉（官方 API）',
    description: '通过钉钉开放平台官方 API 桥接',
    fields: [
      { key: 'appKey', label: 'App Key', type: 'text', placeholder: 'dingxxxxxxxx' },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp（Baileys）',
    description: '通过 Baileys 桥接，输入配对码完成配对',
    warning: '存在封号风险，仅供评估',
    fields: [
      { key: 'pairingCode', label: '配对码', type: 'text', placeholder: 'XXXX-XXXX' },
    ],
  },
]

/** 状态码 → 展示文案。 */
const STATUS_TEXT: Record<string, string> = {
  connected: '已连接',
  disconnected: '未连接',
  'wechat-not-running': '微信未运行',
  unconfigured: '未配置',
  unpaired: '未配对',
  paired: '已配对',
}

/** 状态码 → 颜色语义：成功 / 警告 / 次要。 */
function statusKind(code: string): string {
  if (code === 'connected' || code === 'paired') return 'scb-status-ok'
  if (code === 'wechat-not-running' || code === 'unpaired') return 'scb-status-warn'
  return 'scb-status-muted'
}

type ChannelValues = Record<string, string | boolean>
type Channels = Record<string, ChannelValues>

// ---- 微信桥卡片 ------------------------------------------------------------

/** 微信桥状态（与宿主 GET /api/wechat 返回一致）。 */
interface WechatState {
  enabled: boolean
  status: 'idle' | 'qr_pending' | 'qr_ready' | 'connected' | 'error'
  qrUrl: string
  accountId: string
  error: string
  lastInbound: { userId: string; text: string; at: number } | null
  lastSendResult: { ok: boolean; error?: string; at: number } | null
}

/** 微信状态码 → 中文文案。 */
const WECHAT_STATUS_TEXT: Record<string, string> = {
  idle: '未连接',
  qr_pending: '正在生成二维码…',
  qr_ready: '等待扫码',
  connected: '已连接',
  error: '连接出错',
}

/** 把二维码 URL 转成可显示图片（第三方渲染服务）。 */
function qrImageUrl(qrUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`
}

/** 微信（iLink/OpenClaw 通道）卡片：登录 / QR / 状态 / 断开 / 检查连接。 */
function WechatCard(props: { enabled: boolean; onEnabledChange: (enabled: boolean) => void }) {
  const [state, setState] = useState<WechatState | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  // 每 2 秒轮询微信桥状态（二维码就绪/扫码成功/出错都会实时反映）
  useEffect(() => {
    let cancelled = false
    const poll = () => {
      void fetch('/social-bridge/api/wechat')
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data) => {
          if (!cancelled) setState(data)
        })
        .catch(() => { /* 轮询失败静默，下一轮再试 */ })
    }
    poll()
    const timer = window.setInterval(poll, 2000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  // 活跃会话列表：手机消息接收会话切换用
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([])
  const [currentSession, setCurrentSession] = useState('')
  useEffect(() => {
    let cancelled = false
    void fetch('/social-bridge/api/wechat/sessions')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (cancelled) return
        setSessions(data.sessions || [])
        setCurrentSession(data.current || '')
      })
      .catch(() => { /* 拉取会话列表失败静默 */ })
    return () => {
      cancelled = true
    }
  }, [])

  /** 切换手机消息的接收会话（持久化到宿主配置）。 */
  const switchSession = async (sessionId: string): Promise<void> => {
    setCurrentSession(sessionId)
    try {
      const res = await fetch('/social-bridge/api/wechat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok || data?.ok !== true) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setNotice(`已切换到会话：${sessions.find((s) => s.id === sessionId)?.title ?? sessionId}`)
    } catch (err) {
      setNotice(`切换失败：${err?.message ?? err}`)
    }
  }

  const post = async (path: string): Promise<void> => {
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || data?.ok !== true) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setState(data)
      if (data.status === 'qr_pending') setNotice('二维码生成中，请稍候…')
    } catch (err) {
      setNotice(`操作失败：${err?.message ?? err}`)
    } finally {
      setBusy(false)
    }
  }

  const status = state?.status ?? 'idle'
  const statusLabel = WECHAT_STATUS_TEXT[status] ?? status
  const statusClass = status === 'connected'
    ? 'scb-status-ok'
    : status === 'error'
      ? 'scb-hint-err'
      : status === 'qr_ready'
        ? 'scb-status-warn'
        : 'scb-status-muted'

  return (
    <section className="scb-card">
      <header className="scb-card-head">
        <div className="scb-card-title">
          <h3>微信（iLink/OpenClaw 通道）</h3>
          <p className="scb-card-desc">
            通过 iLink 协议连接个人微信（不 hook 微信客户端、不依赖 OpenClaw 框架），扫码登录后收发 1 对 1 私聊。
          </p>
        </div>
        <label className="scb-switch" title={props.enabled ? '停用' : '启用'}>
          <input
            type="checkbox"
            checked={props.enabled}
            onChange={(event) => props.onEnabledChange(event.target.checked)}
          />
          <span className="scb-switch-track" />
        </label>
      </header>

      {/* 连接状态行 */}
      <div className="scb-wechat-status">
        <span className={`scb-status ${statusClass}`}>{statusLabel}</span>
        {status === 'connected' && state?.accountId && (
          <span className="scb-card-desc">登录账号：{state.accountId}</span>
        )}
      </div>

      {/* 二维码区（仅等待扫码时显示） */}
      {(status === 'qr_ready' || status === 'qr_pending') && (
        <div className="scb-qr-area">
          {status === 'qr_ready' && state?.qrUrl && (
            <img className="scb-qr-img" src={qrImageUrl(state.qrUrl)} alt="微信登录二维码" />
          )}
          <p className="scb-card-desc">请用微信扫码，扫码后状态自动变为已连接</p>
        </div>
      )}

      {/* 出错原因（不静默） */}
      {status === 'error' && state?.error && (
        <p className="scb-hint-err">错误：{state.error}</p>
      )}

      {/* 接收会话切换（手机消息投递到哪个会话） */}
      {sessions.length > 0 && (
        <label className="scb-field">
          <span className="scb-field-label">手机消息接收会话</span>
          <select
            className="scb-input"
            value={currentSession}
            onChange={(event) => { void switchSession(event.target.value) }}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
      )}

      {/* 最近收发记录（验证消息流的窗口） */}
      {state?.lastInbound && (
        <p className="scb-card-desc">
          最近收到（{state.lastInbound.userId}）：{state.lastInbound.text}
        </p>
      )}
      {state?.lastSendResult && !state.lastSendResult.ok && (
        <p className="scb-hint-err">最近回复发送失败：{state.lastSendResult.error}</p>
      )}

      {notice !== '' && <p className="scb-feedback scb-hint-err">{notice}</p>}

      <footer className="scb-card-foot">
        <span className="scb-actions">
          {status !== 'connected' ? (
            <button className="scb-save" disabled={busy} onClick={() => { void post('/social-bridge/api/wechat/login') }}>
              {busy ? '处理中…' : '登录'}
            </button>
          ) : (
            <button className="scb-save scb-save-danger" disabled={busy} onClick={() => { void post('/social-bridge/api/wechat/logout') }}>
              {busy ? '处理中…' : '断开连接'}
            </button>
          )}
          <button className="scb-save scb-save-ghost" disabled={busy} onClick={() => { void post('/social-bridge/api/wechat/status') }}>
            检查连接
          </button>
        </span>
      </footer>
    </section>
  )
}

// ---- 其余四张占位卡片 ------------------------------------------------------

function ChannelCard(props: {
  card: CardDef
  values: ChannelValues | undefined
  statusCode: string
  hint: { ok: boolean; text: string } | undefined
  busy: boolean
  onChange: (patch: ChannelValues) => void
  onSave: () => void
}) {
  const { card, values, statusCode, hint, busy, onChange, onSave } = props
  const enabled = Boolean(values?.enabled)
  return (
    <section className="scb-card">
      <header className="scb-card-head">
        <div className="scb-card-title">
          <h3>{card.title}</h3>
          <p className="scb-card-desc">{card.description}</p>
          {card.warning !== undefined && <p className="scb-card-warn">{card.warning}</p>}
        </div>
        <label className="scb-switch" title={enabled ? '停用' : '启用'}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          <span className="scb-switch-track" />
        </label>
      </header>
      {card.fields.length > 0 && (
        <div className="scb-fields">
          {card.fields.map((field) => (
            <label key={field.key} className="scb-field">
              <span className="scb-field-label">{field.label}</span>
              <input
                className="scb-input"
                type={field.type}
                placeholder={field.placeholder}
                value={String(values?.[field.key] ?? '')}
                onChange={(event) => onChange({ [field.key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      )}
      {/* 保存结果反馈：独立成行，不与按钮抢位 */}
      {hint !== undefined && (
        <p className={`scb-feedback ${hint.ok ? 'scb-hint-ok' : 'scb-hint-err'}`}>{hint.text}</p>
      )}
      <footer className="scb-card-foot">
        <span className={`scb-status ${statusKind(statusCode)}`}>
          {STATUS_TEXT[statusCode] ?? statusCode}
        </span>
        <span className="scb-actions">
          <button className="scb-save" disabled={busy} onClick={onSave}>
            {busy ? '保存中…' : '保存'}
          </button>
        </span>
      </footer>
    </section>
  )
}

// ---- 设置页整页 ------------------------------------------------------------

/** 「社交渠道桥接」设置页：微信桥卡片 + 四张占位卡片。 */
function SocialBridgeSection() {
  const [channels, setChannels] = useState<Channels | null>(null)
  const [status, setStatus] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [hint, setHint] = useState<Record<string, { ok: boolean; text: string }>>({})

  // 首次挂载拉取配置与状态
  useEffect(() => {
    let cancelled = false
    void fetch('/social-bridge/api/config')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (cancelled) return
        setChannels(data.channels)
        setStatus(data.status)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 保存成功/失败提示 3 秒后自动消失
  useEffect(() => {
    if (Object.keys(hint).length === 0) return undefined
    const timer = window.setTimeout(() => setHint({}), 3000)
    return () => window.clearTimeout(timer)
  }, [hint])

  /** 更新本地草稿（单卡字段）。 */
  const patchChannel = (id: string, patch: ChannelValues): void => {
    setChannels((prev) => (prev === null ? prev : { ...prev, [id]: { ...prev[id], ...patch } }))
  }

  /** 保存单卡配置到宿主并落盘。 */
  const saveChannel = async (id: string): Promise<void> => {
    if (channels === null) return
    setBusy((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/social-bridge/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: id, patch: channels[id] }),
      })
      const data = await res.json()
      if (!res.ok || data?.ok !== true) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setHint((prev) => ({ ...prev, [id]: { ok: true, text: '保存成功' } }))
    } catch (err) {
      setHint((prev) => ({ ...prev, [id]: { ok: false, text: `保存失败：${err?.message ?? err}` } }))
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }))
    }
  }

  /** 微信启用开关：开 → 发起登录流程；关 → 断开连接。 */
  const toggleWechat = (enabled: boolean): void => {
    void fetch(`/social-bridge/api/wechat/${enabled ? 'login' : 'logout'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => { /* 失败由微信卡片自身轮询状态展示 */ })
  }

  return (
    <div className="scb-root">
      <h2 className="scb-heading">社交渠道桥接</h2>
      <p className="scb-intro">
        配置各社交渠道的桥接参数。密钥仅保存在本机用户数据目录的 JSON 文件中，不出现在代码与日志里。
      </p>
      {error !== '' && <p className="scb-error">加载配置失败：{error}</p>}

      {/* 微信（iLink/OpenClaw 通道）：真实桥接 */}
      <WechatCard
        enabled={Boolean(channels?.wechat?.enabled)}
        onEnabledChange={toggleWechat}
      />

      {/* 其余四张占位卡片（恢复单列排版） */}
      {channels !== null &&
        CARDS.map((card) => (
          <ChannelCard
            key={card.id}
            card={card}
            values={channels[card.id]}
            statusCode={status[card.id] ?? 'unconfigured'}
            hint={hint[card.id]}
            busy={busy[card.id] === true}
            onChange={(patch) => patchChannel(card.id, patch)}
            onSave={() => {
              void saveChannel(card.id)
            }}
          />
        ))}
    </div>
  )
}

// ---- 插件入口 --------------------------------------------------------------

/** 客户端插件运行期上下文（slots 由客户端运行时注入，类型声明最小化）。 */
interface SocialBridgeHost {
  slots: {
    inject: (name: string, callback: () => void) => void
    register: (options: unknown, render: () => unknown) => unknown
  }
}

/**
 * 客户端插件入口：
 *   1. 注入本插件样式（--dsw-* 色板，不设字体，随插件卸载移除）；
 *   2. 向官方设置页注册「社交渠道桥接」分组（settings.section，
 *      id 全新不占用官方条目，order 25 排在「Agent 预设」之后）。
 */
export function apply(ctx: Context): void {
  // 样式注入：构建时 CSS 以文本内联，这里写入 <style> 标签
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const tag = document.createElement('style')
    tag.dataset.socialBridgeCss = '1'
    tag.textContent = styles
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'dsh-social-bridge: stylesheet')

  const { slots } = ctx as unknown as SocialBridgeHost
  slots.inject('settings.section', () =>
    slots.register(
      { name: 'settings.section', id: 'social-bridge', order: 25, label: '社交渠道桥接' },
      () => SocialBridgeSection(),
    ),
  )
}
