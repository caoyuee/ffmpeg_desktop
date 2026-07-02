import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

  it('stretches the row label to match the row content height', () => {
    const dialogCss = readFileSync(
      resolve(process.cwd(), 'src/components/Dialogs/FrameBlendDialog.vue'),
      'utf-8',
    )

    expect(dialogCss).toContain('.form-row {')
    expect(dialogCss).toContain('align-items: stretch;')
    expect(dialogCss).toContain('.row-label {')
    expect(dialogCss).toContain('display: flex;')
  })
})
