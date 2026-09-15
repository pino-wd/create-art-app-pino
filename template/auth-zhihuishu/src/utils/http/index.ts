import type { AxiosRequestConfig } from 'axios'
import axios, { AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/modules/auth'
import { getCurrentRedirectPath } from '@/utils/auth'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
})

/**
 * 判定登录失效：HTTP 401 或业务码 401 / 4010001。
 */
function isAuthFailure(status?: number, code?: number): boolean {
  return status === 401 || code === 401 || code === 4010001
}

// 请求拦截器：注入 token（协议约定 Authorization 传裸 token，不加 Bearer 前缀）
http.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.getToken()
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  error => Promise.reject(error),
)

// 响应拦截器：处理 401 和业务错误
http.interceptors.response.use(
  (response) => {
    // 后端可能使用 HTTP 200 承载登录失效业务码，不能交给业务层作为成功数据消费。
    if (isAuthFailure(response.status, response.data?.code)) {
      useAuthStore().expireSession(getCurrentRedirectPath())
      return Promise.reject(new AxiosError(
        response.data?.message || '登录已失效，请重新登录',
        'ERR_AUTH_EXPIRED',
        response.config,
        response.request,
        response,
      ))
    }
    return response.data
  },
  (error) => {
    if (isAuthFailure(error.response?.status, error.response?.data?.code)) {
      const authStore = useAuthStore()
      // 保留当前路径作为登录回跳地址
      authStore.expireSession(getCurrentRedirectPath())
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
