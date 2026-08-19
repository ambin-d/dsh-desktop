/**
 * 临时脚本：向微信用户发送一个文件（走 sendMedia，自动路由 MIME）。
 * 用法：node scripts/send-file-wechat.mjs <接收人userId> <文件路径> [说明文字]
 */
import { WeChatClient } from '../vendor/wechat-ilink-client/dist/index.mjs'
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const to = process.argv[2]
const filePath = resolve(process.argv[3])
const caption = process.argv[4] || ''
if (!to || !filePath || !existsSync(filePath)) {
  console.error('用法: node scripts/send-file-wechat.mjs <接收人userId> <文件路径> [说明文字]')
  process.exit(1)
}

const home = process.env.DSH_HOME || join(homedir(), '.dsh')
const cfg = JSON.parse(readFileSync(join(home, 'storages', 'social-bridge', 'config.json'), 'utf8'))
const w = cfg?.wechat
if (!w?.botToken || !w?.accountId) {
  console.error('未找到已保存的微信桥接凭据')
  process.exit(1)
}

const client = new WeChatClient({
  accountId: w.accountId,
  token: w.botToken,
  baseUrl: w.baseUrl || undefined,
})

const rawFetch = client.api.apiFetch.bind(client.api)
client.api.apiFetch = async (params) => {
  const rawText = await rawFetch(params)
  if (params?.endpoint === 'ilink/bot/sendmessage') {
    let body = null
    try { body = JSON.parse(rawText) } catch { /* 非 JSON 按原样放行 */ }
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

const token = w.contextTokens?.[to] || ''
try {
  await client.sendMedia(to, filePath, caption || undefined, token || undefined)
  console.log(`已发送文件给 ${to}: ${filePath}`)
} catch (err) {
  console.error('发送失败: ' + (err?.message ?? String(err)))
  process.exit(1)
}
