import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import OutputSettings from '@/pages/ParameterPanel/components/OutputSettings.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { DEFAULT_PRESET, type PresetData } from '@/types/preset'

/** WebM 不支持 libx264 / aac，是稳定的「不兼容」测试夹具。 */
function incompatiblePreset(): PresetData {
  const preset = structuredClone(DEFAULT_PRESET)
  preset.output.container = '.webm'
  preset.video.encoder.codec = 'libx264'
  preset.audio.encoder = 'aac'
  return preset
}

describe('OutputSettings', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US', preset: PresetData = DEFAULT_PRESET) {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(OutputSettings, {
      global: {
        plugins: [i18n],
      },
      props: {
        preset,
      },
    })
  }

  it('renders auto naming labels on both sides of the switch', () => {
    const wrapper = mountWithLocale('en-US')
    const switchToggle = wrapper.find('.switch-toggle')

    expect(switchToggle.exists()).toBe(true)
    expect(switchToggle.text()).toContain('Disabled')
    expect(switchToggle.text()).toContain('Enabled')
  })

  it('renders timestamp options as checkbox inputs', () => {
    const wrapper = mountWithLocale('en-US')
    const checkboxes = wrapper.findAll('.timestamp-checkbox input[type="checkbox"]')

    expect(checkboxes).toHaveLength(3)
    expect(checkboxes[0]!.attributes('type')).toBe('checkbox')
  })

  describe('R2.2 编码器兼容性显式确认', () => {
    it('不兼容时显示警告与提示文案，但绝不自动修改编码器', () => {
      const wrapper = mountWithLocale('en-US', incompatiblePreset())

      const warning = wrapper.find('.compat-warning')
      expect(warning.exists()).toBe(true)
      expect(warning.text()).toContain('incompatible')
      expect(wrapper.find('[data-testid="use-recommended"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="keep-current"]').exists()).toBe(true)

      // 关键回归：旧路径会静默把 libx264 改成 libvpx-vp9 并只打 console.warn。
      expect(wrapper.emitted('update:preset')).toBeUndefined()
      expect(DEFAULT_PRESET.video.encoder.codec).not.toBe('libvpx-vp9')
    })

    it('点击「使用推荐编码器」后才切换，且不污染传入的 preset 对象', async () => {
      const preset = incompatiblePreset()
      const wrapper = mountWithLocale('en-US', preset)

      await wrapper.find('[data-testid="use-recommended"]').trigger('click')
      await nextTick()

      const emitted = wrapper.emitted('update:preset')
      expect(emitted).toBeTruthy()
      const updated = emitted!.at(-1)![0] as PresetData
      expect(updated.video.encoder.codec).toBe('libvpx-vp9')
      expect(updated.audio.encoder).toBe('libopus')
      // 入参 preset 与全局默认预设都不能被就地修改。
      expect(preset.video.encoder.codec).toBe('libx264')
      expect(preset.audio.encoder).toBe('aac')
      expect(DEFAULT_PRESET.video.encoder.codec).not.toBe('libvpx-vp9')
      expect(wrapper.find('.compat-warning').exists()).toBe(false)
    })

    it('点击「保留当前设置」只记录确认，不改动任何编码器', async () => {
      const wrapper = mountWithLocale('en-US', incompatiblePreset())

      await wrapper.find('[data-testid="keep-current"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-testid="use-recommended"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="keep-current"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="compat-acknowledged"]').exists()).toBe(true)
      expect(wrapper.emitted('update:preset')).toBeUndefined()
    })

    it('配置变化后确认态重置，要求用户重新确认', async () => {
      const wrapper = mountWithLocale('en-US', incompatiblePreset())
      await wrapper.find('[data-testid="keep-current"]').trigger('click')
      await nextTick()
      expect(wrapper.find('[data-testid="compat-acknowledged"]').exists()).toBe(true)

      // AVI 同样不支持 aac，切过去后警告仍在，但确认态必须清零。
      await wrapper.find('select').setValue('.avi')
      await nextTick()

      expect(wrapper.find('.compat-warning').exists()).toBe(true)
      expect(wrapper.find('[data-testid="use-recommended"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="compat-acknowledged"]').exists()).toBe(false)
    })

    it('兼容的组合不显示兼容性警告', () => {
      const preset = structuredClone(DEFAULT_PRESET)
      preset.output.container = '.mp4'
      preset.video.encoder.codec = 'libx264'
      preset.audio.encoder = 'aac'
      const wrapper = mountWithLocale('en-US', preset)

      expect(wrapper.find('.compat-warning').exists()).toBe(false)
    })

    it('中英文都能渲染确认交互文案', () => {
      const zh = mountWithLocale('zh-CN', incompatiblePreset())
      const en = mountWithLocale('en-US', incompatiblePreset())

      expect(zh.find('[data-testid="use-recommended"]').text().length).toBeGreaterThan(0)
      expect(en.find('[data-testid="use-recommended"]').text()).not.toBe(
        zh.find('[data-testid="use-recommended"]').text(),
      )
      expect(zh.find('.compat-hint').exists()).toBe(true)
      expect(en.find('.compat-hint').exists()).toBe(true)
    })
  })
})
