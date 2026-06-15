import { bold, cyan, green, red } from 'kolorist'

export function showBanner(): void {
  console.log()
  console.log(bold(cyan('  create-art-app-pino')))
  console.log()
  console.log(`  ${green('✔')} Art Design Pro based project scaffold`)
  console.log()
}

export function logSuccess(projectName: string, packageManager: string): void {
  console.log()
  console.log(green(`  ✔ 项目 ${bold(projectName)} 创建成功！`))
  console.log()
  console.log(`  ${cyan('cd')} ${projectName}`)
  console.log(`  ${cyan(`${packageManager} install`)}`)
  console.log(`  ${cyan(`${packageManager === 'npm' ? 'npm run' : packageManager} dev`)}`)
  console.log()
}

export function logError(message: string): void {
  console.error(red(`  ✖ ${message}`))
}
