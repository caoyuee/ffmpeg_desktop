import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import Performance from '@/pages/Performance/index.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

const mockInvoke = vi.mocked(invoke)

describe('Performance', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  function mountWithLocale() {
    const i18n = createI18n({
      legacy: false,
      locale: 'en-US',
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(Performance, {
      global: {
        plugins: [i18n],
      },
    })
  }

  it('renders aggregate FFmpeg process metrics and process names', async () => {
    mockInvoke.mockImplementation((command) => {
      if (command === 'get_system_metrics') {
        return Promise.resolve({
          cpu: { usage: 20, cores: 8, temperature: null },
          memory: { total: 16 * 1024 ** 3, used: 8 * 1024 ** 3, usedPercent: 50 },
          gpu: { usage: 0, memoryTotal: 0, memoryUsed: 0, temperature: null },
          disk: { readSpeed: 2, writeSpeed: 4 },
        })
      }
      if (command === 'get_ffmpeg_processes') {
        return Promise.resolve([
          { pid: 11, name: 'ffmpeg', cpu: 12.5, memory: 512 * 1024 ** 2 },
          { pid: 22, name: 'ffprobe', cpu: 2.5, memory: 256 * 1024 ** 2 },
        ])
      }
      return Promise.resolve(null)
    })

    const wrapper = mountWithLocale()
    await flushPromises()

    expect(wrapper.text()).toContain('FFmpeg Processes: 2')
    expect(wrapper.text()).toContain('Total CPU: 15.0%')
    expect(wrapper.text()).toContain('Total Memory: 768 MB')
    expect(wrapper.text()).toContain('ffprobe (PID: 22)')

    wrapper.unmount()
  })
})
