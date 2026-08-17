window.__ModuleLoader__.load({ id: "dsh-social-bridge", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
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

// F:/deepseek-harness/desktop/social-bridge/src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// F:/deepseek-harness/desktop/social-bridge/src/client/styles.css
var styles_default = "/*\n * dsh-social-bridge 样式：仅使用官方 --dsw-alias-* 色板令牌。\n * 纪律：不引入新配色、不设置 font-family（继承官方字体栈）。\n * 类名前缀 scb-（social-channel-bridge）：曾用 sb- 与 dsh-memory-evolve\n * 技能浏览器同名撞车（其 .sb-root { overflow:hidden } 覆盖了本区块滚动），\n * 故全局改名，杜绝类名冲突。\n *\n * 排版原则（本轮重排）：\n *   1. 统一盒模型（border-box），卡片/输入框绝不撑破内容列；\n *   2. 标题区占满剩余宽度，描述文字完整换行显示；\n *   3. 操作按钮成组、右对齐、彼此相邻；\n *   4. 提示/反馈文字独立成行，不与按钮抢同一排。\n */\n\n/* 区块根：纵向弹性布局，内容列自适应宽度 */\n.scb-root {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  width: 100%;\n  max-width: 720px;\n  padding: 4px 10px 16px 0;\n  box-sizing: border-box;\n  /* 自带滚动（确定可用）：区块高度钉在保守上限内，\n     内容超出时在区块内部下拉，滚动条常显——不依赖外层面板滚动。 */\n  max-height: 56vh;\n  overflow-y: scroll;\n}\n\n/* 常显滚动条：轨道始终可见，超出的内容下拉即达 */\n.scb-root::-webkit-scrollbar {\n  width: 10px;\n}\n\n.scb-root::-webkit-scrollbar-track {\n  background: var(--dsw-alias-bg-layer-1);\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 5px;\n}\n\n.scb-root::-webkit-scrollbar-thumb {\n  background: var(--dsw-alias-border-l2);\n  border-radius: 5px;\n  min-height: 40px;\n}\n\n.scb-root::-webkit-scrollbar-thumb:hover {\n  background: var(--dsw-alias-label-secondary);\n}\n\n/* 统一盒模型：所有内部元素尺寸含内边距与边框，杜绝溢出 */\n.scb-root *,\n.scb-root *::before,\n.scb-root *::after {\n  box-sizing: border-box;\n}\n\n.scb-heading {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.scb-intro {\n  margin: 0 0 8px;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.scb-error {\n  margin: 0;\n  font-size: 13px;\n  color: var(--dsw-alias-state-error-primary);\n}\n\n/* ---- 渠道卡片 ---- */\n\n.scb-card {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  width: 100%;\n  min-width: 0; /* 弹性收缩兜底：内容再宽也不撑破父列 */\n  padding: 14px 16px;\n  background: var(--dsw-alias-bg-layer-1);\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 10px;\n}\n\n.scb-card-head {\n  display: flex;\n  align-items: flex-start;\n  gap: 12px;\n}\n\n/* 标题区占满除开关外的全部宽度，描述不再挤在窄列里 */\n.scb-card-title {\n  flex: 1;\n  min-width: 0;\n}\n\n.scb-card-title h3 {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-primary);\n}\n\n.scb-card-desc {\n  margin: 4px 0 0;\n  font-size: 12.5px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary);\n  overflow-wrap: anywhere; /* 长路径/URL 也能断行，不撑破卡片 */\n}\n\n.scb-card-warn {\n  margin: 4px 0 0;\n  font-size: 12.5px;\n  color: var(--dsw-alias-state-warn-primary);\n}\n\n/* ---- 启用/停用滑动开关 ---- */\n\n.scb-switch {\n  position: relative;\n  display: inline-flex;\n  flex-shrink: 0; /* 开关永不收缩 */\n  cursor: pointer;\n}\n\n.scb-switch input {\n  position: absolute;\n  opacity: 0;\n  width: 0;\n  height: 0;\n}\n\n.scb-switch-track {\n  position: relative;\n  width: 36px;\n  height: 20px;\n  border-radius: 999px;\n  background: var(--dsw-alias-border-l2);\n  transition: background 0.15s ease;\n}\n\n.scb-switch-track::after {\n  content: '';\n  position: absolute;\n  top: 2px;\n  left: 2px;\n  width: 16px;\n  height: 16px;\n  border-radius: 50%;\n  background: #fff;\n  transition: left 0.15s ease;\n}\n\n.scb-switch input:checked + .scb-switch-track {\n  background: var(--dsw-alias-brand-primary);\n}\n\n.scb-switch input:checked + .scb-switch-track::after {\n  left: 18px;\n}\n\n/* ---- 字段 ---- */\n\n.scb-fields {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.scb-field {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  min-width: 0;\n}\n\n.scb-field-label {\n  font-size: 12.5px;\n  color: var(--dsw-alias-label-secondary);\n}\n\n.scb-input {\n  width: 100%;\n  max-width: 100%;\n  min-width: 0; /* 下拉框（select）的固有宽度不允许撑破列宽 */\n  padding: 7px 10px;\n  font-size: 13px;\n  line-height: 1.4;\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-alias-bg-base);\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  outline: none;\n}\n\n.scb-input:focus {\n  border-color: var(--dsw-alias-brand-primary);\n}\n\n.scb-input::placeholder {\n  color: var(--dsw-alias-label-secondary);\n}\n\n/* ---- 微信桥卡片 ---- */\n\n.scb-wechat-status {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  flex-wrap: wrap;\n}\n\n.scb-qr-area {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  padding: 10px;\n  border: 1px dashed var(--dsw-alias-border-l2);\n  border-radius: 8px;\n}\n\n.scb-qr-img {\n  width: 200px;\n  height: 200px;\n  border: 1px solid var(--dsw-alias-border-l1);\n  border-radius: 4px;\n  background: #fff;\n}\n\n/* ---- 卡片底部：状态在左，按钮组在右，反馈独立成行 ---- */\n\n.scb-card-foot {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  flex-wrap: wrap; /* 极窄宽度下允许换行，不产生水平溢出 */\n}\n\n/* 按钮组：右对齐且彼此相邻 */\n.scb-actions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  margin-left: auto;\n}\n\n/* 反馈/提示：独占一行，不与状态和按钮抢位 */\n.scb-feedback {\n  margin: 0;\n  width: 100%;\n  font-size: 12.5px;\n  line-height: 1.4;\n}\n\n.scb-status {\n  font-size: 12.5px;\n  white-space: normal; /* 状态文案允许换行 */\n}\n\n.scb-status-ok {\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.scb-status-warn {\n  color: var(--dsw-alias-state-warn-primary);\n}\n\n.scb-status-muted {\n  color: var(--dsw-alias-label-secondary);\n}\n\n.scb-hint-ok {\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.scb-hint-err {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.scb-save {\n  padding: 6px 16px;\n  font-size: 13px;\n  font-weight: 500;\n  color: #fff;\n  background: var(--dsw-alias-brand-primary);\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n  flex-shrink: 0;\n}\n\n.scb-save:disabled {\n  opacity: 0.55;\n  cursor: default;\n}\n\n/* 危险操作（断开连接）：描边 + 错误色文字，背景透明 */\n.scb-save-danger {\n  background: transparent;\n  color: var(--dsw-alias-state-error-primary);\n  border: 1px solid var(--dsw-alias-state-error-primary);\n}\n\n/* 幽灵按钮（检查连接）：描边 + 品牌色文字，背景透明 */\n.scb-save-ghost {\n  background: transparent;\n  color: var(--dsw-alias-brand-primary);\n  border: 1px solid var(--dsw-alias-brand-primary);\n}\n";

// F:/deepseek-harness/desktop/social-bridge/src/client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots"];
var CARDS = [
  {
    id: "telegram",
    title: "Telegram（Bot API）",
    description: "通过 Telegram Bot API 桥接，填入机器人 Token 即可",
    fields: [
      { key: "token", label: "Bot Token", type: "password", placeholder: "123456789:AA..." }
    ]
  },
  {
    id: "feishu",
    title: "飞书（官方 API）",
    description: "通过飞书开放平台官方 API 桥接",
    fields: [
      { key: "appId", label: "App ID", type: "text", placeholder: "cli_xxxxxxxx" },
      { key: "appSecret", label: "App Secret", type: "password", placeholder: "••••••••" }
    ]
  },
  {
    id: "dingtalk",
    title: "钉钉（官方 API）",
    description: "通过钉钉开放平台官方 API 桥接",
    fields: [
      { key: "appKey", label: "App Key", type: "text", placeholder: "dingxxxxxxxx" },
      { key: "appSecret", label: "App Secret", type: "password", placeholder: "••••••••" }
    ]
  },
  {
    id: "whatsapp",
    title: "WhatsApp（Baileys）",
    description: "通过 Baileys 桥接，输入配对码完成配对",
    warning: "存在封号风险，仅供评估",
    fields: [
      { key: "pairingCode", label: "配对码", type: "text", placeholder: "XXXX-XXXX" }
    ]
  }
];
var STATUS_TEXT = {
  connected: "已连接",
  disconnected: "未连接",
  "wechat-not-running": "微信未运行",
  unconfigured: "未配置",
  unpaired: "未配对",
  paired: "已配对"
};
function statusKind(code) {
  if (code === "connected" || code === "paired") return "scb-status-ok";
  if (code === "wechat-not-running" || code === "unpaired") return "scb-status-warn";
  return "scb-status-muted";
}
var WECHAT_STATUS_TEXT = {
  idle: "未连接",
  qr_pending: "正在生成二维码…",
  qr_ready: "等待扫码",
  connected: "已连接",
  error: "连接出错"
};
function qrImageUrl(qrUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;
}
function WechatCard(props) {
  const [state, setState] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [notice, setNotice] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const poll = () => {
      void fetch("/social-bridge/api/wechat").then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))).then((data) => {
        if (!cancelled) setState(data);
      }).catch(() => {
      });
    };
    poll();
    const timer = window.setInterval(poll, 2e3);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
  const [sessions, setSessions] = (0, import_react.useState)([]);
  const [currentSession, setCurrentSession] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    void fetch("/social-bridge/api/wechat/sessions").then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))).then((data) => {
      if (cancelled) return;
      setSessions(data.sessions || []);
      setCurrentSession(data.current || "");
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const switchSession = async (sessionId) => {
    setCurrentSession(sessionId);
    try {
      const res = await fetch("/social-bridge/api/wechat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok || data?.ok !== true) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setNotice(`已切换到会话：${sessions.find((s) => s.id === sessionId)?.title ?? sessionId}`);
    } catch (err) {
      setNotice(`切换失败：${err?.message ?? err}`);
    }
  };
  const post = async (path) => {
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok || data?.ok !== true) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setState(data);
      if (data.status === "qr_pending") setNotice("二维码生成中，请稍候…");
    } catch (err) {
      setNotice(`操作失败：${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };
  const status = state?.status ?? "idle";
  const statusLabel = WECHAT_STATUS_TEXT[status] ?? status;
  const statusClass = status === "connected" ? "scb-status-ok" : status === "error" ? "scb-hint-err" : status === "qr_ready" ? "scb-status-warn" : "scb-status-muted";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "scb-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "scb-card-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scb-card-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "微信（iLink/OpenClaw 通道）" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "scb-card-desc", children: "通过 iLink 协议连接个人微信（不 hook 微信客户端、不依赖 OpenClaw 框架），扫码登录后收发 1 对 1 私聊。" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "scb-switch", title: props.enabled ? "停用" : "启用", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: props.enabled,
            onChange: (event) => props.onEnabledChange(event.target.checked)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "scb-switch-track" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scb-wechat-status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `scb-status ${statusClass}`, children: statusLabel }),
      status === "connected" && state?.accountId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "scb-card-desc", children: [
        "登录账号：",
        state.accountId
      ] })
    ] }),
    (status === "qr_ready" || status === "qr_pending") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scb-qr-area", children: [
      status === "qr_ready" && state?.qrUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", { className: "scb-qr-img", src: qrImageUrl(state.qrUrl), alt: "微信登录二维码" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "scb-card-desc", children: "请用微信扫码，扫码后状态自动变为已连接" })
    ] }),
    status === "error" && state?.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "scb-hint-err", children: [
      "错误：",
      state.error
    ] }),
    sessions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "scb-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "scb-field-label", children: "手机消息接收会话" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "select",
        {
          className: "scb-input",
          value: currentSession,
          onChange: (event) => {
            void switchSession(event.target.value);
          },
          children: sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: s.id, children: s.title }, s.id))
        }
      )
    ] }),
    state?.lastInbound && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "scb-card-desc", children: [
      "最近收到（",
      state.lastInbound.userId,
      "）：",
      state.lastInbound.text
    ] }),
    state?.lastSendResult && !state.lastSendResult.ok && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "scb-hint-err", children: [
      "最近回复发送失败：",
      state.lastSendResult.error
    ] }),
    notice !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "scb-feedback scb-hint-err", children: notice }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", { className: "scb-card-foot", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "scb-actions", children: [
      status !== "connected" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "scb-save", disabled: busy, onClick: () => {
        void post("/social-bridge/api/wechat/login");
      }, children: busy ? "处理中…" : "登录" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "scb-save scb-save-danger", disabled: busy, onClick: () => {
        void post("/social-bridge/api/wechat/logout");
      }, children: busy ? "处理中…" : "断开连接" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "scb-save scb-save-ghost", disabled: busy, onClick: () => {
        void post("/social-bridge/api/wechat/status");
      }, children: "检查连接" })
    ] }) })
  ] });
}
function ChannelCard(props) {
  const { card, values, statusCode, hint, busy, onChange, onSave } = props;
  const enabled = Boolean(values?.enabled);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "scb-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "scb-card-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scb-card-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: card.title }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "scb-card-desc", children: card.description }),
        card.warning !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "scb-card-warn", children: card.warning })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "scb-switch", title: enabled ? "停用" : "启用", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            type: "checkbox",
            checked: enabled,
            onChange: (event) => onChange({ enabled: event.target.checked })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "scb-switch-track" })
      ] })
    ] }),
    card.fields.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "scb-fields", children: card.fields.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "scb-field", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "scb-field-label", children: field.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          className: "scb-input",
          type: field.type,
          placeholder: field.placeholder,
          value: String(values?.[field.key] ?? ""),
          onChange: (event) => onChange({ [field.key]: event.target.value })
        }
      )
    ] }, field.key)) }),
    hint !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: `scb-feedback ${hint.ok ? "scb-hint-ok" : "scb-hint-err"}`, children: hint.text }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { className: "scb-card-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `scb-status ${statusKind(statusCode)}`, children: STATUS_TEXT[statusCode] ?? statusCode }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "scb-actions", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "scb-save", disabled: busy, onClick: onSave, children: busy ? "保存中…" : "保存" }) })
    ] })
  ] });
}
function SocialBridgeSection() {
  const [channels, setChannels] = (0, import_react.useState)(null);
  const [status, setStatus] = (0, import_react.useState)({});
  const [error, setError] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)({});
  const [hint, setHint] = (0, import_react.useState)({});
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    void fetch("/social-bridge/api/config").then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))).then((data) => {
      if (cancelled) return;
      setChannels(data.channels);
      setStatus(data.status);
    }).catch((err) => {
      if (!cancelled) setError(err?.message ?? String(err));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  (0, import_react.useEffect)(() => {
    if (Object.keys(hint).length === 0) return void 0;
    const timer = window.setTimeout(() => setHint({}), 3e3);
    return () => window.clearTimeout(timer);
  }, [hint]);
  const patchChannel = (id, patch) => {
    setChannels((prev) => prev === null ? prev : { ...prev, [id]: { ...prev[id], ...patch } });
  };
  const saveChannel = async (id) => {
    if (channels === null) return;
    setBusy((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/social-bridge/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: id, patch: channels[id] })
      });
      const data = await res.json();
      if (!res.ok || data?.ok !== true) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setHint((prev) => ({ ...prev, [id]: { ok: true, text: "保存成功" } }));
    } catch (err) {
      setHint((prev) => ({ ...prev, [id]: { ok: false, text: `保存失败：${err?.message ?? err}` } }));
    } finally {
      setBusy((prev) => ({ ...prev, [id]: false }));
    }
  };
  const toggleWechat = (enabled) => {
    void fetch(`/social-bridge/api/wechat/${enabled ? "login" : "logout"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }).catch(() => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "scb-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "scb-heading", children: "社交渠道桥接" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "scb-intro", children: "配置各社交渠道的桥接参数。密钥仅保存在本机用户数据目录的 JSON 文件中，不出现在代码与日志里。" }),
    error !== "" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "scb-error", children: [
      "加载配置失败：",
      error
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      WechatCard,
      {
        enabled: Boolean(channels?.wechat?.enabled),
        onEnabledChange: toggleWechat
      }
    ),
    channels !== null && CARDS.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      ChannelCard,
      {
        card,
        values: channels[card.id],
        statusCode: status[card.id] ?? "unconfigured",
        hint: hint[card.id],
        busy: busy[card.id] === true,
        onChange: (patch) => patchChannel(card.id, patch),
        onSave: () => {
          void saveChannel(card.id);
        }
      },
      card.id
    ))
  ] });
}
function apply(ctx) {
  ctx.effect(() => {
    if (typeof document === "undefined") return () => {
    };
    const tag = document.createElement("style");
    tag.dataset.socialBridgeCss = "1";
    tag.textContent = styles_default;
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, "dsh-social-bridge: stylesheet");
  const { slots } = ctx;
  slots.inject(
    "settings.section",
    () => slots.register(
      { name: "settings.section", id: "social-bridge", order: 25, label: "社交渠道桥接" },
      () => SocialBridgeSection()
    )
  );
}
return module.exports; } });
