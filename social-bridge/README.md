# dsh-social-bridge — 社交渠道桥接插件

在官方设置页新增「社交渠道桥接」分组：

- **微信（iLink/OpenClaw 通道）**：真实桥接——二维码扫码登录、长轮询收消息、
  机制说明见 lib/wechat.js（wechat-ilink-client 库，iLink 协议独立实现）；署名可选
  （默认不署名，仅多 AI 协作同一账号时设置）；
- Telegram（Bot API）/ 飞书（官方 API）/ 钉钉（官方 API）/ WhatsApp（Baileys）：
  占位配置卡片（本轮不接真实 SDK）。

## 结构

```
social-bridge/
├── package.json          # 包清单：dsh.client 清单 + dsh.bundle.patch 声明
├── cordis.patch.yml      # bundle patch：把宿主行插入 profile 插件名单
├── lib/
│   ├── index.js          # 宿主半：配置持久化 + 消息流对接 + /social-bridge Web API
│   ├── wechat.js         # 微信连接器（iLink：登录/长轮询/游标/context_token/apiFetch 补丁）
│   └── client.js         # 客户端半：构建产物（window.__ModuleLoader__ 线上格式）
├── scripts/build.mjs     # esbuild 构建（esbuild 取自 DSH 仓库）
├── src/client/
│   ├── index.tsx         # 设置页：微信桥卡片（登录/QR/状态/断开/检查连接）+ 四张占位卡片
│   └── styles.css        # 仅使用官方 --dsw-alias-* 色板令牌，不设字体
└── tsconfig.json
```

## 微信接入机制

| 环节 | 实现 |
|---|---|
| 接入方式 | iLink 协议独立实现（wechat-ilink-client v0.1.0），不 hook 微信客户端、不依赖 OpenClaw 框架、不用 WeChatFerry |
| 首次连接 | 设置页点「登录」→ 弹二维码（`client.login({ onQRCode })`）→ 微信扫码 → 保存 botToken/accountId/baseUrl 到本地 JSON |
| 凭据恢复 | 重启后直接 `new WeChatClient({ accountId, token, baseUrl })`，不再扫码 |
| 收消息 | `client.on('message')` 长轮询；`start({ loadSyncBuf, saveSyncBuf })` 游标持久化，重启续读不丢消息 |
| 发消息 | `client.sendText(to, text)`；署名可选（配置 `signature`，**默认空 = 不署名**；仅当多个 AI 协作同一账号/Agent 时才设置署名以区分说话人） |
| 消息流 | 入站 → `agent.followup` 注入现有会话（含发送者标注）；回合结束 → 助手最终回复发回微信 |
| 三个坑（已对齐） | login 超时也 resolve 必须查 `result.connected`；context_token 重启要回填（否则无法回复）；apiFetch 要拦截 HTTP 200 + ret≠0 的业务失败 |
| 范围 | 仅 1 对 1 私聊（MessageType.USER）；媒体本轮只提示不下载 |

## 状态机与持久化

- 状态：`idle 未连接 / qr_pending 生成二维码 / qr_ready 等待扫码 / connected 已连接 / error 出错`
- 持久化：`$DSH_HOME/storages/social-bridge/config.json`（原子写入：临时文件 + 改名），
  含凭据、游标、context_token 表、接收会话 id、署名文本；密钥只在文件里，代码零硬编码
- 会话过期（服务端 errcode -14）自动清凭据回未连接，错误原因显示在卡片上，不静默
- 回复发送失败记录原因并在卡片展示（最近发送失败），不静默丢消息

## 安装与构建

```powershell
# 安装依赖（wechat-ilink-client，唯一运行时依赖）
Set-Location <仓库根>\desktop\social-bridge
pnpm install

# 构建客户端包（esbuild 取自 DSH 仓库 node_modules）
node scripts/build.mjs

# 安装进 web profile（link 本地目录，离线）
dsh plugin --profile web add link:<仓库根>/desktop/social-bridge

# 重启 dsh web 宿主生效（关掉桌面窗口重开）
```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/social-bridge/api/wechat` | 微信桥完整状态（状态/二维码/账号/最近收发/错误） |
| POST | `/social-bridge/api/wechat/login` | 启用 + 发起二维码登录 |
| POST | `/social-bridge/api/wechat/logout` | 断开并清理凭据 |
| POST | `/social-bridge/api/wechat/status` | 「检查连接」刷新状态 |
| GET | `/social-bridge/api/config` | 五渠道配置与简化状态 |
| POST | `/social-bridge/api/config` | `{ channel, patch }` 保存单渠道配置 |

## 本轮明确不做

群聊（iLink 仅 1 对 1）、媒体收发、微信 hook 依赖（wcferry 等）、其他渠道真实接入。
