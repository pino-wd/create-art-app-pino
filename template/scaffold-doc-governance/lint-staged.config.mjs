export default {
  'docs/**/*.md': [
    'node scripts/docs/lint-frontmatter.mjs',
    'node scripts/docs/lint-naming.mjs',
  ],
}
