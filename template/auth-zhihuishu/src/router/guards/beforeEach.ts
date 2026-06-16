import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import { useAuthStore } from '@/store/modules/auth'
import { useMenuStore } from '@/store/modules/menu'
import { isDevTokenAuthMode, isZhihuishuDomain } from '@/utils/auth'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '@/utils/router'
import { MenuProcessor, RouteRegistry } from '@/router/core'

/**
 * 设置路由前置守卫（智慧树 CAS + dev-token 双模式）
 */
export function setupBeforeEachGuard(router: Router): void {
  router.beforeEach(async (to) => {
    NProgress.start()

    const authStore = useAuthStore()

    // 错误页直接放行
    if (to.name === 'Forbidden' || to.name === 'NotFound' || to.name === 'ServerError') {
      return true
    }

    // dev-token 模式
    if (isDevTokenAuthMode()) {
      const success = await authStore.autoLogin()
      if (!success) {
        return { path: '/403', replace: true }
      }
    } else {
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
    }

    // 初始化菜单和动态路由
    const menuStore = useMenuStore()
    if (menuStore.menuList.length === 0) {
      try {
        const menuProcessor = new MenuProcessor()
        const menuList = await menuProcessor.getMenuList()
        menuStore.setMenuList(menuList)

        const routeRegistry = new RouteRegistry(router)
        routeRegistry.register(menuList)

        // 注册动态路由后，进行重定向以确保新路由生效
        return { ...to, replace: true }
      } catch (error) {
        console.error('[Router] 初始化菜单或路由失败:', error)
      }
    }

    setWorktab(to)
    setPageTitle(to)
    return true
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
