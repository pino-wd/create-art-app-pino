import type { App } from 'vue'
import type { HighlightDirective } from './business/highlight'
import type { RippleDirective } from './business/ripple'
import type { AuthDirective } from './core/auth'
import type { RolesDirective } from './core/roles'
import { setupHighlightDirective } from './business/highlight'
import { setupRippleDirective } from './business/ripple'
import { setupAuthDirective } from './core/auth'
import { setupRolesDirective } from './core/roles'

export function setupGlobDirectives(app: App) {
  setupAuthDirective(app) // 权限指令
  setupRolesDirective(app) // 角色权限指令
  setupHighlightDirective(app) // 高亮指令
  setupRippleDirective(app) // 水波纹指令
}

export type { AuthDirective, HighlightDirective, RippleDirective, RolesDirective }
