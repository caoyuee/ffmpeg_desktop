import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setLocale, type LanguageCode } from '@/i18n'
import {
  DEFAULT_APP_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings,
  type AppSettings,
  type ThemeMode,
} from '@/config/settings'

/**
 * R2.3 唯一的设置 store（setup 风格）。
 * 状态值、持久化、主题/语言副作用全部收敛在这里；
 * config/settings.ts 是纯函数层，本 store 是响应式门面，UI 不再持有 settings 副本。
 */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>(loadSettings())
  const theme = computed(() => settings.value.theme)
  const language = computed(() => settings.value.language)

  /**
   * R1-7：任务输出目录的唯一决策值（defaultOutputDir 并入命令构建器默认值）。
   * 空串表示「跟随预设 / 源目录」；custom 模式返回规范化后的 customOutputDir。
   */
  const taskOutputDir = computed(() => {
    if (settings.value.defaultOutputDir !== 'custom') return ''
    return settings.value.customOutputDir.trim()
  })

  function applyTheme() {
    const root = document.documentElement
    if (settings.value.theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', settings.value.theme)
    }
  }

  /** 把当前（可能被 v-model 直接改动过的）值规范化、持久化并同步副作用。 */
  function commit() {
    settings.value = normalizeSettings(settings.value)
    saveSettings(settings.value)
    setLocale(settings.value.language)
    applyTheme()
  }

  function update(patch: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...patch }
    commit()
  }

  function updateTheme(value: ThemeMode) {
    update({ theme: value })
  }

  function updateLanguage(value: LanguageCode) {
    update({ language: value })
  }

  function reset() {
    settings.value = { ...DEFAULT_APP_SETTINGS }
    commit()
  }

  /** 跨窗口 storage 事件：重新读取唯一键并重新应用主题/语言。 */
  function reload() {
    settings.value = loadSettings()
    setLocale(settings.value.language)
    applyTheme()
  }

  function initTheme() {
    applyTheme()
    if (settings.value.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', applyTheme)
    }
  }

  return {
    settings,
    theme,
    language,
    taskOutputDir,
    commit,
    update,
    updateTheme,
    updateLanguage,
    reset,
    reload,
    applyTheme,
    initTheme,
  }
})
