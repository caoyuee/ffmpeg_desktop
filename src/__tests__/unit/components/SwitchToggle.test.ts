import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SwitchToggle from '@/components/SwitchToggle/SwitchToggle.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('SwitchToggle', () => {
  function mountToggle(props: Record<string, unknown> = {}) {
    const i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(SwitchToggle, {
      global: {
        plugins: [i18n],
      },
      props: {
        modelValue: false,
        ...props,
      },
    })
  }

  it('hides labels by default', () => {
    const wrapper = mountToggle()

    expect(wrapper.text()).toBe('')
  })

  it('shows custom labels when enabled', () => {
    const wrapper = mountToggle({
      showLabels: true,
      offLabel: 'Disabled',
      onLabel: 'Enabled',
    })

    expect(wrapper.text()).toContain('Disabled')
    expect(wrapper.text()).toContain('Enabled')
  })
})
