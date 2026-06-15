<template>
  <div class="layout-container">
    <aside class="layout-sidebar">
      <div class="sidebar-logo">
        <h1>{{ appTitle }}</h1>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
      </el-menu>
    </aside>
    <div class="layout-main">
      <header class="layout-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>Admin</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="layout-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { HomeFilled, User } from '@element-plus/icons-vue'

const route = useRoute()
const appTitle = 'Art App'
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
}

.layout-sidebar {
  width: 240px;
  background: #1d1e1f;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-logo h1 {
  font-size: 18px;
  color: #fff;
}

.sidebar-menu {
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #bfcbd9;
  --el-menu-active-color: #409eff;
  --el-menu-hover-bg-color: rgba(255, 255, 255, 0.05);
}

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.header-right .user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.layout-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background: #f5f7fa;
}
</style>
