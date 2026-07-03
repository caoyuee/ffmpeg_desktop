import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useHardwareCapabilityStore } from '@/store/hardwareCapabilityStore'
import type { HardwareCapabilities } from '@/types/hardware'

vi.mocked(invoke)

describe('hardwareCapabilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(invoke).mockReset()
  })

  it('detects and stores hardware capabilities', async () => {
    const capabilities: HardwareCapabilities = {
      ffmpegPath: 'ffmpeg',
      backends: ['nvenc', 'vaapi'],
      encoders: ['h264_nvenc', 'h264_vaapi'],
      hwaccels: ['cuda', 'vaapi'],
      filters: ['scale_cuda', 'hwupload'],
    }
    vi.mocked(invoke).mockResolvedValueOnce(capabilities)

    const store = useHardwareCapabilityStore()
    const result = await store.detect('/usr/bin/ffmpeg')

    expect(invoke).toHaveBeenCalledWith('detect_hardware_acceleration', {
      path: '/usr/bin/ffmpeg',
    })
    expect(result).toEqual(capabilities)
    expect(store.hasBackend('nvenc')).toBe(true)
    expect(store.hasEncoder('h264_nvenc')).toBe(true)
    expect(store.error).toBeNull()
  })

  it('records detection errors and clears stale capabilities', async () => {
    vi.mocked(invoke).mockRejectedValueOnce('ffmpeg failed')

    const store = useHardwareCapabilityStore()
    const result = await store.detect()

    expect(result).toBeNull()
    expect(store.capabilities).toBeNull()
    expect(store.error).toBe('ffmpeg failed')
    expect(store.loading).toBe(false)
  })
})
