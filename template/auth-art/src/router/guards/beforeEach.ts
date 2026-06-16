import type { Router } from 'vue-router'
import NProgress from 'nprogress'
import { fetchGetUserInfo } from '@/api/auth'
import { useUserStore } from '@/store/modules/user'
import { useMenuStore } from '@/store/modules/menu'
import { setWorktab } from '@/utils/navigation'
import { setPageTitle } from '@/utils/router'
import { MenuProcessor, RouteRegistry } from '@/router/core'

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
        next('/dashboard/console')
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
        userStore.setUserInfo(userInfo)
        hasLoadedUserInfo = true
      }
      catch (error) {
        console.error('[Router] 获取用户信息失败:', error)
        userStore.logOut()
        next({ path: '/login' })
        return
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

        // 注册动态路由后，进行重定向跳转以使新路由生效
        next({ ...to, replace: true })
        return
      } catch (error) {
        console.error('[Router] 初始化菜单或路由失败:', error)
      }
    }

    setWorktab(to)
    setPageTitle(to)
    next()
  })

  router.afterEach(() => {
    NProgress.done()
  })
}
