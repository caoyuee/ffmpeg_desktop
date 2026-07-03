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

  it('syncs the crop input with the latest initial crop value', async () => {
    const wrapper = mountWithLocale('en-US')

    await wrapper.setProps({
      initialCrop: '320:180:10:20',
    })

    const cropInput = wrapper.find('input.crop-input')
    expect((cropInput.element as HTMLInputElement).value).toBe('320:180:10:20')

    wrapper.unmount()
  })
})
