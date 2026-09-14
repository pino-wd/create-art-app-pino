import type {
  AuthDirective,
  HighlightDirective,
  RippleDirective,
  RolesDirective,
} from '@/directives'

declare module 'vue' {
  export interface GlobalDirectives {
    vAuth: AuthDirective
    vRoles: RolesDirective
    vRipple: RippleDirective
    vHighlight: HighlightDirective
  }
}
