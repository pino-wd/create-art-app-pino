import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
})

// Request interceptor
service.interceptors.request.use(
  (config) => {
    // Token injection will be handled by auth layer overlay
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor
service.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('[HTTP Error]', message)
    return Promise.reject(error)
  },
)

export function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return service(config) as Promise<T>
}

export default service
