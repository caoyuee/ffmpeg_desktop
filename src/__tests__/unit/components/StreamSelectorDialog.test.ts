import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import StreamSelectorDialog from '@/components/Dialogs/StreamSelectorDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('StreamSelectorDialog', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(StreamSelectorDialog, {
      global: {
        plugins: [i18n],
      },
      props: {
        visible: true,
      },
      attachTo: document.body,
    })
  }

  it('renders English dialog text from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    const text = document.body.textContent || ''

    expect(text).toContain('Stream Selector')
    expect(text).toContain('Open')
    expect(text).toContain('Reset')
    expect(text).toContain('Drop a media file here or click "Open"')
    expect(text).toContain('Cancel')
    expect(text).toContain('Confirm')

    wrapper.unmount()
  })
})
