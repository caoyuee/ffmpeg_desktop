import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatFileSize,
  formatBitrate,
  formatResolution,
  generateOutputPath,
} from '@/hooks/useFormatters'
import { DEFAULT_PRESET } from '@/types/preset'

describe('formatDuration', () => {
  it('should format seconds to HH:MM:SS', () => {
    expect(formatDuration(1)).toBe('00:00:01')
    expect(formatDuration(65)).toBe('00:01:05')
    expect(formatDuration(3661)).toBe('01:01:01')
    expect(formatDuration(86399)).toBe('23:59:59')
  })

  it('should return placeholder for invalid values', () => {
    expect(formatDuration(undefined)).toBe('--:--:--')
    expect(formatDuration(-1)).toBe('--:--:--')
  })
})

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500.00 B')
    expect(formatFileSize(1024)).toBe('1.00 KB')
    expect(formatFileSize(1048576)).toBe('1.00 MB')
    expect(formatFileSize(1073741824)).toBe('1.00 GB')
    expect(formatFileSize(1099511627776)).toBe('1.00 TB')
  })

  it('should return unknown for invalid values', () => {
    expect(formatFileSize(undefined)).toBe('未知')
    expect(formatFileSize(-1)).toBe('未知')
  })
})

describe('formatBitrate', () => {
  it('should format bitrate to Mbps', () => {
    expect(formatBitrate(5000000)).toBe('5.00 Mbps')
    expect(formatBitrate('2000000')).toBe('2.00 Mbps')
  })

  it('should return unknown for invalid values', () => {
    expect(formatBitrate(undefined)).toBe('未知')
    expect(formatBitrate('')).toBe('未知')
    expect(formatBitrate('invalid')).toBe('未知')
  })
})

describe('formatResolution', () => {
  it('should format width x height', () => {
    expect(formatResolution(1920, 1080)).toBe('1920x1080')
    expect(formatResolution(3840, 2160)).toBe('3840x2160')
  })

  it('should return unknown for invalid values', () => {
    expect(formatResolution(undefined, undefined)).toBe('未知')
    expect(formatResolution(0, 0)).toBe('未知')
  })
})

describe('generateOutputPath', () => {
  it('should keep the existing suffix naming behavior by default', () => {
    const output = generateOutputPath('/videos/input.mkv', DEFAULT_PRESET.output)

    expect(output).toBe('/videos/input_output.mp4')
  })

  it('should use the configured output directory', () => {
    const output = generateOutputPath('/videos/input.mkv', {
      ...DEFAULT_PRESET.output,
      location: '/exports',
    })

    expect(output).toBe('/exports/input_output.mp4')
  })

  it('should apply prefix naming', () => {
    const output = generateOutputPath('/videos/input.mkv', {
      ...DEFAULT_PRESET.output,
      container: '.mkv',
      naming: {
        ...DEFAULT_PRESET.output.naming,
        autoNamingOption: 1,
        prefixText: 'encoded_',
      },
    })

    expect(output).toBe('/videos/encoded_input.mkv')
  })

  it('should apply replacement naming', () => {
    const output = generateOutputPath('C:\\Videos\\input.mkv', {
      ...DEFAULT_PRESET.output,
      container: 'webm',
      naming: {
        ...DEFAULT_PRESET.output.naming,
        autoNamingOption: 2,
        replaceText: 'final-cut',
      },
    })

    expect(output).toBe('C:\\Videos\\final-cut.webm')
  })

  it('should apply fully custom naming', () => {
    const output = generateOutputPath('/videos/input.mkv', {
      ...DEFAULT_PRESET.output,
      naming: {
        ...DEFAULT_PRESET.output.naming,
        autoNamingOption: 3,
        prefixText: 'show-',
        replaceText: 'episode-01',
        suffixText: '-1080p',
      },
    })

    expect(output).toBe('/videos/show-episode-01-1080p.mp4')
  })
})
