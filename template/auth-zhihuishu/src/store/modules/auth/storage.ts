/**
 * 认证登录态本地存储。
 *
 * createAuthStorage 工厂产出 restoreFromStorage / saveToStorage：
 * - 登录态引用（token / userInfo / expiresAt）与 clear 动作经参数注入，
 *   工厂内部不创建任何 store 状态；
 * - 本地模式兼容校验（dev token 不污染 CAS 模式）随迁；
 * - 缺头像时用 CASTGC Cookie 中的头像补齐并回写缓存。
 */
import type { Ref } from 'vue'
import type { StoredUserInfo } from '@/types/auth'
import { authStorageKeys, superAdminRoleCode } from '@/constants/auth'
import { getAuthMode, resolveCastgcHeadPic } from '@/utils/auth'

/**
 * 存储工厂依赖：均为 auth store 实例内持有的状态与方法。
 */
interface AuthStorageOptions {
  /** 业务 token 状态（saveToStorage 写入、restoreFromStorage 回填） */
  token: Ref<string>
  /** 用户信息快照状态（saveToStorage 写入、restoreFromStorage 回填） */
  userInfo: Ref<StoredUserInfo | null>
  /** token 过期时间状态（saveToStorage 写入、restoreFromStorage 回填） */
  expiresAt: Ref<number | null>
  /** 登录态清理动作（模式不兼容时回退为未登录） */
  clear: () => void
}

export function createAuthStorage(options: AuthStorageOptions) {
  const { token, userInfo, expiresAt, clear } = options

  /**
   * 判断本地缓存里的登录态是否与当前认证模式匹配，避免 dev token 污染 CAS 模式。
   */
  function isStoredAuthModeCompatible(storedAuthMode: string | null): boolean {
    const currentAuthMode = getAuthMode()

    if (storedAuthMode === null) {
      return currentAuthMode === 'cas'
    }

    return storedAuthMode === currentAuthMode
  }

  /**
   * 从本地缓存恢复业务 token 和用户信息，旧字段名（userId / realName）做兜底兼容。
   */
  function restoreFromStorage(): void {
    const storedToken = localStorage.getItem(authStorageKeys.token)
    const storedUserInfo = localStorage.getItem(authStorageKeys.userInfo)
    const storedExpiresAt = localStorage.getItem(authStorageKeys.expiresAt)
    const storedAuthMode = localStorage.getItem(authStorageKeys.mode)

    if (!isStoredAuthModeCompatible(storedAuthMode)) {
      clear()
      return
    }

    token.value = storedToken ?? ''
    expiresAt.value = storedExpiresAt ? Number(storedExpiresAt) : null

    if (!storedUserInfo) {
      token.value = ''
      expiresAt.value = null
      userInfo.value = null
      return
    }

    try {
      const parsedUserInfo = JSON.parse(storedUserInfo) as Partial<StoredUserInfo>

      const castgcAvatar = parsedUserInfo.avatar ? null : resolveCastgcHeadPic()

      userInfo.value = {
        userUid: parsedUserInfo.userUid ?? (parsedUserInfo as Partial<{ userId: string }>).userId ?? '',
        name: parsedUserInfo.name ?? (parsedUserInfo as Partial<{ realName: string }>).realName ?? '',
        username: parsedUserInfo.username,
        avatar: parsedUserInfo.avatar || castgcAvatar || undefined,
        isSuperAdmin: parsedUserInfo.systemRole?.roleCode === superAdminRoleCode,
        systemRole: parsedUserInfo.systemRole ?? null,
      }

      if (castgcAvatar) {
        saveToStorage()
      }
    }
    catch {
      token.value = ''
      expiresAt.value = null
      userInfo.value = null
    }
  }

  /**
   * 将当前认证模式下的登录态写入本地，刷新页面后可继续复用 token。
   */
  function saveToStorage(): void {
    if (token.value) {
      localStorage.setItem(authStorageKeys.token, token.value)
    }

    if (userInfo.value) {
      localStorage.setItem(authStorageKeys.userInfo, JSON.stringify(userInfo.value))
    }

    if (expiresAt.value !== null) {
      localStorage.setItem(authStorageKeys.expiresAt, String(expiresAt.value))
    }
    else {
      localStorage.removeItem(authStorageKeys.expiresAt)
    }

    localStorage.setItem(authStorageKeys.mode, getAuthMode())
    localStorage.removeItem(authStorageKeys.userPermissions)
  }

  return {
    restoreFromStorage,
    saveToStorage,
  }
}
