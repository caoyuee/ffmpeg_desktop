import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import InterpolationDialog from '@/components/Dialogs/InterpolationDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('InterpolationDialog', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(InterpolationDialog, {
      global: {
        plugins: [i18n],
      },
      props: {
        visible: true,
        modelValue: {
          targetFps: '',
          interpolationMode: '',
          meMode: '',
          meAlgorithm: '',
          mcMode: '',
          vsmb: false,
          blockSize: '',
          searchRange: '',
          scThreshold: '',
        },
      },
      attachTo: document.body,
    })
  }

  it('renders English dialog text from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    const text = document.body.textContent || ''

    expect(text).toContain('minterpolate Interpolation')
    expect(text).toContain('Target Frame Rate')
    expect(text).toContain('Motion Compensation Mode')
    expect(text).toContain('Cancel')
    expect(text).toContain('OK')

    wrapper.unmount()
  })
})
