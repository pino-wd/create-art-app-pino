import request from '@/utils/http'

export interface LoginParams {
  userName: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken?: string
}

export interface UserInfo {
  userId: number | string
  userName: string
  avatar?: string
  roles?: string[]
}

/**
 * 登录
 */
export function fetchLogin(params: LoginParams) {
  return request.post<LoginResponse>({
    url: '/api/auth/login',
    params,
  })
}

/**
 * 获取用户信息
 */
export function fetchGetUserInfo() {
  return request.get<UserInfo>({
    url: '/api/user/info',
  })
}
