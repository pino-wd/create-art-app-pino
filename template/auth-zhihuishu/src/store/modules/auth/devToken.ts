/**
 * 开发态环境 token 工具。
 *
 * 纯环境函数集合：从 VITE_DEV_* 环境变量读取开发态登录材料并组装最小用户快照，
 * 不持有任何 store 状态；登录态写入仍由 auth/index.ts 的 loginWithEnvDevToken 编排。
 */
import type { StoredUserInfo, SystemRoleSnapshot } from '@/types/auth'
import { superAdminRoleCode } from '@/constants/auth'
import { resolveCastgcHeadPic } from '@/utils/auth'

const defaultDevUserUid = '000000'

/**
 * 为开发态环境 token 生成最小用户信息。
 * 开发态无登录响应，systemRole 从环境变量推导；
 * 未配置时为 null，isSuperAdmin 按 superAdminRoleCode 约定派生。
 */
export function createDevTokenUserInfo(): StoredUserInfo {
  const systemRole = getEnvDevSystemRole()
  const avatar = resolveCastgcHeadPic() ?? undefined
  return {
    userUid: getEnvDevUserUid(),
    name: '开发调试用户',
    avatar,
    isSuperAdmin: systemRole?.roleCode === superAdminRoleCode,
    systemRole,
  }
}

/**
 * 兼容用户直接粘贴 Bearer token 的场景，统一清洗前缀和空白字符。
 */
export function normalizeDevToken(rawToken: string): string {
  return rawToken.replace(/^Bearer\s+/i, '').trim()
}

/**
 * 读取本地环境变量中的开发态 token，优先满足本地联调免手动粘贴的场景。
 */
export function getEnvDevToken(): string {
  return normalizeDevToken(import.meta.env.VITE_DEV_TOKEN ?? '')
}

/**
 * 读取开发态用户 UID，作为登录态展示与接口联调的 user_uid。
 */
export function getEnvDevUserUid(): string {
  return (import.meta.env.VITE_DEV_USER_UID ?? defaultDevUserUid).trim() || defaultDevUserUid
}

/**
 * 读取开发态系统角色快照，由 VITE_DEV_SYSTEM_ROLE 指定。
 * 角色码为后端定义的自由字符串，未配置时返回 null，权限逻辑按无角色自然判定。
 */
export function getEnvDevSystemRole(): SystemRoleSnapshot | null {
  const rawRoleCode = (import.meta.env.VITE_DEV_SYSTEM_ROLE ?? '').trim()
  if (!rawRoleCode) {
    return null
  }

  return {
    roleCode: rawRoleCode,
    roleName: rawRoleCode,
    status: 'active',
  }
}
