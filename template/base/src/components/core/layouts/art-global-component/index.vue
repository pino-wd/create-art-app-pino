<!-- 全局组件 -->
<script setup lang="ts">
import { getEnabledGlobalComponents } from '@/config/modules/component'

defineOptions({ name: 'ArtGlobalComponent' })
const enabledComponents = computed(() => getEnabledGlobalComponents())
</script>

<template>
  <component
    :is="componentConfig.component"
    v-for="componentConfig in enabledComponents"
    :key="componentConfig.key"
  />
</template>
