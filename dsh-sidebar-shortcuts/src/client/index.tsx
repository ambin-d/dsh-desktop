/**
 * dsh-sidebar-shortcuts — 客户端半。
 *
 * 侧边栏左下角两个入口按钮（sidebar.footer.action）：
 *   1. 插件市场 —— 软件内嵌大面板：中文搜索 + 11 分类筛选 + 插件列表
 *      （名称/中文描述/star/活跃度/语言标签）、每条一键安装、英文描述点翻译就地变中文；
 *   2. 知识库 —— 软件内嵌大面板：左侧 Vault 目录树（懒加载可折叠）+ 右侧
 *      Markdown 只读预览 + 关键词过滤当前目录。
 *
 * 面板经 shell.overlay 槽挂到帧级浮层，全程不离开客户端窗口；
 * 仅 GitHub 详情与 Obsidian 打开两个补充入口允许外跳。
 * 样式纪律：只用官方 --dsw-alias-* 色板令牌；不设 font-family；类名前缀 dss-。
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createElement } from 'react'
import type { Context } from 'cordis'
import styles from './styles.css'

export const inject = ['slots']

// ---- 弹窗状态（两个入口按钮与 overlay 宿主共享的模块级小仓库） --------------

type ModalKind = 'plugin-market' | 'knowledge' | null

let openModalKind: ModalKind = null
const modalListeners = new Set<() => void>()

function setOpenModal(kind: ModalKind): void {
  openModalKind = kind
  for (const listener of modalListeners) listener()
}

function subscribeModal(listener: () => void): () => void {
  modalListeners.add(listener)
  return () => {
    modalListeners.delete(listener)
  }
}

/** 订阅当前打开的弹窗（useSyncExternalStore 保证两个渲染点同步）。 */
function useOpenModal(): ModalKind {
  return useSyncExternalStore(subscribeModal, () => openModalKind, () => null)
}

// ---- 图标 -------------------------------------------------------------------

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.8C6.8 2.9 5.1 2.8 3.2 2.8v9.4c1.9 0 3.6.1 4.8 1 1.2-.9 2.9-1 4.8-1V2.8c-1.9 0-3.6.1-4.8 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 3.8v9.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

// ---- 侧栏入口按钮 -----------------------------------------------------------

interface FootButtonProps {
  kind: Exclude<ModalKind, null>
  label: string
}

/** 左下角入口按钮：与官方设置入口同排、同色系，小图标 + 文字。 */
function FootButton({ kind, label }: FootButtonProps) {
  return (
    <button
      type="button"
      className="dss-foot-btn"
      onClick={() => setOpenModal(kind)}
      title={label}
    >
      {kind === 'plugin-market' ? <GridIcon /> : <BookIcon />}
      <span className="dss-foot-label">{label}</span>
    </button>
  )
}

// ---- 弹窗通用壳 -------------------------------------------------------------

function ModalShell({ title, onClose, wide, children }: {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className="dss-overlay" onClick={onClose}>
      <div
        className={wide ? 'dss-modal dss-modal--wide' : 'dss-modal'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dss-modal-head">
          <div className="dss-modal-title">{title}</div>
          <button type="button" className="dss-modal-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---- 插件市场面板 -----------------------------------------------------------

interface MarketPlugin {
  name: string
  url: string
  type: string
  activity: 'active' | 'inactive' | 'unknown'
  language: string
  stars: number | null
  description: string
  category: number
  english: boolean
}

interface MarketData {
  source?: string
  sourceUpdatedAt?: string
  stats?: { total?: number; snapshot?: number; stars?: number } | null
  categories?: { title: string; count: number }[]
  plugins?: MarketPlugin[]
}

interface InstalledRow {
  name: string
  version: string
  builtin: boolean
}

const PAGE_SIZE = 50
const ACTIVITY_TEXT: Record<MarketPlugin['activity'], string> = {
  active: '🟢 活跃',
  inactive: '🔴 停更',
  unknown: '— 未知',
}

/** 单条插件的安装状态。 */
type InstallState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok' } | { kind: 'err'; message: string }

function MarketRow({ plugin, installState, translated, showOriginal, onInstall, onTranslate, onToggleOriginal }: {
  plugin: MarketPlugin
  installState: InstallState
  translated: string | null
  showOriginal: boolean
  onInstall: () => void
  onTranslate: () => void
  onToggleOriginal: () => void
}) {
  const desc = translated !== null && !showOriginal ? translated : plugin.description
  return (
    <div className="dss-mp-row">
      <div className="dss-mp-row-head">
        <a className="dss-mp-name" href={plugin.url} target="_blank" rel="noopener noreferrer" title="查看 GitHub 详情">
          {plugin.name}
        </a>
        <span className="dss-mp-meta">
          {plugin.type ? <span className="dss-tag">{plugin.type}</span> : null}
          {plugin.language ? <span className="dss-tag dss-tag-lang">{plugin.language}</span> : null}
          <span className="dss-mp-activity">{ACTIVITY_TEXT[plugin.activity]}</span>
          {plugin.stars !== null ? <span className="dss-mp-stars">⭐ {plugin.stars}</span> : null}
        </span>
      </div>
      <div className="dss-mp-desc">{desc || '（无描述）'}</div>
      <div className="dss-mp-actions">
        {plugin.english ? (
          translated !== null
            ? <button type="button" className="dss-mini-btn" onClick={onToggleOriginal}>{showOriginal ? '看译文' : '看原文'}</button>
            : <button type="button" className="dss-mini-btn" onClick={onTranslate} disabled={installState.kind === 'busy'}>翻译</button>
        ) : null}
        <button
          type="button"
          className="dss-mini-btn dss-mini-btn-primary"
          onClick={onInstall}
          disabled={!plugin.url || installState.kind === 'busy'}
        >
          {installState.kind === 'busy' ? '安装中…' : '一键安装'}
        </button>
        {installState.kind === 'ok' ? <span className="dss-hint-ok">已安装，重启宿主生效</span> : null}
        {installState.kind === 'err' ? <span className="dss-hint-err">{installState.message}</span> : null}
      </div>
    </div>
  )
}

function MarketPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<MarketData | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<number | null>(null) // null=全部
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  // 已装插件（原有功能保留，作为第二个页签）
  const [tab, setTab] = useState<'market' | 'installed'>('market')
  const [installed, setInstalled] = useState<InstalledRow[] | null>(null)
  const [installedQuery, setInstalledQuery] = useState('')
  // 每插件安装状态
  const [installStates, setInstallStates] = useState<Record<string, InstallState>>({})
  // 已装插件操作状态（更新/卸载）+ 全部更新
  const [updateStates, setUpdateStates] = useState<Record<string, InstallState>>({})
  const [uninstallStates, setUninstallStates] = useState<Record<string, InstallState>>({})
  const [updateAllState, setUpdateAllState] = useState<InstallState>({ kind: 'idle' })
  // 每插件翻译缓存 + 是否显示原文
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({})
  const busyRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    fetch('/sidebar-shortcuts/api/market')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        if (body?.ok !== true) throw new Error(body?.error ?? '读取失败')
        setData(body)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const reloadInstalled = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/sidebar-shortcuts/api/plugins')
      const body = await res.json()
      if (body?.ok !== true) throw new Error(body?.error ?? '读取失败')
      setInstalled(body.plugins ?? [])
    } catch (err) {
      setError(err?.message ?? String(err))
    }
  }, [])

  useEffect(() => {
    if (tab !== 'installed' || installed !== null) return
    void reloadInstalled()
  }, [tab, installed, reloadInstalled])

  const install = async (plugin: MarketPlugin): Promise<void> => {
    if (busyRef.current.has(plugin.name)) return
    busyRef.current.add(plugin.name)
    setInstallStates((prev) => ({ ...prev, [plugin.name]: { kind: 'busy' } }))
    try {
      const res = await fetch('/sidebar-shortcuts/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: plugin.url }),
      })
      const body = await res.json()
      setInstallStates((prev) => ({
        ...prev,
        [plugin.name]: body?.ok === true
          ? { kind: 'ok' }
          : { kind: 'err', message: `安装失败：${body?.error ?? body?.err ?? `HTTP ${res.status}`}` },
      }))
    } catch (err) {
      setInstallStates((prev) => ({ ...prev, [plugin.name]: { kind: 'err', message: `安装失败：${err?.message ?? err}` } }))
    } finally {
      busyRef.current.delete(plugin.name)
    }
  }

  const translate = async (plugin: MarketPlugin): Promise<void> => {
    if (busyRef.current.has(`tr-${plugin.name}`)) return
    busyRef.current.add(`tr-${plugin.name}`)
    setTranslations((prev) => ({ ...prev, [plugin.name]: '翻译中…' }))
    try {
      const res = await fetch('/sidebar-shortcuts/api/market/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plugin.description }),
      })
      const body = await res.json()
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setTranslations((prev) => ({ ...prev, [plugin.name]: body.text }))
      setShowOriginal((prev) => ({ ...prev, [plugin.name]: false }))
    } catch (err) {
      setTranslations((prev) => ({ ...prev, [plugin.name]: `翻译失败：${err?.message ?? err}` }))
    } finally {
      busyRef.current.delete(`tr-${plugin.name}`)
    }
  }

  /** 卸载单个插件（前端确认 + 同源 POST；成功后刷新列表）。 */
  const uninstallPlugin = async (plugin: InstalledRow): Promise<void> => {
    if (!window.confirm(`确定卸载插件「${plugin.name}」？将移除其依赖，重启宿主后完全生效。`)) return
    if (busyRef.current.has(`un-${plugin.name}`)) return
    busyRef.current.add(`un-${plugin.name}`)
    setUninstallStates((prev) => ({ ...prev, [plugin.name]: { kind: 'busy' } }))
    try {
      const res = await fetch('/sidebar-shortcuts/api/plugins/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plugin.name }),
      })
      const body = await res.json()
      setUninstallStates((prev) => ({
        ...prev,
        [plugin.name]: body?.ok === true
          ? { kind: 'ok' }
          : { kind: 'err', message: `卸载失败：${body?.error ?? body?.err ?? `HTTP ${res.status}`}` },
      }))
      if (body?.ok === true) void reloadInstalled()
    } catch (err) {
      setUninstallStates((prev) => ({ ...prev, [plugin.name]: { kind: 'err', message: `卸载失败：${err?.message ?? err}` } }))
    } finally {
      busyRef.current.delete(`un-${plugin.name}`)
    }
  }

  /** 更新单个插件。 */
  const updatePlugin = async (plugin: InstalledRow): Promise<void> => {
    if (busyRef.current.has(`up-${plugin.name}`)) return
    busyRef.current.add(`up-${plugin.name}`)
    setUpdateStates((prev) => ({ ...prev, [plugin.name]: { kind: 'busy' } }))
    try {
      const res = await fetch('/sidebar-shortcuts/api/plugins/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plugin.name }),
      })
      const body = await res.json()
      setUpdateStates((prev) => ({
        ...prev,
        [plugin.name]: body?.ok === true
          ? { kind: 'ok' }
          : { kind: 'err', message: `更新失败：${body?.error ?? body?.err ?? `HTTP ${res.status}`}` },
      }))
      if (body?.ok === true) void reloadInstalled()
    } catch (err) {
      setUpdateStates((prev) => ({ ...prev, [plugin.name]: { kind: 'err', message: `更新失败：${err?.message ?? err}` } }))
    } finally {
      busyRef.current.delete(`up-${plugin.name}`)
    }
  }

  /** 全部更新（非内置逐个更新，宿主汇总结果）。 */
  const updateAll = async (): Promise<void> => {
    const candidates = (installed ?? []).filter((plugin) => !plugin.builtin)
    if (candidates.length === 0) {
      setUpdateAllState({ kind: 'err', message: '没有可更新的自装插件（内置插件由桌面客户端统一管理）' })
      return
    }
    if (!window.confirm(`将逐个更新 ${candidates.length} 个自装插件（可能耗时数分钟），确定？`)) return
    if (updateAllState.kind === 'busy') return
    setUpdateAllState({ kind: 'busy' })
    try {
      const res = await fetch('/sidebar-shortcuts/api/plugins/update-all', { method: 'POST' })
      const body = await res.json()
      const failed = Array.isArray(body?.failed) ? body.failed : []
      const succeeded = Number(body?.succeeded ?? 0)
      const total = Number(body?.total ?? candidates.length)
      if (failed.length > 0) {
        setUpdateAllState({ kind: 'err', message: `全部更新完成 ${succeeded}/${total}，失败：${failed.join('、')}` })
      } else if (body?.ok === true) {
        setUpdateAllState({ kind: 'ok' })
      } else {
        setUpdateAllState({ kind: 'err', message: `全部更新未通过：${body?.error ?? '未知错误'}` })
      }
      void reloadInstalled()
    } catch (err) {
      setUpdateAllState({ kind: 'err', message: `全部更新失败：${err?.message ?? err}` })
    }
  }

  const plugins = data?.plugins ?? []
  const keyword = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    let list = plugins
    if (category !== null) list = list.filter((p) => p.category === category)
    if (keyword) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(keyword)
        || p.description.toLowerCase().includes(keyword)
        || p.type.toLowerCase().includes(keyword)
        || p.language.toLowerCase().includes(keyword),
      )
    }
    return list
  }, [plugins, category, keyword])

  const installedFiltered = useMemo(() => {
    const list = installed ?? []
    const key = installedQuery.trim().toLowerCase()
    if (!key) return list
    return list.filter((p) => p.name.toLowerCase().includes(key))
  }, [installed, installedQuery])

  return (
    <ModalShell title="插件市场" onClose={onClose} wide>
      <div className="dss-panel">
        {/* 顶部工具条：页签 + 搜索 + 统计 */}
        <div className="dss-panel-toolbar">
          <div className="dss-tabs">
            <button
              type="button"
              className={tab === 'market' ? 'dss-tab dss-tab--active' : 'dss-tab'}
              onClick={() => setTab('market')}
            >
              社区插件{data?.stats?.total ? `（${data.stats.total}）` : ''}
            </button>
            <button
              type="button"
              className={tab === 'installed' ? 'dss-tab dss-tab--active' : 'dss-tab'}
              onClick={() => setTab('installed')}
            >
              已装插件{installed ? `（${installed.length}）` : ''}
            </button>
          </div>
          <input
            className="dss-search dss-panel-search"
            type="search"
            placeholder={tab === 'market' ? '搜索插件名 / 描述 / 类型 / 语言…' : '搜索已装插件…'}
            value={tab === 'market' ? query : installedQuery}
            onChange={(event) => (tab === 'market' ? setQuery(event.target.value) : setInstalledQuery(event.target.value))}
          />
          <span className="dss-mp-stats">
            {tab === 'market' && data
              ? `共 ${filtered.length} 条 · 数据更新 ${data.sourceUpdatedAt || '—'}（每小时刷新）`
              : ''}
          </span>
        </div>

        {tab === 'market' && (
          <div className="dss-cats">
            <button
              type="button"
              className={category === null ? 'dss-cat dss-cat--active' : 'dss-cat'}
              onClick={() => { setCategory(null); setVisible(PAGE_SIZE) }}
            >
              全部
            </button>
            {(data?.categories ?? []).map((cat, index) => (
              <button
                key={cat.title}
                type="button"
                className={category === index ? 'dss-cat dss-cat--active' : 'dss-cat'}
                onClick={() => { setCategory(index); setVisible(PAGE_SIZE) }}
              >
                {cat.title}（{cat.count}）
              </button>
            ))}
          </div>
        )}

        {/* 内容区 */}
        <div className="dss-panel-body">
          {error !== '' && <p className="dss-muted">加载失败：{error}</p>}
          {tab === 'market' && data === null && error === ''
            ? <p className="dss-muted">市场数据加载中（首次可能需几秒）…</p>
            : null}
          {tab === 'market' && data !== null && filtered.length === 0
            ? <p className="dss-muted">没有匹配的插件</p>
            : null}
          {tab === 'market' && data !== null && (
            <div className="dss-mp-list">
              {filtered.slice(0, visible).map((plugin) => (
                <MarketRow
                  key={plugin.name}
                  plugin={plugin}
                  installState={installStates[plugin.name] ?? { kind: 'idle' }}
                  translated={translations[plugin.name] ?? null}
                  showOriginal={showOriginal[plugin.name] === true}
                  onInstall={() => void install(plugin)}
                  onTranslate={() => void translate(plugin)}
                  onToggleOriginal={() => setShowOriginal((prev) => ({ ...prev, [plugin.name]: !prev[plugin.name] }))}
                />
              ))}
              {visible < filtered.length && (
                <button
                  type="button"
                  className="dss-mini-btn dss-load-more"
                  onClick={() => setVisible((count) => count + PAGE_SIZE)}
                >
                  加载更多（已显示 {visible} / {filtered.length}）
                </button>
              )}
            </div>
          )}
          {tab === 'installed' && installed !== null && (
            <div className="dss-list">
              <div className="dss-installed-tools">
                <button
                  type="button"
                  className="dss-mini-btn dss-mini-btn-primary"
                  onClick={() => void updateAll()}
                  disabled={updateAllState.kind === 'busy'}
                >
                  {updateAllState.kind === 'busy' ? '全部更新中…（逐个进行，可能较久）' : '全部更新（内置跳过）'}
                </button>
                {updateAllState.kind === 'ok' ? <span className="dss-hint-ok">全部更新完成，重启宿主生效</span> : null}
                {updateAllState.kind === 'err' ? <span className="dss-hint-err">{updateAllState.message}</span> : null}
              </div>
              {installedFiltered.map((plugin) => {
                const updateState = updateStates[plugin.name] ?? { kind: 'idle' as const }
                const uninstallState = uninstallStates[plugin.name] ?? { kind: 'idle' as const }
                return (
                  <div key={plugin.name} className="dss-row">
                    <div className="dss-row-name">
                      {plugin.name}
                      {plugin.builtin ? <span className="dss-tag">内置</span> : null}
                    </div>
                    <div className="dss-row-side">{plugin.version ? `v${plugin.version}` : ''}</div>
                    <div className="dss-row-actions">
                      {!plugin.builtin && (
                        <>
                          <button type="button" className="dss-mini-btn" onClick={() => void updatePlugin(plugin)} disabled={updateState.kind === 'busy'}>
                            {updateState.kind === 'busy' ? '更新中…' : '更新'}
                          </button>
                          <button type="button" className="dss-mini-btn dss-mini-btn-danger" onClick={() => void uninstallPlugin(plugin)} disabled={uninstallState.kind === 'busy'}>
                            {uninstallState.kind === 'busy' ? '卸载中…' : '卸载'}
                          </button>
                        </>
                      )}
                      {updateState.kind === 'ok' ? <span className="dss-hint-ok">已是最新或已更新，重启宿主生效</span> : null}
                      {updateState.kind === 'err' ? <span className="dss-hint-err">{updateState.message}</span> : null}
                      {uninstallState.kind === 'ok' ? <span className="dss-hint-ok">已卸载，重启宿主生效</span> : null}
                      {uninstallState.kind === 'err' ? <span className="dss-hint-err">{uninstallState.message}</span> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部：社区入口降级为角落小字 */}
        <div className="dss-modal-foot">
          <span className="dss-mp-stats">
            社区数据源：<a className="dss-text-link" href={data?.source ?? 'https://github.com/like-study1/Oh-My-DSH'} target="_blank" rel="noopener noreferrer">Oh-My-DSH</a>
            · 安装走官方同一条通道（dsh plugin add），装完重启宿主生效
            {category !== null ? ` · 当前分类：${(data?.categories ?? [])[category]?.title ?? ''}` : ''}
          </span>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- 知识库面板 -------------------------------------------------------------

interface TreeDir {
  name: string
  hasChildren: boolean
}

interface TreeFile {
  name: string
  size: number
  /** md = Markdown/文本；image/video/audio = 可直接预览的媒体。 */
  kind?: string
}

interface TreeData {
  rel: string
  dirs: TreeDir[]
  files: TreeFile[]
}

type DirState = { status: 'loading' } | { status: 'ready'; data: TreeData } | { status: 'error'; message: string }

// ---- 媒体嵌入（![[wiki]] → 图片/视频/音频） --------------------------------

/** 按扩展名判断媒体类型。 */
function mediaKind(target: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' {
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(target)) return 'image'
  if (/\.(mp4|mov|webm|m4v)$/i.test(target)) return 'video'
  if (/\.(mp3|m4a|wav|ogg)$/i.test(target)) return 'audio'
  if (/\.pdf$/i.test(target)) return 'pdf'
  return 'other'
}

/**
 * 单个 ![[媒体链接]] 的内嵌渲染：
 * 宿主解析（同目录 / assets / 99-素材库附件资源 / 根相对 / 全库后缀兜底）→
 * 返回唯一相对路径 → 走 /api/vault/media 字节流。
 * 图片懒加载 + 点击放大；视频/音频 controls + preload=metadata（不预加载大文件）。
 */
function MediaEmbed({ target, noteRel }: { target: string; noteRel: string }) {
  const [resolved, setResolved] = useState<'loading' | null | string>('loading')
  const [failed, setFailed] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const clean = target.split('|')[0].trim()
    setResolved('loading')
    setFailed(false)
    setZoomed(false)
    fetch(`/sidebar-shortcuts/api/vault/resolve-media?note=${encodeURIComponent(noteRel)}&link=${encodeURIComponent(clean)}`)
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        if (body?.ok === true && body.rel) setResolved(String(body.rel))
        else setResolved(null)
      })
      .catch(() => {
        if (!cancelled) setResolved(null)
      })
    return () => {
      cancelled = true
    }
  }, [target, noteRel])

  const kind = mediaKind(target)
  if (kind === 'other') return <span className="dss-md-wiki">{target}</span>
  if (resolved === 'loading') return <span className="dss-md-media-note">（媒体解析中…）</span>
  if (resolved === null) return <span className="dss-md-media-note">（媒体未找到：{target}）</span>
  const src = `/sidebar-shortcuts/api/vault/media?path=${encodeURIComponent(resolved)}`
  if (kind === 'image') {
    return (
      <>
        <img
          className="dss-md-img"
          src={src}
          alt={target}
          loading="lazy"
          onClick={() => setZoomed(true)}
          onError={() => setFailed(true)}
        />
        {failed ? <span className="dss-md-media-note">（图片加载失败）</span> : null}
        {zoomed ? (
          <div className="dss-zoom" onClick={() => setZoomed(false)} role="button" aria-label="关闭原图">
            <img src={src} alt={target} />
          </div>
        ) : null}
      </>
    )
  }
  if (kind === 'video') {
    return <video className="dss-md-video" src={src} controls preload="metadata" onError={() => setFailed(true)} />
  }
  return <audio className="dss-md-audio" src={src} controls preload="metadata" onError={() => setFailed(true)} />
}

/** 目录树点媒体文件（通道 B）：已知精确相对路径，直接走 media 字节流。 */
function MediaDirect({ rel }: { rel: string }) {
  const [zoomed, setZoomed] = useState(false)
  const kind = mediaKind(rel)
  const src = `/sidebar-shortcuts/api/vault/media?path=${encodeURIComponent(rel)}`
  if (kind === 'image') {
    return (
      <>
        <img
          className="dss-md-img"
          src={src}
          alt={rel}
          loading="lazy"
          onClick={() => setZoomed(true)}
        />
        {zoomed ? (
          <div className="dss-zoom" onClick={() => setZoomed(false)} role="button" aria-label="关闭原图">
            <img src={src} alt={rel} />
          </div>
        ) : null}
      </>
    )
  }
  if (kind === 'video') {
    return <video className="dss-md-video" src={src} controls preload="metadata" />
  }
  if (kind === 'audio') {
    return <audio className="dss-md-audio" src={src} controls preload="metadata" />
  }
  if (kind === 'pdf') {
    return <iframe className="dss-md-pdf" src={src} title={rel} />
  }
  return <p className="dss-muted">该文件类型暂不支持预览</p>
}

// ---- Office/WPS 文档预览（docx/xlsx/pptx 解析 + 旧格式提示） ----------------

type OfficeData =
  | { kind: 'doc'; html: string }
  | { kind: 'sheet'; sheets: { name: string; html: string }[] }
  | { kind: 'slides'; slides: OfficeSlide[] }
  | { kind: 'legacy'; ext: string; hint: string }

type OfficeSlideImage = { dataUri: string } | { skipped: true; bytes: number }

type OfficeSlide = { no: number; lines: string[]; images: OfficeSlideImage[] }

/** Office 文档预览：docx 排版 / xlsx 表格（多 sheet 标签）/ pptx 幻灯片卡片 / 旧格式提示。 */
function OfficePreview({ rel, data, onOpenExternally }: {
  rel: string
  data: OfficeData
  onOpenExternally: (rel: string) => void
}) {
  if (data.kind === 'doc') {
    return <div className="dss-office dss-office-doc" dangerouslySetInnerHTML={{ __html: data.html }} />
  }
  if (data.kind === 'sheet') {
    return <SheetPreview sheets={data.sheets} />
  }
  if (data.kind === 'slides') {
    return (
      <div className="dss-office dss-office-slides">
        {data.slides.length === 0
          ? <p className="dss-muted">未能解析出幻灯片内容</p>
          : data.slides.map((slide) => (
              <div key={slide.no} className="dss-office-slide">
                <div className="dss-office-slide-no">{slide.no}</div>
                <div className="dss-office-slide-body">
                  {slide.lines.length > 0 ? (
                    <ul className="dss-office-slide-lines">
                      {slide.lines.map((line, index) => <li key={index}>{line}</li>)}
                    </ul>
                  ) : (
                    <p className="dss-muted">（本页无可提取文本）</p>
                  )}
                  {slide.images.map((image, index) => (
                    'dataUri' in image
                      ? <img key={index} className="dss-office-slide-img" src={image.dataUri} alt="" loading="lazy" />
                      : <p key={index} className="dss-muted">（内嵌图片过大已省略：{(image.bytes / 1024 / 1024).toFixed(1)}MB）</p>
                  ))}
                </div>
              </div>
            ))}
      </div>
    )
  }
  return (
    <div className="dss-office dss-office-legacy">
      <p className="dss-office-legacy-title">无法内嵌预览（{data.ext}）</p>
      <p>{data.hint}</p>
      <button type="button" className="dss-mini-btn" onClick={() => onOpenExternally(rel)}>用默认程序打开</button>
    </div>
  )
}

/** xlsx 多 sheet 标签切换。 */
function SheetPreview({ sheets }: { sheets: { name: string; html: string }[] }) {
  const [tab, setTab] = useState(0)
  const index = Math.min(tab, sheets.length - 1)
  const sheet = sheets[index]
  return (
    <div className="dss-office dss-office-sheet">
      {sheets.length > 1 ? (
        <div className="dss-office-tabs">
          {sheets.map((item, i) => (
            <button
              key={item.name}
              type="button"
              className={i === index ? 'dss-office-tab dss-office-tab--on' : 'dss-office-tab'}
              onClick={() => setTab(i)}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
      {sheet ? <div className="dss-office-table" dangerouslySetInnerHTML={{ __html: sheet.html }} /> : null}
    </div>
  )
}

/** Markdown 行内渲染：`code` / **粗** / *斜* / [链接] / [[wiki]] / ![[媒体]]。 */
function renderInline(text: string, noteRel: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(!\[\[[^\]]+\]\]|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let key = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('![[')) {
      nodes.push(<MediaEmbed key={++key} target={token.slice(3, -2)} noteRel={noteRel} />)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={++key} className="dss-md-code">{token.slice(1, -1)}</code>)
    } else if (token.startsWith('[[')) {
      nodes.push(<span key={++key} className="dss-md-wiki">{token.slice(2, -2)}</span>)
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (link?.[2]) {
        nodes.push(<a key={++key} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>)
      } else {
        nodes.push(token)
      }
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={++key}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<em key={++key}>{token.slice(1, -1)}</em>)
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/** 极简 Markdown 块级渲染（只读预览）：标题/列表/引用/代码块/表格/分隔线/段落/媒体嵌入。 */
function renderMarkdown(md: string, noteRel: string): ReactNode[] {
  const lines = md.split(/\r?\n/)
  const out: ReactNode[] = []
  let key = 0
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // 代码块
    if (/^```/.test(trimmed)) {
      const buffer: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buffer.push(lines[i])
        i += 1
      }
      i += 1 // 跳过收尾 ```
      out.push(<pre key={++key} className="dss-md-pre"><code>{buffer.join('\n')}</code></pre>)
      continue
    }

    // 独占一行的媒体嵌入（![[xxx.png/mp4/mp3]]）→ 块级渲染
    if (/^!\[\[[^\]]+\]\]$/.test(trimmed)) {
      out.push(
        <div key={++key} className="dss-md-embed">
          <MediaEmbed target={trimmed.slice(3, -2)} noteRel={noteRel} />
        </div>,
      )
      i += 1
      continue
    }

    // 标题
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      out.push(createElement(`h${level}`, { key: ++key, className: `dss-md-h dss-md-h${level}` }, renderInline(heading[2], noteRel)))
      i += 1
      continue
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      out.push(<hr key={++key} className="dss-md-hr" />)
      i += 1
      continue
    }

    // 表格：| 表头 | ... | 后跟 | --- | 分隔行
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:-]+\|$/.test(lines[i + 1].trim())) {
      const splitCells = (row: string): string[] =>
        row.replace(/\\\|/g, '\u0001').split('|').slice(1, -1)
          .map((cell) => cell.replace(/\u0001/g, '|').trim())
      const head = splitCells(line)
      i += 2
      const body: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        body.push(splitCells(lines[i]))
        i += 1
      }
      out.push(
        <table key={++key} className="dss-md-table">
          <thead>
            <tr>{head.map((cell, cellIndex) => <th key={cellIndex}>{renderInline(cell, noteRel)}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInline(cell, noteRel)}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }

    // 引用块
    if (/^>\s?/.test(line)) {
      const buffer: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buffer.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      out.push(<blockquote key={++key} className="dss-md-quote">{renderMarkdown(buffer.join('\n'), noteRel)}</blockquote>)
      continue
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(<li key={++key}>{renderInline(lines[i].replace(/^\s*[-*+]\s+/, ''), noteRel)}</li>)
        i += 1
      }
      out.push(<ul key={++key} className="dss-md-list">{items}</ul>)
      continue
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(<li key={++key}>{renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''), noteRel)}</li>)
        i += 1
      }
      out.push(<ol key={++key} className="dss-md-list">{items}</ol>)
      continue
    }

    // 空行
    if (trimmed === '') {
      i += 1
      continue
    }

    // 普通段落（连续非特殊行合并）
    const buffer: string[] = [line]
    i += 1
    while (i < lines.length) {
      const next = lines[i]
      const nextTrimmed = next.trim()
      if (nextTrimmed === '' || /^(#{1,6}\s|```|>|[-*+]\s|\d+\.\s|\||-{3,}$|\*{3,}$)/.test(next)) break
      buffer.push(next)
      i += 1
    }
    out.push(<p key={++key} className="dss-md-p">{renderInline(buffer.join(' '), noteRel)}</p>)
  }
  return out
}

/** 目录树节点（递归；dirs 按 rel 索引的懒加载内容）。 */
function TreeView({ rel, dirs, expanded, selected, filter, onToggle, onSelect }: {
  rel: string
  dirs: Record<string, DirState>
  expanded: Set<string>
  selected: string | null
  filter: string
  onToggle: (rel: string) => void
  onSelect: (rel: string, kind: string) => void
}) {
  const dirState = dirs[rel]
  if (dirState === undefined) return null
  if (dirState.status === 'loading') {
    return <div className="dss-tree-loading">加载中…</div>
  }
  if (dirState.status === 'error') {
    return <div className="dss-tree-error">{dirState.message}</div>
  }
  const keyword = filter.trim().toLowerCase()
  const matchName = (name: string): boolean => !keyword || name.toLowerCase().includes(keyword)
  const nodes: ReactNode[] = []
  for (const dir of dirState.data.dirs) {
    if (!matchName(dir.name)) continue
    const dirRel = rel ? `${rel}/${dir.name}` : dir.name
    const isOpen = expanded.has(dirRel)
    nodes.push(
      <div key={`d-${dirRel}`} className="dss-tree-item">
        <button
          type="button"
          className="dss-tree-row"
          onClick={() => onToggle(dirRel)}
          title={dirRel}
        >
          <span className="dss-tree-caret">{isOpen ? '▾' : '▸'}</span>
          <span className="dss-tree-icon">📁</span>
          <span className="dss-tree-label">{dir.name}</span>
        </button>
        {isOpen ? (
          <div className="dss-tree-children">
            <TreeView
              rel={dirRel}
              dirs={dirs}
              expanded={expanded}
              selected={selected}
              filter={filter}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          </div>
        ) : null}
      </div>,
    )
  }
  for (const file of dirState.data.files) {
    if (!matchName(file.name)) continue
    const fileRel = rel ? `${rel}/${file.name}` : file.name
    const icon = file.kind === 'image' ? '🖼️' : file.kind === 'video' ? '🎬' : file.kind === 'audio' ? '🎵'
      : file.kind === 'pdf' ? '📕' : file.kind === 'doc' ? '📝' : file.kind === 'sheet' ? '📊'
        : file.kind === 'slides' ? '📽️' : file.kind === 'legacy' ? '🗎' : '📄'
    nodes.push(
      <button
        key={`f-${fileRel}`}
        type="button"
        className={selected === fileRel ? 'dss-tree-row dss-tree-row--file dss-tree-row--selected' : 'dss-tree-row dss-tree-row--file'}
        onClick={() => onSelect(fileRel, file.kind ?? 'md')}
        title={fileRel}
      >
        <span className="dss-tree-caret" />
        <span className="dss-tree-icon">{icon}</span>
        <span className="dss-tree-label">{file.name}</span>
      </button>,
    )
  }
  return <>{nodes}</>
}

function KnowledgePanel({ onClose }: { onClose: () => void }) {
  const [vault, setVault] = useState<{ path: string; exists: boolean } | null>(null)
  const [error, setError] = useState('')
  const [openHint, setOpenHint] = useState('')
  // 目录树：rel → 子目录内容（懒加载）
  const [dirs, setDirs] = useState<Record<string, DirState>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // 当前预览
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState<{ rel: string; text: string } | null>(null)
  const [mediaRel, setMediaRel] = useState<string | null>(null) // 通道 B：直接预览的媒体路径
  const [office, setOffice] = useState<OfficeData | null>(null) // 通道 C：Office/WPS 文档预览数据
  const [loadingFile, setLoadingFile] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/sidebar-shortcuts/api/vault')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        if (body?.ok !== true) throw new Error(body?.error ?? '读取失败')
        setVault({ path: String(body.path ?? ''), exists: body.exists === true })
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 懒加载目录内容（展开时）
  const loadDir = async (rel: string): Promise<void> => {
    if (dirs[rel] !== undefined) return
    setDirs((prev) => ({ ...prev, [rel]: { status: 'loading' } }))
    try {
      const res = await fetch(`/sidebar-shortcuts/api/vault/tree?dir=${encodeURIComponent(rel)}`)
      const body = await res.json()
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setDirs((prev) => ({ ...prev, [rel]: { status: 'ready', data: { rel: body.rel ?? rel, dirs: body.dirs ?? [], files: body.files ?? [] } } }))
    } catch (err) {
      setDirs((prev) => ({ ...prev, [rel]: { status: 'error', message: err?.message ?? String(err) } }))
    }
  }

  useEffect(() => {
    void loadDir('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleDir = (rel: string): void => {
    if (expanded.has(rel)) {
      setExpanded((prev) => {
        const next = new Set(prev)
        next.delete(rel)
        return next
      })
    } else {
      void loadDir(rel)
      setExpanded((prev) => new Set(prev).add(rel))
    }
  }

  const openFile = async (rel: string, kind: string): Promise<void> => {
    setSelected(rel)
    setError('')
    // 通道 B：媒体/PDF 直接预览（精确路径走 media 字节流，Range 已支持可拖进度条）
    if (kind === 'image' || kind === 'video' || kind === 'audio' || kind === 'pdf') {
      setContent(null)
      setOffice(null)
      setMediaRel(rel)
      setLoadingFile(false)
      return
    }
    // 通道 C：Office/WPS 文档（宿主解析后返回可渲染结构）
    if (kind === 'doc' || kind === 'sheet' || kind === 'slides' || kind === 'legacy') {
      setMediaRel(null)
      setContent(null)
      setOffice(null)
      setLoadingFile(true)
      try {
        const res = await fetch(`/sidebar-shortcuts/api/vault/office?path=${encodeURIComponent(rel)}`)
        const body = await res.json()
        if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
        const officeKind = String(body.kind ?? '')
        if (officeKind === 'doc') setOffice({ kind: 'doc', html: String(body.html ?? '') })
        else if (officeKind === 'sheet') setOffice({ kind: 'sheet', sheets: Array.isArray(body.sheets) ? body.sheets : [] })
        else if (officeKind === 'slides') setOffice({ kind: 'slides', slides: Array.isArray(body.slides) ? body.slides : [] })
        else setOffice({ kind: 'legacy', ext: String(body.ext ?? ''), hint: String(body.hint ?? '') })
      } catch (err) {
        setError(`预览失败：${err?.message ?? err}`)
      } finally {
        setLoadingFile(false)
      }
      return
    }
    setMediaRel(null)
    setOffice(null)
    setLoadingFile(true)
    try {
      const res = await fetch(`/sidebar-shortcuts/api/vault/read?path=${encodeURIComponent(rel)}`)
      const body = await res.json()
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setContent({ rel: body.rel, text: body.content ?? '' })
    } catch (err) {
      setContent(null)
      setError(`读取失败：${err?.message ?? err}`)
    } finally {
      setLoadingFile(false)
    }
  }

  /** 用系统默认程序打开库内单个文件（旧版 WPS 格式兜底）。 */
  const openFileExternally = async (rel: string): Promise<void> => {
    setOpenHint('')
    try {
      const res = await fetch(`/sidebar-shortcuts/api/vault/open-file?path=${encodeURIComponent(rel)}`, { method: 'POST' })
      const body = await res.json()
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setOpenHint('已用默认程序打开')
    } catch (err) {
      setOpenHint(`打开失败：${err?.message ?? err}`)
    }
  }

  const openVaultFolder = async (): Promise<void> => {
    setOpenHint('')
    try {
      const res = await fetch('/sidebar-shortcuts/api/vault/open', { method: 'POST' })
      const body = await res.json()
      if (body?.ok !== true) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setOpenHint('已在资源管理器中打开')
    } catch (err) {
      setOpenHint(`打开失败：${err?.message ?? err}`)
    }
  }

  const obsidianUrl = vault?.path ? `obsidian://open?path=${encodeURIComponent(vault.path)}` : ''

  return (
    <ModalShell title="第二大脑 · Obsidian" onClose={onClose} wide>
      <div className="dss-panel dss-panel--kb">
        <div className="dss-kb-tree">
          <div className="dss-kb-tree-head">
            <input
              className="dss-search"
              type="search"
              placeholder="过滤当前目录…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          <div className="dss-kb-tree-body">
            {vault === null
              ? <p className="dss-muted">库信息加载中…</p>
              : !vault.exists
                ? <p className="dss-muted">库目录不存在：{vault.path}</p>
                : <TreeView
                    rel=""
                    dirs={dirs}
                    expanded={expanded}
                    selected={selected}
                    filter={filter}
                    onToggle={toggleDir}
                    onSelect={(rel, kind) => void openFile(rel, kind)}
                  />}
          </div>
        </div>
        <div className="dss-kb-preview">
          <div className="dss-kb-preview-head">
            {selected !== null ? (
              <>
                <span className="dss-kb-file-name">{selected.split('/').pop()}</span>
                <span className="dss-kb-path">{selected.includes('/') ? selected.slice(0, selected.lastIndexOf('/')) : '库根目录'}</span>
              </>
            ) : (
              <span className="dss-kb-file-name">未选择文件</span>
            )}
            <span className="dss-kb-corner">
              {vault?.exists ? (
                <>
                  <a className="dss-text-link" href={obsidianUrl} target="_blank" rel="noopener noreferrer">用 Obsidian 打开</a>
                  <button type="button" className="dss-text-link dss-text-link-btn" onClick={() => void openVaultFolder()}>打开库文件夹</button>
                </>
              ) : null}
              {openHint !== '' ? <span className="dss-hint-ok">{openHint}</span> : null}
            </span>
          </div>
          <div className="dss-kb-preview-body">
            {loadingFile
              ? <p className="dss-muted">加载中…</p>
              : error !== ''
                ? <p className="dss-muted">{error}</p>
                : mediaRel !== null
                  ? <MediaDirect rel={mediaRel} />
                  : office !== null
                    ? <OfficePreview rel={selected ?? ''} data={office} onOpenExternally={(path) => void openFileExternally(path)} />
                    : content === null
                      ? <p className="dss-muted">从左侧目录树点选笔记（📄）阅读，或直接预览图片（🖼️）/视频（🎬）/音频（🎵）/PDF（📕）/Word（📝）/表格（📊）/幻灯片（📽️）（只读，不会改动你的文件）</p>
                      : <div className="dss-md">{renderMarkdown(content.text, content.rel)}</div>}
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

// ---- 弹窗宿主（shell.overlay 槽） ------------------------------------------

function ModalHost() {
  const open = useOpenModal()

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenModal(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null
  if (open === 'plugin-market') return <MarketPanel onClose={() => setOpenModal(null)} />
  return <KnowledgePanel onClose={() => setOpenModal(null)} />
}

// ---- 插件入口 --------------------------------------------------------------

/** 客户端插件运行期上下文（slots 由客户端运行时注入，类型声明最小化）。 */
interface ShortcutsHost {
  slots: {
    inject: (name: string, callback: () => unknown) => void
    register: (options: unknown, render: () => unknown) => unknown
  }
}

// ---- 关于（设置页版本号 + 版权） -------------------------------------------

interface AboutData {
  version?: string
  copyright?: string
  email?: string
}

/** 设置页「关于」分组：桌面客户端版本号 + 版权归属。 */
function AboutSection() {
  const [about, setAbout] = useState<AboutData | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/sidebar-shortcuts/api/about')
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return
        if (body?.ok === true) setAbout(body)
      })
      .catch(() => { /* 读取失败保持空态 */ })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="dss-about">
      <h2 className="dss-about-title">DeepSeek Harness 桌面客户端</h2>
      <div className="dss-about-list">
        <div className="dss-about-row">
          <span className="dss-about-key">版本号</span>
          <span className="dss-about-value">{about?.version ? `v${about.version}` : '读取中…'}</span>
        </div>
        <div className="dss-about-row">
          <span className="dss-about-key">版权归属</span>
          <span className="dss-about-value">{about?.copyright ?? 'Ambin.D'}</span>
        </div>
        <div className="dss-about-row">
          <span className="dss-about-key">联系邮箱</span>
          <span className="dss-about-value">
            {about?.email ? <a className="dss-text-link" href={`mailto:${about.email}`}>{about.email}</a> : '—'}
          </span>
        </div>
        <div className="dss-about-row">
          <span className="dss-about-key">界面内核</span>
          <span className="dss-about-value">官方 DeepSeek Harness Web GUI</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 客户端插件入口：
 *   1. 注入本插件样式（--dsw-* 色板，不设字体，随插件卸载移除）；
 *   2. sidebar.footer.action 注册两个入口（插件市场 / 知识库）；
 *   3. shell.overlay 注册居中大面板宿主（关闭时渲染 null）；
 *   4. settings.section 注册「关于」分组（版本号 + 版权）。
 */
export function apply(ctx: Context): void {
  // 样式注入：构建时 CSS 以文本内联，这里写入 <style> 标签
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const tag = document.createElement('style')
    tag.dataset.sidebarShortcutsCss = '1'
    tag.textContent = styles
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'dsh-sidebar-shortcuts: stylesheet')

  const { slots } = ctx as unknown as ShortcutsHost

  // 一个 inject 回调返回多个 register 的注销器（iterable effect，事务式安装）
  slots.inject('sidebar.footer.action', () => [
    slots.register(
      { name: 'sidebar.footer.action', id: 'dss-plugin-market', order: 1, label: '插件市场' },
      () => FootButton({ kind: 'plugin-market', label: '插件市场' }),
    ),
    slots.register(
      { name: 'sidebar.footer.action', id: 'dss-knowledge', order: 2, label: '知识库' },
      () => FootButton({ kind: 'knowledge', label: '知识库' }),
    ),
  ])

  slots.inject('shell.overlay', () =>
    slots.register(
      { name: 'shell.overlay', id: 'dss-shortcut-modals', order: 50, label: '侧边栏快捷弹窗' },
      () => ModalHost(),
    ),
  )

  // 设置页「关于」：版本号与版权归属
  slots.inject('settings.section', () =>
    slots.register(
      { name: 'settings.section', id: 'dss-about', order: 99, label: '关于' },
      () => AboutSection(),
    ),
  )
}
