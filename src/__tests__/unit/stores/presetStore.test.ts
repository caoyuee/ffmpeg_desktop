import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePresetStore } from '@/store/presetStore'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('presetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start with empty presets', () => {
    const store = usePresetStore()
    expect(store.presets).toEqual([])
  })

  it('should have current preset initialized', () => {
    const store = usePresetStore()
    expect(store.currentPreset).toBeDefined()
    expect(store.currentPreset.name).toBe('默认预设')
  })

  it('should have presetCount computed', () => {
    const store = usePresetStore()
    expect(store.presetCount).toBe(0)
  })

  it('should have loadPresets method', () => {
    const store = usePresetStore()
    expect(typeof store.loadPresets).toBe('function')
  })

  it('should have savePreset method', () => {
    const store = usePresetStore()
    expect(typeof store.savePreset).toBe('function')
  })

  it('should have deletePreset method', () => {
    const store = usePresetStore()
    expect(typeof store.deletePreset).toBe('function')
  })

  it('should have importPreset method', () => {
    const store = usePresetStore()
    expect(typeof store.importPreset).toBe('function')
  })

  it('should have exportPreset method', () => {
    const store = usePresetStore()
    expect(typeof store.exportPreset).toBe('function')
  })
})
