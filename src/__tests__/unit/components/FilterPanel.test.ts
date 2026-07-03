import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import FilterPanel from '@/components/FilterPanel/FilterPanel.vue'
import FrameBlendDialog from '@/components/Dialogs/FrameBlendDialog.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('FilterPanel', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(FilterPanel, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset: DEFAULT_PRESET,
      },
    })
  }

  it('renders English labels from i18n', () => {
    const wrapper = mountWithLocale('en-US')
    expect(wrapper.text()).toContain('Deinterlace')
    expect(wrapper.text()).toContain('Denoise')
    expect(wrapper.text()).toContain('Sharpen')
    expect(wrapper.text()).toContain('Rotate / Flip')
    expect(wrapper.text()).toContain('Advanced Filter Tools')
  })

  it('passes frame blend settings to the frame blend dialog', async () => {
    const wrapper = mountWithLocale('en-US')
    await wrapper.findAll('button').find((button) => button.text() === 'Frame Blend / Motion Blur')?.trigger('click')
    const dialog = wrapper.findComponent(FrameBlendDialog)

    expect(dialog.props('modelValue')).toEqual(DEFAULT_PRESET.video.filters.frameBlend)
  })
})
