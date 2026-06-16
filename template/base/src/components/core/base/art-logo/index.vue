<template>
  <div class="flex-cc" v-bind="$attrs">
    <!-- 系统logo -->
    <img :style="logoStyle" src="@/assets/images/common/logo.webp" alt="logo" class="w-full h-full" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const logoStyle = computed(() => ({ width: `${props.size}px` }))
</script>
