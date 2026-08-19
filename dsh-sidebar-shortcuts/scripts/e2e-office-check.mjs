/**
 * 端到端验证：直接 import 构建产物 lib/index.js，用其 officePreview 解析
 * 真实 docx/xlsx 与构造的 pptx、legacy 提示。跑完即删（一次性验证脚本）。
 */
import { writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { officePreview } from '../lib/index.js'

let failed = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed += 1
}

// 1. 真实 docx（环境变量 DSH_E2E_VAULT + DSH_E2E_DOCX_REL；未设置则跳过本项）
const docxVault = process.env.DSH_E2E_VAULT
const docxRel = process.env.DSH_E2E_DOCX_REL
if (!docxVault || !docxRel) {
  console.log('[SKIP] docx 解析（未设置 DSH_E2E_VAULT/DSH_E2E_DOCX_REL）')
} else {
  try {
    const result = await officePreview(docxVault, docxRel)
    check('docx 解析', result.kind === 'doc' && result.html.length > 500, `kind=${result.kind}, html=${result.html?.length} chars`)
  } catch (error) {
    check('docx 解析', false, error?.message)
  }
}

// 2. 真实 xlsx（环境变量 DSH_E2E_XLSX；未设置则跳过本项。库外路径测试：先复制进临时目录当 vault）
const tmpVault = join(tmpdir(), 'dsh-office-e2e-vault')
const xlsxSource = process.env.DSH_E2E_XLSX
if (!xlsxSource) {
  console.log('[SKIP] xlsx 解析（未设置 DSH_E2E_XLSX）')
} else {
  try {
    const { mkdirSync, copyFileSync } = await import('node:fs')
    mkdirSync(tmpVault, { recursive: true })
    copyFileSync(xlsxSource, join(tmpVault, 'kebiao.xlsx'))
    const result = await officePreview(tmpVault, 'kebiao.xlsx')
    check('xlsx 解析', result.kind === 'sheet' && result.sheets.length >= 1, `kind=${result.kind}, sheets=${result.sheets?.length}, html=${result.sheets?.[0]?.html?.length} chars`)
  } catch (error) {
    check('xlsx 解析', false, error?.message)
  }
}

// 3. 构造 pptx 文件后解析
try {
  const { mkdirSync } = await import('node:fs')
  mkdirSync(tmpVault, { recursive: true })
  // 复用插件目录 node_modules 的 jszip 生成最小 pptx（仅测试脚本用）
  const { default: JSZipMod } = await import('../node_modules/jszip/lib/index.js').catch(async () => ({}))
  const JSZip = JSZipMod?.default ?? JSZipMod
  if (!JSZip) throw new Error('jszip 不可用')
  const zip = new JSZip()
  zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>标题 &amp; 要点</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>')
  zip.file('ppt/slides/_rels/slide1.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>')
  zip.file('ppt/media/image1.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
  const pptxPath = join(tmpVault, 'demo.pptx')
  writeFileSync(pptxPath, await zip.generateAsync({ type: 'nodebuffer' }))
  const result = await officePreview(tmpVault, 'demo.pptx')
  const slide = result.slides?.[0]
  check('pptx 解析', result.kind === 'slides' && slide?.lines?.includes('标题 & 要点') && slide?.images?.length === 1,
    `kind=${result.kind}, lines=${JSON.stringify(slide?.lines)}, images=${slide?.images?.length}`)
} catch (error) {
  check('pptx 解析', false, error?.message)
}

// 4. legacy 提示
try {
  const { mkdirSync, writeFileSync: w } = await import('node:fs')
  mkdirSync(tmpVault, { recursive: true })
  w(join(tmpVault, 'old.wps'), Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))
  const result = await officePreview(tmpVault, 'old.wps')
  check('legacy 提示', result.kind === 'legacy' && result.hint.includes('另存为 docx'), `kind=${result.kind}`)
} catch (error) {
  check('legacy 提示', false, error?.message)
}

// 5. 防穿越（路径越界必须拒绝）
try {
  await officePreview(tmpVault, '../outside.docx')
  check('防目录穿越', false, '未拒绝越界路径')
} catch (error) {
  check('防目录穿越', /越界|非法/.test(error?.message ?? ''), error?.message)
}

// 清理临时目录
try { rmSync(tmpVault, { recursive: true, force: true }) } catch { /* 忽略 */ }

console.log(failed === 0 ? '\nALL E2E CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
