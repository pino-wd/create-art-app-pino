<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2 class="login-title">欢迎登录</h2>
        <p class="login-subtitle">请输入您的账号和密码</p>
      </div>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model.trim="formData.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model.trim="formData.password"
            placeholder="请输入密码"
            type="password"
            size="large"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item>
          <div class="login-options">
            <el-checkbox v-model="formData.rememberPassword">记住密码</el-checkbox>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleSubmit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElNotification, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { fetchLogin } from '@/api/auth'

defineOptions({ name: 'Login' })

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const formData = reactive({
  username: '',
  password: '',
  rememberPassword: true,
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleSubmit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  try {
    const { token, refreshToken } = await fetchLogin({
      userName: formData.username,
      password: formData.password,
    })

    if (!token) {
      throw new Error('登录失败：未获取到 token')
    }

    userStore.setToken(token, refreshToken)
    userStore.setLoginStatus(true)

    ElNotification({
      title: '登录成功',
      type: 'success',
      duration: 2500,
      message: '欢迎回来！',
    })

    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch (error: any) {
    ElNotification({
      title: '登录失败',
      type: 'error',
      duration: 3000,
      message: error.message || '请检查用户名和密码',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-button {
  width: 100%;
}
</style>
