import fs from 'node:fs'
import path from 'node:path'
import minimist from 'minimist'
import { showBanner, logError } from './utils/banner'
import { getProjectOptions } from './prompts'
import { generate } from './generator'
import { postGenerate } from './postActions'

async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2), {
    // 注意：git/hooks 不能放进 boolean 列表——minimist 会让未传入的 boolean 默认为 false，
    // 导致 resolveScaffoldOption 把"未指定"误判为"显式关闭"，破坏脚手架默认开启行为。
    // 参照 reference/vscode/agents：未声明时 --no-x 解析为 false、未传为 undefined、--x 为 true。
    boolean: ['default', 'history', 'hash'],
    string: ['auth', 'package-manager'],
  })

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
