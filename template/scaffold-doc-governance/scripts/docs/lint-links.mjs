#!/usr/bin/env node

/**
 * 使用 lychee 检查 docs/ 死链；未安装时仅给出提示并跳过。
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

if (!fs.existsSync(path.resolve('docs'))) {
  console.log('✅ No docs/ directory found. Skipping.')
  process.exit(0)
}

try {
  execFileSync('lychee', ['--no-progress', 'docs/'], { stdio: 'inherit' })
} catch (error) {
  if (isMissingBinary(error)) {
    console.log('⚠️  lychee is not installed. Skipping link check.')
    console.log('   Install: brew install lychee (macOS) or cargo install lychee')
    process.exit(0)
  }

  process.exit(1)
}

function isMissingBinary(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
