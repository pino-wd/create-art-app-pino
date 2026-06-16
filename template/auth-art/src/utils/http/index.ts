import type { AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { setupMock } from './mock'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
})

// 启用 Mock 拦截器（仅 VITE_MOCK_ENABLED=true 时生效）
setupMock(http)

// 请求拦截器：注入 token
http.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.accessToken) {
      config.headers.Authorization = `Bearer ${userStore.accessToken}`
    }
    return config
  },
  error => Promise.reject(error),
)

// 响应拦截器：处理 401 和业务错误
http.interceptors.response.use(
  (response) => {
    const res = response.data
    // 剥离业务响应包装
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 0) {
        return res.data
      }
      const message = res.message || '请求失败'
      ElMessage.error(message)
      return Promise.reject(new Error(message))
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      const userStore = useUserStore()
      userStore.logOut()
      return Promise.reject(error)
    }
    const message = error.response?.data?.message || error.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  },
)

interface RequestConfig extends AxiosRequestConfig {
  url: string
  params?: any
}

const request = {
  get<T>(config: RequestConfig): Promise<T> {
    return http.get(config.url, { params: config.params, ...config }) as unknown as Promise<T>
  },
  post<T>(config: RequestConfig): Promise<T> {
    return http.post(config.url, config.params, config) as unknown as Promise<T>
  },
  put<T>(config: RequestConfig): Promise<T> {
    return http.put(config.url, config.params, config) as unknown as Promise<T>
  },
  delete<T>(config: RequestConfig): Promise<T> {
    return http.delete(config.url, { params: config.params, ...config }) as unknown as Promise<T>
  },
}

export default request
