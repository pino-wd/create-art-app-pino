import type { AuthMode } from '@/types/auth'
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
 * 获取当前运行时使用的认证模式，供路由守卫和请求链路统一判断。
 */
export function getAuthMode(): AuthMode {
  return resolveAuthMode()
}

/**
 * 判断当前是否启用了开发态手动 token 登录模式。
 */
export function isDevTokenAuthMode(): boolean {
  return getAuthMode() === 'dev-token'
}

/**
 * 从 document.cookie 中读取指定 Cookie，避免额外引入 Cookie 依赖。
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
 * 判断给定字符串是否为合法的 HTTP(S) URL，防止 XSS 注入。
 */
function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  }
  catch {
    return false
  }
}

/**
 * 从 CASTGC Cookie 中安全解析用户头像 URL。
 *
 * 读取 CASTGC → decodeURIComponent → JSON.parse → 校验 headPic 为合法 HTTP(S) URL。
 * Cookie 缺失、解码失败、JSON 非法、字段缺失或 URL 非法时均返回 null。
 * 不记录、输出或持久化完整 Cookie 内容。
 */
export function resolveCastgcHeadPic(): string | null {
  const rawCookie = getCookieValue(casTicketCookieName)
  if (!rawCookie)
    return null

  try {
    const profile = JSON.parse(decodeURIComponent(rawCookie))
    const headPic = profile.headPic
    if (typeof headPic !== 'string' || !isSafeHttpUrl(headPic)) {
      return null
    }
    return headPic
  }
  catch {
    return null
  }
}

/**
 * 获取 jt-cas 登录 Cookie 的原始值。
 */
export function getJtCasToken(): string | null {
  const token = getCookieValue(casCookieName)
  if (token) {
    return token
  }

  if (isDevTokenAuthMode()) {
    const envToken = import.meta.env.VITE_DEV_TOKEN
    if (envToken) {
      return envToken
    }
  }

  return null
}

/**
 * 以当前站点为边界解析回跳地址，避免外部 origin 混入 CAS service。
 */
function createRedirectUrl(redirectPath?: string): URL {
  const rawRedirectPath = redirectPath?.trim() || getCurrentRedirectPath()
  return new URL(rawRedirectPath, window.location.origin)
}

/**
 * 清理回跳路径里的 CAS 参数，避免旧 ticket 被继续带回 service。
 */
export function sanitizeRedirectPath(redirectPath?: string): string {
  const urlObj = createRedirectUrl(redirectPath)
  urlObj.searchParams.delete('ticket')
  urlObj.searchParams.delete('service')
  urlObj.searchParams.delete('source')
  return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`
}

/**
 * 拼出当前页面路径，用于登录完成后回跳原页面。
 */
export function getCurrentRedirectPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/**
 * 判断当前 URL 是否携带 CAS ticket，决定是否启用短重试等待 Cookie 稳定。
 */
export function hasTicketInUrl(): boolean {
  return createRedirectUrl(getCurrentRedirectPath()).searchParams.has('ticket')
}

/**
 * 清理地址栏中的 CAS 参数，登录成功后避免刷新页面重复消费旧 ticket。
 */
export function clearCurrentCASParamsFromUrl(): void {
  const currentRedirectPath = getCurrentRedirectPath()
  const sanitizedRedirectPath = sanitizeRedirectPath(currentRedirectPath)

  if (sanitizedRedirectPath === currentRedirectPath) {
    return
  }

  window.history.replaceState(window.history.state, document.title, sanitizedRedirectPath)
}

/**
 * 清理本地业务登录态，避免旧 token 继续污染真实接口请求。
 */
export function clearAuthStorage(): void {
  localStorage.removeItem(authStorageKeys.token)
  localStorage.removeItem(authStorageKeys.userInfo)
  localStorage.removeItem(authStorageKeys.expiresAt)
  localStorage.removeItem(authStorageKeys.mode)
  localStorage.removeItem(authStorageKeys.userPermissions)
}

/**
 * 通过过期写入方式清除当前域及二级域下的智慧树 CAS Cookie。
 */
export function removeAuthCookies(): void {
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
 * 跳转智慧树 CAS 登录页，并把目标页面作为 service 参数传入。
 */
export function redirectToZhihuishuLogin(redirectPath?: string): void {
  const sanitizedRedirectPath = sanitizeRedirectPath(redirectPath)
  const targetUrl = `${window.location.origin}${sanitizedRedirectPath}`

  window.location.replace(`${zhihuishuCASLoginUrl}${encodeURIComponent(targetUrl)}`)
}

/**
 * 清理登录态后按认证模式处理退出；开发态无登录页，不做整页跳转。
 */
export function loginOutRedirect(redirectPath?: string): void {
  clearAuthStorage()

  if (isDevTokenAuthMode()) {
    return
  }

  removeAuthCookies()
  redirectToZhihuishuLogin(redirectPath)
}
