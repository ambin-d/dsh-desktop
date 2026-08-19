/**
 * 验证 Office 预览解析链路（与 lib/index.js 中 officePreview 同款逻辑）：
 *   1. 真实 docx → mammoth HTML
 *   2. 真实 xlsx → SheetJS 表格
 *   3. 构造的最小 pptx → jszip 幻灯片提取（文本 + 内嵌图片）
 * 依赖解析自插件目录 node_modules（scripts/ 向上查找）。
 */
import { extname } from 'node:path'

const officeLibCache = new Map()
async function officeLib(name) {
  if (officeLibCache.has(name)) return officeLibCache.get(name)
  const mod = await import(name)
  const value = mod.default ?? mod
  officeLibCache.set(name, value)
  return value
}

function decodeXmlEntities(text) {
  return String(text)
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function normalizeZipPath(base) {
  const parts = String(base).replaceAll('\\', '/').split('/')
  const out = []
  for (const part of parts) {
    if (part === '..') out.pop()
    else if (part !== '.' && part !== '') out.push(part)
  }
  return out.join('/')
}

const MEDIA_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
}

async function pptxSlide(zip, no) {
  const lines = []
  const images = []
  const xml = await zip.files[`ppt/slides/slide${no}.xml`].async('string')
  for (const paragraph of xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)) {
    const runs = [...paragraph[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
    const line = runs.map((match) => decodeXmlEntities(match[1])).join('')
    if (line.trim()) lines.push(line)
  }
  const relsFile = zip.files[`ppt/slides/_rels/slide${no}.xml.rels`]
  if (relsFile) {
    const rels = await relsFile.async('string')
    for (const tag of rels.matchAll(/<Relationship\b[^>]*\/>/g)) {
      const type = /Type="([^"]+)"/.exec(tag[0])?.[1] ?? ''
      const target = /Target="([^"]+)"/.exec(tag[0])?.[1] ?? ''
      if (!/\/image$/.test(type) || !target) continue
      const mediaPath = normalizeZipPath(`ppt/slides/${target}`)
      const entry = zip.files[mediaPath]
      if (!entry) continue
      const data = await entry.async('nodebuffer')
      const mime = MEDIA_TYPES[extname(mediaPath).toLowerCase()] ?? 'image/png'
      if (data.length <= 1024 * 1024) images.push({ dataUri: `data:${mime};base64,${data.toString('base64')}`.slice(0, 60) + '…', bytes: data.length })
      else images.push({ skipped: true, bytes: data.length })
    }
  }
  return { no, lines, images }
}

// ---- 1. docx（环境变量 DSH_OFFICE_DOCX 指定真实文件；未设置则跳过） ----
{
  const docxPath = process.env.DSH_OFFICE_DOCX
  if (!docxPath) {
    console.log('[docx] skip（未设置 DSH_OFFICE_DOCX）')
  } else {
    const mammoth = await officeLib('mammoth')
    const { readFileSync } = await import('node:fs')
    const result = await mammoth.convertToHtml({ buffer: readFileSync(docxPath) })
    console.log(`[docx] ok, html=${result.value.length} chars`)
    console.log(`[docx] head: ${result.value.replace(/\s+/g, ' ').slice(0, 120)}`)
  }
}

// ---- 2. xlsx（环境变量 DSH_OFFICE_XLSX 指定真实文件；未设置则跳过） ----
{
  const xlsxPath = process.env.DSH_OFFICE_XLSX
  if (!xlsxPath) {
    console.log('[xlsx] skip（未设置 DSH_OFFICE_XLSX）')
  } else {
    const XLSX = await officeLib('xlsx')
    const { readFileSync } = await import('node:fs')
    const workbook = XLSX.read(readFileSync(xlsxPath), { type: 'buffer' })
    console.log(`[xlsx] ok, sheets=${workbook.SheetNames.join(', ')}`)
    for (const sheetName of workbook.SheetNames) {
      const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], { header: '', footer: '' })
      console.log(`[xlsx] ${sheetName}: html=${html.length} chars, head=${html.replace(/\s+/g, ' ').slice(0, 100)}`)
    }
  }
}

// ---- 3. pptx（构造最小样例） ----
{
  const JSZip = await officeLib('jszip')
  const zip = new JSZip()
  zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>第一页标题</a:t></a:r></a:p><a:p><a:r><a:t>要点一 &amp; 二</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>')
  zip.file('ppt/slides/slide2.xml', '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>第二页只有文字</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>')
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>')
  zip.file('ppt/media/image1.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  const loaded = await JSZip.loadAsync(buffer)
  const slidePaths = Object.keys(loaded.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
  const numbers = slidePaths.map((p) => Number(/slide(\d+)\.xml$/.exec(p)?.[1] ?? 0)).filter((n) => n > 0).sort((a, b) => a - b)
  console.log(`[pptx] slide files detected: ${slidePaths.join(', ')}`)
  for (const no of numbers) {
    const slide = await pptxSlide(loaded, no)
    console.log(`[pptx] slide${no}: lines=${JSON.stringify(slide.lines)}, images=${slide.images.length}`)
  }
}

console.log('all office preview checks passed')
