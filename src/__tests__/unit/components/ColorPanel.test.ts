import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ColorPanel from '@/components/ColorPanel/ColorPanel.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('ColorPanel', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(ColorPanel, {
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
    expect(wrapper.text()).toContain('Basic Adjustments')
    expect(wrapper.text()).toContain('Brightness')
    expect(wrapper.text()).toContain('Pixel Format')
    expect(wrapper.text()).toContain('Color Space')
    expect(wrapper.text()).toContain('Tone Mapping')
  })

  it('positions gamma slider at 1 when gamma is unset', () => {
    const wrapper = mountWithLocale('en-US')
    const gammaInput = wrapper.findAll('input[type="range"]')[3]

    expect(gammaInput.element.value).toBe('1')
  })

  it('updates preset gamma when gamma slider changes', async () => {
    const wrapper = mountWithLocale('en-US')
    const gammaInput = wrapper.findAll('input[type="range"]')[3]

    await gammaInput.setValue('2')

    const emittedPreset = wrapper.emitted('update:preset')?.[0]?.[0]
    expect(emittedPreset.video.colorManagement.gamma).toBe('2')
  })
})
