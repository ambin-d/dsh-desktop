window.__ModuleLoader__.load({ id: "dsh-sidebar-shortcuts", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_react2 = require("react");

// src/client/styles.css
var styles_default = "/**\n * dsh-sidebar-shortcuts 样式。\n * 纪律：只用官方 --dsw-alias-* 令牌；不设 font-family；类名前缀 dss-。\n */\n\n/* ---- 侧栏左下角入口按钮（与官方设置入口同排） ----------------------------- */\n.dss-foot-btn {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  padding: 6px 8px;\n  border: none;\n  border-radius: 8px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 13px;\n  line-height: 1;\n  cursor: pointer;\n  transition: background 0.12s ease, color 0.12s ease;\n}\n\n.dss-foot-btn:hover {\n  background: rgba(128, 128, 128, 0.1);\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n\n.dss-foot-btn svg {\n  flex: none;\n  display: block;\n}\n\n.dss-foot-label {\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* ---- 居中面板（shell.overlay 帧级浮层） ------------------------------------ */\n.dss-overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 1000;\n  background: rgba(14, 20, 34, 0.45);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 24px;\n}\n\n.dss-modal {\n  width: 560px;\n  max-width: 100%;\n  max-height: 72vh;\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1, #ffffff));\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  border-radius: 12px;\n  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n\n/* 内嵌大面板：宽 1140px、高 84vh */\n.dss-modal--wide {\n  width: 1140px;\n  max-height: 84vh;\n  height: 84vh;\n}\n\n.dss-modal-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px 16px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-modal-title {\n  font-size: 15px;\n  font-weight: 600;\n}\n\n.dss-modal-close {\n  width: 28px;\n  height: 28px;\n  border: none;\n  border-radius: 8px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 18px;\n  line-height: 1;\n  cursor: pointer;\n}\n\n.dss-modal-close:hover {\n  background: rgba(128, 128, 128, 0.12);\n  color: var(--dsw-alias-label-primary, #0f1115);\n}\n\n.dss-modal-foot {\n  padding: 10px 16px;\n  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 12px;\n}\n\n/* ---- 面板骨架 -------------------------------------------------------------- */\n.dss-panel {\n  flex: 1;\n  min-height: 0;\n  display: flex;\n  flex-direction: column;\n}\n\n.dss-panel-toolbar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 10px 16px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-tabs {\n  display: flex;\n  gap: 4px;\n}\n\n.dss-tab {\n  padding: 6px 14px;\n  border: none;\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 13px;\n  font-family: inherit;\n  cursor: pointer;\n}\n\n.dss-tab--active {\n  background: rgba(77, 107, 254, 0.12);\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n}\n\n.dss-panel-search {\n  flex: 1;\n  min-width: 120px;\n}\n\n.dss-panel-body {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  padding: 12px 16px;\n}\n\n/* ---- 搜索框 ----------------------------------------------------------------- */\n.dss-search {\n  width: 100%;\n  box-sizing: border-box;\n  padding: 7px 12px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  font-size: 13px;\n  outline: none;\n}\n\n.dss-search:focus {\n  border-color: var(--dsw-alias-brand-primary, #4d6bfe);\n}\n\n/* ---- 分类筛选 ---------------------------------------------------------------- */\n.dss-cats {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding: 8px 16px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-cat {\n  padding: 3px 10px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 12px;\n  font-family: inherit;\n  cursor: pointer;\n}\n\n.dss-cat--active {\n  border-color: transparent;\n  background: rgba(77, 107, 254, 0.12);\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n}\n\n/* ---- 市场列表 ----------------------------------------------------------------- */\n.dss-mp-list {\n  display: flex;\n  flex-direction: column;\n}\n\n.dss-mp-row {\n  padding: 10px 4px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.dss-mp-row-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n}\n\n.dss-mp-name {\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n  text-decoration: none;\n  word-break: break-all;\n}\n\n.dss-mp-name:hover {\n  text-decoration: underline;\n}\n\n.dss-mp-meta {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-mp-activity {\n  white-space: nowrap;\n}\n\n.dss-mp-stars {\n  white-space: nowrap;\n}\n\n.dss-mp-desc {\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  word-break: break-word;\n}\n\n.dss-mp-actions {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n.dss-mp-stats {\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  white-space: nowrap;\n}\n\n/* ---- 标签 / 小按钮 ------------------------------------------------------------- */\n.dss-tag {\n  flex: none;\n  padding: 1px 7px;\n  border-radius: 999px;\n  background: rgba(77, 107, 254, 0.12);\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n  font-size: 11px;\n}\n\n.dss-tag-lang {\n  background: rgba(34, 197, 94, 0.12);\n  color: var(--dsw-alias-state-success-primary, #22c55e);\n}\n\n.dss-mini-btn {\n  padding: 3px 12px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 12px;\n  font-family: inherit;\n  cursor: pointer;\n}\n\n.dss-mini-btn:hover:not(:disabled) {\n  border-color: var(--dsw-alias-brand-primary, #4d6bfe);\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n}\n\n.dss-mini-btn-primary {\n  border-color: transparent;\n  background: var(--dsw-alias-brand-primary, #4d6bfe);\n  color: #ffffff;\n}\n\n.dss-mini-btn-primary:hover:not(:disabled) {\n  filter: brightness(1.08);\n  color: #ffffff;\n}\n\n.dss-mini-btn:disabled {\n  opacity: 0.5;\n  cursor: default;\n}\n\n.dss-load-more {\n  align-self: center;\n  margin: 12px 0;\n}\n\n/* ---- 已装插件列表（复用行样式） ------------------------------------------------ */\n.dss-list {\n  display: flex;\n  flex-direction: column;\n}\n\n.dss-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 8px 4px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-row:last-child {\n  border-bottom: none;\n}\n\n.dss-row-name {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 13px;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dss-row-side {\n  flex: none;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  font-size: 12px;\n}\n\n/* 已装插件操作区：全部更新工具条 + 每行更新/卸载按钮 */\n.dss-installed-tools {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 8px;\n  padding: 8px 4px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-row-actions {\n  flex: none;\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 6px;\n}\n\n.dss-mini-btn-danger {\n  border-color: var(--dsw-alias-state-error-primary, #ec1313);\n  color: var(--dsw-alias-state-error-primary, #ec1313);\n}\n\n.dss-mini-btn-danger:hover:not(:disabled) {\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #ec1313) 10%, transparent);\n}\n\n/* ---- 通用提示 ------------------------------------------------------------------- */\n.dss-muted {\n  margin: 0;\n  font-size: 13px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-hint-ok {\n  margin: 0;\n  font-size: 12px;\n  color: var(--dsw-alias-state-success-primary, #22c55e);\n  word-break: break-all;\n}\n\n.dss-hint-err {\n  margin: 0;\n  font-size: 12px;\n  color: var(--dsw-alias-state-error-primary, #ec1313);\n  word-break: break-all;\n}\n\n.dss-text-link {\n  background: none;\n  border: none;\n  padding: 0;\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n  font-size: inherit;\n  font-family: inherit;\n  text-decoration: none;\n  cursor: pointer;\n}\n\n.dss-text-link:hover {\n  text-decoration: underline;\n}\n\n.dss-text-link-btn {\n  margin-left: 10px;\n}\n\n/* ---- 知识库：双栏布局 -------------------------------------------------------------- */\n.dss-panel--kb {\n  flex-direction: row;\n  min-height: 0;\n}\n\n.dss-kb-tree {\n  width: 300px;\n  flex: none;\n  display: flex;\n  flex-direction: column;\n  border-right: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  min-height: 0;\n}\n\n.dss-kb-tree-head {\n  padding: 10px 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-kb-tree-body {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  padding: 6px;\n}\n\n.dss-tree-item {\n  display: flex;\n  flex-direction: column;\n}\n\n.dss-tree-children {\n  padding-left: 14px;\n}\n\n.dss-tree-row {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  width: 100%;\n  padding: 3px 6px;\n  border: none;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #0f1115);\n  font-size: 13px;\n  font-family: inherit;\n  text-align: left;\n  cursor: pointer;\n}\n\n.dss-tree-row:hover {\n  background: rgba(128, 128, 128, 0.08);\n}\n\n.dss-tree-row--file {\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-tree-row--selected {\n  background: rgba(77, 107, 254, 0.12);\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n}\n\n.dss-tree-caret {\n  flex: none;\n  width: 14px;\n  font-size: 10px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-tree-icon {\n  flex: none;\n  font-size: 12px;\n}\n\n.dss-tree-label {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dss-tree-loading,\n.dss-tree-error {\n  padding: 4px 8px;\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-tree-error {\n  color: var(--dsw-alias-state-error-primary, #ec1313);\n}\n\n.dss-kb-preview {\n  flex: 1;\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  min-height: 0;\n}\n\n.dss-kb-preview-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 10px 16px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n}\n\n.dss-kb-file-name {\n  font-size: 13px;\n  font-weight: 600;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dss-kb-path {\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.dss-kb-corner {\n  flex: none;\n  display: flex;\n  align-items: center;\n  font-size: 12px;\n}\n\n.dss-kb-preview-body {\n  flex: 1;\n  min-height: 0;\n  overflow-y: auto;\n  padding: 14px 20px;\n}\n\n/* ---- Markdown 预览 ----------------------------------------------------------------- */\n.dss-md {\n  font-size: 14px;\n  line-height: 1.65;\n  word-break: break-word;\n}\n\n.dss-md-h {\n  margin: 0.9em 0 0.45em;\n  line-height: 1.3;\n}\n\n.dss-md-h1 { font-size: 22px; }\n.dss-md-h2 { font-size: 18px; }\n.dss-md-h3 { font-size: 16px; }\n.dss-md-h4 { font-size: 15px; }\n.dss-md-h5 { font-size: 14px; }\n.dss-md-h6 { font-size: 13px; }\n\n.dss-md-p {\n  margin: 0.4em 0;\n}\n\n.dss-md-list {\n  margin: 0.4em 0;\n  padding-left: 1.6em;\n}\n\n.dss-md-quote {\n  margin: 0.4em 0;\n  padding: 2px 12px;\n  border-left: 3px solid var(--dsw-alias-brand-primary, #4d6bfe);\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-md-code {\n  padding: 1px 6px;\n  border-radius: 4px;\n  background: rgba(128, 128, 128, 0.14);\n  font-size: 0.9em;\n}\n\n.dss-md-pre {\n  margin: 0.5em 0;\n  padding: 10px 12px;\n  border-radius: 8px;\n  background: rgba(128, 128, 128, 0.1);\n  overflow-x: auto;\n  font-size: 13px;\n  line-height: 1.5;\n}\n\n.dss-md-pre code {\n  background: none;\n  padding: 0;\n  font-family: Consolas, 'Courier New', monospace;\n}\n\n.dss-md-table {\n  margin: 0.5em 0;\n  border-collapse: collapse;\n  font-size: 13px;\n}\n\n.dss-md-table th,\n.dss-md-table td {\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  padding: 4px 10px;\n  text-align: left;\n}\n\n.dss-md-table th {\n  background: rgba(128, 128, 128, 0.08);\n}\n\n.dss-md-hr {\n  border: none;\n  border-top: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  margin: 0.8em 0;\n}\n\n.dss-md-wiki {\n  padding: 0 4px;\n  border-radius: 4px;\n  background: rgba(77, 107, 254, 0.1);\n  color: var(--dsw-alias-brand-primary, #4d6bfe);\n}\n\n/* ---- 设置页「关于」 ------------------------------------------------------------ */\n.dss-about {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  padding: 4px 2px;\n}\n\n.dss-about-title {\n  margin: 0;\n  font-size: 17px;\n  font-weight: 600;\n}\n\n.dss-about-list {\n  display: flex;\n  flex-direction: column;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  border-radius: 10px;\n  overflow: hidden;\n}\n\n.dss-about-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding: 10px 14px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  font-size: 13px;\n}\n\n.dss-about-row:last-child {\n  border-bottom: none;\n}\n\n.dss-about-key {\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n.dss-about-value {\n  font-weight: 500;\n  text-align: right;\n  word-break: break-all;\n}\n\n/* ---- 媒体嵌入（![[wiki]] → 图片/视频/音频） ------------------------------------- */\n.dss-md-embed {\n  margin: 8px 0;\n}\n\n.dss-md-img {\n  display: block;\n  max-width: 100%;\n  max-height: 560px;\n  object-fit: contain;\n  border-radius: 8px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  cursor: zoom-in;\n  margin: 6px 0;\n}\n\n.dss-md-video {\n  display: block;\n  max-width: 100%;\n  border-radius: 8px;\n  margin: 6px 0;\n  background: #000;\n}\n\n.dss-md-audio {\n  display: block;\n  max-width: 100%;\n  margin: 6px 0;\n}\n\n.dss-md-media-note {\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary, #61666b);\n}\n\n/* 点击放大原图：全屏浮层 */\n.dss-zoom {\n  position: fixed;\n  inset: 0;\n  z-index: 1300;\n  background: rgba(0, 0, 0, 0.78);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  cursor: zoom-out;\n}\n\n.dss-zoom img {\n  max-width: 92vw;\n  max-height: 92vh;\n  object-fit: contain;\n  border-radius: 4px;\n}\n\n/* ---- PDF 预览（浏览器原生渲染） --------------------------------------------------- */\n.dss-md-pdf {\n  display: block;\n  width: 100%;\n  height: calc(100% - 8px);\n  min-height: 480px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06));\n  border-radius: 8px;\n  background: #fff;\n}\n\n/* ---- Office/WPS 文档预览 ---------------------------------------------------------- */\n.dss-office {\n  height: 100%;\n  overflow: auto;\n  font-size: 14px;\n  line-height: 1.65;\n  color: var(--dsw-alias-label-primary, #1f2329);\n}\n\n/* docx：mammoth 输出的受控 HTML */\n.dss-office-doc {\n  padding: 2px 6px;\n}\n\n.dss-office-doc table,\n.dss-office-table table {\n  border-collapse: collapse;\n  margin: 8px 0;\n  max-width: 100%;\n}\n\n.dss-office-doc th,\n.dss-office-doc td,\n.dss-office-table th,\n.dss-office-table td {\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.12));\n  padding: 5px 8px;\n  text-align: left;\n  vertical-align: top;\n  word-break: break-word;\n}\n\n.dss-office-doc img {\n  max-width: 100%;\n  border-radius: 6px;\n}\n\n.dss-office-doc h1,\n.dss-office-doc h2,\n.dss-office-doc h3 {\n  margin: 10px 0 6px;\n}\n\n.dss-office-doc p {\n  margin: 6px 0;\n}\n\n.dss-office-doc pre {\n  background: var(--dsw-alias-bg-l2, rgba(0, 0, 0, 0.04));\n  border-radius: 6px;\n  padding: 8px;\n  overflow: auto;\n}\n\n/* xlsx：表格容器 + sheet 标签 */\n.dss-office-sheet {\n  display: flex;\n  flex-direction: column;\n}\n\n.dss-office-tabs {\n  position: sticky;\n  top: 0;\n  z-index: 1;\n  display: flex;\n  gap: 4px;\n  flex-wrap: wrap;\n  padding: 6px 2px;\n  background: var(--dsw-alias-bg-l1, #fff);\n  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));\n}\n\n.dss-office-tab {\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.14));\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #61666b);\n  border-radius: 6px;\n  padding: 3px 12px;\n  font-size: 12px;\n  cursor: pointer;\n}\n\n.dss-office-tab--on {\n  background: var(--dsw-alias-brand-primary, #4d6bfe);\n  border-color: var(--dsw-alias-brand-primary, #4d6bfe);\n  color: #fff;\n}\n\n.dss-office-table {\n  padding: 8px 6px;\n  overflow: auto;\n}\n\n/* pptx：幻灯片卡片列表 */\n.dss-office-slides {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  padding: 10px 6px;\n}\n\n.dss-office-slide {\n  display: flex;\n  gap: 12px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.1));\n  border-radius: 10px;\n  padding: 12px;\n  background: var(--dsw-alias-bg-l1, #fff);\n}\n\n.dss-office-slide-no {\n  flex: none;\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: var(--dsw-alias-brand-primary, #4d6bfe);\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 14px;\n  font-weight: 600;\n}\n\n.dss-office-slide-body {\n  flex: 1;\n  min-width: 0;\n}\n\n.dss-office-slide-lines {\n  margin: 0;\n  padding-left: 20px;\n}\n\n.dss-office-slide-lines li {\n  margin: 3px 0;\n}\n\n.dss-office-slide-img {\n  display: block;\n  max-width: 100%;\n  border-radius: 8px;\n  margin-top: 8px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.08));\n}\n\n/* legacy：旧版 WPS 格式提示 */\n.dss-office-legacy {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  align-items: flex-start;\n  padding: 18px 6px;\n}\n\n.dss-office-legacy-title {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary, #1f2329);\n}\n\n/* 手机端：树/预览两栏上下堆叠，Office 预览保持可用 */\n@media (max-width: 720px) {\n  .dss-office-doc {\n    padding: 2px;\n  }\n\n  .dss-office-table {\n    padding: 6px 2px;\n  }\n\n  .dss-office-doc th,\n  .dss-office-doc td,\n  .dss-office-table th,\n  .dss-office-table td {\n    padding: 4px 5px;\n    font-size: 12px;\n  }\n\n  .dss-office-slide {\n    gap: 8px;\n    padding: 10px;\n  }\n\n  .dss-md-pdf {\n    min-height: 60vh;\n  }\n}\n";

// src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots"];
var openModalKind = null;
var modalListeners = /* @__PURE__ */ new Set();
function setOpenModal(kind) {
  openModalKind = kind;
  for (const listener of modalListeners) listener();
}
function subscribeModal(listener) {
  modalListeners.add(listener);
  return () => {
    modalListeners.delete(listener);
  };
}
function useOpenModal() {
  return (0, import_react.useSyncExternalStore)(subscribeModal, () => openModalKind, () => null);
}
function GridIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "15", height: "15", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "1.5", y: "1.5", width: "5.5", height: "5.5", rx: "1.5", stroke: "currentColor", strokeWidth: "1.3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "9", y: "1.5", width: "5.5", height: "5.5", rx: "1.5", stroke: "currentColor", strokeWidth: "1.3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "1.5", y: "9", width: "5.5", height: "5.5", rx: "1.5", stroke: "currentColor", strokeWidth: "1.3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "9", y: "9", width: "5.5", height: "5.5", rx: "1.5", stroke: "currentColor", strokeWidth: "1.3" })
  ] });
}
function BookIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "15", height: "15", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 3.8C6.8 2.9 5.1 2.8 3.2 2.8v9.4c1.9 0 3.6.1 4.8 1 1.2-.9 2.9-1 4.8-1V2.8c-1.9 0-3.6.1-4.8 1Z", stroke: "currentColor", strokeWidth: "1.3", strokeLinejoin: "round" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 3.8v9.4", stroke: "currentColor", strokeWidth: "1.3" })
  ] });
}
function FootButton({ kind, label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: "dss-foot-btn",
      onClick: () => setOpenModal(kind),
      title: label,
      children: [
        kind === "plugin-market" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GridIcon, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookIcon, {}),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-foot-label", children: label })
      ]
    }
  );
}
function ModalShell({ title, onClose, wide, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-overlay", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: wide ? "dss-modal dss-modal--wide" : "dss-modal",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title,
      onClick: (event) => event.stopPropagation(),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-modal-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-modal-title", children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-modal-close", onClick: onClose, "aria-label": "关闭", children: "×" })
        ] }),
        children
      ]
    }
  ) });
}
var PAGE_SIZE = 50;
var ACTIVITY_TEXT = {
  active: "🟢 活跃",
  inactive: "🔴 停更",
  unknown: "— 未知"
};
function MarketRow({ plugin, installState, translated, showOriginal, onInstall, onTranslate, onToggleOriginal }) {
  const desc = translated !== null && !showOriginal ? translated : plugin.description;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-mp-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-mp-row-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "dss-mp-name", href: plugin.url, target: "_blank", rel: "noopener noreferrer", title: "查看 GitHub 详情", children: plugin.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dss-mp-meta", children: [
        plugin.type ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tag", children: plugin.type }) : null,
        plugin.language ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tag dss-tag-lang", children: plugin.language }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-mp-activity", children: ACTIVITY_TEXT[plugin.activity] }),
        plugin.stars !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dss-mp-stars", children: [
          "⭐ ",
          plugin.stars
        ] }) : null
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-mp-desc", children: desc || "（无描述）" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-mp-actions", children: [
      plugin.english ? translated !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-mini-btn", onClick: onToggleOriginal, children: showOriginal ? "看译文" : "看原文" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-mini-btn", onClick: onTranslate, disabled: installState.kind === "busy", children: "翻译" }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "dss-mini-btn dss-mini-btn-primary",
          onClick: onInstall,
          disabled: !plugin.url || installState.kind === "busy",
          children: installState.kind === "busy" ? "安装中…" : "一键安装"
        }
      ),
      installState.kind === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-ok", children: "已安装，重启宿主生效" }) : null,
      installState.kind === "err" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-err", children: installState.message }) : null
    ] })
  ] });
}
function MarketPanel({ onClose }) {
  const [data, setData] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)("");
  const [category, setCategory] = (0, import_react.useState)(null);
  const [query, setQuery] = (0, import_react.useState)("");
  const [visible, setVisible] = (0, import_react.useState)(PAGE_SIZE);
  const [tab, setTab] = (0, import_react.useState)("market");
  const [installed, setInstalled] = (0, import_react.useState)(null);
  const [installedQuery, setInstalledQuery] = (0, import_react.useState)("");
  const [installStates, setInstallStates] = (0, import_react.useState)({});
  const [updateStates, setUpdateStates] = (0, import_react.useState)({});
  const [uninstallStates, setUninstallStates] = (0, import_react.useState)({});
  const [updateAllState, setUpdateAllState] = (0, import_react.useState)({ kind: "idle" });
  const [translations, setTranslations] = (0, import_react.useState)({});
  const [showOriginal, setShowOriginal] = (0, import_react.useState)({});
  const busyRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    fetch("/sidebar-shortcuts/api/market").then((res) => res.json()).then((body) => {
      if (cancelled) return;
      if (body?.ok !== true) throw new Error(body?.error ?? "读取失败");
      setData(body);
    }).catch((err) => {
      if (!cancelled) setError(err?.message ?? String(err));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const reloadInstalled = (0, import_react.useCallback)(async () => {
    try {
      const res = await fetch("/sidebar-shortcuts/api/plugins");
      const body = await res.json();
      if (body?.ok !== true) throw new Error(body?.error ?? "读取失败");
      setInstalled(body.plugins ?? []);
    } catch (err) {
      setError(err?.message ?? String(err));
    }
  }, []);
  (0, import_react.useEffect)(() => {
    if (tab !== "installed" || installed !== null) return;
    void reloadInstalled();
  }, [tab, installed, reloadInstalled]);
  const install = async (plugin) => {
    if (busyRef.current.has(plugin.name)) return;
    busyRef.current.add(plugin.name);
    setInstallStates((prev) => ({ ...prev, [plugin.name]: { kind: "busy" } }));
    try {
      const res = await fetch("/sidebar-shortcuts/api/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec: plugin.url })
      });
      const body = await res.json();
      setInstallStates((prev) => ({
        ...prev,
        [plugin.name]: body?.ok === true ? { kind: "ok" } : { kind: "err", message: `安装失败：${body?.error ?? body?.err ?? `HTTP ${res.status}`}` }
      }));
    } catch (err) {
      setInstallStates((prev) => ({ ...prev, [plugin.name]: { kind: "err", message: `安装失败：${err?.message ?? err}` } }));
    } finally {
      busyRef.current.delete(plugin.name);
    }
  };
  const translate = async (plugin) => {
    if (busyRef.current.has(`tr-${plugin.name}`)) return;
    busyRef.current.add(`tr-${plugin.name}`);
    setTranslations((prev) => ({ ...prev, [plugin.name]: "翻译中…" }));
    try {
      const res = await fetch("/sidebar-shortcuts/api/market/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plugin.description })
      });
      const body = await res.json();
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setTranslations((prev) => ({ ...prev, [plugin.name]: body.text }));
      setShowOriginal((prev) => ({ ...prev, [plugin.name]: false }));
    } catch (err) {
      setTranslations((prev) => ({ ...prev, [plugin.name]: `翻译失败：${err?.message ?? err}` }));
    } finally {
      busyRef.current.delete(`tr-${plugin.name}`);
    }
  };
  const uninstallPlugin = async (plugin) => {
    if (!window.confirm(`确定卸载插件「${plugin.name}」？将移除其依赖，重启宿主后完全生效。`)) return;
    if (busyRef.current.has(`un-${plugin.name}`)) return;
    busyRef.current.add(`un-${plugin.name}`);
    setUninstallStates((prev) => ({ ...prev, [plugin.name]: { kind: "busy" } }));
    try {
      const res = await fetch("/sidebar-shortcuts/api/plugins/uninstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: plugin.name })
      });
      const body = await res.json();
      setUninstallStates((prev) => ({
        ...prev,
        [plugin.name]: body?.ok === true ? { kind: "ok" } : { kind: "err", message: `卸载失败：${body?.error ?? body?.err ?? `HTTP ${res.status}`}` }
      }));
      if (body?.ok === true) void reloadInstalled();
    } catch (err) {
      setUninstallStates((prev) => ({ ...prev, [plugin.name]: { kind: "err", message: `卸载失败：${err?.message ?? err}` } }));
    } finally {
      busyRef.current.delete(`un-${plugin.name}`);
    }
  };
  const updatePlugin = async (plugin) => {
    if (busyRef.current.has(`up-${plugin.name}`)) return;
    busyRef.current.add(`up-${plugin.name}`);
    setUpdateStates((prev) => ({ ...prev, [plugin.name]: { kind: "busy" } }));
    try {
      const res = await fetch("/sidebar-shortcuts/api/plugins/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: plugin.name })
      });
      const body = await res.json();
      setUpdateStates((prev) => ({
        ...prev,
        [plugin.name]: body?.ok === true ? { kind: "ok" } : { kind: "err", message: `更新失败：${body?.error ?? body?.err ?? `HTTP ${res.status}`}` }
      }));
      if (body?.ok === true) void reloadInstalled();
    } catch (err) {
      setUpdateStates((prev) => ({ ...prev, [plugin.name]: { kind: "err", message: `更新失败：${err?.message ?? err}` } }));
    } finally {
      busyRef.current.delete(`up-${plugin.name}`);
    }
  };
  const updateAll = async () => {
    const candidates = (installed ?? []).filter((plugin) => !plugin.builtin);
    if (candidates.length === 0) {
      setUpdateAllState({ kind: "err", message: "没有可更新的自装插件（内置插件由桌面客户端统一管理）" });
      return;
    }
    if (!window.confirm(`将逐个更新 ${candidates.length} 个自装插件（可能耗时数分钟），确定？`)) return;
    if (updateAllState.kind === "busy") return;
    setUpdateAllState({ kind: "busy" });
    try {
      const res = await fetch("/sidebar-shortcuts/api/plugins/update-all", { method: "POST" });
      const body = await res.json();
      const failed = Array.isArray(body?.failed) ? body.failed : [];
      const succeeded = Number(body?.succeeded ?? 0);
      const total = Number(body?.total ?? candidates.length);
      if (failed.length > 0) {
        setUpdateAllState({ kind: "err", message: `全部更新完成 ${succeeded}/${total}，失败：${failed.join("、")}` });
      } else if (body?.ok === true) {
        setUpdateAllState({ kind: "ok" });
      } else {
        setUpdateAllState({ kind: "err", message: `全部更新未通过：${body?.error ?? "未知错误"}` });
      }
      void reloadInstalled();
    } catch (err) {
      setUpdateAllState({ kind: "err", message: `全部更新失败：${err?.message ?? err}` });
    }
  };
  const plugins = data?.plugins ?? [];
  const keyword = query.trim().toLowerCase();
  const filtered = (0, import_react.useMemo)(() => {
    let list = plugins;
    if (category !== null) list = list.filter((p) => p.category === category);
    if (keyword) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword) || p.type.toLowerCase().includes(keyword) || p.language.toLowerCase().includes(keyword)
      );
    }
    return list;
  }, [plugins, category, keyword]);
  const installedFiltered = (0, import_react.useMemo)(() => {
    const list = installed ?? [];
    const key = installedQuery.trim().toLowerCase();
    if (!key) return list;
    return list.filter((p) => p.name.toLowerCase().includes(key));
  }, [installed, installedQuery]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalShell, { title: "插件市场", onClose, wide: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-panel-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-tabs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: tab === "market" ? "dss-tab dss-tab--active" : "dss-tab",
            onClick: () => setTab("market"),
            children: [
              "社区插件",
              data?.stats?.total ? `（${data.stats.total}）` : ""
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: tab === "installed" ? "dss-tab dss-tab--active" : "dss-tab",
            onClick: () => setTab("installed"),
            children: [
              "已装插件",
              installed ? `（${installed.length}）` : ""
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: "dss-search dss-panel-search",
          type: "search",
          placeholder: tab === "market" ? "搜索插件名 / 描述 / 类型 / 语言…" : "搜索已装插件…",
          value: tab === "market" ? query : installedQuery,
          onChange: (event) => tab === "market" ? setQuery(event.target.value) : setInstalledQuery(event.target.value)
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-mp-stats", children: tab === "market" && data ? `共 ${filtered.length} 条 · 数据更新 ${data.sourceUpdatedAt || "—"}（每小时刷新）` : "" })
    ] }),
    tab === "market" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-cats", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: category === null ? "dss-cat dss-cat--active" : "dss-cat",
          onClick: () => {
            setCategory(null);
            setVisible(PAGE_SIZE);
          },
          children: "全部"
        }
      ),
      (data?.categories ?? []).map((cat, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: category === index ? "dss-cat dss-cat--active" : "dss-cat",
          onClick: () => {
            setCategory(index);
            setVisible(PAGE_SIZE);
          },
          children: [
            cat.title,
            "（",
            cat.count,
            "）"
          ]
        },
        cat.title
      ))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-panel-body", children: [
      error !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dss-muted", children: [
        "加载失败：",
        error
      ] }),
      tab === "market" && data === null && error === "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "市场数据加载中（首次可能需几秒）…" }) : null,
      tab === "market" && data !== null && filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "没有匹配的插件" }) : null,
      tab === "market" && data !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-mp-list", children: [
        filtered.slice(0, visible).map((plugin) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          MarketRow,
          {
            plugin,
            installState: installStates[plugin.name] ?? { kind: "idle" },
            translated: translations[plugin.name] ?? null,
            showOriginal: showOriginal[plugin.name] === true,
            onInstall: () => void install(plugin),
            onTranslate: () => void translate(plugin),
            onToggleOriginal: () => setShowOriginal((prev) => ({ ...prev, [plugin.name]: !prev[plugin.name] }))
          },
          plugin.name
        )),
        visible < filtered.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "dss-mini-btn dss-load-more",
            onClick: () => setVisible((count) => count + PAGE_SIZE),
            children: [
              "加载更多（已显示 ",
              visible,
              " / ",
              filtered.length,
              "）"
            ]
          }
        )
      ] }),
      tab === "installed" && installed !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-list", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-installed-tools", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dss-mini-btn dss-mini-btn-primary",
              onClick: () => void updateAll(),
              disabled: updateAllState.kind === "busy",
              children: updateAllState.kind === "busy" ? "全部更新中…（逐个进行，可能较久）" : "全部更新（内置跳过）"
            }
          ),
          updateAllState.kind === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-ok", children: "全部更新完成，重启宿主生效" }) : null,
          updateAllState.kind === "err" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-err", children: updateAllState.message }) : null
        ] }),
        installedFiltered.map((plugin) => {
          const updateState = updateStates[plugin.name] ?? { kind: "idle" };
          const uninstallState = uninstallStates[plugin.name] ?? { kind: "idle" };
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-row-name", children: [
              plugin.name,
              plugin.builtin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tag", children: "内置" }) : null
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-row-side", children: plugin.version ? `v${plugin.version}` : "" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-row-actions", children: [
              !plugin.builtin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-mini-btn", onClick: () => void updatePlugin(plugin), disabled: updateState.kind === "busy", children: updateState.kind === "busy" ? "更新中…" : "更新" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-mini-btn dss-mini-btn-danger", onClick: () => void uninstallPlugin(plugin), disabled: uninstallState.kind === "busy", children: uninstallState.kind === "busy" ? "卸载中…" : "卸载" })
              ] }),
              updateState.kind === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-ok", children: "已是最新或已更新，重启宿主生效" }) : null,
              updateState.kind === "err" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-err", children: updateState.message }) : null,
              uninstallState.kind === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-ok", children: "已卸载，重启宿主生效" }) : null,
              uninstallState.kind === "err" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-err", children: uninstallState.message }) : null
            ] })
          ] }, plugin.name);
        })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-modal-foot", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dss-mp-stats", children: [
      "社区数据源：",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "dss-text-link", href: data?.source ?? "https://github.com/like-study1/Oh-My-DSH", target: "_blank", rel: "noopener noreferrer", children: "Oh-My-DSH" }),
      "· 安装走官方同一条通道（dsh plugin add），装完重启宿主生效",
      category !== null ? ` · 当前分类：${(data?.categories ?? [])[category]?.title ?? ""}` : ""
    ] }) })
  ] }) });
}
function mediaKind(target) {
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(target)) return "image";
  if (/\.(mp4|mov|webm|m4v)$/i.test(target)) return "video";
  if (/\.(mp3|m4a|wav|ogg)$/i.test(target)) return "audio";
  if (/\.pdf$/i.test(target)) return "pdf";
  return "other";
}
function MediaEmbed({ target, noteRel }) {
  const [resolved, setResolved] = (0, import_react.useState)("loading");
  const [failed, setFailed] = (0, import_react.useState)(false);
  const [zoomed, setZoomed] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const clean = target.split("|")[0].trim();
    setResolved("loading");
    setFailed(false);
    setZoomed(false);
    fetch(`/sidebar-shortcuts/api/vault/resolve-media?note=${encodeURIComponent(noteRel)}&link=${encodeURIComponent(clean)}`).then((res) => res.json()).then((body) => {
      if (cancelled) return;
      if (body?.ok === true && body.rel) setResolved(String(body.rel));
      else setResolved(null);
    }).catch(() => {
      if (!cancelled) setResolved(null);
    });
    return () => {
      cancelled = true;
    };
  }, [target, noteRel]);
  const kind = mediaKind(target);
  if (kind === "other") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-md-wiki", children: target });
  if (resolved === "loading") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-md-media-note", children: "（媒体解析中…）" });
  if (resolved === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dss-md-media-note", children: [
    "（媒体未找到：",
    target,
    "）"
  ] });
  const src = `/sidebar-shortcuts/api/vault/media?path=${encodeURIComponent(resolved)}`;
  if (kind === "image") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "img",
        {
          className: "dss-md-img",
          src,
          alt: target,
          loading: "lazy",
          onClick: () => setZoomed(true),
          onError: () => setFailed(true)
        }
      ),
      failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-md-media-note", children: "（图片加载失败）" }) : null,
      zoomed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-zoom", onClick: () => setZoomed(false), role: "button", "aria-label": "关闭原图", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src, alt: target }) }) : null
    ] });
  }
  if (kind === "video") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", { className: "dss-md-video", src, controls: true, preload: "metadata", onError: () => setFailed(true) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", { className: "dss-md-audio", src, controls: true, preload: "metadata", onError: () => setFailed(true) });
}
function MediaDirect({ rel }) {
  const [zoomed, setZoomed] = (0, import_react.useState)(false);
  const kind = mediaKind(rel);
  const src = `/sidebar-shortcuts/api/vault/media?path=${encodeURIComponent(rel)}`;
  if (kind === "image") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "img",
        {
          className: "dss-md-img",
          src,
          alt: rel,
          loading: "lazy",
          onClick: () => setZoomed(true)
        }
      ),
      zoomed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-zoom", onClick: () => setZoomed(false), role: "button", "aria-label": "关闭原图", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { src, alt: rel }) }) : null
    ] });
  }
  if (kind === "video") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", { className: "dss-md-video", src, controls: true, preload: "metadata" });
  }
  if (kind === "audio") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", { className: "dss-md-audio", src, controls: true, preload: "metadata" });
  }
  if (kind === "pdf") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", { className: "dss-md-pdf", src, title: rel });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "该文件类型暂不支持预览" });
}
function OfficePreview({ rel, data, onOpenExternally }) {
  if (data.kind === "doc") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-office dss-office-doc", dangerouslySetInnerHTML: { __html: data.html } });
  }
  if (data.kind === "sheet") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetPreview, { sheets: data.sheets });
  }
  if (data.kind === "slides") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-office dss-office-slides", children: data.slides.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "未能解析出幻灯片内容" }) : data.slides.map((slide) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-office-slide", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-office-slide-no", children: slide.no }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-office-slide-body", children: [
        slide.lines.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dss-office-slide-lines", children: slide.lines.map((line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, index)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "（本页无可提取文本）" }),
        slide.images.map((image, index) => "dataUri" in image ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { className: "dss-office-slide-img", src: image.dataUri, alt: "", loading: "lazy" }, index) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dss-muted", children: [
          "（内嵌图片过大已省略：",
          (image.bytes / 1024 / 1024).toFixed(1),
          "MB）"
        ] }, index))
      ] })
    ] }, slide.no)) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-office dss-office-legacy", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dss-office-legacy-title", children: [
      "无法内嵌预览（",
      data.ext,
      "）"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: data.hint }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-mini-btn", onClick: () => onOpenExternally(rel), children: "用默认程序打开" })
  ] });
}
function SheetPreview({ sheets }) {
  const [tab, setTab] = (0, import_react.useState)(0);
  const index = Math.min(tab, sheets.length - 1);
  const sheet = sheets[index];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-office dss-office-sheet", children: [
    sheets.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-office-tabs", children: sheets.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        className: i === index ? "dss-office-tab dss-office-tab--on" : "dss-office-tab",
        onClick: () => setTab(i),
        children: item.name
      },
      item.name
    )) }) : null,
    sheet ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-office-table", dangerouslySetInnerHTML: { __html: sheet.html } }) : null
  ] });
}
function renderInline(text, noteRel) {
  const nodes = [];
  const pattern = /(!\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("![[")) {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaEmbed, { target: token.slice(3, -2), noteRel }, ++key));
    } else if (token.startsWith("`")) {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: "dss-md-code", children: token.slice(1, -1) }, ++key));
    } else if (token.startsWith("[[")) {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-md-wiki", children: token.slice(2, -2) }, ++key));
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link?.[2]) {
        nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: link[2], target: "_blank", rel: "noopener noreferrer", children: link[1] }, ++key));
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**")) {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: token.slice(2, -2) }, ++key));
    } else {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: token.slice(1, -1) }, ++key));
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
function renderMarkdown(md, noteRel) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let key = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      const buffer2 = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buffer2.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "dss-md-pre", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: buffer2.join("\n") }) }, ++key));
      continue;
    }
    if (/^!\[\[[^\]]+\]\]$/.test(trimmed)) {
      out.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-md-embed", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaEmbed, { target: trimmed.slice(3, -2), noteRel }) }, ++key)
      );
      i += 1;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push((0, import_react2.createElement)(`h${level}`, { key: ++key, className: `dss-md-h dss-md-h${level}` }, renderInline(heading[2], noteRel)));
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      out.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", { className: "dss-md-hr" }, ++key));
      i += 1;
      continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:-]+\|$/.test(lines[i + 1].trim())) {
      const splitCells = (row) => row.replace(/\\\|/g, "").split("|").slice(1, -1).map((cell) => cell.replace(/\u0001/g, "|").trim());
      const head = splitCells(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        body.push(splitCells(lines[i]));
        i += 1;
      }
      out.push(
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "dss-md-table", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: head.map((cell, cellIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: renderInline(cell, noteRel) }, cellIndex)) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: body.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: row.map((cell, cellIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: renderInline(cell, noteRel) }, cellIndex)) }, rowIndex)) })
        ] }, ++key)
      );
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buffer2 = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buffer2.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { className: "dss-md-quote", children: renderMarkdown(buffer2.join("\n"), noteRel) }, ++key));
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: renderInline(lines[i].replace(/^\s*[-*+]\s+/, ""), noteRel) }, ++key));
        i += 1;
      }
      out.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dss-md-list", children: items }, ++key));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""), noteRel) }, ++key));
        i += 1;
      }
      out.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { className: "dss-md-list", children: items }, ++key));
      continue;
    }
    if (trimmed === "") {
      i += 1;
      continue;
    }
    const buffer = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrimmed = next.trim();
      if (nextTrimmed === "" || /^(#{1,6}\s|```|>|[-*+]\s|\d+\.\s|\||-{3,}$|\*{3,}$)/.test(next)) break;
      buffer.push(next);
      i += 1;
    }
    out.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-md-p", children: renderInline(buffer.join(" "), noteRel) }, ++key));
  }
  return out;
}
function TreeView({ rel, dirs, expanded, selected, filter, onToggle, onSelect }) {
  const dirState = dirs[rel];
  if (dirState === void 0) return null;
  if (dirState.status === "loading") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-tree-loading", children: "加载中…" });
  }
  if (dirState.status === "error") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-tree-error", children: dirState.message });
  }
  const keyword = filter.trim().toLowerCase();
  const matchName = (name) => !keyword || name.toLowerCase().includes(keyword);
  const nodes = [];
  for (const dir of dirState.data.dirs) {
    if (!matchName(dir.name)) continue;
    const dirRel = rel ? `${rel}/${dir.name}` : dir.name;
    const isOpen = expanded.has(dirRel);
    nodes.push(
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-tree-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            type: "button",
            className: "dss-tree-row",
            onClick: () => onToggle(dirRel),
            title: dirRel,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tree-caret", children: isOpen ? "▾" : "▸" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tree-icon", children: "📁" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tree-label", children: dir.name })
            ]
          }
        ),
        isOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-tree-children", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          TreeView,
          {
            rel: dirRel,
            dirs,
            expanded,
            selected,
            filter,
            onToggle,
            onSelect
          }
        ) }) : null
      ] }, `d-${dirRel}`)
    );
  }
  for (const file of dirState.data.files) {
    if (!matchName(file.name)) continue;
    const fileRel = rel ? `${rel}/${file.name}` : file.name;
    const icon = file.kind === "image" ? "🖼️" : file.kind === "video" ? "🎬" : file.kind === "audio" ? "🎵" : file.kind === "pdf" ? "📕" : file.kind === "doc" ? "📝" : file.kind === "sheet" ? "📊" : file.kind === "slides" ? "📽️" : file.kind === "legacy" ? "🗎" : "📄";
    nodes.push(
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          className: selected === fileRel ? "dss-tree-row dss-tree-row--file dss-tree-row--selected" : "dss-tree-row dss-tree-row--file",
          onClick: () => onSelect(fileRel, file.kind ?? "md"),
          title: fileRel,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tree-caret" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tree-icon", children: icon }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-tree-label", children: file.name })
          ]
        },
        `f-${fileRel}`
      )
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: nodes });
}
function KnowledgePanel({ onClose }) {
  const [vault, setVault] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)("");
  const [openHint, setOpenHint] = (0, import_react.useState)("");
  const [dirs, setDirs] = (0, import_react.useState)({});
  const [expanded, setExpanded] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const [selected, setSelected] = (0, import_react.useState)(null);
  const [content, setContent] = (0, import_react.useState)(null);
  const [mediaRel, setMediaRel] = (0, import_react.useState)(null);
  const [office, setOffice] = (0, import_react.useState)(null);
  const [loadingFile, setLoadingFile] = (0, import_react.useState)(false);
  const [filter, setFilter] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    fetch("/sidebar-shortcuts/api/vault").then((res) => res.json()).then((body) => {
      if (cancelled) return;
      if (body?.ok !== true) throw new Error(body?.error ?? "读取失败");
      setVault({ path: String(body.path ?? ""), exists: body.exists === true });
    }).catch((err) => {
      if (!cancelled) setError(err?.message ?? String(err));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const loadDir = async (rel) => {
    if (dirs[rel] !== void 0) return;
    setDirs((prev) => ({ ...prev, [rel]: { status: "loading" } }));
    try {
      const res = await fetch(`/sidebar-shortcuts/api/vault/tree?dir=${encodeURIComponent(rel)}`);
      const body = await res.json();
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setDirs((prev) => ({ ...prev, [rel]: { status: "ready", data: { rel: body.rel ?? rel, dirs: body.dirs ?? [], files: body.files ?? [] } } }));
    } catch (err) {
      setDirs((prev) => ({ ...prev, [rel]: { status: "error", message: err?.message ?? String(err) } }));
    }
  };
  (0, import_react.useEffect)(() => {
    void loadDir("");
  }, []);
  const toggleDir = (rel) => {
    if (expanded.has(rel)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(rel);
        return next;
      });
    } else {
      void loadDir(rel);
      setExpanded((prev) => new Set(prev).add(rel));
    }
  };
  const openFile = async (rel, kind) => {
    setSelected(rel);
    setError("");
    if (kind === "image" || kind === "video" || kind === "audio" || kind === "pdf") {
      setContent(null);
      setOffice(null);
      setMediaRel(rel);
      setLoadingFile(false);
      return;
    }
    if (kind === "doc" || kind === "sheet" || kind === "slides" || kind === "legacy") {
      setMediaRel(null);
      setContent(null);
      setOffice(null);
      setLoadingFile(true);
      try {
        const res = await fetch(`/sidebar-shortcuts/api/vault/office?path=${encodeURIComponent(rel)}`);
        const body = await res.json();
        if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
        const officeKind = String(body.kind ?? "");
        if (officeKind === "doc") setOffice({ kind: "doc", html: String(body.html ?? "") });
        else if (officeKind === "sheet") setOffice({ kind: "sheet", sheets: Array.isArray(body.sheets) ? body.sheets : [] });
        else if (officeKind === "slides") setOffice({ kind: "slides", slides: Array.isArray(body.slides) ? body.slides : [] });
        else setOffice({ kind: "legacy", ext: String(body.ext ?? ""), hint: String(body.hint ?? "") });
      } catch (err) {
        setError(`预览失败：${err?.message ?? err}`);
      } finally {
        setLoadingFile(false);
      }
      return;
    }
    setMediaRel(null);
    setOffice(null);
    setLoadingFile(true);
    try {
      const res = await fetch(`/sidebar-shortcuts/api/vault/read?path=${encodeURIComponent(rel)}`);
      const body = await res.json();
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setContent({ rel: body.rel, text: body.content ?? "" });
    } catch (err) {
      setContent(null);
      setError(`读取失败：${err?.message ?? err}`);
    } finally {
      setLoadingFile(false);
    }
  };
  const openFileExternally = async (rel) => {
    setOpenHint("");
    try {
      const res = await fetch(`/sidebar-shortcuts/api/vault/open-file?path=${encodeURIComponent(rel)}`, { method: "POST" });
      const body = await res.json();
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setOpenHint("已用默认程序打开");
    } catch (err) {
      setOpenHint(`打开失败：${err?.message ?? err}`);
    }
  };
  const openVaultFolder = async () => {
    setOpenHint("");
    try {
      const res = await fetch("/sidebar-shortcuts/api/vault/open", { method: "POST" });
      const body = await res.json();
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setOpenHint("已在资源管理器中打开");
    } catch (err) {
      setOpenHint(`打开失败：${err?.message ?? err}`);
    }
  };
  const obsidianUrl = vault?.path ? `obsidian://open?path=${encodeURIComponent(vault.path)}` : "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModalShell, { title: "第二大脑 · Obsidian", onClose, wide: true, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-panel dss-panel--kb", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-kb-tree", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-kb-tree-head", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: "dss-search",
          type: "search",
          placeholder: "过滤当前目录…",
          value: filter,
          onChange: (event) => setFilter(event.target.value)
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-kb-tree-body", children: vault === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "库信息加载中…" }) : !vault.exists ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dss-muted", children: [
        "库目录不存在：",
        vault.path
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        TreeView,
        {
          rel: "",
          dirs,
          expanded,
          selected,
          filter,
          onToggle: toggleDir,
          onSelect: (rel, kind) => void openFile(rel, kind)
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-kb-preview", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-kb-preview-head", children: [
        selected !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-kb-file-name", children: selected.split("/").pop() }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-kb-path", children: selected.includes("/") ? selected.slice(0, selected.lastIndexOf("/")) : "库根目录" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-kb-file-name", children: "未选择文件" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dss-kb-corner", children: [
          vault?.exists ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "dss-text-link", href: obsidianUrl, target: "_blank", rel: "noopener noreferrer", children: "用 Obsidian 打开" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dss-text-link dss-text-link-btn", onClick: () => void openVaultFolder(), children: "打开库文件夹" })
          ] }) : null,
          openHint !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-hint-ok", children: openHint }) : null
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-kb-preview-body", children: loadingFile ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "加载中…" }) : error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: error }) : mediaRel !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MediaDirect, { rel: mediaRel }) : office !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OfficePreview, { rel: selected ?? "", data: office, onOpenExternally: (path) => void openFileExternally(path) }) : content === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dss-muted", children: "从左侧目录树点选笔记（📄）阅读，或直接预览图片（🖼️）/视频（🎬）/音频（🎵）/PDF（📕）/Word（📝）/表格（📊）/幻灯片（📽️）（只读，不会改动你的文件）" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dss-md", children: renderMarkdown(content.text, content.rel) }) })
    ] })
  ] }) });
}
function ModalHost() {
  const open = useOpenModal();
  (0, import_react.useEffect)(() => {
    if (!open) return void 0;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  if (!open) return null;
  if (open === "plugin-market") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketPanel, { onClose: () => setOpenModal(null) });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KnowledgePanel, { onClose: () => setOpenModal(null) });
}
function AboutSection() {
  const [about, setAbout] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    fetch("/sidebar-shortcuts/api/about").then((res) => res.json()).then((body) => {
      if (cancelled) return;
      if (body?.ok === true) setAbout(body);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-about", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "dss-about-title", children: "DeepSeek Harness 桌面客户端" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-about-list", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-about-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-key", children: "版本号" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-value", children: about?.version ? `v${about.version}` : "读取中…" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-about-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-key", children: "版权归属" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-value", children: about?.copyright ?? "Ambin.D" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-about-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-key", children: "联系邮箱" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-value", children: about?.email ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "dss-text-link", href: `mailto:${about.email}`, children: about.email }) : "—" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dss-about-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-key", children: "界面内核" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dss-about-value", children: "官方 DeepSeek Harness Web GUI" })
      ] })
    ] })
  ] });
}
function apply(ctx) {
  ctx.effect(() => {
    if (typeof document === "undefined") return () => {
    };
    const tag = document.createElement("style");
    tag.dataset.sidebarShortcutsCss = "1";
    tag.textContent = styles_default;
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, "dsh-sidebar-shortcuts: stylesheet");
  const { slots } = ctx;
  slots.inject("sidebar.footer.action", () => [
    slots.register(
      { name: "sidebar.footer.action", id: "dss-plugin-market", order: 1, label: "插件市场" },
      () => FootButton({ kind: "plugin-market", label: "插件市场" })
    ),
    slots.register(
      { name: "sidebar.footer.action", id: "dss-knowledge", order: 2, label: "知识库" },
      () => FootButton({ kind: "knowledge", label: "知识库" })
    )
  ]);
  slots.inject(
    "shell.overlay",
    () => slots.register(
      { name: "shell.overlay", id: "dss-shortcut-modals", order: 50, label: "侧边栏快捷弹窗" },
      () => ModalHost()
    )
  );
  slots.inject(
    "settings.section",
    () => slots.register(
      { name: "settings.section", id: "dss-about", order: 99, label: "关于" },
      () => AboutSection()
    )
  );
}
return module.exports; } });
