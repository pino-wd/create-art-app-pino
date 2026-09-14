import { bold, cyan, green, red } from 'kolorist'

export function showBanner(): void {
  console.log()
  console.log(bold(cyan('  create-art-app-pino')))
  console.log()
  console.log(`  ${green('✔')} Art Design Pro based project scaffold`)
  console.log()
}

export function logError(message: string): void {
  console.error(red(`  ✖ ${message}`))
}
