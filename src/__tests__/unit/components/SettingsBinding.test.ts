import { flushPromises, mount } from '@vue/test-utils'
import { invoke } from '@tauri-apps/api/core'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n, { getLocale } from '@/i18n'
import Settings from '@/pages/Settings/index.vue'
import { loadSettings, SETTINGS_STORAGE_KEY } from '@/config/settings'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(() => Promise.resolve('0.1.6')),
}))
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(() => Promise.resolve(null)),
}))
vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(() => Promise.resolve()),
}))

// R2.3：设置页必须直接绑定唯一 store，不再持有本地副本、不再双写旧键。
describe('R2.3 设置页与唯一 store 的绑定', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    pinia = createPinia()
    setActivePinia(pinia)
    vi.mocked(invoke).mockReset()
    vi.mocked(invoke).mockResolvedValue(null)
  })

  function mountPage() {
    return mount(Settings, {
      global: {
        plugins: [i18n, pinia],
        stubs: { ConfirmDialog: true, Toast: true },
      },
    })
  }

  function storageKeys(): string[] {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
      (key): key is string => key !== null,
    )
  }

  it('修改语言经唯一 store 持久化并同步 i18n locale', async () => {
    const wrapper = mountPage()

    await wrapper.findAll('.settings-section')[0]!.findAll('select')[0]!.setValue('en-US')
    await flushPromises()

    expect(useSettingsStore(pinia).language).toBe('en-US')
    expect(loadSettings().language).toBe('en-US')
    expect(getLocale()).toBe('en-US')
  })

  it('修改主题经唯一 store 应用到 DOM 并持久化', async () => {
    const wrapper = mountPage()

    await wrapper.findAll('.settings-section')[0]!.findAll('select')[1]!.setValue('dark')
    await flushPromises()

    expect(useSettingsStore(pinia).theme).toBe('dark')
    expect(loadSettings().theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('修改最大并发数同时写盘并同步任务队列', async () => {
    const wrapper = mountPage()
    const input = wrapper.findAll('.settings-section')[1]!.find('input[type="number"]')

    await input.setValue('5')
    await input.trigger('change')
    await flushPromises()

    expect(loadSettings().maxConcurrentTasks).toBe(5)
    expect(useTaskStore(pinia).maxConcurrent).toBe(5)
  })

  it('保存后 localStorage 只有唯一设置键，不再双写 theme/language/appSettings', async () => {
    const wrapper = mountPage()

    await wrapper.findAll('.settings-section')[0]!.findAll('select')[1]!.setValue('light')
    await flushPromises()

    const keys = storageKeys()
    expect(keys).toContain(SETTINGS_STORAGE_KEY)
    expect(keys).not.toContain('appSettings')
    expect(keys).not.toContain('theme')
    expect(keys).not.toContain('language')
  })
})
