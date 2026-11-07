import { createI18n } from 'vue-i18n'
import { loadSettings } from '@/config/settings'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export type MessageSchema = typeof zhCN

export type LanguageCode = 'zh-CN' | 'en-US'

export interface LanguageOption {
  code: LanguageCode
  name: string
  nativeName: string
}

export const availableLanguages: LanguageOption[] = [
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
]

// R2.3：初始语言只从唯一事实源读取（含旧键迁移），不再直接碰 localStorage。
const defaultLocale: LanguageCode = loadSettings().language

const i18n = createI18n<[MessageSchema], LanguageCode>({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  missingWarn: false,
  fallbackWarn: false,
})

export function setLocale(locale: LanguageCode): void {
  if (i18n.mode === 'legacy') {
    i18n.global.locale = locale
  } else {
    ;(i18n.global.locale as unknown as { value: LanguageCode }).value = locale
  }
  // R2.3：持久化统一由 store/settingsStore.ts 负责，i18n 只切换运行时 locale。
  document.documentElement.lang = locale
}

export function getLocale(): LanguageCode {
  if (i18n.mode === 'legacy') {
    return i18n.global.locale as LanguageCode
  }
  return (i18n.global.locale as unknown as { value: LanguageCode }).value
}

export function getLanguageName(code: LanguageCode): string {
  const lang = availableLanguages.find((l) => l.code === code)
  return lang ? lang.nativeName : code
}

export default i18n
