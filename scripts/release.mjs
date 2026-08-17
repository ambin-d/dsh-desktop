/**
 * 发布脚本：每次封装安装包前自动升版本号（用户规则：不允许重复版本号）。
 *
 * 用法：
 *   node scripts/release.mjs [patch|minor|major]   # 缺省 patch（1.0.0 → 1.0.1）
 *   npm run release                                # 升版 + 立即打包
 *
 * 版本号来自 package.json，electron-builder 的安装包文件名
 * （DeepSeek Harness Setup <version>.exe）随版本自动递增。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG_PATH = join(ROOT, 'package.json')

const kind = process.argv[2] ?? 'patch'
if (!['patch', 'minor', 'major'].includes(kind)) {
  console.error('用法: node scripts/release.mjs [patch|minor|major]')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map((part) => Number(part))
let next
if (kind === 'major') next = [major + 1, 0, 0]
else if (kind === 'minor') next = [major, minor + 1, 0]
else next = [major, minor, patch + 1]
const nextVersion = next.join('.')

pkg.version = nextVersion
writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
console.log(`版本已升: ${pkg.version}（原 ${[major, minor, patch].join('.')}，${kind}）`)
console.log(`下一步: npm run dist → 产出 DeepSeek Harness Setup ${nextVersion}.exe`)
