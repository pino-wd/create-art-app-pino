import fs from 'node:fs'
import path from 'node:path'
import ejs from 'ejs'
import type { ProjectOptions } from '../prompts'

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
    if (skipFiles.includes(file)) continue

    const srcPath = path.join(templateDir, file)
    const srcStat = fs.statSync(srcPath)

    if (srcStat.isDirectory()) {
      const destName = file.startsWith('_') ? `.${file.slice(1)}` : file
      const destDir = path.join(targetDir, destName)
      fs.mkdirSync(destDir, { recursive: true })
      await renderTemplate(srcPath, destDir, options)
    } else {
      await renderFile(srcPath, targetDir, file, options)
    }
  }
}

async function renderFile(
  srcPath: string,
  targetDir: string,
  fileName: string,
  options: ProjectOptions,
): Promise<void> {
  let destName = fileName
  let content: string

  if (fileName.endsWith('.ejs')) {
    // EJS template: compile and remove .ejs extension
    destName = fileName.slice(0, -4)
    const template = fs.readFileSync(srcPath, 'utf-8')
    content = ejs.render(template, { options })

    // Skip empty output (EJS condition evaluated to nothing)
    if (!content.trim()) return
  } else {
    content = fs.readFileSync(srcPath, 'utf-8')
  }

  // Rename _ prefix to . prefix
  if (destName.startsWith('_')) {
    destName = `.${destName.slice(1)}`
  }

  const destPath = path.join(targetDir, destName)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, content)
}

/**
 * Process all .ejs files in the generated directory (second pass)
 * Used for files that have already been copied but contain EJS conditions
 */
export async function renderEjsInPlace(
  targetDir: string,
  options: ProjectOptions,
): Promise<void> {
  const files = getAllFiles(targetDir)

  for (const filePath of files) {
    if (filePath.endsWith('.ejs')) {
      const template = fs.readFileSync(filePath, 'utf-8')
      const content = ejs.render(template, { options })
      const destPath = filePath.slice(0, -4) // Remove .ejs extension

      if (content.trim()) {
        fs.writeFileSync(destPath, content)
      }
      fs.unlinkSync(filePath) // Remove .ejs source
    }
  }
}

function getAllFiles(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      results.push(...getAllFiles(fullPath))
    } else {
      results.push(fullPath)
    }
  }

  return results
}
