import fs from 'node:fs'
import path from 'node:path'
import minimist from 'minimist'
import { showBanner, logError } from './utils/banner'
import { getProjectOptions } from './prompts'
import { generate } from './generator'
import { postGenerate } from './postActions'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const scaffoldFlags = ['reference', 'vscode', 'agents', 'git', 'hooks', 'doc-governance']
  const argv = minimist(args, {
    boolean: ['default', 'history', 'hash', ...scaffoldFlags],
    string: ['auth', 'package-manager'],
  })

  // 布尔开关不能吞掉后续项目名；未显式传入的开关交回交互选项决定。
  const optionArgs = args.slice(0, args.indexOf('--') === -1 ? args.length : args.indexOf('--'))
  for (const flag of scaffoldFlags) {
    const specified = optionArgs.some(arg => arg === `--${flag}` || arg === `--no-${flag}` || arg.startsWith(`--${flag}=`))
    if (!specified) delete argv[flag]
  }

  showBanner()

  // Get project options from prompts or CLI flags
  const options = await getProjectOptions(argv)
  if (!options) {
    logError('操作已取消')
    process.exit(1)
  }

  // Resolve target directory
  const cwd = process.cwd()
  const targetDir = path.join(cwd, options.projectName)

  // Check if target directory already exists
  const targetDirExisted = fs.existsSync(targetDir)
  if (targetDirExisted) {
    const entries = fs.readdirSync(targetDir)
    if (entries.length > 0) {
      logError(`目录 ${options.projectName} 已存在且不为空`)
      process.exit(1)
    }
  } else {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  // Generate project
  console.log()
  console.log(`  正在创建项目 ${options.projectName} ...`)
  console.log()

  try {
    await generate(options, targetDir)
    await postGenerate(options, targetDir)
  } catch (err) {
    // 生成失败时清理半成品：仅当目标目录是本轮新建的才删除，
    // 用户预先创建的空目录保持原状，避免误删用户已有内容。
    if (!targetDirExisted) {
      fs.rmSync(targetDir, { recursive: true, force: true })
    }
    throw err
  }
}

main().catch((err) => {
  logError(err.message || '未知错误')
  process.exit(1)
})
