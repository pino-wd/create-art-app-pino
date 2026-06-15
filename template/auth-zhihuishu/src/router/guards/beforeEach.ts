import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import { useAuthStore } from '@/store/modules/auth'
import { isDevTokenAuthMode, isZhihuishuDomain } from '@/utils/auth'

/**
 * 设置路由前置守卫（智慧树 CAS + dev-token 双模式）
 */
export function setupBeforeEachGuard(router: Router): void {
  router.beforeEach(async (to) => {
    NProgress.start()

    const authStore = useAuthStore()

    // 错误页直接放行
    if (to.name === 'Forbidden' || to.name === 'NotFound') {
      return true
    }

    // dev-token 模式
    if (isDevTokenAuthMode()) {
      const success = await authStore.autoLogin()
      if (!success) {
        return { path: '/403', replace: true }
      }
      return true
    }

    // CAS 模式：需要在智慧树域名下运行
    if (!isZhihuishuDomain()) {
      authStore.logout(to.fullPath)
      return false
    }

    const success = await authStore.autoLogin()
    if (!success) {
      authStore.logout(to.fullPath)
      return false
    }

    return true
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
