/**
 * dsh-session-title-suffix — 宿主半：会话标题自动规范化。
 *
 * 命名规范（用户拍板）：所有会话标题统一「任务描述(AI名)」，
 * 半角括号、中间无空格。本插件监听全局 session/event 事件流里的
 * session/title 事件，为自动生成（LLM provider / fallback）的标题
 * 按会话预设映射追加 AI 名后缀；用户手动改名的（source=user）与
 * 未知预设一律不动，不猜。映射表由 profile 补丁 config.suffixes 提供，
 * 代码本身不含任何具体人名/路径（公开仓安全）。
 *
 * 实现要点：session/event 在 session.append 发布期间同步触发，
 * 监听器内直接调用 sessionTitle.rename 会重入 append 而被拒
 * （"session append cannot reenter while another append is being
 * published"），因此改名必须延后到本次发布完成之后执行。
 */

export const name = 'dsh-session-title-suffix'
export const inject = ['sessionTitle']

/** 标题字节预算缺省值（与 base bundle 的 sessionTitle.maxTitleBytes 一致）。 */
const DEFAULT_MAX_TITLE_BYTES = 80

function byteLength(text) {
  return Buffer.byteLength(String(text), 'utf8')
}

/** UTF-8 安全截断：保留前导码点，不切断半个字符。 */
function truncateUtf8(text, maxBytes) {
  const source = String(text)
  if (byteLength(source) <= maxBytes) return source
  let used = 0
  let out = ''
  for (const character of source) {
    const size = byteLength(character)
    if (used + size > maxBytes) break
    out += character
    used += size
  }
  return out
}

/** 全角括号统一转半角（命名规范：括号一律半角）。 */
function toHalfWidthParens(text) {
  return String(text).replaceAll('（', '(').replaceAll('）', ')')
}

/**
 * 规范化一个自动生成的标题。
 * @returns 规范化结果；与输入一致时表示无需改动。
 */
function normalizeTitle(raw, suffix, suffixMarkers, maxBytes) {
  const title = toHalfWidthParens(raw).trim()
  const marker = `(${suffix})`
  if (title.endsWith(marker)) return title
  // 已带其它已知 AI 名后缀 → 不重复追加（预设与后缀不一致留给用户处理）
  for (const known of suffixMarkers) {
    if (known !== marker && title.endsWith(known)) return title
  }
  // 任务描述部分为后缀让出字节空间，保证后缀完整落在预算内
  const budget = Math.max(0, maxBytes - byteLength(marker))
  const description = truncateUtf8(title, budget).trimEnd()
  return description + marker
}

/** 延后执行：避开 append 发布期的重入保护（setImmediate 不可用时退 setTimeout）。 */
function defer(callback) {
  if (typeof setImmediate === 'function') setImmediate(callback)
  else setTimeout(callback, 0)
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ suffixes?: Record<string, string>, maxTitleBytes?: number }} config
 */
export function apply(ctx, config = {}) {
  const suffixes = config?.suffixes
  if (suffixes === null || typeof suffixes !== 'object') return
  const entries = Object.entries(suffixes).filter(
    ([, value]) => typeof value === 'string' && value !== ''
  )
  if (entries.length === 0) return
  const maxBytes = Number.isInteger(config?.maxTitleBytes) && config.maxTitleBytes > 0
    ? config.maxTitleBytes
    : DEFAULT_MAX_TITLE_BYTES
  const markers = entries.map(([, value]) => `(${value})`)

  ctx.effect(() => {
    const stop = ctx.on('session/event', (session, event) => {
      if (event?.type !== 'session/title') return
      const data = event?.data
      if (data === null || typeof data !== 'object') return
      // 用户手动改名 → 尊重用户输入，不处理
      if (data?.source?.kind === 'user') return
      const preset = session?.header?.agentPreset
      if (typeof preset !== 'string') return
      const suffix = suffixes[preset]
      if (typeof suffix !== 'string' || suffix === '') return
      const current = typeof data?.title === 'string' ? data.title : ''
      if (current === '') return
      const target = normalizeTitle(current, suffix, markers, maxBytes)
      if (target === current) return
      defer(() => {
        try {
          ctx.sessionTitle.rename(session, target)
        } catch {
          // 会话竞态（已卸载/不在线等）→ 忽略；下一次标题事件会再补
        }
      })
    })
    return () => stop()
  }, 'session-title-suffix: watch session/title')
}
