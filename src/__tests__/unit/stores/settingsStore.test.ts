import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '@/store/settingsStore'
import {
  DEFAULT_APP_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  loadSettings,
} from '@/config/settings'
import { getLocale } from '@/i18n'

// R2.3 红测试：三套设置归一后的唯一响应式 store（setup 风格）。
describe('R2.3 settingsStore（唯一设置 store）', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    setActivePinia(createPinia())
    // setup.ts 里的 window.matchMedia 是全局共享的 vi.fn()，必须清掉跨用例的调用记录。
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('初始化即读取唯一事实源，theme/language 为派生只读视图', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
        language: 'en-US',
      }),
    )

    const store = useSettingsStore()
    expect(store.theme).toBe('dark')
    expect(store.language).toBe('en-US')
    expect(store.settings.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
  })

  it('update(patch) 修改状态、立即持久化并保持其余字段不变', () => {
    const store = useSettingsStore()

    store.update({ minimizeToTray: true, maxConcurrentTasks: 6 })

    expect(store.settings.minimizeToTray).toBe(true)
    expect(loadSettings().maxConcurrentTasks).toBe(6)
    expect(loadSettings().minimizeToTray).toBe(true)
    expect(loadSettings().ffmpegPath).toBe(DEFAULT_APP_SETTINGS.ffmpegPath)
  })

  it('直接改 settings ref 后 commit() 会规范化并持久化', () => {
    const store = useSettingsStore()
    store.settings.theme = 'light'
    store.settings.maxConcurrentTasks = 999

    store.commit()

    expect(store.settings.maxConcurrentTasks).toBe(8)
    expect(loadSettings().theme).toBe('light')
    expect(loadSettings().maxConcurrentTasks).toBe(8)
  })

  it('updateTheme 应用 DOM 主题属性，system 模式移除属性', () => {
    const store = useSettingsStore()

    store.updateTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(loadSettings().theme).toBe('dark')

    store.updateTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    store.updateTheme('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('updateLanguage 同步 i18n locale 并持久化', () => {
    const store = useSettingsStore()

    store.updateLanguage('en-US')
    expect(getLocale()).toBe('en-US')
    expect(loadSettings().language).toBe('en-US')

    store.updateLanguage('zh-CN')
    expect(getLocale()).toBe('zh-CN')
  })

  it('reset() 恢复默认值并写回唯一键', () => {
    const store = useSettingsStore()
    store.update({ ffmpegPath: '/custom', theme: 'dark', language: 'en-US' })

    store.reset()

    expect(store.settings).toEqual(DEFAULT_APP_SETTINGS)
    expect(loadSettings()).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('reload() 用于跨窗口 storage 事件：读回新键并重新应用主题', () => {
    const store = useSettingsStore()
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_APP_SETTINGS,
        theme: 'dark',
        ffmpegPath: '/other/window',
      }),
    )

    store.reload()

    expect(store.settings.ffmpegPath).toBe('/other/window')
    expect(store.theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('initTheme() 在 system 模式下注册系统主题变化监听', () => {
    const addEventListener = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener,
    } as unknown as MediaQueryList)
    const store = useSettingsStore()

    store.initTheme()

    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('initTheme() 在非 system 模式下不注册监听', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia')
    const store = useSettingsStore()
    store.updateTheme('light')

    store.initTheme()

    expect(matchMedia).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
