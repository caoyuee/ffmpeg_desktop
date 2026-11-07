import { beforeEach, describe, expect, it } from 'vitest'

import { getFFmpegPath } from '@/utils/ffmpegPath'
import { DEFAULT_APP_SETTINGS, saveSettings } from '@/config/settings'

describe('getFFmpegPath', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('quotes a configured FFmpeg executable path when it contains spaces', () => {
    saveSettings({
      ...DEFAULT_APP_SETTINGS,
      ffmpegPath: 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    })

    expect(getFFmpegPath()).toBe('"C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"')
  })

  it('uses ffmpeg from PATH when no custom path is configured', () => {
    expect(getFFmpegPath()).toBe('ffmpeg')
  })
})
