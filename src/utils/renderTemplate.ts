import fs from 'node:fs'
import path from 'node:path'
import ejs from 'ejs'
import type { ProjectOptions } from '../prompts'

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ico',
  '.bmp',
  '.avif',
  '.pdf',
  '.zip',
  '.gz',
  '.tgz',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
])

const IGNORED_TEMPLATE_ENTRIES = new Set([
  '.DS_Store',
  'node_modules',
  'dist',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
])

/**
 * Render a template directory to the target directory
 * - Regular files: copy as-is
 * - `.ejs` files: compile with EJS, output without .ejs extension
 * - `_` prefix files: rename to `.` prefix (e.g., _gitignore → .gitignore)
 */
export async function renderTemplate(
  templateDir: string,
  targetDir: string,
  options: ProjectOptions,
  skipFiles: string[] = [],
): Promise<void> {
  const stats = fs.statSync(templateDir)
  if (!stats.isDirectory()) return

  const files = fs.readdirSync(templateDir)

  for (const file of files) {
    if (skipFiles.includes(file) || shouldIgnoreTemplateEntry(file)) continue
    if (!file.endsWith('.ejs') && files.includes(`${file}.ejs`)) continue

    const srcPath = path.join(templateDir, file)
    const srcStat = fs.statSync(srcPath)

    if (srcStat.isDirectory()) {
      const destName = resolveTemplateEntryName(file)
      const destDir = path.join(targetDir, destName)
      fs.mkdirSync(destDir, { recursive: true })
      await renderTemplate(srcPath, destDir, options, skipFiles)
    } else {
      await renderFile(srcPath, targetDir, file, options)
    }
  }
}

/**
 * 模板条目重命名：单下划线前缀转为点前缀（_gitignore → .gitignore）。
 * 双下划线前缀（如 __tests__）属目录命名约定，保持原样。
 */
function resolveTemplateEntryName(name: string): string {
  if (name.startsWith('_') && !name.startsWith('__')) {
    return `.${name.slice(1)}`
  }
  return name
}

async function renderFile(
  srcPath: string,
  targetDir: string,
  fileName: string,
  options: ProjectOptions,
): Promise<void> {
  let destName = fileName
  let textContent: string | null = null
  let binaryContent: Buffer | null = null

  if (fileName.endsWith('.ejs')) {
    // EJS template: compile and remove .ejs extension
    destName = fileName.slice(0, -4)
    const template = fs.readFileSync(srcPath, 'utf-8')
    textContent = ejs.render(template, { options })

    // Skip empty output (EJS condition evaluated to nothing)
    if (!textContent.trim()) return
  } else if (isBinaryTemplateFile(srcPath)) {
    binaryContent = fs.readFileSync(srcPath)
  } else {
    textContent = fs.readFileSync(srcPath, 'utf-8')
  }

  // Rename _ prefix to . prefix
  destName = resolveTemplateEntryName(destName)

  const destPath = path.join(targetDir, destName)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  if (binaryContent) {
    fs.writeFileSync(destPath, binaryContent)
    return
  }

  fs.writeFileSync(destPath, textContent ?? '')
}

/**
 * 判断模板文件是否需要按二进制原样复制，避免图片字体等资源被 UTF-8 转码破坏。
 */
function isBinaryTemplateFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function shouldIgnoreTemplateEntry(entryName: string): boolean {
  return IGNORED_TEMPLATE_ENTRIES.has(entryName)
}
