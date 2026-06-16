/**
 * 用户状态管理（基础版本）
 * 提供语言和登录状态的最小化 store
 * auth-art / auth-zhihuishu 模板会覆盖此文件
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LanguageEnum } from '@/enums/appEnum'
import { router } from '@/router'
import { useMenuStore } from './menu'

export interface UserInfo {
  roles?: string[]
  buttons?: string[]
  userId?: string | number
  [key: string]: any
}

export const useUserStore = defineStore(
  'userStore',
  () => {
    const language = ref(LanguageEnum.ZH)
    const isLogin = ref(false)
    const info = ref<UserInfo>({})
    const accessToken = ref('')
    const refreshToken = ref('')

    const getUserInfo = computed(() => info.value)

    const setLanguage = (lang: LanguageEnum) => {
      language.value = lang
    }

    const setToken = (newAccessToken: string, newRefreshToken?: string) => {
      accessToken.value = newAccessToken
      if (newRefreshToken) {
        refreshToken.value = newRefreshToken
      }
    }

    const setLoginStatus = (status: boolean) => {
      isLogin.value = status
    }

    const setUserInfo = (newInfo: UserInfo) => {
      info.value = newInfo
    }

    const logOut = () => {
      info.value = {}
      isLogin.value = false
      accessToken.value = ''
      refreshToken.value = ''
      useMenuStore().setHomePath('')
      router.push({ name: 'Login' })
    }

    return {
      language,
      isLogin,
      info,
      accessToken,
      refreshToken,
      getUserInfo,
      setLanguage,
      setToken,
      setLoginStatus,
      setUserInfo,
      logOut,
    }
  },
  {
    persist: {
      key: 'user',
      storage: localStorage,
    },
  },
)
