import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SubtitlePanel from '@/components/SubtitlePanel/SubtitlePanel.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET } from '@/types/preset'

describe('SubtitlePanel', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(SubtitlePanel, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset: DEFAULT_PRESET,
      },
    })
  }

  it('renders English labels from i18n', async () => {
    const wrapper = mountWithLocale('en-US')
    await wrapper.find('select').setValue('external')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Subtitle Burn-in')
    expect(wrapper.text()).toContain('Subtitle Mode')
    expect(wrapper.text()).toContain('Font Style')
    expect(wrapper.text()).toContain('Alignment')
  })

  it('shows a translated font name placeholder', async () => {
    const wrapper = mountWithLocale('en-US')
    await wrapper.find('select').setValue('external')
    await wrapper.vm.$nextTick()

    const fontNameInput = wrapper.find('input[placeholder="e.g. Sans"]')
    expect(fontNameInput.exists()).toBe(true)
  })
})
