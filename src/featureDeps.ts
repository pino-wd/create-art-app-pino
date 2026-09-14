export type Feature = 'markdown' | 'sse' | 'draggable' | 'dayjs'

interface FeatureDepConfig {
  deps?: Record<string, string>
  devDeps?: Record<string, string>
}

/**
 * Pure dependency features — only add deps to package.json, no template directory needed
 * key 收敛到 Feature：markdown/sse 为模板型特性，不在此登记纯依赖
 */
export const FEATURE_DEPS: Partial<Record<Feature, FeatureDepConfig>> = {
  draggable: { deps: { 'vue-draggable-plus': '^0.5.6' } },
  dayjs: { deps: { dayjs: '^1.11.13' } },
}

/**
 * Template-based features — have their own template directory
 */
export const TEMPLATE_FEATURES: readonly Feature[] = ['markdown', 'sse']

/**
 * Check if a feature has a template directory
 */
export function hasTemplateDir(feature: Feature): boolean {
  return TEMPLATE_FEATURES.includes(feature)
}

/**
 * Get aggregated deps for selected pure-dependency features
 */
export function getFeatureDeps(features: Feature[]): { deps: Record<string, string>, devDeps: Record<string, string> } {
  const result = { deps: {} as Record<string, string>, devDeps: {} as Record<string, string> }

  for (const feature of features) {
    const config = FEATURE_DEPS[feature]
    if (config) {
      Object.assign(result.deps, config.deps || {})
      Object.assign(result.devDeps, config.devDeps || {})
    }
  }

  return result
}
