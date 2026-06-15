<template>
  <div class="exception-page">
    <h1>404</h1>
    <p>抱歉，您访问的页面不存在</p>
    <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<style scoped>
.exception-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
.exception-page h1 {
  font-size: 72px;
  color: #909399;
}
.exception-page p {
  margin: 16px 0 24px;
  color: #606266;
}
</style>
