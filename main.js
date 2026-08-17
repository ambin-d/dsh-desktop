/**
 * DeepSeek Harness 桌面客户端外壳（Electron 主进程）
 *
 * 设计原则：界面与官方 Web GUI 100% 一致。
 * 本壳不复制、不改写任何官方界面 —— 窗口里加载的页面就是官方 dsh web 服务
 * 输出的同一份页面（同一个 DSH_HOME、同一个宿主进程体系），颜色、文字、logo、
 * 布局、快捷键全部来自官方前端本身。
 *
 * 宿主（“大脑”）解析顺序（见 resolveHostInvocation）：
 *   1. 本工程捆绑的 @deepseek-ai/dsh（官方 release:pack 产物，打包安装包时随附）；
 *   2. 本仓库构建产物 apps/cli/lib/bin.js（pnpm run build 之后）；
 *   3. 本仓库源码执行（node --import tsx/esm apps/cli/src/bin.ts，与仓库 pnpm dsh 同款）；
 *   4. npm 全局安装的 dsh（兜底）。
 *
 * 本壳只负责三件事：
 *   1. 找到一个可用的官方服务：优先复用已在运行的官方实例（127.0.0.1:3080），
 *      没有则在后台拉起一个自己的 dsh web 宿主（独立端口 13800）；
 *   2. 开一个无地址栏的桌面窗口加载它；
 *   3. 窗口关闭时回收自己拉起的宿主进程（绝不误杀复用的官方实例）。
 */

import { app, BrowserWindow, dialog, shell } from 'electron';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 解析官方仓库根目录：
 * 开发时本工程位于仓库根的 desktop/ 下（仓库根 = 上级目录）；
 * 打包安装后 __dirname 落在 asar 内，改为按以下顺序探测磁盘上的仓库：
 *   1. 环境变量 DSH_HARNESS_REPO 指定的路径；
 *   2. 常见位置（仓库根）；
 *   3. 兜底回到 asar 上级（仅开发布局有效）。
 */
function resolveRepoRoot() {
  const candidates = [process.env.DSH_HARNESS_REPO];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const builtBin = path.join(candidate, 'apps', 'cli', 'lib', 'bin.js');
    const srcBin = path.join(candidate, 'apps', 'cli', 'src', 'bin.ts');
    if (fs.existsSync(builtBin) || fs.existsSync(srcBin)) return candidate;
  }
  return path.resolve(__dirname, '..');
}
const REPO_ROOT = resolveRepoRoot();

// ---- 运行参数 ------------------------------------------------------------
// 官方默认地址：先探测它，若已有官方实例在运行则直接复用（所见即当前会话）
const PRIMARY_URL = 'http://127.0.0.1:3080';
// 自启宿主使用的独立端口（避开官方默认 3080，避免与正在运行的实例冲突）
const FALLBACK_PORT = process.env.DSH_WEB_PORT || '13800';
const FALLBACK_URL = `http://127.0.0.1:${FALLBACK_PORT}`;
// 宿主启动等待上限（毫秒）
const HOST_READY_TIMEOUT_MS = 30_000;

let mainWindow = null; // 主窗口引用（单实例模式下第二次启动时聚焦用）
let dshChild = null;   // 自己拉起的 dsh web 子进程（复用官方实例时为 null）
let loadedUrl = null;  // 本次窗口实际加载的官方地址

// ---- 工具函数 ------------------------------------------------------------

/** 查找 Node 运行时：打包后优先用安装包自带的 node-runtime，开发时退回系统 node */
function resolveNode() {
  const bundled = path.join(process.resourcesPath, 'node-runtime', 'node.exe');
  return fs.existsSync(bundled) ? bundled : 'node';
}

/**
 * 解析宿主的启动方式，返回 { nodeArgs, bin, cwd }。
 * 优先级：捆绑依赖 → 仓库构建产物 → 仓库源码执行 → npm 全局安装。
 */
function resolveHostInvocation() {
  // 1. 本工程捆绑的官方 CLI（安装包随附的 @deepseek-ai/dsh 依赖）
  try {
    return { nodeArgs: [], bin: require.resolve('@deepseek-ai/dsh/lib/bin.js'), cwd: homedir() };
  } catch { /* 未捆绑，继续向下 */ }
  // 2. 本仓库构建产物（apps/cli/lib/bin.js）
  const builtBin = path.join(REPO_ROOT, 'apps', 'cli', 'lib', 'bin.js');
  if (fs.existsSync(builtBin)) {
    return { nodeArgs: [], bin: builtBin, cwd: REPO_ROOT };
  }
  // 3. 本仓库源码执行（与仓库自带的 `pnpm dsh` 同款；依赖由仓库 node_modules 解析）
  const srcBin = path.join(REPO_ROOT, 'apps', 'cli', 'src', 'bin.ts');
  if (fs.existsSync(srcBin)) {
    return { nodeArgs: ['--import', 'tsx/esm'], bin: srcBin, cwd: REPO_ROOT };
  }
  // 4. npm 全局安装的 dsh（兜底）
  const globalBin = path.join(
    process.env.APPDATA ?? '',
    'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js',
  );
  return { nodeArgs: [], bin: globalBin, cwd: homedir() };
}

/** 探测一个地址是否已经可访问（官方页面会返回 200） */
async function probe(url, timeoutMs = 2_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (res.ok) return true;
    } catch {
      // 服务尚未就绪，继续重试
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

/** 后台拉起一个 dsh web 宿主，并等待它就绪 */
async function startHost(port) {
  const { nodeArgs, bin, cwd } = resolveHostInvocation();
  dshChild = spawn(resolveNode(), [...nodeArgs, bin, 'web', '--port', port], {
    cwd,                                         // 官方 CLI 习惯：在仓库根/主目录下运行
    stdio: ['ignore', 'inherit', 'inherit'],     // 宿主日志透传到本进程控制台
    env: { ...process.env },                     // 完整继承环境（含 DSH_HOME）→ 会话/设置/插件与官方共用
    windowsHide: true,                           // 不弹子进程控制台黑窗
  });

  // 记录退出原因；正常退出由本壳在退出时触发 kill，此处仅作日志
  dshChild.on('exit', (code) => {
    dshChild = null;
    if (code !== null && code !== 0) {
      console.error(`[dsh-desktop] dsh web 宿主异常退出，退出码 ${code}`);
    }
  });

  const deadline = Date.now() + HOST_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await probe(FALLBACK_URL, 1_500)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`dsh web 宿主未在 ${HOST_READY_TIMEOUT_MS}ms 内就绪（端口 ${port}）`);
}

// ---- 窗口 ----------------------------------------------------------------

/** 创建主窗口并加载官方页面 */
async function openWindow(targetUrl) {
  loadedUrl = targetUrl;
  const iconPath = path.join(__dirname, 'build', 'icon.ico');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: 'DeepSeek Harness', // 与官方页面 <title> 完全一致
    autoHideMenuBar: true,     // 隐藏菜单栏；快捷键（Ctrl+R / F11 / Ctrl+Shift+I 等）仍可用，与浏览器一致
    // 窗口与任务栏图标：由官方 favicon.svg 生成的 icon.ico（见 scripts/make-icon.mjs）
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      contextIsolation: true,  // 渲染进程与 Node 隔离（官方页面本就不依赖 Node 能力）
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // 页面用 window.open 打开的新窗口：一律交给系统浏览器，保持“外部链接外部开”
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 阻止当前窗口被导航到官方地址之外（如误拖拽文件到窗口），外部链接转交系统浏览器
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(targetUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // 下载行为对齐浏览器：弹出系统“另存为”对话框
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    dialog.showSaveDialog(mainWindow, {
      title: '保存文件',
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
    }).then(({ filePath, canceled }) => {
      if (canceled || !filePath) {
        item.cancel();
        return;
      }
      item.setSavePath(filePath);
    }).catch(() => item.cancel());
  });

  // F12 打开/关闭开发者工具（与浏览器 F12 行为一致）
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(targetUrl);
}

// ---- 应用生命周期 --------------------------------------------------------

// 单实例锁：重复双击图标时聚焦已有窗口，而不是再开一套宿主
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Windows 通知与任务栏分组标识（桌面应用最佳实践）
    app.setAppUserModelId('local.deepseek-harness.desktop');
    try {
      // 优先复用官方实例 → 100% 原会话；没有则自启宿主
      if (await probe(PRIMARY_URL)) {
        await openWindow(PRIMARY_URL);
      } else {
        await startHost(FALLBACK_PORT);
        await openWindow(FALLBACK_URL);
      }
    } catch (error) {
      dialog.showErrorBox('DeepSeek Harness 启动失败', String(error?.message ?? error));
      app.quit();
    }
  });

  // 退出时只回收自己拉起的子进程；复用的官方实例保持原样
  app.on('before-quit', () => {
    if (dshChild) {
      dshChild.kill();
      dshChild = null;
    }
  });

  // 所有窗口关闭即退出（Windows/Linux 桌面应用惯例）
  app.on('window-all-closed', () => {
    app.quit();
  });

  // macOS 惯例：点击 Dock 图标且无窗口时重新打开（保留以备跨平台使用）
  app.on('activate', () => {
    if (mainWindow === null && loadedUrl) {
      openWindow(loadedUrl).catch(console.error);
    }
  });
}
