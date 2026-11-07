import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PresetManager from '@/components/PresetManager/PresetManager.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { createDefaultPreset } from '@/config/presetSchema'
import { PresetShareError } from '@/config/presetShare'

const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    presets: [] as unknown[],
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
    importShareText: vi.fn(),
    createShareText: vi.fn(),
  },
}))

vi.mock('@/store/presetStore', () => ({
  usePresetStore: () => storeMock,
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

describe('PresetManager', () => {
  beforeEach(() => {
    storeMock.presets = []
    vi.clearAllMocks()
    storeMock.createShareText.mockReturnValue({ ok: true, text: 'FFD1:unit-test' })
    storeMock.importShareText.mockResolvedValue({})
  })

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

  it('renders share entry in both locales', () => {
    expect(mountWithLocale('en-US').text()).toContain('Import from Text')
    expect(mountWithLocale('zh-CN').text()).toContain('从分享码导入')
  })

  it('点击复制分享码会生成并展示分享码', async () => {
    const preset = createDefaultPreset()
    preset.id = 'p-1'
    preset.name = 'Share me'
    storeMock.presets = [preset]
    const wrapper = mountWithLocale('en-US')

    await wrapper.get('[data-testid="share-preset"]').trigger('click')
    await flushPromises()

    expect(storeMock.createShareText).toHaveBeenCalledWith(preset)
    expect(wrapper.find('[data-testid="share-dialog"]').exists()).toBe(true)
    expect((wrapper.get('[data-testid="share-output"]').element as HTMLTextAreaElement).value).toBe(
      'FFD1:unit-test',
    )
  })

  it('createShareText 失败时按错误码提示且不产生分享码', async () => {
    storeMock.createShareText.mockReturnValue({ ok: false, code: 'textTooLarge' })
    storeMock.presets = [createDefaultPreset()]
    const wrapper = mountWithLocale('en-US')

    await wrapper.get('[data-testid="share-preset"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="share-dialog"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="share-error"]').text()).toContain('too large')
    expect((wrapper.get('[data-testid="share-output"]').element as HTMLTextAreaElement).value).toBe(
      '',
    )
  })

  it('从文本导入会把输入交给 store.importShareText', async () => {
    const wrapper = mountWithLocale('en-US')
    await wrapper.get('[data-testid="import-share-text"]').trigger('click')
    await wrapper.get('[data-testid="share-input"]').setValue('FFD1:unit-test')
    await wrapper.get('[data-testid="share-import-confirm"]').trigger('click')
    await flushPromises()

    expect(storeMock.importShareText).toHaveBeenCalledWith('FFD1:unit-test')
    expect(wrapper.find('[data-testid="share-dialog"]').exists()).toBe(false)
  })

  it('导入失败时在对话框内按错误码显示中英文案', async () => {
    storeMock.importShareText.mockRejectedValue(new PresetShareError('unsupportedVersion'))

    const en = mountWithLocale('en-US')
    await en.get('[data-testid="import-share-text"]').trigger('click')
    await en.get('[data-testid="share-input"]').setValue('FFD1:future')
    await en.get('[data-testid="share-import-confirm"]').trigger('click')
    await flushPromises()
    expect(en.get('[data-testid="share-error"]').text()).toContain('newer version')

    const zh = mountWithLocale('zh-CN')
    await zh.get('[data-testid="import-share-text"]').trigger('click')
    await zh.get('[data-testid="share-input"]').setValue('FFD1:future')
    await zh.get('[data-testid="share-import-confirm"]').trigger('click')
    await flushPromises()
    expect(zh.get('[data-testid="share-error"]').text()).toContain('更新版本')
  })
})
