import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useSettingStore = defineStore('setting_info', {
  state: () => ({
    theme: (localStorage.getItem('theme') as ThemeMode) || 'system',
    language: localStorage.getItem('language') || 'zh-CN',
  }),
  actions: {
    updateTheme(theme: ThemeMode) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      this.applyTheme()
    },
    applyTheme() {
      const root = document.documentElement
      
      if (this.theme === 'system') {
        root.removeAttribute('data-theme')
      } else {
        root.setAttribute('data-theme', this.theme)
      }
    },
    updateLanguage(language: string) {
      this.language = language
      localStorage.setItem('language', language)
    },
    initTheme() {
      this.applyTheme()
      
      if (this.theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', () => {
          this.applyTheme()
        })
      }
    },
  },
})
