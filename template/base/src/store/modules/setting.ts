import { defineStore } from 'pinia'

export const useSettingStore = defineStore('setting', {
  state: () => ({
    sidebarCollapsed: false,
    themeColor: '#409eff',
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    setThemeColor(color: string) {
      this.themeColor = color
    },
  },
  persist: true,
})
