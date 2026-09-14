#!/usr/bin/env node
/**
 * CLI 冒烟测试基线（C 批）
 *
 * 目标：非交互、无网络、无 git 依赖地验证生成链路的结构性正确性。
 * 仅使用 node 内置模块（child_process / assert / fs / os / path），零新依赖。
 *
 * 用法：pnpm test:smoke（先 build 再跑）；或 build 后直接 node scripts/smoke.mjs
 *
 * 注意：CLI 校验项目名只接受 /^[a-z0-9-]+$/ 且 targetDir = cwd/<projectName>，
 * 因此必须在临时根目录下以纯项目名调用，不能传绝对路径。
 */
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distCli = path.join(projectRoot, 'dist', 'index.cjs')

if (!fs.existsSync(distCli)) {
  console.error('未找到 dist/index.cjs，请先执行 pnpm build 再运行冒烟测试')
  process.exit(1)
}

/**
 * 3 组矩阵：
 * - smoke-art：默认 art 认证（默认 features / scaffold 全开，仅关 reference 与 git）
 * - smoke-zhs：zhs 别名 → zhihuishu 认证
 * - smoke-zhs-bare：zhihuishu 别名 + --no-hooks/--no-agents，验证关闭开关
 */
const combos = [
  {
    name: 'smoke-art',
    auth: 'art',
    args: ['smoke-art', '--default', '--no-reference', '--no-git'],
  },
  {
    name: 'smoke-zhs',
    auth: 'zhihuishu',
    args: ['smoke-zhs', '--default', '--auth', 'zhs', '--no-reference', '--no-git'],
  },
  {
    name: 'smoke-zhs-bare',
    auth: 'zhihuishu',
    bare: true,
    args: ['smoke-zhs-bare', '--default', '--auth', 'zhihuishu', '--no-reference', '--no-git', '--no-hooks', '--no-agents'],
  },
]

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-art-app-smoke-'))
const failures = []

try {
  for (const combo of combos) {
    console.log(`\n▶ 组合 ${combo.name} ...`)
    try {
      runCombo(combo, tmpRoot)
      console.log(`  ✔ ${combo.name} 全部断言通过`)
    } catch (err) {
      failures.push({ combo: combo.name, error: err })
      console.error(`  ✖ ${combo.name} 失败：${err.message}`)
    }
  }
} finally {
  // 无论成败都清理临时目录，避免残留
  fs.rmSync(tmpRoot, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\n冒烟测试失败（${failures.length}/${combos.length} 组合）：`)
  for (const { combo, error } of failures) {
    console.error(`\n[${combo}] ${error.message}`)
    if (error.details) {
      console.error(error.details)
    }
  }
  process.exit(1)
}

console.log(`\n冒烟测试通过：${combos.length}/${combos.length} 组合`)

function runCombo(combo, tmpRoot) {
  const run = spawnSync(process.execPath, [distCli, ...combo.args], {
    cwd: tmpRoot,
    encoding: 'utf8',
  })

  if (run.status !== 0) {
    const err = new Error(`CLI 退出码 ${run.status}（期望 0）`)
    err.details = [
      `  stdout 尾部：${tail(run.stdout)}`,
      `  stderr 尾部：${tail(run.stderr)}`,
    ].join('\n')
    throw err
  }

  const projectDir = path.join(tmpRoot, combo.name)
  assertCommonArtifacts(projectDir)
  assertAuthOverlayDirection(combo, projectDir)
  assertScaffoldToggles(combo, projectDir)
  if (combo.name === 'smoke-zhs') {
    assertDocGovernanceMarker(projectDir)
  }
}

/** 通用断言：重命名、EJS 清理、依赖合并、auth overlay 基础产物 */
function assertCommonArtifacts(projectDir) {
  assert(fs.existsSync(path.join(projectDir, '.gitignore')), '应存在 .gitignore（_ 前缀重命名产物）')

  const underscoreLeftovers = fs.readdirSync(projectDir).filter(e => e.startsWith('_'))
  assert(
    underscoreLeftovers.length === 0,
    `根目录不应存在 _ 前缀残留（_gitignore/_vscode/_env 等），实际：${underscoreLeftovers.join(', ')}`,
  )

  const ejsLeftovers = walkFiles(projectDir).filter(f => f.endsWith('.ejs'))
  assert(
    ejsLeftovers.length === 0,
    `全树不应存在 .ejs 残留文件，实际：${ejsLeftovers.slice(0, 10).join(', ')}`,
  )

  const pkgPath = path.join(projectDir, 'package.json')
  assert(fs.existsSync(pkgPath), '应存在 package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const deps = pkg.dependencies || {}
  assert('echarts' in deps, 'dependencies 应含 echarts（base 模板）')
  // 三组均为 --default（features 全开），模板型特性依赖同样应合并就位
  assert('md-editor-v3' in deps, 'dependencies 应含 md-editor-v3（feature-markdown）')
  assert('@microsoft/fetch-event-source' in deps, 'dependencies 应含 @microsoft/fetch-event-source（feature-sse）')

  assert(fs.existsSync(path.join(projectDir, 'src', 'router', 'index.ts')), '应存在 src/router/index.ts（auth overlay 提供）')
  assert(fs.existsSync(path.join(projectDir, 'src', 'utils', 'http', 'index.ts')), '应存在 src/utils/http/index.ts（auth overlay 提供）')
}

/** overlay 方向断言：art 与 zhihuishu 互斥产物 */
function assertAuthOverlayDirection(combo, projectDir) {
  const authService = path.join(projectDir, 'src', 'services', 'authService.ts')
  const loginPage = path.join(projectDir, 'src', 'pages', 'auth', 'login', 'index.vue')

  if (combo.auth === 'zhihuishu') {
    assert(fs.existsSync(authService), 'zhihuishu 认证应生成 src/services/authService.ts')
    assert(!fs.existsSync(loginPage), 'zhihuishu 认证不应存在 Art 登录页 src/pages/auth/login/index.vue')
  } else {
    assert(fs.existsSync(loginPage), 'art 认证应生成登录页 src/pages/auth/login/index.vue')
    assert(!fs.existsSync(authService), 'art 认证不应存在 src/services/authService.ts')
  }
}

/** 脚手架开关断言：agentsMd / commitChecks 产物 */
function assertScaffoldToggles(combo, projectDir) {
  const agentsMd = path.join(projectDir, 'AGENTS.md')
  const huskyDir = path.join(projectDir, '.husky')
  const commitlint = path.join(projectDir, 'commitlint.config.mjs')

  if (combo.bare) {
    assert(!fs.existsSync(agentsMd), '--no-agents 时不应生成 AGENTS.md')
    assert(!fs.existsSync(huskyDir), '--no-hooks 时不应生成 .husky/')
    assert(!fs.existsSync(commitlint), '--no-hooks 时不应生成 commitlint.config.mjs')
  } else {
    assert(fs.existsSync(agentsMd), '默认应生成 AGENTS.md')
    assert(fs.existsSync(huskyDir), '默认应生成 .husky/')
    assert(fs.existsSync(commitlint), '默认应生成 commitlint.config.mjs')
  }
}

/** docGovernance 默认开启的产物标记（scaffold-doc-governance overlay） */
function assertDocGovernanceMarker(projectDir) {
  assert(
    fs.existsSync(path.join(projectDir, 'scripts', 'docs', 'lint-frontmatter.mjs')),
    'docGovernance 应生成 scripts/docs/lint-frontmatter.mjs',
  )
}

/** 递归收集全树文件（跳过 node_modules/.git，正常情况下不会存在） */
function walkFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      results.push(...walkFiles(fullPath))
    } else {
      results.push(fullPath)
    }
  }
  return results
}

function tail(text, max = 2000) {
  const trimmed = (text || '').trim()
  return trimmed.length > max ? `...${trimmed.slice(-max)}` : trimmed
}

