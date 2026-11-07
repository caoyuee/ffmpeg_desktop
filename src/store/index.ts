import { useSettingsStore } from './settingsStore'
import { useLogsStore } from './logsStore'
import { useSoftwareInfoStore } from './softInfoStore'
import { useTaskStore } from './taskStore'
import { usePresetStore } from './presetStore'
import { useFileListStore } from './fileListStore'
import { useHardwareCapabilityStore } from './hardwareCapabilityStore'

// R2.3：settingStore / ffmpegSettingsStore 已归并进 useSettingsStore；
// 文件列表只剩 useFileListStore（FileItem 模型）。
export {
  useSettingsStore,
  useLogsStore,
  useSoftwareInfoStore,
  useTaskStore,
  usePresetStore,
  useFileListStore,
  useHardwareCapabilityStore,
}
