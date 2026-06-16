import type { CasCookieUser, StoredUserInfo } from '@/types/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authStorageKeys } from '@/constants/auth'
import { loginWithCasUser } from '@/services/authService'
import {
  clearAuthStorage,
  getAuthMode,
  isDevTokenAuthMode,
  loginOutRedirect,
  parseCASLOGC,
} from '@/utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const userInfo = ref<StoredUserInfo | null>(null)
  const expiresAt = ref<number | null>(null)
  const isLoggingIn = ref(false)
  const errorMessage = ref('')

  let autoLoginPromise: Promise<boolean> | null = null
  let isEnvDevTokenRejected = false
  let isAuthRedirecting = false

  function hasUsableToken(): boolean {
    if (!token.value)
      return false
    return expiresAt.value === null || Date.now() < expiresAt.value
  }

  function isStoredAuthModeCompatible(storedAuthMode: string | null): boolean {
    const currentAuthMode = getAuthMode()
    if (storedAuthMode === null)
      return currentAuthMode === 'cas'
    return storedAuthMode === currentAuthMode
  }

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
      userInfo.value = null
      return
    }

    try {
      userInfo.value = JSON.parse(storedUserInfo) as StoredUserInfo
    }
    catch {
      userInfo.value = null
    }
  }

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
  }

  function normalizeDevToken(rawToken: string): string {
    return rawToken.replace(/^Bearer\s+/i, '').trim()
  }

  function getEnvDevToken(): string {
    return normalizeDevToken(import.meta.env.VITE_DEV_TOKEN ?? '')
  }

  function getEnvDevUserUid(): string {
    return (import.meta.env.VITE_DEV_USER_UID ?? '').trim() || '000000'
  }

  function loginWithEnvDevToken(rawToken: string): boolean {
    const normalizedToken = normalizeDevToken(rawToken)

    if (!normalizedToken) {
      errorMessage.value = '请在环境变量 VITE_DEV_TOKEN 中配置有效业务 token'
      return false
    }

    token.value = normalizedToken
    userInfo.value = {
      userUid: getEnvDevUserUid(),
      name: '开发调试用户',
      isSuperAdmin: true,
    }
    expiresAt.value = null
    errorMessage.value = ''
    isEnvDevTokenRejected = false
    saveToStorage()

    return true
  }

  async function loginByCasUser(casUser: CasCookieUser): Promise<boolean> {
    const casUserId = String(casUser.userId)
    const loginData = await loginWithCasUser({ user_uid: casUserId })

    token.value = loginData.token
    userInfo.value = {
      userUid: loginData.userUid,
      name: loginData.name || casUser.realName || casUser.realname || loginData.userUid,
      username: casUser.username,
      avatar: casUser.avatar,
      isSuperAdmin: loginData.isSuperAdmin,
    }
    expiresAt.value = loginData.expiresIn === undefined ? null : Date.now() + loginData.expiresIn * 1000
    saveToStorage()

    return true
  }

  async function autoLogin(): Promise<boolean> {
    if (autoLoginPromise)
      return autoLoginPromise

    autoLoginPromise = (async () => {
      isLoggingIn.value = true
      errorMessage.value = ''

      try {
        if (isDevTokenAuthMode()) {
          if (isEnvDevTokenRejected) {
            clear()
            errorMessage.value = '环境变量 VITE_DEV_TOKEN 已失效，请更新后重启开发服务'
            return false
          }

          const envDevToken = getEnvDevToken()
          if (!envDevToken) {
            clear()
            errorMessage.value = '请在环境变量 VITE_DEV_TOKEN 中配置业务 token'
            return false
          }

          return loginWithEnvDevToken(envDevToken)
        }

        const casUser = parseCASLOGC()
        if (!casUser) {
          clear()
          errorMessage.value = '未读取到有效的智慧树登录态'
          return false
        }

        restoreFromStorage()
        if (hasUsableToken())
          return true

        return await loginByCasUser(casUser)
      }
      catch (error) {
        clear()
        errorMessage.value = error instanceof Error ? error.message : '自动登录失败'
        return false
      }
      finally {
        isLoggingIn.value = false
        autoLoginPromise = null
      }
    })()

    return autoLoginPromise
  }

  function clear(): void {
    token.value = ''
    userInfo.value = null
    expiresAt.value = null
    clearAuthStorage()
  }

  function logout(redirectPath?: string): void {
    clear()
    if (isDevTokenAuthMode())
      return
    if (isAuthRedirecting)
      return
    isAuthRedirecting = true
    loginOutRedirect(redirectPath)
  }

  function expireSession(redirectPath?: string): void {
    clear()
    if (isDevTokenAuthMode()) {
      isEnvDevTokenRejected = true
      errorMessage.value = '环境变量 VITE_DEV_TOKEN 已失效，请更新后重启开发服务'
      return
    }
    if (isAuthRedirecting)
      return
    isAuthRedirecting = true
    loginOutRedirect(redirectPath)
  }

  function getToken(): string {
    return token.value
  }

  function isAuthenticated(): boolean {
    return hasUsableToken()
  }

  restoreFromStorage()

  return {
    errorMessage,
    expireSession,
    getToken,
    autoLogin,
    clear,
    isAuthenticated,
    isLoggingIn,
    logout,
    token,
    userInfo,
  }
})
