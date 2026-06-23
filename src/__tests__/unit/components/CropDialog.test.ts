import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CropDialog from '@/components/Dialogs/CropDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('CropDialog', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(CropDialog, {
      global: {
        plugins: [i18n],
      },
      props: {
        modelValue: true,
      },
      attachTo: document.body,
    })
  }

  it('renders English dialog text from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    const text = wrapper.text()

    expect(text).toContain('Interactive Crop Window')
    expect(text).toContain('Open')
    expect(text).toContain('Complete')
    expect(text).toContain('Free')
    expect(text).toContain('Center')
    expect(text).toContain('Drop a video file here or click "Open"')

    wrapper.unmount()
  })
})
