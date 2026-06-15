import fs from 'node:fs'
import path from 'node:path'
import type { ProjectOptions } from './prompts'
import { hasTemplateDir, getFeatureDeps } from './featureDeps'
import { renderTemplate, renderEjsInPlace } from './utils/renderTemplate'
import { sortDependencies } from './utils/deepMerge'

/**
 * Main generation logic: render templates, merge deps, process EJS
 */
export async function generate(options: ProjectOptions, targetDir: string): Promise<void> {
  const templateRoot = path.resolve(__dirname, '..', 'template')

  // 1. Copy base template (includes scaffold EJS conditionals)
  const baseDir = path.join(templateRoot, 'base')
  if (fs.existsSync(baseDir)) {
    await renderTemplate(baseDir, targetDir, options)
  }

  // 2. Overlay auth template
  const authDir = path.join(templateRoot, options.auth === 'zhihuishu' ? 'auth-zhihuishu' : 'auth-art')
  if (fs.existsSync(authDir)) {
    await renderTemplate(authDir, targetDir, options)
  }

  // 2.5. Overlay scaffold-doc-governance
  if (options.scaffold.docGovernance) {
    const dgDir = path.join(templateRoot, 'scaffold-doc-governance')
    if (fs.existsSync(dgDir)) {
      mergeTemplatePackageJson(dgDir, targetDir)
      await renderTemplate(dgDir, targetDir, options, ['package.json'])
    }
  }

  // 3. Overlay template-based features
  const templateFeatures = options.features.filter(f => hasTemplateDir(f))
  for (const feature of templateFeatures) {
    const featureDir = path.join(templateRoot, `feature-${feature}`)
    if (fs.existsSync(featureDir)) {
      // Merge feature's package.json deps into target
      mergeTemplatePackageJson(featureDir, targetDir)
      // Copy other files (skip package.json)
      await renderTemplate(featureDir, targetDir, options, ['package.json'])
    }
  }

  // 4. Merge pure-dependency features into package.json
  mergeFeatureDeps(targetDir, options)

  // 5. Process remaining EJS files in place (router mode, scaffold conditions, etc.)
  await renderEjsInPlace(targetDir, options)

  // 6. Remove empty directories (leftover from EJS conditions)
  removeEmptyDirs(targetDir)

  // 7. Sort package.json dependencies
  sortPackageJson(targetDir)
}

function mergeFeatureDeps(targetDir: string, options: ProjectOptions): void {
  const pkgPath = path.join(targetDir, 'package.json')
  if (!fs.existsSync(pkgPath)) return

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const { deps, devDeps } = getFeatureDeps(options.features)

  if (Object.keys(deps).length > 0) {
    pkg.dependencies = { ...pkg.dependencies, ...deps }
  }
  if (Object.keys(devDeps).length > 0) {
    pkg.devDependencies = { ...pkg.devDependencies, ...devDeps }
  }

  // Add CLI version marker (read from CLI own package.json)
  const cliPkgPath = path.resolve(__dirname, '..'  , 'package.json')
  const cliVersion = fs.existsSync(cliPkgPath) ? JSON.parse(fs.readFileSync(cliPkgPath, 'utf-8')).version : '0.0.0'
  pkg['create-art-app-pino'] = { version: cliVersion }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function mergeTemplatePackageJson(featureDir: string, targetDir: string): void {
  const featurePkgPath = path.join(featureDir, 'package.json')
  if (!fs.existsSync(featurePkgPath)) return

  const targetPkgPath = path.join(targetDir, 'package.json')
  if (!fs.existsSync(targetPkgPath)) return

  const featurePkg = JSON.parse(fs.readFileSync(featurePkgPath, 'utf-8'))
  const targetPkg = JSON.parse(fs.readFileSync(targetPkgPath, 'utf-8'))

  if (featurePkg.dependencies) {
    targetPkg.dependencies = { ...targetPkg.dependencies, ...featurePkg.dependencies }
  }
  if (featurePkg.devDependencies) {
    targetPkg.devDependencies = { ...targetPkg.devDependencies, ...featurePkg.devDependencies }
  }

  fs.writeFileSync(targetPkgPath, JSON.stringify(targetPkg, null, 2) + '\n')
}

function sortPackageJson(targetDir: string): void {
  const pkgPath = path.join(targetDir, 'package.json')
  if (!fs.existsSync(pkgPath)) return

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const sorted = sortDependencies(pkg)
  fs.writeFileSync(pkgPath, JSON.stringify(sorted, null, 2) + '\n')
}

function removeEmptyDirs(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dir, entry.name)
      if (entry.name === '.git') continue
      removeEmptyDirs(fullPath)
      // Remove if now empty
      const remaining = fs.readdirSync(fullPath)
      if (remaining.length === 0) {
        fs.rmdirSync(fullPath)
      }
    }
  }
}
