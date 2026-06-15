#!/usr/bin/env node

/**
 * lint-naming.mjs
 * Validates file naming conventions in docs/**\/*.md.
 *
 * Rules:
 * - kebab-case filenames (a-z0-9 with hyphens)
 * - changes/requirements/ and maintenance/incidents/ → YYYY-MM-DD- prefix required
 * - adr/ → NNNN- four-digit prefix required
 * - Exceptions: README.md, CHANGELOG.md, .gitkeep
 */

import fs from 'node:fs'
import path from 'node:path'

const DOCS_DIR = path.resolve('docs')
const EXCLUDE_DIRS = new Set(['templates', 'archive'])
const EXCEPTIONS = new Set(['README.md', 'CHANGELOG.md', '.gitkeep'])

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-.+\.md$/
const ADR_PREFIX_RE = /^\d{4}-.+\.md$/

const DATE_REQUIRED = ['changes/requirements', 'maintenance/incidents']

function collectMarkdownFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) results.push(...collectMarkdownFiles(full))
    } else if (entry.name.endsWith('.md')) {
      results.push({ fullPath: full, name: entry.name })
    }
  }
  return results
}

let hasError = false
const files = collectMarkdownFiles(DOCS_DIR)

if (files.length === 0) {
  console.log('✅ No docs found to validate.')
  process.exit(0)
}

for (const { fullPath, name } of files) {
  if (EXCEPTIONS.has(name)) continue

  const relToDocs = path.relative(DOCS_DIR, fullPath)
  const relToCwd = path.relative(process.cwd(), fullPath)
  const errors = []

  // Normalize path separators for matching
  const normalized = relToDocs.split(path.sep).join('/')

  const needsDate = DATE_REQUIRED.some(p => normalized.startsWith(p + '/'))
  const isAdr = normalized.startsWith('adr/')

  if (needsDate) {
    if (!DATE_PREFIX_RE.test(name)) {
      errors.push('requires YYYY-MM-DD- prefix (e.g., 2026-01-15-feature-name.md)')
    }
  } else if (isAdr) {
    if (!ADR_PREFIX_RE.test(name)) {
      errors.push('requires NNNN- four-digit prefix (e.g., 0001-decision-name.md)')
    }
  } else {
    if (!KEBAB_RE.test(name)) {
      errors.push('must be kebab-case (a-z0-9 with hyphens)')
    }
  }

  if (errors.length > 0) {
    hasError = true
    console.error(`\n❌ ${relToCwd}`)
    for (const e of errors) console.error(`   - ${e}`)
  }
}

if (hasError) {
  console.error('\n⛔ Naming convention check failed.\n')
  process.exit(1)
} else {
  console.log('✅ Naming convention check passed.')
}
