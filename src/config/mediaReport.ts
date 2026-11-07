import { toCsv } from '@/config/csv'

/**
 * R3.7：ffprobe 报告导出的唯一规范化 / 序列化层。
 *
 * MediaInfo 页把 `probe_media_info` 的原始 JSON 交给这里，页面只负责展示与复制；
 * 导出走剪贴板（不新增写盘命令、不扩大 CSP 面）。CSV 转义复用 config/csv.ts。
 */
export const MEDIA_REPORT_FORMAT = 'ffmpeg-desktop/mediainfo'
export const MEDIA_REPORT_SCHEMA_VERSION = 1

export interface MediaReportStream {
  index: number
  codecType: string
  codecName: string
  width: number | null
  height: number | null
  frameRate: string | null
  sampleRate: string | null
  channels: number | null
  bitRate: string | null
  language: string | null
}

export interface MediaReport {
  filename: string
  format: string
  duration: number
  size: number
  bitRate: number
  streams: MediaReportStream[]
  metadata: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function normalizeMediaInfo(raw: unknown, fallbackFileName = ''): MediaReport {
  const root = isRecord(raw) ? raw : {}
  const fmt = isRecord(root['format']) ? root['format'] : {}
  const streamsRaw = Array.isArray(root['streams']) ? root['streams'] : []

  const streams: MediaReportStream[] = streamsRaw.slice(0, 64).map((entry, index) => {
    const stream = isRecord(entry) ? entry : {}
    return {
      index: Number.isInteger(stream['index']) ? Number(stream['index']) : index,
      codecType: text(stream['codec_type']) ?? 'unknown',
      codecName: text(stream['codec_name']) ?? text(stream['codec_long_name']) ?? 'unknown',
      width: stream['width'] === undefined ? null : finiteNumber(stream['width']) || null,
      height: stream['height'] === undefined ? null : finiteNumber(stream['height']) || null,
      frameRate: text(stream['r_frame_rate']),
      sampleRate: text(stream['sample_rate']),
      channels: stream['channels'] === undefined ? null : finiteNumber(stream['channels']) || null,
      bitRate: text(stream['bit_rate']),
      language: text(isRecord(stream['tags']) ? stream['tags']['language'] : stream['language']),
    }
  })

  const rawTags = isRecord(fmt['tags']) ? fmt['tags'] : {}
  const metadata: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawTags).slice(0, 200)) {
    const normalized = text(value)
    if (normalized !== null) metadata[key] = normalized
  }

  return {
    filename: text(fmt['filename']) ?? fallbackFileName,
    format: text(fmt['format_long_name']) ?? text(fmt['format_name']) ?? '',
    duration: finiteNumber(fmt['duration']),
    size: finiteNumber(fmt['size']),
    bitRate: finiteNumber(fmt['bit_rate']),
    streams,
    metadata,
  }
}

const CSV_HEADER = ['filename', 'format', 'duration', 'size', 'bitRate', 'section', 'key', 'value']

export function exportMediaReport(
  report: MediaReport,
  format: 'json' | 'csv',
  exportedAt?: string,
): string {
  const safe = isRecord(report) ? (report as unknown as MediaReport) : normalizeMediaInfo(null)
  const timestamp =
    typeof exportedAt === 'string' && exportedAt !== '' ? exportedAt : new Date().toISOString()

  if (format === 'json') {
    return JSON.stringify(
      {
        format: MEDIA_REPORT_FORMAT,
        schemaVersion: MEDIA_REPORT_SCHEMA_VERSION,
        exportedAt: timestamp,
        report: {
          filename: safe.filename,
          format: safe.format,
          duration: safe.duration,
          size: safe.size,
          bitRate: safe.bitRate,
          streams: Array.isArray(safe.streams) ? safe.streams : [],
          metadata: isRecord(safe.metadata) ? safe.metadata : {},
        },
      },
      null,
      2,
    )
  }

  const rows: (string | number | null)[][] = [
    [safe.filename, safe.format, safe.duration, safe.size, safe.bitRate, 'format', '', ''],
  ]
  for (const stream of Array.isArray(safe.streams) ? safe.streams : []) {
    rows.push(['', '', '', '', '', `stream#${stream.index}`, stream.codecType, stream.codecName])
  }
  for (const [key, value] of Object.entries(isRecord(safe.metadata) ? safe.metadata : {})) {
    rows.push(['', '', '', '', '', 'metadata', key, value])
  }
  // toCsv 只按表头列数取值，这里保证每行都有 8 列；escapeCsvCell 负责注入防护。
  return toCsv(
    CSV_HEADER,
    rows.map((row) => row.slice(0, CSV_HEADER.length)),
  )
}
