/**
 * Deep merge utility for package.json merging
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target }

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key]
    const targetVal = result[key]

    if (isObject(sourceVal) && isObject(targetVal)) {
      result[key] = deepMerge(targetVal as any, sourceVal as any) as any
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as any
    }
  }

  return result
}

function isObject(val: unknown): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

/**
 * Sort package.json dependencies alphabetically
 */
export function sortDependencies(pkg: Record<string, any>): Record<string, any> {
  const sorted = { ...pkg }

  const depsFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
  for (const field of depsFields) {
    if (sorted[field]) {
      sorted[field] = Object.fromEntries(
        Object.entries(sorted[field] as Record<string, string>).sort(([a], [b]) => a.localeCompare(b)),
      )
    }
  }

  return sorted
}
