import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { FileItem, FileStatus, MediaInfo } from '@/types/fileList'

/**
 * R2.3 文件列表的唯一状态源：沿用原 useFileList 的 FileItem 模型
 * （带 status / mediaInfo），同时为 PrepareFiles、启动参数等调用方派生
 * `files: string[]` 视图。原 hook 每次调用创建独立的局部状态，与跨页共享
 * 需求冲突，已删除；string[] 与 FileItem[] 两套模型就此合一。
 */
export const useFileListStore = defineStore('fileList', () => {
  const fileItems = ref<FileItem[]>([])
  const selectedIndices = ref<number[]>([])

  /** 只读派生视图：按路径暴露给仍以 string[] 工作的 UI 与启动参数链路。 */
  const files = computed(() => fileItems.value.map((item) => item.path))

  function addFiles(paths: string[]) {
    const existing = new Set(fileItems.value.map((item) => item.path))
    for (const path of paths) {
      if (existing.has(path)) continue
      existing.add(path)
      fileItems.value.push({ path, status: 'pending' })
    }
  }

  function removeSelected() {
    const toRemove = new Set(selectedIndices.value)
    fileItems.value = fileItems.value.filter((_, index) => !toRemove.has(index))
    selectedIndices.value = []
  }

  function removeFile(index: number) {
    if (index < 0 || index >= fileItems.value.length) return
    fileItems.value.splice(index, 1)
    selectedIndices.value = selectedIndices.value
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i))
  }

  function clear() {
    fileItems.value = []
    selectedIndices.value = []
  }

  function sortByName() {
    fileItems.value = [...fileItems.value].sort((a, b) => a.path.localeCompare(b.path))
    // 排序后原索引不再指向同一文件，清空选择避免误删。
    selectedIndices.value = []
  }

  function updateFileStatus(index: number, status: FileStatus, error?: string) {
    const item = fileItems.value[index]
    if (!item) return
    item.status = status
    if (error !== undefined) item.error = error
  }

  function updateFileMediaInfo(index: number, mediaInfo: MediaInfo) {
    const item = fileItems.value[index]
    if (!item) return
    item.mediaInfo = mediaInfo
  }

  return {
    fileItems,
    files,
    selectedIndices,
    addFiles,
    removeSelected,
    removeFile,
    clear,
    sortByName,
    updateFileStatus,
    updateFileMediaInfo,
  }
})
