import { flushPromises, mount } from '@vue/test-utils'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import PrepareFiles from '@/pages/PrepareFiles/index.vue'
import { useFileListStore } from '@/store/fileListStore'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('R1-9 / R1-10 / R1-11 准备文件页', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    vi.mocked(invoke).mockReset()
    vi.mocked(open).mockReset()
  })

  function mountPage() {
    return mount(PrepareFiles, {
      global: {
        plugins: [i18n, pinia],
        stubs: { Toast: true },
      },
    })
  }

  it('添加文件夹时调用 Rust 递归扫描并只加入返回的视频文件', async () => {
    vi.mocked(open).mockResolvedValue('/videos' as never)
    vi.mocked(invoke).mockResolvedValue(['/videos/a.mp4', '/videos/sub/b.mkv'] as never)
    const wrapper = mountPage()

    await wrapper.findAll('.prepare-toolbar button')[1]!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(invoke).toHaveBeenCalledWith('list_media_files', { dir: '/videos' })
    expect(useFileListStore(pinia).files).toEqual(['/videos/a.mp4', '/videos/sub/b.mkv'])
  })

  it('扫描失败时不会把目录本身塞进列表，并显示 Toast', async () => {
    vi.mocked(open).mockResolvedValue('/videos' as never)
    vi.mocked(invoke).mockRejectedValue(new Error('permission denied'))
    const wrapper = mountPage()

    await wrapper.findAll('.prepare-toolbar button')[1]!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(useFileListStore(pinia).files).toEqual([])
    expect(wrapper.findAll('.file-item')).toHaveLength(0)
  })

  it('R1-11 Windows 路径在文件列表里显示正确的文件名', async () => {
    vi.mocked(open).mockResolvedValue('C:\\Videos' as never)
    vi.mocked(invoke).mockResolvedValue(['C:\\Videos\\clip.mp4'] as never)
    const wrapper = mountPage()

    await wrapper.findAll('.prepare-toolbar button')[1]!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.file-name').text()).toBe('clip.mp4')
  })

  it('R1-10 添加到队列后未选中的文件仍然保留', async () => {
    const store = useFileListStore(pinia)
    store.addFiles(['a.mp4', 'b.mp4', 'c.mp4'])
    store.selectedIndices = [1]
    const wrapper = mountPage()

    await wrapper.find('.add-to-queue-btn').trigger('click')
    await flushPromises()

    expect(store.files).toEqual(['a.mp4', 'c.mp4'])
  })
})
