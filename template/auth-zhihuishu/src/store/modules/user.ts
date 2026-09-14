/**
 * 用户状态管理（智慧树 CAS 版本）
 *
 * 覆盖 base 版本：登出委托 auth store 走 CAS 退出链路（不跳不存在的 Login 路由），
 * 头部用户展示字段由 syncFromBusinessAuth 从业务登录态同步。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LanguageEnum } from '@/enums/appEnum'
import { useAuthStore } from '@/store/modules/auth'

interface ArtUserInfo {
  userUid: string
  userName: string
  userAvatar: string
  /**
   * 以下字段供 base 的角色指令（v-roles）与菜单过滤消费。
   * 智慧树 CAS 模式不返回角色/按钮清单，保持缺省即“无绑定”，权限判定按自然逻辑拒绝。
   */
  roles?: string[]
  buttons?: string[]
}

export const useUserStore = defineStore(
  'userStore',
  () => {
    const language = ref(LanguageEnum.ZH)
    const isLogin = ref(false)
    const info = ref<ArtUserInfo>({
      userUid: '',
      userName: '业务用户',
      userAvatar: '',
    })

    const getUserInfo = computed(() => info.value)

    /**
     * 同步当前业务登录态到 Art 顶部用户菜单，仅保留展示所需字段。
     */
    function syncFromBusinessAuth(): void {
      const authStore = useAuthStore()
      const businessUser = authStore.userInfo

      if (!businessUser) {
        return
      }

      info.value = {
        userUid: businessUser.userUid,
        userName: businessUser.name || businessUser.username || '业务用户',
        userAvatar: businessUser.avatar || '',
      }
      isLogin.value = authStore.isAuthenticated()
    }

    /**
     * 设置界面语言
     */
    function setLanguage(lang: LanguageEnum): void {
      language.value = lang
    }

    /**
     * 登出：委托 auth store 按当前认证模式退出（CAS 整页跳转 / 开发态仅清理本地态）。
     */
    function logOut(): void {
      const authStore = useAuthStore()
      authStore.logout()
      isLogin.value = false
    }

    return {
      language,
      isLogin,
      info,
      getUserInfo,
      setLanguage,
      logOut,
      syncFromBusinessAuth,
    }
  },
  {
    persist: {
      key: 'art-user',
      storage: localStorage,
    },
  },
)
