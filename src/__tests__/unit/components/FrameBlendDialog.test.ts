import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import FrameBlendDialog from '@/components/Dialogs/FrameBlendDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('FrameBlendDialog', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(FrameBlendDialog, {
      global: {
        plugins: [i18n],
      },
      props: {
        visible: true,
        modelValue: {
          frameRate: '',
          blendMode: '',
          ratio: '',
        },
      },
      attachTo: document.body,
    })
  }

  it('renders English dialog text from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    const text = document.body.textContent || ''

    expect(text).toContain('tblend Motion Blur')
    expect(text).toContain('Reduce Frame Rate')
    expect(text).toContain('Cancel')
    expect(text).toContain('OK')

    wrapper.unmount()
  })
})
