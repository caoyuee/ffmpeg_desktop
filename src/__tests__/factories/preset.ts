import { createDefaultPreset } from '@/config/presetSchema'
import type { PresetData } from '@/types/preset'

/** 基于 DEFAULT_PRESET 的深拷贝，保证测试预设永远与唯一 schema 对齐。 */
export function createMockPreset(overrides: Partial<PresetData> = {}): PresetData {
  return { ...createDefaultPreset(), ...overrides }
}

export function createMockPresetList(count: number = 3): PresetData[] {
  return Array.from({ length: count }, (_, index) =>
    createMockPreset({
      id: `preset_${index}_${Date.now()}`,
      name: `测试预设 ${index + 1}`,
    }),
  )
}
