import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import AdvancedSettings from '@/pages/ParameterPanel/components/AdvancedSettings.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('AdvancedSettings', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US' = 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(AdvancedSettings, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset: structuredClone(DEFAULT_PRESET),
      },
    })
  }

  it('renders full custom mode as a dedicated checkbox input', async () => {
    const wrapper = mountWithLocale()
    const checkbox = wrapper.find('.full-custom-checkbox')

    expect(checkbox.exists()).toBe(true)
    expect(checkbox.attributes('type')).toBe('checkbox')

    await checkbox.setChecked(true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('validates CPU threads as a positive integer', async () => {
    const wrapper = mountWithLocale()
    const cpuThreadsInput = wrapper.find('.cpu-threads-input')

    expect(cpuThreadsInput.attributes('inputmode')).toBe('numeric')
    expect(cpuThreadsInput.attributes('pattern')).toBe('[1-9][0-9]*')

    await cpuThreadsInput.setValue('0')
    expect(wrapper.text()).toContain('Please enter a positive integer')
    expect(wrapper.emitted('update:preset')).toBeUndefined()

    await cpuThreadsInput.setValue('4')
    expect(wrapper.text()).not.toContain('Please enter a positive integer')
    expect(wrapper.emitted('update:preset')).toBeTruthy()
  })

  it('validates CPU affinity as zero or positive integer list', async () => {
    const wrapper = mountWithLocale()
    const cpuAffinityInput = wrapper.find('.cpu-affinity-input')

    expect(cpuAffinityInput.attributes('inputmode')).toBe('numeric')
    expect(cpuAffinityInput.attributes('pattern')).toBe('[0-9]+(,[0-9]+)*')

    await cpuAffinityInput.setValue('-1')
    expect(wrapper.text()).toContain('Please enter 0 or positive integers separated by commas')
    expect(wrapper.emitted('update:preset')).toBeUndefined()

    await cpuAffinityInput.setValue('0,1,2')
    expect(wrapper.text()).not.toContain('Please enter 0 or positive integers separated by commas')
    expect(wrapper.emitted('update:preset')).toBeTruthy()
  })
})
