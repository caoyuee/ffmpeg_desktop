import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StreamPanel from '@/components/StreamPanel/StreamPanel.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('StreamPanel checkboxes', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US' = 'en-US') {
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

  it('keeps the video stream checkbox as a real checkbox control', async () => {
    const wrapper = mountWithLocale()
    const videoCheckbox = wrapper.find('input[type="checkbox"]')

    expect(videoCheckbox.exists()).toBe(true)
    expect(videoCheckbox.attributes('type')).toBe('checkbox')

    await videoCheckbox.setChecked(true)
    expect((videoCheckbox.element as HTMLInputElement).checked).toBe(true)
  })
})
