import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingStore } from '@/store/settingStore'

describe('settingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have a default theme', () => {
    const store = useSettingStore()
    expect(['dark', 'light', 'system']).toContain(store.theme)
  })

  it('should have a language', () => {
    const store = useSettingStore()
    expect(['zh-CN', 'en-US']).toContain(store.language)
  })

  it('should support theme change', () => {
    const store = useSettingStore()
    store.theme = 'light'
    expect(store.theme).toBe('light')
    store.theme = 'dark'
    expect(store.theme).toBe('dark')
  })
})
