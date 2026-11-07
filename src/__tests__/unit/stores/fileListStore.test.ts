import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFileListStore } from '@/store/fileListStore'

describe('R2.3 fileListStore（FileItem 单一模型）', () => {
  beforeEach(() => setActivePinia(createPinia()))

  describe('R1-10 添加到队列时保留未选中文件', () => {
    it('removeSelected 只移除选中项，其余文件按原顺序保留', () => {
      const store = useFileListStore()
      store.addFiles(['a.mp4', 'b.mp4', 'c.mp4', 'd.mp4'])
      store.selectedIndices = [1, 3]

      store.removeSelected()

      expect(store.files).toEqual(['a.mp4', 'c.mp4'])
      expect(store.selectedIndices).toEqual([])
    })

    it('removeSelected 与 clear 的语义不同', () => {
      const store = useFileListStore()
      store.addFiles(['a.mp4', 'b.mp4'])
      store.selectedIndices = [0]

      store.removeSelected()
      expect(store.files).toEqual(['b.mp4'])

      store.clear()
      expect(store.files).toEqual([])
    })
  })

  it('files 是 fileItems 的只读派生视图，条目带 status 字段', () => {
    const store = useFileListStore()
    store.addFiles(['a.mp4', 'b.mkv'])

    expect(store.files).toEqual(['a.mp4', 'b.mkv'])
    expect(store.fileItems).toEqual([
      { path: 'a.mp4', status: 'pending' },
      { path: 'b.mkv', status: 'pending' },
    ])
  })

  it('重复路径不会重复入列（沿用 useFileList 的去重语义）', () => {
    const store = useFileListStore()
    store.addFiles(['a.mp4', 'b.mp4'])
    store.addFiles(['b.mp4', 'c.mp4'])

    expect(store.files).toEqual(['a.mp4', 'b.mp4', 'c.mp4'])
  })

  it('updateFileStatus / updateFileMediaInfo 写入对应条目', () => {
    const store = useFileListStore()
    store.addFiles(['a.mp4'])

    store.updateFileStatus(0, 'error', 'codec missing')
    store.updateFileMediaInfo(0, { width: 1920, height: 1080 })

    expect(store.fileItems[0]).toEqual({
      path: 'a.mp4',
      status: 'error',
      error: 'codec missing',
      mediaInfo: { width: 1920, height: 1080 },
    })
  })

  it('越界索引的状态更新是安全的空操作', () => {
    const store = useFileListStore()
    store.addFiles(['a.mp4'])

    expect(() => store.updateFileStatus(9, 'success')).not.toThrow()
    expect(() => store.updateFileMediaInfo(-1, { width: 100 })).not.toThrow()
    expect(store.fileItems[0]!.status).toBe('pending')
  })

  it('removeFile 同步修正选中索引', () => {
    const store = useFileListStore()
    store.addFiles(['b.mp4', 'a.mp4', 'c.mp4'])
    store.updateFileStatus(1, 'success')
    store.selectedIndices = [1, 2]

    store.removeFile(0)

    expect(store.files).toEqual(['a.mp4', 'c.mp4'])
    expect(store.selectedIndices).toEqual([0, 1])
    expect(store.fileItems[0]).toEqual({ path: 'a.mp4', status: 'success' })
  })

  it('sortByName 排序整个 FileItem，状态与媒体信息跟着条目走', () => {
    const store = useFileListStore()
    store.addFiles(['c.mp4', 'a.mp4', 'b.mp4'])
    store.updateFileStatus(2, 'success')
    store.updateFileMediaInfo(2, { duration: 12 })

    store.sortByName()

    expect(store.files).toEqual(['a.mp4', 'b.mp4', 'c.mp4'])
    expect(store.fileItems[1]).toEqual({
      path: 'b.mp4',
      status: 'success',
      mediaInfo: { duration: 12 },
    })
  })

  it('clear 同时清空条目与选中索引', () => {
    const store = useFileListStore()
    store.addFiles(['a.mp4'])
    store.selectedIndices = [0]

    store.clear()

    expect(store.fileItems).toEqual([])
    expect(store.selectedIndices).toEqual([])
    expect(store.files).toEqual([])
  })
})
