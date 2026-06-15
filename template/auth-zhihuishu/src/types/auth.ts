export type AuthMode = 'cas' | 'dev-token'

export interface CasCookieUser {
  userId: string | number
  realName?: string
  realname?: string
  username?: string
  avatar?: string
}

export interface AuthLoginParams {
  user_uid: string
}

export interface AuthLoginData {
  token: string
  userUid: string
  name: string
  expiresIn?: number
  isSuperAdmin: boolean
}

export interface AuthLoginResponseData {
  name?: string | null
  token?: string
  user_uid?: string | number
  expires_in?: number
  is_super_admin?: boolean
}

export interface AuthLoginResponsePayload extends AuthLoginResponseData {
  code?: number
  message?: string
  data?: AuthLoginResponseData
}

export interface StoredUserInfo {
  userUid: string
  name: string
  username?: string
  avatar?: string
  isSuperAdmin: boolean
}
