/**
 * 发布前预检：工作区干净、HEAD 已打对应版本 tag、npm pack 清单干净且完整。
 *
 * 背景：1.0.2 曾从含未提交修复的工作区发布，导致 npm 包内容与 tag 不一致。
 * 紧急发布可设 SKIP_PREPUBLISH_CHECK=1 临时跳过本预检。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SKIP_ENV = 'SKIP_PREPUBLISH_CHECK'

if (process.env[SKIP_ENV] === '1') {
  console.log(`[prepublish-check] 检测到 ${SKIP_ENV}=1，跳过预检`)
  process.exit(0)
}

function fail(message) {
  console.error(`[prepublish-check] ✗ ${message}`)
  console.error(`[prepublish-check] 如确需跳过，可用 ${SKIP_ENV}=1 pnpm publish 临时放行`)
  process.exit(1)
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8' }).trim()
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const version = pkg.version

// 1. 工作区必须干净，避免把未提交内容打进发布物
const status = run('git', ['status', '--porcelain'])
if (status) {
  fail(`工作区存在未提交改动：\n${status}`)
}

// 2. HEAD 必须已打对应版本 tag，保证发布物可溯源
const tagsAtHead = run('git', ['tag', '--points-at', 'HEAD']).split('\n').filter(Boolean)
if (!tagsAtHead.includes(`v${version}`)) {
  fail(`HEAD 未打 v${version} 标签（当前指向 tag：${tagsAtHead.join(', ') || '无'}），请先 git tag v${version}`)
}

// 3. npm pack 清单：不得含开发产物，且必须包含运行所需文件
let packInfo
try {
  const [first] = JSON.parse(run('npm', ['pack', '--dry-run', '--json']))
  packInfo = first
}
catch (error) {
  fail(`npm pack --dry-run 解析失败：${error.message}`)
}

const paths = packInfo.files.map(file => file.path)

const forbidden = paths.filter(path => (
  path.startsWith('src/')
  || path.startsWith('docs/')
  || path.startsWith('_test-output/')
  || path.startsWith('node_modules/')
  || path.includes('/node_modules/')
))
if (forbidden.length > 0) {
  fail(`发布物包含不应发布的路径：\n${forbidden.slice(0, 10).join('\n')}`)
}

const required = ['package.json', 'README.md', 'MIGRATION.md', 'LICENSE', 'dist/index.cjs']
const missing = required.filter(path => !paths.includes(path))
if (missing.length > 0) {
  fail(`发布物缺少必要文件：${missing.join(', ')}`)
}

if (!paths.some(path => path.startsWith('template/'))) {
  fail('发布物缺少 template/ 模板目录')
}

console.log(`[prepublish-check] ✓ 预检通过：v${version}，${paths.length} 个文件待发布`)
