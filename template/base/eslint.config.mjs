import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'app',
  vue: true,
  typescript: true,
  formatters: true,
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },
  ignores: [
    'dist',
    'coverage',
    'node_modules',
    'tsconfig*.json',
    'vite.config.*',
    'vitest.config.*',
    'auto-imports.d.ts',
    'components.d.ts',
  ],
}, {
  // 单文件 650 行熔断：口径为文件总行数，含空行与注释；
  // 仅约束 src 业务代码（.vue/.ts/.tsx），排除 *.d.ts。
  files: ['src/**/*.{vue,ts,tsx}'],
  ignores: ['**/*.d.ts'],
  rules: {
    'max-lines': ['error', { max: 650 }],
  },
}, {
  // docs 治理脚本运行在 node 环境，允许直接使用全局 process
  files: ['scripts/**/*.mjs'],
  rules: {
    'node/prefer-global/process': 'off',
  },
})
