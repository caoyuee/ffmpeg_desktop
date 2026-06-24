import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StreamPanel from '@/components/StreamPanel/StreamPanel.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('StreamPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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

    return mount(StreamPanel, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset: DEFAULT_PRESET,
      },
    })
  }

  it('renders English labels from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    expect(wrapper.text()).toContain('Video Streams')
    expect(wrapper.text()).toContain('Keep Other Video Streams')
    expect(wrapper.text()).toContain('Subtitle Streams')
    expect(wrapper.text()).toContain('Keep Metadata')
  })

  it('updates stream text inputs without Vue warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = mountWithLocale('en-US')

    const videoInput = wrapper.findAll('input[type="text"]')[0]
    await videoInput.setValue('0,1,2')

    expect(warnSpy).not.toHaveBeenCalled()
  })
})
