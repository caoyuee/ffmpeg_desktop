import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PresetManager from '@/components/PresetManager/PresetManager.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

vi.mock('@/store/presetStore', () => ({
  usePresetStore: () => ({
    presets: [],
    currentPreset: {
      id: '',
      name: 'Default',
      output: { container: '.mp4' },
      video: { encoder: { codec: '' }, bitrateControl: { qualityValue: '' } },
      audio: { encoder: '' },
    },
    loadPresets: vi.fn(),
    setCurrentPreset: vi.fn(),
    savePreset: vi.fn(),
    deletePreset: vi.fn(),
    exportPreset: vi.fn(),
    importPreset: vi.fn(),
  }),
}))

describe('PresetManager', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(PresetManager, {
      global: {
        plugins: [i18n],
      },
    })
  }

  it('renders English labels from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    expect(wrapper.text()).toContain('Preset Manager')
    expect(wrapper.text()).toContain('Create New Preset')
    expect(wrapper.text()).toContain('Import')
    expect(wrapper.text()).toContain('No presets')
  })
})
