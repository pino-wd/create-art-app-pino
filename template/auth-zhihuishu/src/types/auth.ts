export type AuthMode = 'cas' | 'dev-token'
export type AuthBootstrapStatus = 'idle' | 'bootstrapping' | 'authenticated' | 'redirecting' | 'failed'
export type AuthBootstrapSource = 'storage' | 'ticket' | 'cas-cookie' | null

export interface AuthBootstrapState {
  status: AuthBootstrapStatus
  source: AuthBootstrapSource
  attempt: number
  redirectLocked: boolean
  lastErrorCode?: string
}

export interface AuthRedirectContext {
  reason: 'exchange-failed' | 'logout' | 'missing-session' | 'session-expired'
  redirectPath: string
  sanitizedRedirectPath: string
  ticketCount: number
}

/**
 * 登录响应中的系统角色快照；后端未返回角色时为 null。
 * 角色码为后端定义的自由字符串，isSuperAdmin 按 superAdminRoleCode 约定派生。
 */
export interface SystemRoleSnapshot {
  roleCode: string
  roleName: string
  status: string
}

export interface AuthLoginParams {
  user_uid?: string
}

/**
 * 登录响应数据；system_role 为可选快照，缺失时 systemRole 为 null。
 */
export interface AuthLoginData {
  token: string
  userUid: string
  name: string
  expiresIn?: number
  systemRole: SystemRoleSnapshot | null
}

export interface AuthLoginResponseData {
  name?: string | null
  token?: string
  user_uid?: string | number
  expires_in?: number
  system_role?: {
    role_code: string
    role_name: string
    status: string
  } | null
}

export interface AuthLoginResponsePayload extends AuthLoginResponseData {
  code?: number
  message?: string
  data?: AuthLoginResponseData
}

/**
 * 本地缓存的用户信息。
 * isSuperAdmin 从 systemRole.roleCode === superAdminRoleCode 派生，供业务按需复用。
 */
export interface StoredUserInfo {
  userUid: string
  name: string
  username?: string
  avatar?: string
  isSuperAdmin: boolean
  /** 登录响应直接返回的系统角色快照；null 表示未绑定系统角色 */
  systemRole: SystemRoleSnapshot | null
}
