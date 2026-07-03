import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import VideoEncoderSettings from '@/pages/ParameterPanel/components/VideoEncoderSettings.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'
import type { PresetData } from '@/types/preset'
import { useHardwareCapabilityStore } from '@/store/hardwareCapabilityStore'

vi.mocked(invoke)

describe('VideoEncoderSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(invoke).mockReset()
  })

  function createPreset(): PresetData {
    return structuredClone(DEFAULT_PRESET)
  }

  function mountWithLocale(locale: 'zh-CN' | 'en-US' = 'en-US', preset = createPreset()) {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(VideoEncoderSettings, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset,
      },
    })
  }

  it('marks GPU acceleration and threads as positive integer fields', () => {
    const wrapper = mountWithLocale()
    const inputs = wrapper.findAll('input')

    expect(inputs[0].attributes('inputmode')).toBe('numeric')
    expect(inputs[0].attributes('pattern')).toBe('[1-9][0-9]*')
    expect(inputs[1].attributes('inputmode')).toBe('numeric')
    expect(inputs[1].attributes('pattern')).toBe('[1-9][0-9]*')
  })

  it('shows validation errors and skips updates for non-positive integer values', async () => {
    const wrapper = mountWithLocale()
    const [gpuInput, threadsInput] = wrapper.findAll('input')

    await gpuInput.setValue('0')
    await threadsInput.setValue('1.5')

    expect(wrapper.text()).toContain('Please enter a positive integer')
    expect(wrapper.emitted('update:preset')).toBeUndefined()
  })

  it('emits updates for positive integers and empty values', async () => {
    const wrapper = mountWithLocale()
    const [gpuInput, threadsInput] = wrapper.findAll('input')

    await gpuInput.setValue('2')
    await threadsInput.setValue('')

    expect(wrapper.text()).not.toContain('Please enter a positive integer')
    expect(wrapper.emitted('update:preset')).toBeTruthy()
  })

  it('disables unavailable hardware encoders after capability detection', async () => {
    const store = useHardwareCapabilityStore()
    store.capabilities = {
      ffmpegPath: 'ffmpeg',
      backends: ['nvenc'],
      encoders: ['h264_nvenc'],
      hwaccels: ['cuda'],
      filters: [],
    }

    const preset = createPreset()
    preset.video.encoder.category = 'h264'

    const wrapper = mountWithLocale('en-US', preset)
    const options = wrapper.findAll('option')
    const qsvOption = options.find((option) => option.attributes('value') === 'h264_qsv')

    expect(qsvOption?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Unavailable hardware encoders are disabled')
  })

  it('warns when the selected hardware encoder is unavailable', () => {
    const store = useHardwareCapabilityStore()
    store.capabilities = {
      ffmpegPath: 'ffmpeg',
      backends: [],
      encoders: [],
      hwaccels: [],
      filters: [],
    }

    const preset = createPreset()
    preset.video.encoder.category = 'h264'
    preset.video.encoder.codec = 'h264_nvenc'

    const wrapper = mountWithLocale('en-US', preset)

    expect(wrapper.text()).toContain('Current FFmpeg does not support h264_nvenc')
  })
})
