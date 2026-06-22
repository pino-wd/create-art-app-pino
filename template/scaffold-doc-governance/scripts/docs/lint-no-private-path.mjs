#!/usr/bin/env node

/**
 * 检测 docs/ 中的私人绝对路径，避免将本机目录泄露到仓库。
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DOCS_DIR = path.resolve('docs')
const PRIVATE_PATH_PATTERNS = [
  /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//,
  /[A-Za-z]:\\Users\\[^\\\r\n]+\\/i,
]

if (!fs.existsSync(DOCS_DIR)) {
  console.log('✅ No docs/ directory found. Skipping.')
  process.exit(0)
}

const markdownFiles = collectFiles(DOCS_DIR)
const violations: Array<{ file: string, line: number, content: string }> = []

for (const filePath of markdownFiles) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split(/\r?\n/u)

  lines.forEach((line, index) => {
    if (PRIVATE_PATH_PATTERNS.some(pattern => pattern.test(line))) {
      violations.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        content: line.trim(),
      })
    }
  })
}

if (violations.length === 0) {
  console.log('✅ No private paths found.')
  process.exit(0)
}

for (const violation of violations) {
  console.error(`❌ ${violation.file}:${violation.line}`)
  console.error(`   ${violation.content}`)
}

console.error('\n⛔ Private absolute paths detected in docs/. Use relative paths instead.')
process.exit(1)

function collectFiles(dir: string): string[] {
  const results: string[] = []

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath))
      continue
    }

    if (entry.name.endsWith('.md')) {
      results.push(fullPath)
    }
  }

  return results
}
