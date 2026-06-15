import type {
  AuthLoginData,
  AuthLoginParams,
  AuthLoginResponseData,
  AuthLoginResponsePayload,
} from '@/types/auth'
import axios from 'axios'

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
 * 从登录响应中提取 token 与用户信息
 */
function resolveLoginData(payload: AuthLoginResponsePayload, fallbackUserUid: string): AuthLoginData {
  const responseData: AuthLoginResponseData = payload.data ?? payload

  if (!responseData.token) {
    throw new AuthServiceError(payload.message || '登录响应缺少 token', payload.code)
  }

  return {
    token: responseData.token,
    userUid: responseData.user_uid === undefined ? fallbackUserUid : String(responseData.user_uid),
    name: responseData.name?.trim() || fallbackUserUid,
    expiresIn: responseData.expires_in,
    isSuperAdmin: responseData.is_super_admin ?? false,
  }
}

/**
 * 使用 CASLOGC 中的用户 ID 换取业务 token
 */
export async function loginWithCasUser(params: AuthLoginParams): Promise<AuthLoginData> {
  const response = await authService.post<AuthLoginResponsePayload>('/auth/login', params)
  const payload = response.data

  if (typeof payload.code === 'number' && payload.code !== 200) {
    throw new AuthServiceError(payload.message || '登录失败', payload.code)
  }

  return resolveLoginData(payload, params.user_uid)
}
