import type {
  AuthLoginData,
  AuthLoginParams,
  AuthLoginResponseData,
  AuthLoginResponsePayload,
  SystemRoleSnapshot,
} from '@/types/auth'
import axios from 'axios'

// 登录换票使用独立 axios 实例：不注入业务 token、不触发 401 登出逻辑，避免换票链路自我递归。
const authService = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
})

export class AuthServiceError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'AuthServiceError'
    this.code = code
  }
}

/**
 * 保留后端业务错误码，供 Store 区分普通失败和登录失效。
 */
function createAuthServiceError(message: string, code?: number): AuthServiceError {
  return new AuthServiceError(message, code)
}

/**
 * 将后端 system_role 快照映射为前端稳定模型，缺字段时返回 null（安全默认值）。
 */
function resolveSystemRole(role: AuthLoginResponseData['system_role']): SystemRoleSnapshot | null {
  if (!role || !role.role_code) {
    return null
  }

  return {
    roleCode: role.role_code,
    roleName: role.role_name ?? '',
    status: role.status ?? 'inactive',
  }
}

/**
 * 从登录响应中提取当前文档定义的 token 与用户信息。
 */
function resolveLoginData(payload: AuthLoginResponsePayload, fallbackUserUid = '', fallbackToken = ''): AuthLoginData {
  const responseData: AuthLoginResponseData = payload.data ?? payload
  const resolvedToken = responseData.token || fallbackToken

  if (!resolvedToken) {
    throw createAuthServiceError(payload.message || '登录响应缺少 token', payload.code)
  }

  return {
    token: resolvedToken,
    userUid: responseData.user_uid === undefined ? fallbackUserUid : String(responseData.user_uid),
    name: responseData.name?.trim() || fallbackUserUid,
    expiresIn: responseData.expires_in,
    systemRole: resolveSystemRole(responseData.system_role),
  }
}

/**
 * 携带当前 Token 调用登录初始化接口（POST /auth/login），换取业务 token 与用户快照。
 * 协议约定：Authorization 头传裸 token，不加 Bearer 前缀。
 */
export async function loginWithCasUser(params: AuthLoginParams = {}, fallbackToken = ''): Promise<AuthLoginData> {
  const headers = fallbackToken ? { Authorization: fallbackToken } : undefined
  const response = await authService.post<AuthLoginResponsePayload>('/auth/login', params, { headers })
  const payload = response.data

  if (typeof payload.code === 'number' && payload.code !== 200) {
    throw createAuthServiceError(payload.message || '登录失败', payload.code)
  }

  return resolveLoginData(payload, params.user_uid || '', fallbackToken)
}
