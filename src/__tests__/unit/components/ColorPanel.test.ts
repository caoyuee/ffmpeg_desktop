import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ColorPanel from '@/components/ColorPanel/ColorPanel.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('ColorPanel', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(ColorPanel, {
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
    expect(wrapper.text()).toContain('Basic Adjustments')
    expect(wrapper.text()).toContain('Brightness')
    expect(wrapper.text()).toContain('Pixel Format')
    expect(wrapper.text()).toContain('Color Space')
    expect(wrapper.text()).toContain('Tone Mapping')
  })
})
