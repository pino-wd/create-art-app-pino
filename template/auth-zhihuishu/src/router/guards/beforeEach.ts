import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import { MenuProcessor, RouteRegistry } from '@/router/core'
import { useAuthStore } from '@/store/modules/auth'
import { useMenuStore } from '@/store/modules/menu'
import { useUserStore } from '@/store/modules/user'
import { isDevTokenAuthMode } from '@/utils/auth'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '@/utils/router'

const FORBIDDEN_PAGE_PATH = '/403'

/**
 * 设置路由前置守卫（智慧树 CAS + dev-token 双模式）
 *
 * 登录态准备一律走 authStore.autoLogin()：
 * - 失败且换票已达上限时落到 403，避免后端故障时整页死循环；
 * - 其余 CAS 失败场景交给 logout 触发一次整页登录跳转；
 * - 登录成功后再同步头部用户信息，并初始化菜单与动态路由。
 */
export function setupBeforeEachGuard(router: Router): void {
  router.beforeEach(async (to) => {
    NProgress.start()

    const authStore = useAuthStore()

    // 错误页直接放行
    if (to.name === 'Forbidden' || to.name === 'NotFound' || to.name === 'ServerError') {
      return true
    }

    const success = await authStore.autoLogin()

    if (!success) {
      // 换票失败已达上限时不再跳转 CAS，直接落到错误页，避免后端故障时整页死循环。
      if (authStore.authBootstrapState.lastErrorCode === 'exchange-failed-exhausted') {
        return { path: FORBIDDEN_PAGE_PATH, replace: true }
      }

      // 开发态仅清理本地登录态并落到 403；CAS 态触发一次整页登录跳转。
      authStore.logout(to.fullPath)
      return isDevTokenAuthMode() ? { path: FORBIDDEN_PAGE_PATH, replace: true } : false
    }

    // 登录成功后同步业务登录态到顶部用户菜单
    useUserStore().syncFromBusinessAuth()

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
      }
      catch (error) {
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
