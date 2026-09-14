<!-- 按钮组件 -->
<script lang="ts" setup>
defineOptions({ name: 'ArtIconButton' })

withDefaults(defineProps<Props>(), {})

interface Props {
  /** 图标名称 */
  icon: string
  /** 圆角按钮 */
  circle?: boolean
}
</script>

<template>
  <div
    class="size-8.5 inline-flex flex-cc c-p text-g-600 dark:text-g-800 text-xl rounded tad-300 hover:bg-hover-color"
    :class="{ 'rounded-full': circle }"
  >
    <ArtSvgIcon :icon="icon" />
    <slot />
  </div>
</template>
