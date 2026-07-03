import type { PresetData } from '@/types/preset'

export function createMockPreset(overrides: Partial<PresetData> = {}): PresetData {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  
  return {
    id: `preset_${timestamp}_${random}`,
    name: '测试预设',
    description: '用于测试的预设配置',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
    qualityMode: 'crf',
    qualityValue: 23,
    preset: 'medium',
    resolution: 'original',
    frameRate: 'original',
    audioBitrate: '128k',
    audioSampleRate: '44100',
    customParams: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createMockPresetList(count: number = 3): PresetData[] {
  return Array.from({ length: count }, (_, index) => 
    createMockPreset({
      id: `preset_${index}_${Date.now()}`,
      name: `测试预设 ${index + 1}`,
    })
  )
}
