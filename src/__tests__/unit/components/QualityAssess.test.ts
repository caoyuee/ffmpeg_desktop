import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import QualityAssess from '@/pages/QualityAssess/index.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('QualityAssess', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US' = 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(QualityAssess, {
      global: {
        plugins: [i18n],
      },
    })
  }

  it('renders quality metric options as dedicated checkbox inputs', async () => {
    const wrapper = mountWithLocale()
    const metricCheckboxes = wrapper.findAll('.metric-checkbox')

    expect(metricCheckboxes).toHaveLength(3)
    expect(metricCheckboxes.every((checkbox) => checkbox.attributes('type') === 'checkbox')).toBe(true)

    await metricCheckboxes[1].setChecked(true)
    expect((metricCheckboxes[1].element as HTMLInputElement).checked).toBe(true)
  })
})
