/**
 * 认证 Pinia store（目录化：状态机母体）
 *
 * store 组装：状态、bootstrap/redirect 上下文、换票、autoLogin single-flight、
 * clear/logout/expireSession 与返回对象；导入路径 @/store/modules/auth 经目录 index 解析。
 *
 * 拆分契约：
 * - 开发态环境函数（normalizeDevToken / getEnvDevToken 等）见 ./devToken；
 * - 本地登录态恢复与落盘（模式兼容校验、CASTGC 头像补齐）见 ./storage。
 */
import type { AuthBootstrapState, AuthLoginData, AuthRedirectContext, StoredUserInfo } from '@/types/auth'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { superAdminRoleCode } from '@/constants/auth'
import { loginWithCasUser } from '@/services/authService'
import {
  clearAuthStorage,
  clearCurrentCASParamsFromUrl,
  getCurrentRedirectPath,
  getJtCasToken,
  hasTicketInUrl,
  isDevTokenAuthMode,
  loginOutRedirect,
  redirectToZhihuishuLogin,
  resolveCastgcHeadPic,
  sanitizeRedirectPath,
} from '@/utils/auth'
import { createDevTokenUserInfo, getEnvDevToken, normalizeDevToken } from './devToken'
import { createAuthStorage } from './storage'

const casContextRetryMaxAttempts = 3
const casContextRetryIntervalMs = 300
// Token 过期提前量：临界期内视为不可用，改由静默换票刷新，避免 401 触发整页登录。
const TOKEN_EXPIRY_SKEW_MS = 60_000
// 换票失败重试上限：超过后停止跳转，落到错误页，避免后端故障时整页死循环。
const MAX_EXCHANGE_FAILURE = 2
// 换票失败计数键，用 sessionStorage 存储，仅在当前标签页会话内累计。
const EXCHANGE_FAILURE_STORAGE_KEY = 'auth_exchange_failure_count'

interface CasContextRetryOptions {
  enabled: boolean
  maxAttempts: number
  intervalMs: number
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const userInfo = ref<StoredUserInfo | null>(null)
  const expiresAt = ref<number | null>(null)
  const isLoggingIn = ref(false)
  const errorMessage = ref('')
  const authBootstrapState = ref<AuthBootstrapState>({
    attempt: 0,
    redirectLocked: false,
    source: null,
    status: 'idle',
  })

  let autoLoginPromise: Promise<boolean> | null = null
  let isEnvDevTokenRejected = false
  // 标记本次页面会话是否已完成过一次 CAS 换票。
  // 页面刷新会重建 JS 环境使其重置为 false，从而在刷新时重新换票刷新登录快照；
  // 而刷新后由各业务请求触发的 autoLogin 则复用本地登录态，避免每个接口都重复换票。
  let hasCompletedBootstrapLogin = false

  const { restoreFromStorage, saveToStorage } = createAuthStorage({ token, userInfo, expiresAt, clear })

  /**
   * 更新登录启动状态，集中维护跳转锁和失败原因。
   */
  function updateAuthBootstrapState(nextState: Partial<AuthBootstrapState>): void {
    authBootstrapState.value = {
      ...authBootstrapState.value,
      ...nextState,
    }
  }

  /**
   * 等待指定时间后重试读取 CAS Cookie，覆盖回跳后 Cookie 延迟写入的情况。
   */
  function waitForCasContextRetry(intervalMs: number): Promise<void> {
    return new Promise(resolve => window.setTimeout(resolve, intervalMs))
  }

  /**
   * 生成 CAS 重定向上下文，保证所有重定向前都先清洗旧 ticket。
   */
  function createAuthRedirectContext(reason: AuthRedirectContext['reason'], redirectPath?: string): AuthRedirectContext {
    const rawRedirectPath = redirectPath || getCurrentRedirectPath()
    const redirectUrl = new URL(rawRedirectPath, window.location.origin)
    const sanitizedRedirectPath = sanitizeRedirectPath(rawRedirectPath)

    return {
      reason,
      redirectPath: rawRedirectPath,
      sanitizedRedirectPath,
      ticketCount: redirectUrl.searchParams.getAll('ticket').length,
    }
  }

  /**
   * CAS 模式只允许一次整页跳转，避免路由守卫和请求链路重复触发。
   */
  function redirectToCasOnce(context: AuthRedirectContext): void {
    if (authBootstrapState.value.redirectLocked) {
      return
    }

    updateAuthBootstrapState({
      lastErrorCode: context.reason,
      redirectLocked: true,
      source: null,
      status: 'redirecting',
    })

    // missing-session 与 exchange-failed 属于“尚未拿到业务态”，Cookie 仍有效，
    // 只跳登录页而不清登录 Cookie；logout / session-expired 才需清理 Cookie 后重登。
    if (context.reason === 'missing-session' || context.reason === 'exchange-failed') {
      redirectToZhihuishuLogin(context.sanitizedRedirectPath)
      return
    }

    loginOutRedirect(context.sanitizedRedirectPath)
  }

  /**
   * 读取当前标签页会话内的换票失败次数，非法值统一回退为 0。
   */
  function readExchangeFailureCount(): number {
    const raw = Number(sessionStorage.getItem(EXCHANGE_FAILURE_STORAGE_KEY))
    return Number.isFinite(raw) && raw > 0 ? raw : 0
  }

  /**
   * 累加换票失败次数并返回累加后的值。
   */
  function bumpExchangeFailureCount(): number {
    const next = readExchangeFailureCount() + 1
    sessionStorage.setItem(EXCHANGE_FAILURE_STORAGE_KEY, String(next))
    return next
  }

  /**
   * 换票成功或需要重新计数时清零，保证后端恢复后手动刷新可再次尝试。
   */
  function resetExchangeFailureCount(): void {
    sessionStorage.removeItem(EXCHANGE_FAILURE_STORAGE_KEY)
  }

  /**
   * 处理换票失败：未超上限时跳 CAS 重试（不清 Cookie，因 Cookie 本身有效），
   * 超上限时停止跳转并置为 failed，交由路由守卫落到错误页，避免后端故障时整页死循环。
   */
  function handleExchangeFailure(): void {
    clear()
    if (bumpExchangeFailureCount() > MAX_EXCHANGE_FAILURE) {
      resetExchangeFailureCount()
      updateAuthBootstrapState({
        lastErrorCode: 'exchange-failed-exhausted',
        redirectLocked: true,
        source: null,
        status: 'failed',
      })
      return
    }

    redirectToCasOnce(createAuthRedirectContext('exchange-failed'))
  }

  /**
   * 带 ticket 回跳时短重试读取 jt-cas，避免把暂时性 Cookie miss 判为失败。
   */
  async function readCasContextWithRetry(options: CasContextRetryOptions): Promise<string | null> {
    const maxAttempts = options.enabled ? options.maxAttempts : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      updateAuthBootstrapState({
        attempt,
        source: options.enabled ? 'ticket' : 'cas-cookie',
      })

      const jtCasToken = getJtCasToken()
      if (jtCasToken) {
        return jtCasToken
      }

      if (attempt < maxAttempts) {
        await waitForCasContextRetry(options.intervalMs)
      }
    }

    return null
  }

  /**
   * 判断当前业务登录态是否完整可用。
   * 仅有 token 但缺少最新用户快照时，仍视为不可用并重新登录。
   */
  function hasUsableToken(): boolean {
    if (!token.value || !userInfo.value) {
      return false
    }

    // 提前 TOKEN_EXPIRY_SKEW_MS 视为过期，临界期请求走静默换票而非等 401 整页跳转。
    return expiresAt.value === null || Date.now() < expiresAt.value - TOKEN_EXPIRY_SKEW_MS
  }

  /**
   * 用登录响应数据组装本地展示所需的最小用户对象；
   * isSuperAdmin 按 superAdminRoleCode 约定从系统角色派生。
   */
  function createStoredUserInfo(loginData: AuthLoginData): StoredUserInfo {
    const avatar = resolveCastgcHeadPic() ?? undefined
    return {
      userUid: loginData.userUid || '',
      name: loginData.name || loginData.userUid || '用户',
      username: undefined,
      avatar,
      isSuperAdmin: loginData.systemRole?.roleCode === superAdminRoleCode,
      systemRole: loginData.systemRole,
    }
  }

  /**
   * 通过 jt-cas Token 调用登录初始化接口，换取业务 token 与用户快照。
   */
  async function loginByCasUser(jtCasToken: string): Promise<boolean> {
    const loginData = await loginWithCasUser({}, jtCasToken)

    token.value = loginData.token || jtCasToken
    userInfo.value = createStoredUserInfo(loginData)
    expiresAt.value = loginData.expiresIn === undefined ? null : Date.now() + loginData.expiresIn * 1000
    saveToStorage()

    return true
  }

  /**
   * 从环境变量读取开发态 token，并写入本地业务登录态。
   */
  function loginWithEnvDevToken(rawToken: string): boolean {
    const normalizedToken = normalizeDevToken(rawToken)

    if (!normalizedToken) {
      errorMessage.value = '请在环境变量 VITE_DEV_TOKEN 中配置有效业务 token'
      return false
    }

    token.value = normalizedToken
    userInfo.value = createDevTokenUserInfo()
    expiresAt.value = null
    errorMessage.value = ''
    isEnvDevTokenRejected = false
    saveToStorage()

    return true
  }

  /**
   * 自动登录入口，复用并发 Promise，直接读取 jt-cas 统一 Token。
   */
  async function autoLogin(): Promise<boolean> {
    // 快路径：会话内已换票、非 ticket 回跳、内存态仍可用时直接复用，
    // 不进入 single-flight 也不读 localStorage，避免每个业务请求重复换票与解析；
    // 重定向进行中（redirectLocked）时不走快路径，避免与失效跳转竞态。
    if (
      !isDevTokenAuthMode()
      && !authBootstrapState.value.redirectLocked
      && !hasTicketInUrl()
      && hasCompletedBootstrapLogin
      && hasUsableToken()
    ) {
      updateAuthBootstrapState({
        redirectLocked: false,
        source: 'storage',
        status: 'authenticated',
      })
      return true
    }

    if (autoLoginPromise) {
      return autoLoginPromise
    }

    autoLoginPromise = (async () => {
      isLoggingIn.value = true
      errorMessage.value = ''
      updateAuthBootstrapState({
        attempt: 0,
        lastErrorCode: undefined,
        source: null,
        status: 'bootstrapping',
      })

      try {
        restoreFromStorage()

        // dev-token 模式不信任本地缓存：每次启动都从环境变量重新伪造登录并覆盖缓存，
        // 保证修改 VITE_DEV_SYSTEM_ROLE 等环境变量后重启 dev server 即可生效，
        // 避免旧角色快照（如 null）残留导致权限判定不生效。
        if (isDevTokenAuthMode()) {
          if (isEnvDevTokenRejected) {
            clear()
            errorMessage.value = '环境变量 VITE_DEV_TOKEN 已失效，请更新后重启开发服务'
            updateAuthBootstrapState({
              lastErrorCode: 'dev-token-rejected',
              source: null,
              status: 'failed',
            })
            return false
          }

          const envDevToken = getEnvDevToken()

          if (!envDevToken) {
            clear()
            errorMessage.value = '请在环境变量 VITE_DEV_TOKEN 中配置业务 token'
            updateAuthBootstrapState({
              lastErrorCode: 'missing-dev-token',
              source: null,
              status: 'failed',
            })
            return false
          }

          const loginSuccess = loginWithEnvDevToken(envDevToken)

          if (!loginSuccess) {
            updateAuthBootstrapState({
              lastErrorCode: 'invalid-dev-token',
              source: null,
              status: 'failed',
            })
            return false
          }

          updateAuthBootstrapState({
            redirectLocked: false,
            source: 'storage',
            status: 'authenticated',
          })
          return true
        }

        const readFromTicket = hasTicketInUrl()
        const jtCasToken = await readCasContextWithRetry({
          enabled: readFromTicket,
          intervalMs: casContextRetryIntervalMs,
          maxAttempts: casContextRetryMaxAttempts,
        })

        if (!jtCasToken) {
          clear()
          errorMessage.value = '未读取到有效的智慧树登录态'
          redirectToCasOnce(createAuthRedirectContext('missing-session'))
          return false
        }

        try {
          const loginSuccess = await loginByCasUser(jtCasToken)

          if (!loginSuccess) {
            handleExchangeFailure()
            return false
          }
        }
        catch (error) {
          errorMessage.value = error instanceof Error ? error.message : '自动登录失败'
          handleExchangeFailure()
          return false
        }

        clearCurrentCASParamsFromUrl()
        // 换票成功后标记本次会话已完成引导登录，后续业务请求可直接复用本地登录态，并清零失败计数。
        hasCompletedBootstrapLogin = true
        resetExchangeFailureCount()
        updateAuthBootstrapState({
          redirectLocked: false,
          source: readFromTicket ? 'ticket' : 'cas-cookie',
          status: 'authenticated',
        })
        return true
      }
      catch (error) {
        clear()
        errorMessage.value = error instanceof Error ? error.message : '自动登录失败'
        updateAuthBootstrapState({
          lastErrorCode: error instanceof Error ? error.name : 'unknown-error',
          source: null,
          status: 'failed',
        })
        return false
      }
      finally {
        isLoggingIn.value = false
      }
    })()

    // 等待已赋值的 Promise 后再释放，覆盖开发态不经过 await 就返回的分支。
    try {
      return await autoLoginPromise
    }
    finally {
      autoLoginPromise = null
    }
  }

  /**
   * 清理 store 和本地缓存中的业务登录态。
   */
  function clear(): void {
    // 已无登录态时直接返回，避免并发 401 场景重复清理 storage。
    if (!token.value && !userInfo.value) {
      return
    }

    token.value = ''
    userInfo.value = null
    expiresAt.value = null
    // 清理登录态时同步重置引导登录标记，保证登出/失效后下次会重新换票。
    hasCompletedBootstrapLogin = false
    clearAuthStorage()
  }

  /**
   * 登出后按当前认证模式处理退出，保证后续真实接口不会继续使用旧 token。
   */
  function logout(redirectPath?: string): void {
    clear()

    if (isDevTokenAuthMode()) {
      return
    }

    redirectToCasOnce(createAuthRedirectContext('logout', redirectPath))
  }

  /**
   * 处理接口判定的登录失效；开发态停止复用 env token，CAS 态只触发一次登录跳转。
   */
  function expireSession(redirectPath?: string): void {
    clear()

    if (isDevTokenAuthMode()) {
      isEnvDevTokenRejected = true
      errorMessage.value = '环境变量 VITE_DEV_TOKEN 已失效，请更新后重启开发服务'
      return
    }

    redirectToCasOnce(createAuthRedirectContext('session-expired', redirectPath))
  }

  /**
   * 读取当前请求需要使用的业务 token。
   */
  function getToken(): string {
    return token.value
  }

  /**
   * 判断当前 store 中是否已有可用业务登录态。
   */
  function isAuthenticated(): boolean {
    return hasUsableToken()
  }

  restoreFromStorage()

  return {
    errorMessage,
    authBootstrapState,
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
