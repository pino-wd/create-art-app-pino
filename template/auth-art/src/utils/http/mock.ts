import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

interface MockRoute {
  method: string
  url: string
  handler: (config: InternalAxiosRequestConfig) => unknown
}

const MOCK_TOKEN = 'mock-art-token-local-dev'

const mockRoutes: MockRoute[] = [
  {
    method: 'post',
    url: '/api/auth/login',
    handler: (config) => {
      const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
      if (body?.userName === 'admin' && body?.password === 'admin') {
        return { code: 0, data: { token: MOCK_TOKEN, refreshToken: MOCK_TOKEN } }
      }
      return { code: 401, message: '用户名或密码错误' }
    },
  },
  {
    method: 'get',
    url: '/api/user/info',
    handler: () => ({
      code: 0,
      data: { userId: 1, userName: 'admin', roles: ['admin'] },
    }),
  },
]

/**
 * 在 VITE_MOCK_ENABLED=true 时启用本地 mock 拦截器
 * 无需后端即可 admin/admin 登录并获取用户信息
 */
export function setupMock(instance: AxiosInstance) {
  if (import.meta.env.VITE_MOCK_ENABLED !== 'true')
    return

  instance.interceptors.request.use((config) => {
    const matched = mockRoutes.find(
      r => r.method === (config.method || 'get').toLowerCase()
        && config.url?.includes(r.url),
    )

    if (matched) {
      // 标记为 mock 请求，用 adapter 直接返回数据
      const result = matched.handler(config)
      config.adapter = () =>
        Promise.resolve({
          data: result,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        })
    }

    return config
  })
}
