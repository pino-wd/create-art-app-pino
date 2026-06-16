import { AppRouteRecord } from '@/types/router'
import { RoutesAlias } from '../routesAlias'

/**
 * 动态路由（脚手架精简版）
 */
export const asyncRoutes: AppRouteRecord[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: RoutesAlias.Layout,
    redirect: '/dashboard/console',
    meta: { title: '仪表盘', icon: 'ri:pie-chart-line' },
    children: [
      {
        path: 'console',
        name: 'Console',
        component: '/dashboard/console',
        meta: {
          title: '工作台',
          icon: 'ri:home-smile-2-line',
          keepAlive: false,
          fixedTab: true,
        },
      },
      {
        path: 'analysis',
        name: 'Analysis',
        component: '/dashboard/analysis',
        meta: {
          title: '分析页',
          icon: 'ri:align-item-bottom-line',
          keepAlive: false,
        },
      },
    ],
  }
]
