import { describe, it, expect } from 'vitest'
import {
  parseNumeric,
  parseTimecode,
  parseSizeToBytes,
  formatDuration,
  formatBytes,
} from '@/utils/progressFormat'
import { selectTaskLogs } from '@/utils/taskLogs'

describe('R1-8 进度字符串解析', () => {
  it('解析带单位的 speed / bitrate', () => {
    expect(parseNumeric('1.23x')).toBe(1.23)
    expect(parseNumeric('1234.5 kbps')).toBe(1234.5)
    expect(parseNumeric(null)).toBeNull()
    expect(parseNumeric('n/a')).toBeNull()
  })

  it('解析 FFmpeg 时间码', () => {
    expect(parseTimecode('00:01:23.45')).toBeCloseTo(83.45)
    expect(parseTimecode('01:00:00.00')).toBe(3600)
    expect(parseTimecode(null)).toBeNull()
    expect(parseTimecode('invalid')).toBeNull()
  })

  it('解析带单位的文件大小', () => {
    expect(parseSizeToBytes('1KiB')).toBe(1024)
    expect(parseSizeToBytes('2MiB')).toBe(2 * 1024 * 1024)
    expect(parseSizeToBytes(null)).toBeNull()
  })

  it('时长走 i18n 单位，不再硬编码中文', () => {
    const t = (key: string) =>
      ({ 'task.time.seconds': 's', 'task.time.minutes': 'm', 'task.time.hours': 'h' })[key] ?? key
    expect(formatDuration(45, t)).toBe('45s')
    expect(formatDuration(83, t)).toBe('1m23s')
    expect(formatDuration(3720, t)).toBe('1h2m')
  })
})

describe('R1-6 输出日志筛选', () => {
  const logs = { all: ['info line', 'error line', 'progress line'], errors: ['error line'] }

  it('all 模式返回全部 stderr 行', () => {
    expect(selectTaskLogs(logs, 'all')).toEqual(logs.all)
  })

  it('error 模式只返回错误行', () => {
    expect(selectTaskLogs(logs, 'error')).toEqual(['error line'])
  })

  it('无任务时返回空数组', () => {
    expect(selectTaskLogs(undefined, 'error')).toEqual([])
  })
})

describe('R3.2 文件体积格式化（历史视图与压缩比共用）', () => {
  it('null / 负 / NaN 返回占位符，不产生 NaN 文本', () => {
    expect(formatBytes(null)).toBe('--')
    expect(formatBytes(-1)).toBe('--')
    expect(formatBytes(Number.NaN)).toBe('--')
  })

  it('按 1024 进制分级，保留两位小数', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1536)).toBe('1.50 KB')
    expect(formatBytes(1024 ** 2)).toBe('1.00 MB')
    expect(formatBytes(1024 ** 3 * 2.5)).toBe('2.50 GB')
  })
})
