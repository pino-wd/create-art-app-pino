<!-- 布局容器 -->
<script setup lang="ts">
defineOptions({ name: 'AppLayout' })
</script>

<template>
  <div class="app-layout">
    <aside id="app-sidebar">
      <ArtSidebarMenu />
    </aside>

    <main id="app-main">
      <div id="app-header">
        <ArtHeaderBar />
      </div>
      <div id="app-content">
        <ArtPageContent />
      </div>
    </main>

    <div id="app-global">
      <ArtGlobalComponent />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  @use './style';
</style>
