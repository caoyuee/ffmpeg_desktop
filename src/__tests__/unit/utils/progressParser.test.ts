import { describe, it, expect } from 'vitest'
import {
  parseFFmpegProgress,
  parseDuration,
  timeToSeconds,
  calculateProgress,
  estimateRemainingTime,
  formatSize,
} from '@/utils/progressParser'

describe('parseFFmpegProgress', () => {
  it('should parse a complete progress line', () => {
    const line =
      'frame=  120 fps= 30 q=28.0 size=    1024KiB time=00:00:04.00 bitrate= 2048.0kbits/s speed=2.0x'
    const result = parseFFmpegProgress(line)

    expect(result).not.toBeNull()
    expect(result!.frame).toBe('120')
    expect(result!.fps).toBe('30')
    expect(result!.time).toBe('00:00:04.00')
    expect(result!.bitrate).toBe('2048.0')
    expect(result!.speed).toBe('2.0')
    expect(result!.size).toBe('1024KiB')
    expect(result!.quality).toBe(28.0)
  })

  it('should parse a partial progress line', () => {
    const line = 'frame=   50 fps= 25 time=00:00:02.00'
    const result = parseFFmpegProgress(line)

    expect(result).not.toBeNull()
    expect(result!.frame).toBe('50')
    expect(result!.fps).toBe('25')
    expect(result!.time).toBe('00:00:02.00')
    expect(result!.bitrate).toBeUndefined()
    expect(result!.speed).toBeUndefined()
  })

  it('should return null for non-progress lines', () => {
    expect(parseFFmpegProgress('Input #0, mov from input.mp4')).toBeNull()
    expect(parseFFmpegProgress('Stream #0:0: Video: h264')).toBeNull()
    expect(parseFFmpegProgress('')).toBeNull()
  })

  it('should parse scientific notation speed', () => {
    const line = 'speed=1.5e+00x'
    const result = parseFFmpegProgress(line)
    expect(result!.speed).toBe('1.5e+00')
  })

  it('should parse negative speed', () => {
    const line = 'speed=-0.5x'
    const result = parseFFmpegProgress(line)
    expect(result!.speed).toBe('-0.5')
  })
})

describe('parseDuration', () => {
  it('should parse Duration line', () => {
    const line = '  Duration: 01:23:45.67, start: 0.000000, bitrate: 5000 kb/s'
    expect(parseDuration(line)).toBe(1 * 3600 + 23 * 60 + 45.67)
  })

  it('should return 0 for non-matching lines', () => {
    expect(parseDuration('no duration here')).toBe(0)
    expect(parseDuration('')).toBe(0)
  })
})

describe('timeToSeconds', () => {
  it('should convert HH:MM:SS.mm to seconds', () => {
    expect(timeToSeconds('00:01:30.50')).toBe(90.5)
    expect(timeToSeconds('01:00:00.00')).toBe(3600)
    expect(timeToSeconds('00:00:00.00')).toBe(0)
  })

  it('should return 0 for invalid format', () => {
    expect(timeToSeconds('invalid')).toBe(0)
    expect(timeToSeconds('')).toBe(0)
    expect(timeToSeconds('00:00')).toBe(0)
  })
})

describe('calculateProgress', () => {
  it('should calculate percentage', () => {
    expect(calculateProgress(50, 100)).toBe(50)
    expect(calculateProgress(0, 100)).toBe(0)
    expect(calculateProgress(100, 100)).toBe(100)
  })

  it('should cap at 100%', () => {
    expect(calculateProgress(150, 100)).toBe(100)
  })

  it('should return 0 for zero total time', () => {
    expect(calculateProgress(50, 0)).toBe(0)
  })
})

describe('estimateRemainingTime', () => {
  it('should calculate remaining time', () => {
    expect(estimateRemainingTime(50, 100, 2.0)).toBe(25)
    expect(estimateRemainingTime(0, 100, 1.0)).toBe(100)
    expect(estimateRemainingTime(90, 100, 0.5)).toBe(20)
  })

  it('should return 0 for invalid inputs', () => {
    expect(estimateRemainingTime(50, 100, 0)).toBe(0)
    expect(estimateRemainingTime(50, 0, 1.0)).toBe(0)
  })
})

describe('formatSize', () => {
  it('should format KB sizes', () => {
    expect(formatSize(500)).toBe('500 KB')
  })

  it('should format MB sizes', () => {
    expect(formatSize(2048)).toBe('2 MB')
  })

  it('should format GB sizes', () => {
    expect(formatSize(2097152)).toBe('2.00 GB')
  })
})
