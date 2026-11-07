import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PresetData } from '@/types/preset'
import { createDefaultPreset, normalizePreset } from '@/config/presetSchema'
import {
  PresetShareError,
  encodePresetShareText,
  parsePresetShare,
  parsePresetShareInput,
  serializePresetShare,
  type PresetShareTextResult,
} from '@/config/presetShare'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * R2.4：Rust 侧只把预设当 JSON blob 透传，不做结构化建模。
 * 因此所有来自后端的返回值必须先过 normalizePreset 才能进入响应式状态，
 * 写入前也要规范化，保证磁盘上永远是带 schemaVersion 的完整合法 schema。
 */
export const usePresetStore = defineStore('presets', () => {
  const presets = ref<PresetData[]>([])
  const currentPreset = ref<PresetData>(createDefaultPreset())

  const presetCount = computed(() => presets.value.length)

  /**
   * R1-7：预设目录透传 Rust 的唯一出口。
   * 设置里 presetDir 非空时使用自定义目录；空串传 null 让 Rust 回退 app data presets。
   */
  function presetDirArg(): string | null {
    const dir = useSettingsStore().settings.presetDir.trim()
    return dir === '' ? null : dir
  }

  async function loadPresets() {
    try {
      const loadedPresets = await invoke<unknown[]>('load_presets', { dir: presetDirArg() })
      presets.value = Array.isArray(loadedPresets)
        ? loadedPresets.map((item) => normalizePreset(item))
        : []
    } catch (error) {
      console.error('加载预设失败:', error)
      presets.value = []
    }
  }

  async function savePreset(preset: PresetData) {
    try {
      const payload = normalizePreset(preset)
      const saved = await invoke<unknown>('save_preset', { preset: payload, dir: presetDirArg() })
      const savedPreset = normalizePreset(saved)

      const index = presets.value.findIndex((p) => p.id === savedPreset.id)
      if (index >= 0) {
        presets.value[index] = savedPreset
      } else {
        presets.value.push(savedPreset)
      }

      return savedPreset
    } catch (error) {
      console.error('保存预设失败:', error)
      throw error
    }
  }

  async function deletePreset(presetId: string) {
    try {
      await invoke('delete_preset', { presetId, dir: presetDirArg() })
      presets.value = presets.value.filter((p) => p.id !== presetId)

      if (currentPreset.value.id === presetId) {
        currentPreset.value = createDefaultPreset()
      }
    } catch (error) {
      console.error('删除预设失败:', error)
      throw error
    }
  }

  function setCurrentPreset(preset: PresetData) {
    currentPreset.value = normalizePreset(preset)
  }

  function resetCurrentPreset() {
    currentPreset.value = createDefaultPreset()
  }

  function duplicatePreset(presetId: string) {
    const preset = presets.value.find((p) => p.id === presetId)
    if (preset) {
      // normalizePreset 同时完成深拷贝与校验，避免副本与源共享嵌套引用。
      const duplicated = normalizePreset(preset)
      duplicated.id = ''
      duplicated.name = `${preset.name} (副本)`
      duplicated.createdAt = ''
      duplicated.updatedAt = ''
      return savePreset(duplicated)
    }
    return null
  }

  /** R3.1：导出内容由唯一分享格式层生成，Rust 只负责把文本原样写盘。 */
  async function exportPreset(preset: PresetData, filePath: string) {
    try {
      const content = serializePresetShare(preset)
      await invoke('export_preset', { filePath, content })
    } catch (error) {
      console.error('导出预设失败:', error)
      throw error
    }
  }

  /** R3.1：读回原始文本 → 校验格式/版本 → 由 savePreset 生成新 id 落盘。 */
  async function importPreset(filePath: string) {
    const content = await invoke<string>('import_preset', { filePath })
    const result = parsePresetShare(content)
    if (!result.ok) throw new PresetShareError(result.code)
    try {
      return await savePreset(result.preset)
    } catch (error) {
      console.error('导入预设失败:', error)
      throw error
    }
  }

  /** 从粘贴的分享码 / JSON 文本导入，统一走 savePreset 生成新 id。 */
  async function importShareText(text: string) {
    const result = parsePresetShareInput(text)
    if (!result.ok) throw new PresetShareError(result.code)
    return await savePreset(result.preset)
  }

  function createShareText(preset: PresetData): PresetShareTextResult {
    return encodePresetShareText(preset)
  }

  return {
    presets,
    currentPreset,
    presetCount,
    loadPresets,
    savePreset,
    deletePreset,
    setCurrentPreset,
    resetCurrentPreset,
    duplicatePreset,
    exportPreset,
    importPreset,
    importShareText,
    createShareText,
  }
})
