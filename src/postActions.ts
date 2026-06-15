import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { cyan, green, yellow } from 'kolorist'
import type { ProjectOptions } from './prompts'

/**
 * Post-generation actions: clone .reference, git init, install deps
 */
export async function postGenerate(options: ProjectOptions, targetDir: string): Promise<void> {
  // Clone .reference if selected
  if (options.scaffold.reference) {
    await cloneReference(targetDir)
  }

  // Initialize git repository
  await initGit(targetDir)

  // Prompt user to install deps (don't auto-install to keep it fast)
  console.log()
  console.log(green('  项目创建完成！'))
  console.log()
  console.log(`  ${cyan('cd')} ${options.projectName}`)
  console.log(`  ${cyan(`${options.packageManager} install`)}`)
  console.log(`  ${cyan(`${options.packageManager === 'npm' ? 'npm run' : options.packageManager} dev`)}`)
  if (options.scaffold.docGovernance) {
    console.log(`  ${cyan(`${options.packageManager === 'npm' ? 'npm run' : options.packageManager} docs:lint`)}  # 文档治理检查`)
  }
  console.log()
}

async function cloneReference(targetDir: string): Promise<void> {
  const refDir = path.join(targetDir, '.reference', 'art-design-pro')

  console.log(`  ${cyan('⏳')} 克隆 .reference/art-design-pro ...`)

  try {
    fs.mkdirSync(path.join(targetDir, '.reference'), { recursive: true })
    execSync(
      `git clone --depth 1 https://github.com/Daymychen/art-design-pro.git "${refDir}"`,
      { stdio: 'pipe' },
    )
    // Remove .git to avoid submodule issues
    const gitDir = path.join(refDir, '.git')
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true })
    }
    console.log(`  ${green('✔')} .reference/art-design-pro 克隆完成`)
  } catch {
    console.log(`  ${yellow('⚠')} .reference 克隆失败，可稍后手动执行：`)
    console.log(`    git clone --depth 1 https://github.com/Daymychen/art-design-pro.git .reference/art-design-pro`)
  }
}

async function initGit(targetDir: string): Promise<void> {
  try {
    execSync('git init', { cwd: targetDir, stdio: 'pipe' })
    console.log(`  ${green('✔')} Git 仓库已初始化`)
  } catch {
    console.log(`  ${yellow('⚠')} Git 初始化失败，请手动执行 git init`)
  }
}
