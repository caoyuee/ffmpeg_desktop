import { mount } from '@vue/test-utils'
import { invoke } from '@tauri-apps/api/core'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import Settings from '@/pages/Settings/index.vue'

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(() => Promise.resolve('0.1.7')),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(() => Promise.resolve()),
}))

const EXE = '/opt/apps/FFmpeg_Desktop'

function mountSettings() {
  return mount(Settings, {
    global: {
      plugins: [i18n, createPinia()],
      stubs: { ConfirmDialog: true, Toast: true },
    },
  })
}

describe('Settings MCP tab（RM1 后续）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(invoke).mockReset()
  })

  it('存在 MCP 服务标签页，展示由 exe 路径拼出的 mcpServers 配置', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_executable_path') return Promise.resolve(EXE)
      return Promise.resolve(null)
    })
    const wrapper = mountSettings()

    // tab 导航是 div.settings-tab（非 button），按 i18n 渲染后的中文标签找。
    const mcpTab = wrapper.findAll('.settings-tab').find((b) => b.text() === 'MCP 服务')
    expect(mcpTab).toBeTruthy()
    await mcpTab!.trigger('click')

    const code = wrapper.find('.mcp-config-code')
    expect(code.exists()).toBe(true)
    const parsed = JSON.parse(code.text())
    expect(parsed.mcpServers['ffmpeg-desktop']).toEqual({
      command: EXE,
      args: ['mcp'],
    })
  })

  it('点击复制按钮把配置写入剪贴板，并短暂显示「已复制」', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_executable_path') return Promise.resolve(EXE)
      return Promise.resolve(null)
    })
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    const wrapper = mountSettings()
    const mcpTab = wrapper.findAll('.settings-tab').find((b) => b.text() === 'MCP 服务')
    await mcpTab!.trigger('click')

    const copyBtn = wrapper.findAll('button').find((b) => b.text() === '复制配置')
    expect(copyBtn).toBeTruthy()

    // fake timers 必须在 click 前启用，否则 setTimeout 落在真实时钟上收不回来。
    vi.useFakeTimers()
    try {
      await copyBtn!.trigger('click')

      expect(writeText).toHaveBeenCalledTimes(1)
      expect(
        JSON.parse(writeText.mock.calls[0]![0] as string).mcpServers['ffmpeg-desktop'].command,
      ).toBe(EXE)
      expect(wrapper.text()).toContain('已复制')

      await vi.runAllTimersAsync()
      expect(wrapper.text()).not.toContain('已复制')
    } finally {
      vi.useRealTimers()
    }
  })

  it('get_executable_path 失败时展示错误提示且不生成残缺配置', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_executable_path') return Promise.reject(new Error('boom'))
      return Promise.resolve(null)
    })
    const wrapper = mountSettings()

    const mcpTab = wrapper.findAll('.settings-tab').find((b) => b.text() === 'MCP 服务')
    await mcpTab!.trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('无法获取应用路径')
    })
    expect(wrapper.find('.mcp-config-code').text()).toBe('')
  })
})
