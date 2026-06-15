import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export const useUserStore = defineStore(
  'userStore',
  () => {
    const router = useRouter()

    const isLogin = ref(false)
    const accessToken = ref('')
    const refreshToken = ref('')
    const info = ref<Record<string, any>>({})

    const getUserInfo = computed(() => info.value)

    function setUserInfo(newInfo: Record<string, any>) {
      info.value = newInfo
    }

    function setLoginStatus(status: boolean) {
      isLogin.value = status
    }

    function setToken(newAccessToken: string, newRefreshToken?: string) {
      accessToken.value = newAccessToken
      if (newRefreshToken) {
        refreshToken.value = newRefreshToken
      }
    }

    function logOut() {
      info.value = {}
      isLogin.value = false
      accessToken.value = ''
      refreshToken.value = ''

      const currentRoute = router.currentRoute.value
      const redirect = currentRoute.path !== '/login' ? currentRoute.fullPath : undefined
      router.push({
        path: '/login',
        query: redirect ? { redirect } : undefined,
      })
    }

    return {
      isLogin,
      accessToken,
      refreshToken,
      info,
      getUserInfo,
      setUserInfo,
      setLoginStatus,
      setToken,
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
