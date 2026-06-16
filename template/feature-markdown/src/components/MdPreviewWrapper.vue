<script setup lang="ts">
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

withDefaults(defineProps<{
  content: string
  theme?: 'light' | 'dark'
}>(), {
  theme: 'light',
})
</script>

<template>
  <div class="md-preview-container">
    <MdPreview
      :model-value="content"
      :theme="theme"
    />
  </div>
</template>

<style scoped>
.md-preview-container {
  width: 100%;
}
</style>
