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
      const username = body?.userName?.toLowerCase()
      const password = body?.password

      const isValid = (
        (username === 'super' && password === '123456') ||
        (username === 'admin' && password === '123456') ||
        (username === 'user' && password === '123456') ||
        (username === 'admin' && password === 'admin')
      )

      if (isValid) {
        const role = username === 'super' ? 'R_SUPER' : (username === 'user' ? 'R_USER' : 'R_ADMIN')
        return { code: 0, data: { token: `${MOCK_TOKEN}-${role}`, refreshToken: MOCK_TOKEN } }
      }
      return { code: 401, message: '用户名或密码错误' }
    },
  },
  {
    method: 'get',
    url: '/api/user/info',
    handler: (config) => {
      const authHeader = (config.headers as any)?.Authorization as string || ''
      const role = authHeader.includes('R_ADMIN') ? 'R_ADMIN' : (authHeader.includes('R_USER') ? 'R_USER' : 'R_SUPER')
      const name = role === 'R_SUPER' ? 'Super' : (role === 'R_USER' ? 'User' : 'Admin')

      return {
        code: 0,
        data: { userId: 1, userName: name, roles: [role], avatar: '/src/assets/images/user/avatar.webp' },
      }
    },
  },
  {
    method: 'get',
    url: '/api/v3/system/menus',
    handler: () => ({
      code: 0,
      data: [
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: '/dashboard/console/index',
          meta: { title: '仪表盘', icon: 'ep:home-filled' },
        }
      ],
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
