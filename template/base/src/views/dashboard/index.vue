<template>
  <div class="dashboard-page">
    <h2>Welcome to {{ projectName }}</h2>
    <p>项目已成功创建，开始你的开发之旅吧！</p>

    <el-row :gutter="20" style="margin-top: 24px;">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>Vue 3</template>
          <p>组合式 API + TypeScript</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>Element Plus</template>
          <p>企业级 UI 组件库</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>Vite</template>
          <p>极速开发体验</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
const projectName = document.title || 'Art App'
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
}

.dashboard-page h2 {
  font-size: 24px;
  margin-bottom: 8px;
}
</style>
