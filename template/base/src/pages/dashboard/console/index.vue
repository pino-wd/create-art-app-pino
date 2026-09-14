<!-- 工作台页面 -->
<script setup lang="ts">
import AboutProject from './modules/about-project.vue'
import ActiveUser from './modules/active-user.vue'
import CardList from './modules/card-list.vue'
import Dynamic from './modules/dynamic-stats.vue'
import NewUser from './modules/new-user.vue'
import SalesOverview from './modules/sales-overview.vue'
import TodoList from './modules/todo-list.vue'

defineOptions({ name: 'Console' })
</script>

<template>
  <div>
    <CardList />

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="10">
        <ActiveUser />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="14">
        <SalesOverview />
      </ElCol>
    </ElRow>

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="12">
        <NewUser />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="6">
        <Dynamic />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="6">
        <TodoList />
      </ElCol>
    </ElRow>

    <AboutProject />
  </div>
</template>
