/**
 * 图标生成脚本：把官方前端的 favicon.svg 渲染成桌面图标
 *
 * 来源：官方仓库 apps/web/public/favicon.svg（本工程已拷贝到 assets/favicon.svg）。
 *
 * 流程：
 *   1. 用 Electron 无头渲染（透明背景）把 SVG 按各尺寸栅格化为 PNG；
 *   2. 手工拼装 ICO 容器（ICO 支持内嵌 PNG，Windows Vista+ 均可识别），
 *      输出 build/icon.ico（窗口/任务栏/安装包图标）与 build/icon.png（备用）。
 *
 * 运行方式：npm run make-icon （即 electron scripts/make-icon.mjs）
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'assets', 'favicon.svg');
const OUT_DIR = path.join(ROOT, 'build');
// 需要生成的各尺寸（Windows 图标标准尺寸集合）
const SIZES = [16, 24, 32, 48, 64, 128, 256];
// 渲染用临时页面：把 SVG 撑满整个窗口、背景透明（保留官方 logo 的透明通道）
const WRAPPER_PATH = path.join(ROOT, 'assets', '_icon-render.html');

/** 生成渲染用的临时 HTML（<img> 撑满窗口） */
function writeWrapperHtml() {
  const svgUri = pathToFileURL(SVG_PATH).href;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:transparent">
<img src="${svgUri}" style="width:100vw;height:100vh;display:block">
</body></html>`;
  fs.writeFileSync(WRAPPER_PATH, html, 'utf8');
}

/** 等待若干毫秒 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 在同一个透明无头窗口中依次渲染所有尺寸：
 * 复用窗口 + 调整尺寸，避免反复建窗/销毁引发的加载竞态。
 * @returns [[尺寸, PNG 数据], ...]
 */
async function renderAllSizes() {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,          // 无头：不显示窗口
    frame: false,
    transparent: true,    // 透明背景 → 抓图时保留 alpha 通道
    webPreferences: { offscreen: true },
  });

  // 加载一次包装页；失败时重试 3 次
  let loaded = false;
  for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
    try {
      await win.loadURL(pathToFileURL(WRAPPER_PATH).href);
      loaded = true;
    } catch {
      await delay(500);
    }
  }
  if (!loaded) throw new Error('包装页面加载失败（3 次重试后放弃）');
  // 等待图片解码与首帧渲染稳定
  await delay(800);

  const results = [];
  for (const size of SIZES) {
    win.setSize(size, size);
    await delay(300); // 等待窗口缩放后的重绘
    const image = await win.webContents.capturePage();
    results.push([size, image.toPNG()]);
  }
  win.destroy();
  return results;
}

/**
 * 把若干 [尺寸, PNG] 拼装为 ICO 文件
 * ICO 容器格式：6 字节文件头 + 每图 16 字节目录项 + 依次拼接的图像数据。
 * 图像数据直接使用 PNG（ICO 规范允许，Windows 7+ 全部支持）。
 */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);                // 保留字段，必须为 0
  header.writeUInt16LE(1, 2);                // 类型：1 = 图标
  header.writeUInt16LE(entries.length, 4);   // 图像数量

  let offset = 6 + 16 * entries.length;      // 第一个图像数据区的偏移
  const dirEntries = [];
  const imageDatas = [];
  for (const [size, png] of entries) {
    const dim = size >= 256 ? 0 : size;      // ICO 约定：256 记作 0
    const dir = Buffer.alloc(16);
    dir.writeUInt8(dim, 0);                  // 宽
    dir.writeUInt8(dim, 1);                  // 高
    dir.writeUInt8(0, 2);                    // 调色板颜色数（PNG 内嵌时为 0）
    dir.writeUInt8(0, 3);                    // 保留
    dir.writeUInt16LE(1, 4);                 // 色彩平面数
    dir.writeUInt16LE(32, 6);                // 位深
    dir.writeUInt32LE(png.length, 8);        // 图像数据字节数
    dir.writeUInt32LE(offset, 12);           // 图像数据偏移
    dirEntries.push(dir);
    imageDatas.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...dirEntries, ...imageDatas]);
}

// ---- 主流程 --------------------------------------------------------------
app.whenReady().then(async () => {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    writeWrapperHtml();
    const entries = await renderAllSizes();
    for (const [size, png] of entries) {
      console.log(`[make-icon] 已渲染 ${size}x${size} PNG（${png.length} 字节）`);
    }
    // 输出 .ico（窗口/任务栏/安装包用）与 256 尺寸 .png（备用）
    fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), buildIco(entries));
    fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), entries[entries.length - 1][1]);
    console.log('[make-icon] 已生成 build/icon.ico 与 build/icon.png');
  } catch (error) {
    console.error('[make-icon] 失败：', error);
    app.exit(1);
    return;
  }
  // 清理临时渲染页面后正常退出
  fs.rmSync(WRAPPER_PATH, { force: true });
  app.exit(0);
});
