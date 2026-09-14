<script setup lang="ts">
import { IframeRouteManager } from '@/router/core'

defineOptions({ name: 'IframeView' })

const route = useRoute()
const isLoading = ref(true)
const iframeUrl = ref('')
const iframeRef = ref<HTMLIFrameElement | null>(null)

/**
 * 初始化 iframe URL
 * 从路由配置中获取对应的外部链接地址
 */
onMounted(() => {
  const iframeRoute = IframeRouteManager.getInstance().findByPath(route.path)

  if (iframeRoute?.meta) {
    iframeUrl.value = iframeRoute.meta.link || ''
  }
})

/**
 * 处理 iframe 加载完成事件
 * 隐藏加载状态
 */
function handleIframeLoad(): void {
  isLoading.value = false
}

// iframeRef 仅通过模板字符串 ref（ref="iframeRef"）由运行时绑定，
// 脚本内不直接读取；显式 void 读取避免 noUnusedLocals 误报
void iframeRef.value
</script>

<template>
  <div v-loading="isLoading" class="box-border w-full h-full">
    <iframe
      ref="iframeRef"
      :src="iframeUrl"
      frameborder="0"
      class="w-full h-full min-h-[calc(100vh-120px)] border-none"
      @load="handleIframeLoad"
    />
  </div>
</template>
