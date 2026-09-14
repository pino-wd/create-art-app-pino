import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import ElementPlus from 'unplugin-element-plus/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

/**
 * 按依赖职责拆分 vendor chunk，避免所有第三方包进入同一个入口 chunk。
 */
const dependencyChunkGroups = [
  {
    name: 'vue-vendor',
    packages: ['vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate'],
  },
  {
    name: 'element-plus',
    packages: ['element-plus'],
  },
  {
    name: 'element-plus-icons',
    packages: ['@element-plus/icons-vue'],
  },
  {
    name: 'echarts',
    packages: ['echarts'],
  },
  {
    name: 'ui-vendor',
    packages: ['@iconify/vue', '@vueuse/core', 'vue-i18n'],
  },
  {
    name: 'utility-vendor',
    packages: ['axios', 'highlight.js', 'mitt', 'nprogress', 'ohash'],
  },
] satisfies Array<{ name: string, packages: string[] }>

/**
 * 命中分组返回对应 chunk 名，未命中的 node_modules 包统一进 vendor。
 */
function getPackageChunkName(id: string): string | undefined {
  const normalizedId = id.replaceAll('\\', '/')

  if (!normalizedId.includes('/node_modules/')) {
    return undefined
  }

  const matchedGroup = dependencyChunkGroups.find(group =>
    group.packages.some(packageName => normalizedId.includes(`/node_modules/${packageName}/`)),
  )

  return matchedGroup?.name ?? 'vendor'
}

export default defineConfig(({ command }) => {
  // 仅 dev 期生成根级 auto-imports.d.ts / components.d.ts，构建期不产出
  const isServe = command === 'serve'

  return {
    define: {
      __APP_VERSION__: JSON.stringify('0.1.0'),
    },
    plugins: [
      ...(isServe ? [vueDevTools()] : []),
      vue(),
      tailwindcss(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        resolvers: [ElementPlusResolver()],
        dts: isServe,
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: isServe,
      }),
      ElementPlus({
        useSource: true,
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@views': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@imgs': fileURLToPath(new URL('./src/assets/images', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@stores': fileURLToPath(new URL('./src/store', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/assets/styles', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "@styles/core/el-light.scss" as *;
            @use "@styles/core/mixin.scss" as *;
          `,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 800,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks: getPackageChunkName,
        },
      },
    },
  }
})
