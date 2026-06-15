#!/usr/bin/env node

/**
 * lint-frontmatter.mjs
 * Validates YAML frontmatter of docs/**\/*.md files.
 *
 * Required fields: title, type, status, owner, lastReviewed
 * type  enum: tutorial | guide | reference | architecture | adr | requirement | incident | troubleshooting
 * status enum: active | draft | superseded | archived
 * status=superseded → supersededBy field required
 */

import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const DOCS_DIR = path.resolve('docs')
const EXCLUDE_DIRS = new Set(['templates', 'archive'])
const REQUIRED_FIELDS = ['title', 'type', 'status', 'owner', 'lastReviewed']
const TYPE_ENUM = new Set([
  'tutorial', 'guide', 'reference', 'architecture',
  'adr', 'requirement', 'incident', 'troubleshooting',
])
const STATUS_ENUM = new Set(['active', 'draft', 'superseded', 'archived'])

function collectMarkdownFiles(dir) {
  const results = []
  if (!fs.existsSync(dir)) return results

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) results.push(...collectMarkdownFiles(full))
    } else if (entry.name.endsWith('.md') && entry.name !== '.gitkeep') {
      results.push(full)
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

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf-8')
  const { data } = matter(raw)
  const rel = path.relative(process.cwd(), file)
  const errors = []

  for (const field of REQUIRED_FIELDS) {
    if (data[field] == null || data[field] === '') {
      errors.push(`missing required field: ${field}`)
    }
  }

  if (data.type && !TYPE_ENUM.has(data.type)) {
    errors.push(`invalid type "${data.type}", must be one of: ${[...TYPE_ENUM].join(', ')}`)
  }

  if (data.status && !STATUS_ENUM.has(data.status)) {
    errors.push(`invalid status "${data.status}", must be one of: ${[...STATUS_ENUM].join(', ')}`)
  }

  if (data.status === 'superseded' && !data.supersededBy) {
    errors.push('status is "superseded" but missing "supersededBy" field')
  }

  if (errors.length > 0) {
    hasError = true
    console.error(`\n❌ ${rel}`)
    for (const e of errors) console.error(`   - ${e}`)
  }
}

if (hasError) {
  console.error('\n⛔ Frontmatter validation failed.\n')
  process.exit(1)
} else {
  console.log('✅ Frontmatter validation passed.')
}
