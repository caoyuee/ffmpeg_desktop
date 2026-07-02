import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import TrimPanel from '@/components/TrimPanel/TrimPanel.vue'
import CropDialog from '@/components/Dialogs/CropDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('TrimPanel', () => {
  function mountPanel(locale: 'zh-CN' | 'en-US' = 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(TrimPanel, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset: DEFAULT_PRESET,
      },
      attachTo: document.body,
    })
  }

  it('opens the crop dialog when clicking the crop tool button', async () => {
    const wrapper = mountPanel()

    await wrapper.get('button.tool-btn').trigger('click')

    expect(wrapper.findComponent(CropDialog).props('modelValue')).toBe(true)

    wrapper.unmount()
  })
})
