/**
 * dsh-vision-router — 自动视觉路由（宿主插件，自研证据转写）。
 *
 * 目标：贴图/发图时自动"看"图，用户零操作、
 * 会话模型不切换——图片先由视觉模型转成文字证据，主模型基于证据作答。
 *
 * 挂载点：agent/pre-step 瀑布（在 next() 之后改写即将进入步骤的消息）。
 *
 * 视觉后端：火山方舟 doubao-seed-2-1-pro（OpenAI 兼容），
 * 关思考后单图实测约 6 秒；凭据经 ctx.credentials 按次解析
 * （.credentials.yaml 的 ARK_API_KEY，绝无硬编码）。
 * 证据按 attachmentId 缓存：同一张图在后续回合的上下文里不再重复转写。
 *
 * 失败策略：转写失败降级为说明性文本块，绝不吞掉用户的步骤。
 */

export const name = 'dsh-vision-router'
export const inject = ['llm']

// ---- 可配置常量（loader 行 config 可覆盖） -----------------------------------
const DEFAULTS = {
  endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  model: 'doubao-seed-2-1-pro-260628',
  credentialRef: 'ARK_API_KEY',
  prompt: '详细描述这张图片：逐字转录所有可见文字，概括布局与内容。用中文回答。',
}

/** 图片证据缓存：attachmentId → 转写文本（跨回合复用）。 */
const evidenceCache = new Map()

/** 判断一条消息的内容块里是否包含图片。 */
function contentHasImage(content) {
  return Array.isArray(content) && content.some((block) => block?.type === 'image')
}

export function apply(ctx, rawConfig = {}) {
  const config = { ...DEFAULTS, ...(rawConfig || {}) }

  /**
   * 把一张图片内容块转成文字证据块。
   * 流程：attachments 服务读字节 → base64 → 方舟视觉模型（关思考）→ 文本。
   * 永不抛出：失败返回带原因的说明性文本块。
   */
  async function imageEvidence(block, signal) {
    const attachmentId = block?.attachment?.attachmentId
    if (attachmentId && evidenceCache.has(attachmentId)) {
      return evidenceCache.get(attachmentId)
    }
    try {
      const attachments = ctx.get('attachments')
      if (typeof attachments?.readImage !== 'function') {
        return '[图片读取服务不可用，无法转写]'
      }
      // 附件服务返回 { ref, data }：字节按引用校验后给出
      const stored = await attachments.readImage(block.attachment, signal)
      if (!stored?.data) {
        return '[图片数据不可用，无法转写]'
      }
      const mediaType = stored.ref?.mediaType || block.attachment?.mediaType || 'image/png'
      const base64 = Buffer.from(stored.data).toString('base64')

      // 凭据按次解析（改密后下一次操作即生效）
      const credentials = ctx.get('credentials')
      const resolved = typeof credentials?.resolve === 'function'
        ? await credentials.resolve(config.credentialRef)
        : undefined
      if (!resolved?.value) {
        return '[视觉模型凭据未配置（缺少 ARK_API_KEY）]'
      }

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resolved.value}`,
        },
        body: JSON.stringify({
          model: config.model,
          thinking: { type: 'disabled' }, // 关思考：实测 90s+ → 约 6s
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: config.prompt },
              { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
            ],
          }],
        }),
        signal,
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        return `[视觉模型请求失败 ${response.status}: ${detail.slice(0, 200)}]`
      }
      const json = await response.json()
      const text = json?.choices?.[0]?.message?.content
      if (typeof text !== 'string' || !text.trim()) {
        return '[视觉模型返回为空]'
      }
      const evidence = `[用户发送的图片内容（视觉模型转写）]\n${text.trim()}`
      if (attachmentId) evidenceCache.set(attachmentId, evidence)
      return evidence
    } catch (error) {
      return `[图片转写失败：${error?.message ?? error}]`
    }
  }

  /** 把消息列表中的图片块全部替换为文字证据块（其余原样保留）。 */
  async function convertMessages(messages, signal) {
    const out = []
    for (const message of messages) {
      if (!contentHasImage(message?.content)) {
        out.push(message)
        continue
      }
      const content = []
      for (const block of message.content) {
        if (block?.type === 'image') {
          content.push({ type: 'text', text: await imageEvidence(block, signal) })
        } else {
          content.push(block)
        }
      }
      out.push({ ...message, content })
    }
    return out
  }

  // 图片自动转写：在步骤即将进入前改写消息集
  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (decision?.kind !== 'enter') return decision
    if (!Array.isArray(decision.messages) || !decision.messages.some((m) => contentHasImage(m?.content))) {
      return decision
    }
    const messages = await convertMessages(decision.messages, payload.signal)
    return { ...decision, kind: 'enter', messages }
  })

  console.log(`[视觉路由] 已就绪：图片将自动经 ${config.model} 转写为文字证据`)
}
