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
