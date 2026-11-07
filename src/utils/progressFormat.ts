/**
 * R1-8：TaskProgress 与 Rust ProgressInfo 对齐后，time/bitrate/speed/size 都是
 * 带单位的字符串（或 null）。展示层必须先解析，禁止再对字符串调用 toFixed / 比较大小。
 */

/** 取带单位字符串里的首个数值："1.23x" → 1.23，"1234.5 kbps" → 1234.5。 */
export function parseNumeric(value: string | null): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

/** "00:01:23.45" → 83.45 秒。 */
export function parseTimecode(value: string | null): number | null {
  if (typeof value !== 'string') return null
  const parts = value.split(':')
  if (parts.length !== 3) return null
  const [hours, minutes, seconds] = parts.map(Number)
  if ([hours, minutes, seconds].some((part) => !Number.isFinite(part))) return null
  return hours! * 3600 + minutes! * 60 + seconds!
}

/** "12345KiB" / "12MiB" → 字节数。 */
export function parseSizeToBytes(value: string | null): number | null {
  if (typeof value !== 'string') return null
  const match = value.match(/([\d.]+)\s*(B|KiB|MiB|GiB|kB|KB|MB|GB)/i)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return null
  const factors: Record<string, number> = {
    b: 1,
    kib: 1024,
    mib: 1024 ** 2,
    gib: 1024 ** 3,
    kb: 1000,
    mb: 1000 ** 2,
    gb: 1000 ** 3,
  }
  return amount * (factors[match[2]!.toLowerCase()] ?? 1)
}

/** 用 i18n 单位格式化时长，避免硬编码中文（P2-8）。 */
export function formatDuration(seconds: number, t: (key: string) => string): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  if (seconds < 60) {
    return `${Math.round(seconds)}${t('task.time.seconds')}`
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}${t('task.time.minutes')}${Math.round(seconds % 60)}${t('task.time.seconds')}`
  }
  return `${Math.floor(seconds / 3600)}${t('task.time.hours')}${Math.floor((seconds % 3600) / 60)}${t('task.time.minutes')}`
}

/** R3.2：历史视图与压缩比共用的唯一字节格式化入口（1024 进制，脏值返回占位符）。 */
export function formatBytes(bytes: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`
}
