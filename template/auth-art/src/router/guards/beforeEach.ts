import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import { fetchGetUserInfo } from '@/api/auth'
import { useUserStore } from '@/store/modules/user'

// 是否已获取过用户信息
let hasLoadedUserInfo = false

/**
 * 重置路由守卫状态（登出时调用）
 */
export function resetRouterState(): void {
  hasLoadedUserInfo = false
}

/**
 * 设置路由前置守卫
 */
export function setupBeforeEachGuard(router: Router): void {
  router.beforeEach(async (to, _from, next) => {
    NProgress.start()

    const userStore = useUserStore()

    // 访问登录页直接放行
    if (to.path === '/login') {
      if (userStore.isLogin) {
        next('/')
      }
      else {
        next()
      }
      return
    }

    // 未登录跳转到登录页
    if (!userStore.isLogin) {
      next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
      return
    }

    // 首次进入已登录页面时获取用户信息
    if (!hasLoadedUserInfo) {
      try {
        const userInfo = await fetchGetUserInfo()
        userStore.setUserInfo(userInfo as any)
        hasLoadedUserInfo = true
      }
      catch (error) {
        console.error('[Router] 获取用户信息失败:', error)
        userStore.logOut()
        next({ path: '/login' })
        return
      }
    }

    next()
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
