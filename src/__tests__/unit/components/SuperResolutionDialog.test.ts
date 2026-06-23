import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SuperResolutionDialog from '@/components/Dialogs/SuperResolutionDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('SuperResolutionDialog', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(SuperResolutionDialog, {
      global: {
        plugins: [i18n],
      },
      props: {
        visible: true,
        modelValue: {
          width: '',
          height: '',
          upscaler: '',
          downscaler: '',
          antiRinging: '',
          shaders: [],
        },
      },
      attachTo: document.body,
    })
  }

  it('renders English dialog text from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    const text = document.body.textContent || ''

    expect(text).toContain('libplacebo Super Resolution')
    expect(text).toContain('Target Resolution')
    expect(text).toContain('Add')
    expect(text).toContain('Cancel')
    expect(text).toContain('OK')

    wrapper.unmount()
  })
})
