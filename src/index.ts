import fs from 'node:fs'
import path from 'node:path'
import minimist from 'minimist'
import { showBanner, logError } from './utils/banner'
import { getProjectOptions } from './prompts'
import { generate } from './generator'
import { postGenerate } from './postActions'

async function main(): Promise<void> {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['default', 'history', 'hash', 'git', 'hooks'],
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
  if (fs.existsSync(targetDir)) {
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

  await generate(options, targetDir)
  await postGenerate(options, targetDir)
}

main().catch((err) => {
  logError(err.message || '未知错误')
  process.exit(1)
})
