/**
 * 认证常量：CAS Cookie 名、登录页地址与本地存储键名。
 * casCookieName 对应智慧树统一登录下发的 jt-cas Cookie，业务 token 通过换票接口换取。
 */
export const casCookieName = 'jt-cas'
export const casTicketCookieName = 'CASTGC'
export const zhihuishuCASLoginUrl = 'https://passport.zhihuishu.com/login?source=20&service='

/**
 * 超级管理员角色码约定：登录响应或 VITE_DEV_SYSTEM_ROLE 携带该角色码时 isSuperAdmin 为 true。
 * 角色码本身为后端定义的自由字符串，此约定可按项目实际角色体系调整。
 */
export const superAdminRoleCode = 'system_admin'

export const authStorageKeys = {
  token: 'auth_token',
  userInfo: 'user_info',
  expiresAt: 'auth_token_expires_at',
  mode: 'auth_mode',
  userPermissions: 'user_permissions',
} as const
