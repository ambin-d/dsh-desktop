/**
 * 构建 dsh-social-bridge 客户端 bundle。
 *
 * 产出 lib/client.js，格式与 DSH Web 壳期望的线上格式一致：
 * window.__ModuleLoader__.load({ id, factory }) 的 CJS 工厂，平台模块
 * （react 等）经注入的 require（loader 模块表）解析，其余全部内联；
 * CSS 以文本内联（--loader:.css=text），由入口 apply() 注入 <style>。
 *
 * esbuild 从 DSH 源码仓库解析（插件本体零运行时依赖）。
 * 本插件位于仓库根的 desktop/social-bridge，仓库根默认为其三级上级，
 * 也可用环境变量 DSH_SOURCE 覆盖。
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/** DSH 源码仓库根（本插件位于仓库根的 desktop/social-bridge，上两级即仓库根）；可用 $DSH_SOURCE 覆盖。 */
const CHECKOUT = process.env.DSH_SOURCE ?? resolve(ROOT, '..', '..')

/** loader 入口名必须与包名完全一致（client-modules 按包名解析注册 id）。 */
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const PLUGIN_ID = MANIFEST.name

/**
 * 平台模块表：必须与 packages/client/web/src/platform.ts 保持一致。
 * 这些模块由客户端运行时提供，构建时不内联。
 */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

/** 在 pnpm checkout 中定位 esbuild（store 或 hoisted）。 */
function resolveEsbuild(checkout) {
  const store = join(checkout, 'node_modules/.pnpm')
  if (existsSync(store)) {
    const entries = readdirSync(store).filter((name) => name.startsWith('esbuild@')).sort()
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const candidate = join(store, entries[i], 'node_modules/esbuild/package.json')
      if (existsSync(candidate)) return candidate
    }
  }
  const hoisted = join(checkout, 'node_modules/esbuild/package.json')
  if (existsSync(hoisted)) return hoisted
  throw new Error(`esbuild 未找到：${checkout}（可用 DSH_SOURCE 指定 DSH 仓库根）`)
}

const require = createRequire(resolveEsbuild(CHECKOUT))
const esbuild = require('esbuild')

const banner = [
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
  'var module = { exports: {} }; var exports = module.exports;',
].join('\n')
const footer = 'return module.exports; } });'

await esbuild.build({
  entryPoints: [join(ROOT, 'src/client/index.tsx')],
  outfile: join(ROOT, 'lib/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  charset: 'utf8',
  external: EXTERNALS,
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env': '{"MODE":"production"}',
  },
  loader: { '.css': 'text' },
  banner: { js: banner },
  footer: { js: footer },
})

console.log('lib/client.js built')
