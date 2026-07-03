import { defineStore } from 'pinia'
import type { LanguageCode } from '@/i18n'
import { availableLanguages } from '@/i18n'

export type ThemeMode = 'light' | 'dark' | 'system'

const SUPPORTED_LANGUAGES = availableLanguages.map(l => l.code)

function isValidLanguage(lang: string | null): lang is LanguageCode {
  return lang !== null && SUPPORTED_LANGUAGES.includes(lang as LanguageCode)
}

function getValidLanguage(): LanguageCode {
  const saved = localStorage.getItem('language')
  if (isValidLanguage(saved)) {
    return saved
  }
  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return 'zh-CN'
  }
  return 'en-US'
}

export const useSettingStore = defineStore('setting_info', {
  state: () => ({
    theme: (localStorage.getItem('theme') as ThemeMode) || 'system',
    language: getValidLanguage(),
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
    updateLanguage(language: LanguageCode) {
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
