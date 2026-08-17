/**
 * 临时脚本：向微信用户发送一条通知消息。
 *
 * 原理：读取桥接插件落盘的凭据（botToken/accountId/baseUrl）与
 * context_token，构造一个只发送不轮询的 WeChatClient 实例，
 * 调用 sendText 直接投递——不与正在运行的长轮询冲突。
 *
 * 用法：node scripts/notify-wechat.mjs <接收人userId> <文本内容>
 * 说明：与桥接插件同款的 apiFetch 补丁，业务失败（ret≠0）会显式报错。
 */
import { WeChatClient } from '../vendor/wechat-ilink-client/dist/index.mjs'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// ---- 读取参数与凭据 --------------------------------------------------------
const to = process.argv[2]
const text = process.argv[3]
if (!to || !text) {
  console.error('用法: node scripts/notify-wechat.mjs <接收人userId> <文本内容>')
  process.exit(1)
}

const home = process.env.DSH_HOME || join(homedir(), '.dsh')
const cfg = JSON.parse(readFileSync(join(home, 'storages', 'social-bridge', 'config.json'), 'utf8'))
const w = cfg?.wechat
if (!w?.botToken || !w?.accountId) {
  console.error('未找到已保存的微信桥接凭据（请先在设置页扫码登录）')
  process.exit(1)
}

// ---- 构造一次性客户端（只发送，不启动长轮询） -------------------------------
const client = new WeChatClient({
  accountId: w.accountId,
  token: w.botToken,
  baseUrl: w.baseUrl || undefined,
})

// 与桥接插件同款补丁：sendmessage 端点 HTTP 200 但 ret≠0 时显式抛错，
// 否则库会把业务失败当成功吞掉
const rawFetch = client.api.apiFetch.bind(client.api)
client.api.apiFetch = async (params) => {
  const rawText = await rawFetch(params)
  if (params?.endpoint === 'ilink/bot/sendmessage') {
    let body = null
    try { body = JSON.parse(rawText) } catch { /* 非 JSON 响应按原样放行 */ }
    if (body && typeof body === 'object') {
      const ret = body.ret ?? body.code ?? body.errcode
      if (ret != null && ret !== 0) {
        const errMsg = body.err_msg || body.errmsg || body.message || body.msg || ''
        throw new Error(`iLink sendmessage rejected: ret=${ret} ${errMsg}`)
      }
    }
  }
  return rawText
}

// ---- 发送（显式传入已持久化的 context_token） --------------------------------
const token = w.contextTokens?.[to] || ''
try {
  await client.sendText(to, text, token || undefined)
  console.log(`已发送给 ${to}`)
} catch (err) {
  console.error('发送失败: ' + (err?.message ?? String(err)))
  process.exit(1)
}
