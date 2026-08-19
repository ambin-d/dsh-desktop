# DeepSeek Harness 桌面客户端

一个 Electron 外壳：窗口内加载的页面就是**官方 `dsh web` 服务输出的同一份页面**。
颜色、文字、logo、布局、快捷键、全部功能与官方 Web GUI **100% 一致**——因为壳不复制、
不改写任何界面，它只是给官方页面套了一个无地址栏的桌面窗口。

本目录位于官方仓库（`<仓库根>`）的 `desktop/` 下，**不加入仓库的 pnpm workspace**，
对官方仓库零侵入；宿主的运行时全部来自仓库自身（或安装包随附的官方 CLI 产物）。

## 📖 用户文档

- [安装说明](安装说明.md) —— 安装包、运行依赖、常用操作、故障排查
- [功能说明](功能说明.md) —— 桌面壳 / 长期记忆 / 微信桥 / 自动视觉 / 侧边栏快捷入口 / Lucky 预设 / 模型配置
- [更新说明](更新说明.md) —— 各版本更新内容（当前 v1.0.3）

## 目录结构

```
desktop/
├── main.js                      # Electron 主进程（全部中文注释）
├── package.json                 # 依赖与 electron-builder 打包配置
├── scripts/
│   ├── make-icon.mjs            # 图标生成：官方 favicon.svg → build/icon.ico
│   └── release.mjs              # 发布脚本：升版本号（不允许重复版本号）
├── assets/
│   └── favicon.svg              # 官方仓库 apps/web/public/favicon.svg 的原件
├── node-runtime/
│   └── node.exe                 # 随安装包分发的 Node 运行时（宿主进程用它运行）
├── build/
│   ├── icon.ico                 # 窗口 / 任务栏 / 安装包图标（npm run make-icon 生成）
│   └── icon.png                 # 256×256 备用图标
├── social-bridge/               # 插件：社交渠道桥接（微信桥 + 四渠道配置）
├── vision-router/               # 插件：自动视觉（贴图自动转写）
├── memory-evolve/               # 插件：长期记忆（五轨记忆/待办/技能）
├── dsh-sidebar-shortcuts/       # 插件：侧边栏快捷入口（内嵌插件市场 + 知识库 + 关于）
└── session-title-suffix/        # 插件：会话标题规范（「任务描述(AI名)」统一格式）
```

## 工作原理

官方 GUI 的“大脑”是 `dsh web` 这个 Node 宿主进程（负责模型路由、工具、沙箱、会话持久化），
浏览器页面只是它的一个视图。本壳据此工作：

1. **复用优先**：启动时先探测官方默认地址 `http://127.0.0.1:3080`，若已有官方实例在运行，
   直接加载它——窗口里看到的就是当前正在进行的会话，一字不差。
2. **自动兜底**：若没有实例在运行，壳用自己的 `node-runtime` 在独立端口（默认 13800）后台拉起
   `dsh web`，等它就绪后加载。宿主按以下优先级解析：
   1. 本工程捆绑的 `@deepseek-ai/dsh`（安装包随附）；
   2. 仓库构建产物 `apps/cli/lib/bin.js`；
   3. 仓库源码执行 `node --import tsx/esm apps/cli/src/bin.ts`（与仓库 `pnpm dsh` 同款）；
   4. npm 全局安装的 dsh（兜底）。
3. **完全共用**：子进程完整继承环境变量（含 `DSH_HOME`），因此会话历史、设置、插件、技能
   与官方命令行启动的实例共用同一份数据。
4. **善后**：窗口关闭时只回收自己拉起的宿主进程，复用的官方实例原样保留。

## 使用

```powershell
# 首次（在仓库根执行）：构建官方产物，一次性，约几分钟
pnpm run build

# 首次（在本目录执行）：安装依赖（Electron 使用本机缓存，基本零下载）
npm install

# 生成窗口/任务栏图标（官方 favicon 渲染）
npm run make-icon

# 启动桌面窗口
npm start
```

## 打包成安装程序（Windows）

```powershell
npm run release   # 升版本号（patch）→ 打包（用户规则：每次封装版本号必须递增）
# 或分开执行：
node scripts/release.mjs patch && npm run dist
```

产物在 `desktop\dist\`：
- `DeepSeek Harness Setup <版本号>.exe` — NSIS 安装包（向导式，可选安装目录）
- `win-unpacked\` — 免安装绿色版（直接运行 `DeepSeek Harness.exe`）

安装包特性：
- **自动创建桌面快捷方式与开始菜单快捷方式**（`shortcutName: DeepSeek Harness`）
- 安装完成自动运行（`runAfterFinish`）
- 自带 Electron 与 node-runtime（复用 `node_modules\electron\dist`，打包不再重复下载 Electron 二进制）
- 卸载入口：安装目录内的 `Uninstall DeepSeek Harness.exe` 或"设置 → 应用"

宿主解析优先级（打包安装后同样生效）：
1. 本工程捆绑的 `@deepseek-ai/dsh`（若按下方说明随附）；
2. 仓库构建产物 `apps/cli/lib/bin.js` —— 仓库根默认取自本目录上级，可用环境变量 `DSH_HARNESS_REPO` 指向其他位置；
3. 仓库源码执行（`tsx`）；
4. npm 全局安装的 dsh（兜底）。

若要让安装包在**无仓库、无全局 dsh 的机器**上也能自启宿主：先用官方 `release:pack`
产出 rc.7 CLI 闭包，`npm i file:...` 装进本工程（届时第 1 优先级生效），再重新 `npm run dist`。

## 行为对齐浏览器之处

- `F12` / `Ctrl+Shift+I`：开发者工具
- `Ctrl+R`：刷新；`F11`：全屏（与浏览器一致）
- 外部链接：交给系统浏览器打开；`window.open` 不新开 Electron 窗口
- 文件下载：弹系统“另存为”对话框
- 单实例：重复双击图标时聚焦已有窗口

## 常见问题

- **想固定使用自己的独立宿主？** 删除 main.js 中 `probe(PRIMARY_URL)` 分支，直接 `startHost(FALLBACK_PORT)`。
- **换端口？** 设置环境变量 `DSH_WEB_PORT`，或修改 main.js 顶部 `FALLBACK_PORT`。
- **窗口/任务栏图标不显示？** 先运行 `npm run make-icon` 生成 `build/icon.ico`。
- **宿主起不来？** 打开控制台看 `npm start` 输出；端口被占用时换 `DSH_WEB_PORT`；
  仓库未构建时确认 `apps/cli/lib/bin.js` 存在或已执行 `pnpm run build`。
