import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import OutputSettings from '@/pages/ParameterPanel/components/OutputSettings.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('OutputSettings', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(OutputSettings, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset: DEFAULT_PRESET,
      },
    })
  }

  it('renders auto naming labels on both sides of the switch', () => {
    const wrapper = mountWithLocale('en-US')
    const switchToggle = wrapper.find('.switch-toggle')

    expect(switchToggle.exists()).toBe(true)
    expect(switchToggle.text()).toContain('Disabled')
    expect(switchToggle.text()).toContain('Enabled')
  })

  it('renders timestamp options as checkbox inputs', () => {
    const wrapper = mountWithLocale('en-US')
    const checkboxes = wrapper.findAll('.timestamp-checkbox input[type="checkbox"]')

    expect(checkboxes).toHaveLength(3)
    expect(checkboxes[0].attributes('type')).toBe('checkbox')
  })
})
