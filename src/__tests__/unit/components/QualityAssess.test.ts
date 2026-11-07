import { describe, expect, it, beforeEach, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import QualityAssess from '@/pages/QualityAssess/index.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

describe('QualityAssess', () => {
  function mountWithLocale(locale: 'zh-CN' | 'en-US' = 'en-US') {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(QualityAssess, {
      global: {
        plugins: [i18n],
      },
    })
  }

  beforeEach(() => {
    vi.mocked(invoke).mockReset()
    vi.mocked(listen).mockReset()
    vi.mocked(listen).mockImplementation(() => Promise.resolve(vi.fn()) as never)
    vi.mocked(open).mockReset()
  })

  async function selectBothFiles(wrapper: ReturnType<typeof mountWithLocale>) {
    vi.mocked(open)
      .mockResolvedValueOnce('/ref.mp4' as never)
      .mockResolvedValueOnce('/dist.mp4' as never)

    const toolbarButtons = wrapper.findAll('.app-toolbar button')
    await toolbarButtons[0]!.trigger('click')
    await toolbarButtons[1]!.trigger('click')
    await flushPromises()

    await wrapper.findAll('.app-bottom-bar button')[0]!.trigger('click')
    await flushPromises()
    await flushPromises()
  }

  it('renders quality metric options as dedicated checkbox inputs', async () => {
    const wrapper = mountWithLocale()
    const metricCheckboxes = wrapper.findAll('.metric-checkbox')

    expect(metricCheckboxes).toHaveLength(3)
    expect(metricCheckboxes.every((checkbox) => checkbox.attributes('type') === 'checkbox')).toBe(
      true,
    )

    await metricCheckboxes[1].setChecked(true)
    expect((metricCheckboxes[1].element as HTMLInputElement).checked).toBe(true)
  })

  it('R2.1 评测经由 start_ffmpeg 启动，且只监听 ffmpeg-* 事件', async () => {
    const wrapper = mountWithLocale()
    await selectBothFiles(wrapper)

    expect(invoke).toHaveBeenCalledWith(
      'start_ffmpeg',
      expect.objectContaining({
        command: expect.stringContaining('-lavfi'),
        cpuAffinity: null,
      }),
    )
    expect(invoke).not.toHaveBeenCalledWith('execute_ffmpeg_command', expect.anything())
    expect(invoke).not.toHaveBeenCalledWith('stop_convert')

    const listened = vi.mocked(listen).mock.calls.map(([eventName]) => eventName)
    expect(listened).toEqual(['ffmpeg-log', 'ffmpeg-progress', 'ffmpeg-finish', 'ffmpeg-error'])
  })

  it('R2.1 组件卸载时释放全部监听器', async () => {
    const unlisten = vi.fn()
    vi.mocked(listen).mockImplementation(() => Promise.resolve(unlisten) as never)

    const wrapper = mountWithLocale()
    await selectBothFiles(wrapper)

    wrapper.unmount()
    expect(unlisten).toHaveBeenCalledTimes(4)
  })
})
