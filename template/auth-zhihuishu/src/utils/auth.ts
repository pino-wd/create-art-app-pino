import type { AuthMode, CasCookieUser } from '@/types/auth'
import {
  authStorageKeys,
  casCookieName,
  casTicketCookieName,
  zhihuishuCASLoginUrl,
} from '@/constants/auth'

/**
 * 统一解析认证模式，开发环境默认使用手动 token，非开发环境默认走 CAS。
 */
function resolveAuthMode(): AuthMode {
  const authMode = import.meta.env.VITE_AUTH_MODE

  if (authMode === 'cas' || authMode === 'dev-token') {
    return authMode
  }

  return import.meta.env.DEV ? 'dev-token' : 'cas'
}

/**
 * 获取当前运行时使用的认证模式
 */
export function getAuthMode(): AuthMode {
  return resolveAuthMode()
}

/**
 * 判断当前是否启用了开发态手动 token 登录模式
 */
export function isDevTokenAuthMode(): boolean {
  return getAuthMode() === 'dev-token'
}

/**
 * 判断当前页面是否运行在智慧树域名下
 */
export function isZhihuishuDomain(): boolean {
  const hostname = window.location.hostname
  return hostname === 'zhihuishu.com' || hostname.endsWith('.zhihuishu.com')
}

/**
 * 从 document.cookie 中读取指定 Cookie
 */
function getCookieValue(name: string): string | null {
  const prefix = `${name}=`
  const cookie = document.cookie
    .split(';')
    .map(item => item.trim())
    .find(item => item.startsWith(prefix))

  return cookie ? cookie.slice(prefix.length) : null
}

/**
 * 获取智慧树 CAS 登录 Cookie 的原始值
 */
export function getCASLOGC(): string | null {
  return getCookieValue(casCookieName)
}

/**
 * 校验 CAS Cookie 中是否具备可用于业务换票的用户 ID
 */
function hasValidUserId(value: Partial<CasCookieUser>): value is CasCookieUser {
  const userId = value.userId

  if (typeof userId === 'number') {
    return Number.isFinite(userId)
  }

  if (typeof userId === 'string') {
    return userId.trim().length > 0
  }

  return false
}

/**
 * 解析 CASLOGC，解析失败或缺少 userId 时统一返回 null
 */
export function parseCASLOGC(): CasCookieUser | null {
  const caslogcCookie = getCASLOGC()

  if (!caslogcCookie) {
    return null
  }

  try {
    const decodedData = decodeURIComponent(caslogcCookie)
    const parsed = JSON.parse(decodedData) as Partial<CasCookieUser>

    if (!hasValidUserId(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * 清理本地业务登录态
 */
export function clearAuthStorage(): void {
  localStorage.removeItem(authStorageKeys.token)
  localStorage.removeItem(authStorageKeys.userInfo)
  localStorage.removeItem(authStorageKeys.expiresAt)
  localStorage.removeItem(authStorageKeys.mode)
}

/**
 * 通过过期写入方式清除当前域及二级域下的智慧树 CAS Cookie
 */
export function removeCASLOGC(): void {
  const hostname = window.location.hostname
  const expireCookie = (name: string, domain?: string): void => {
    const domainText = domain ? `; domain=${domain}` : ''
    document.cookie = `${name}=; Max-Age=0; path=/${domainText}; SameSite=Lax`
  }

  expireCookie(casCookieName)
  expireCookie(casTicketCookieName)

  if (!hostname.includes('.')) {
    return
  }

  const parts = hostname.split('.')
  const secondLevelDomain = `.${parts.slice(-2).join('.')}`
  expireCookie(casCookieName, secondLevelDomain)
  expireCookie(casTicketCookieName, secondLevelDomain)
}

/**
 * 跳转智慧树 CAS 登录页
 */
export function redirectToZhihuishuLogin(redirectPath?: string): void {
  const targetUrl = redirectPath
    ? `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`
    : window.location.href

  window.location.replace(`${zhihuishuCASLoginUrl}${encodeURIComponent(targetUrl)}`)
}

/**
 * 清理登录态后按认证模式处理退出
 */
export function loginOutRedirect(redirectPath?: string): void {
  clearAuthStorage()

  if (isDevTokenAuthMode()) {
    return
  }

  removeCASLOGC()
  redirectToZhihuishuLogin(redirectPath)
}
