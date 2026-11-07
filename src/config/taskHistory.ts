import { escapeCsvCell } from '@/config/csv'
import { TaskStatus, type Task } from '@/types/task'

/**
 * R3.2：任务历史与统计的唯一聚合层（纯函数，不依赖 Vue / Pinia / Tauri / DOM）。
 *
 * 事实源是 R2.5 的队列快照 `tasks.json` 恢复到内存后的 `taskStore.tasks`：
 * 本模块只做「只读投影 + 统计口径」，不落盘、不写第二份状态、不需要新的持久化命令。
 * 文件体积属于磁盘运行时事实（文件可能已被删除/移动），由 Rust `get_file_sizes`
 * 按需查询后作为外部参数传入，不进入队列快照 schema。
 */

export const HISTORY_FORMAT = 'ffmpeg-desktop/history'
export const HISTORY_SCHEMA_VERSION = 1

/** 导出与聚合的条数上限，防止异常队列把剪贴板/内存撑爆。 */
export const MAX_HISTORY_ROWS = 5000

export type HistoryOutcome = 'completed' | 'failed' | 'stopped'
export const HISTORY_OUTCOMES: readonly HistoryOutcome[] = ['completed', 'failed', 'stopped']
export type HistorySortKey = 'completedAt' | 'durationMs' | 'inputFile'

const OUTCOME_BY_STATUS: Record<number, HistoryOutcome> = {
  [TaskStatus.Completed]: 'completed',
  [TaskStatus.Stopped]: 'stopped',
  [TaskStatus.Error]: 'failed',
}

export interface TaskHistoryEntry {
  id: string
  inputFile: string
  outputFile: string
  presetId: string
  outcome: HistoryOutcome
  createdAt: string | null
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  error?: string
  errorType?: string
}

export interface DailyHistoryBucket {
  date: string
  completed: number
  failed: number
  stopped: number
}

export interface TaskHistorySummary {
  total: number
  completed: number
  failed: number
  stopped: number
  /** 百分比，保留 1 位小数；空历史为 0 而不是 NaN。 */
  successRate: number
  durationSampleCount: number
  totalDurationMs: number
  averageDurationMs: number
  longestDurationMs: number
  errorTypeBreakdown: Record<string, number>
  dailyBreakdown: DailyHistoryBucket[]
}

export interface HistoryFilter {
  outcome?: HistoryOutcome | 'all'
  query?: string
}

export interface CompressionRow {
  id: string
  inputBytes: number | null
  outputBytes: number | null
  /** output/input，越小说明压缩越多；体积不可用时为 null。 */
  ratio: number | null
  savedPercent: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEntryLike(value: unknown): value is TaskHistoryEntry {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    HISTORY_OUTCOMES.includes(value['outcome'] as HistoryOutcome)
  )
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function validDuration(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** 时间与耗时的唯一规范化入口：非法 Date / 脏字符串一律降级为 null，绝不产出 "Invalid Date"。 */
export function toIsoOrNull(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : new Date(ms).toISOString()
  }
  return null
}

export function isHistoryTask(task: Task): boolean {
  return isRecord(task) && OUTCOME_BY_STATUS[task['status'] as number] !== undefined
}

function byCompletedAtDesc(a: TaskHistoryEntry, b: TaskHistoryEntry): number {
  if (a.completedAt === null && b.completedAt === null) return a.id.localeCompare(b.id)
  if (a.completedAt === null) return 1
  if (b.completedAt === null) return -1
  if (a.completedAt === b.completedAt) return a.id.localeCompare(b.id)
  return a.completedAt < b.completedAt ? 1 : -1
}

/** 从队列快照投影出终态历史，默认「最近完成在前」；缺完成时间的排最后。 */
export function buildTaskHistory(tasks: readonly Task[]): TaskHistoryEntry[] {
  if (!Array.isArray(tasks)) return []

  const seen = new Set<string>()
  const rows: TaskHistoryEntry[] = []

  for (const task of tasks) {
    if (!isHistoryTask(task)) continue
    const id = asText(task.id)
    if (!id || seen.has(id)) continue
    seen.add(id)

    const startedAt = toIsoOrNull(task.startedAt)
    const completedAt = toIsoOrNull(task.completedAt)
    const delta = startedAt && completedAt ? Date.parse(completedAt) - Date.parse(startedAt) : null
    const durationMs = validDuration(delta)

    const row: TaskHistoryEntry = {
      id,
      inputFile: asText(task.inputFile),
      outputFile: asText(task.outputFile),
      presetId: asText(task.presetId),
      outcome: OUTCOME_BY_STATUS[task.status as number]!,
      createdAt: toIsoOrNull(task.createdAt),
      startedAt,
      completedAt,
      durationMs,
    }
    if (typeof task.error === 'string') row.error = task.error
    if (typeof task.errorType === 'string') row.errorType = task.errorType
    rows.push(row)
  }

  rows.sort(byCompletedAtDesc)
  return rows.slice(0, MAX_HISTORY_ROWS)
}

function emptySummary(): TaskHistorySummary {
  return {
    total: 0,
    completed: 0,
    failed: 0,
    stopped: 0,
    successRate: 0,
    durationSampleCount: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    longestDurationMs: 0,
    errorTypeBreakdown: {},
    dailyBreakdown: [],
  }
}

export function summarizeHistory(entries: readonly TaskHistoryEntry[]): TaskHistorySummary {
  const summary = emptySummary()
  if (!Array.isArray(entries)) return summary

  const valid = entries.filter(isEntryLike)
  summary.total = valid.length
  const byDay = new Map<string, DailyHistoryBucket>()

  for (const row of valid) {
    if (row.outcome === 'completed') summary.completed += 1
    else if (row.outcome === 'failed') {
      summary.failed += 1
      const key = typeof row.errorType === 'string' && row.errorType ? row.errorType : 'unknown'
      summary.errorTypeBreakdown[key] = (summary.errorTypeBreakdown[key] ?? 0) + 1
    } else if (row.outcome === 'stopped') {
      summary.stopped += 1
    }

    const duration = validDuration(row.durationMs)
    if (duration !== null) {
      summary.durationSampleCount += 1
      summary.totalDurationMs += duration
      summary.longestDurationMs = Math.max(summary.longestDurationMs, duration)
    }

    const day = (row.completedAt ?? row.createdAt)?.slice(0, 10)
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const bucket = byDay.get(day) ?? { date: day, completed: 0, failed: 0, stopped: 0 }
      bucket[row.outcome] += 1
      byDay.set(day, bucket)
    }
  }

  summary.successRate =
    summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 1000) / 10
  summary.averageDurationMs =
    summary.durationSampleCount === 0
      ? 0
      : Math.round(summary.totalDurationMs / summary.durationSampleCount)
  summary.dailyBreakdown = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  return summary
}

/**
 * P1-2 收尾：logRetentionDays 设置的消费层（纯函数）。
 *
 * 按保留天数过滤历史展示：completedAt（缺则 createdAt）距今超过 days 天的条目
 * 不再出现在历史页。0（或非法值）表示永久保留；无法判定时间（无时间戳或脏值）
 * 的条目一律保留，绝不因数据缺失丢历史。只影响展示投影，不删除任务快照数据。
 */
export function filterHistoryByRetention(
  entries: readonly TaskHistoryEntry[],
  retentionDays: number,
  now: number = Date.now(),
): TaskHistoryEntry[] {
  if (!Array.isArray(entries)) return []
  const days =
    typeof retentionDays === 'number' && Number.isFinite(retentionDays) && retentionDays > 0
      ? Math.floor(retentionDays)
      : 0
  if (days === 0) return [...entries]

  const cutoff = now - days * 86_400_000
  return entries.filter((row) => {
    const timestamp = row.completedAt ?? row.createdAt
    if (!timestamp) return true
    const ms = Date.parse(timestamp)
    if (Number.isNaN(ms)) return true
    return ms >= cutoff
  })
}

export function filterHistory(
  entries: readonly TaskHistoryEntry[],
  filter: HistoryFilter = {},
): TaskHistoryEntry[] {
  if (!Array.isArray(entries)) return []
  const outcome = filter.outcome ?? 'all'
  if (outcome !== 'all' && !HISTORY_OUTCOMES.includes(outcome as HistoryOutcome)) return []
  const query = typeof filter.query === 'string' ? filter.query.trim().toLowerCase() : ''

  return entries.filter((row) => {
    if (!isEntryLike(row)) return false
    if (outcome !== 'all' && row.outcome !== outcome) return false
    if (!query) return true
    return [row.inputFile, row.outputFile, row.presetId, row.error, row.errorType]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLowerCase().includes(query))
  })
}

/** 返回新数组，不修改入参；缺失值一律排末尾，次排序键为 id 保证稳定。 */
export function sortHistory(
  entries: readonly TaskHistoryEntry[],
  key: HistorySortKey,
  direction: 'asc' | 'desc' = 'desc',
): TaskHistoryEntry[] {
  if (!Array.isArray(entries)) return []
  const sign = direction === 'asc' ? 1 : -1

  return [...entries].sort((a, b) => {
    let result = 0
    if (key === 'durationMs') {
      const av = validDuration(a.durationMs)
      const bv = validDuration(b.durationMs)
      if (av === null && bv === null) result = 0
      else if (av === null) result = 1
      else if (bv === null) result = -1
      else result = (av - bv) * sign
    } else {
      const av = key === 'inputFile' ? a.inputFile.toLowerCase() : (a.completedAt ?? '')
      const bv = key === 'inputFile' ? b.inputFile.toLowerCase() : (b.completedAt ?? '')
      if (av === '' && bv === '') result = 0
      else if (av === '') result = 1
      else if (bv === '') result = -1
      else result = av === bv ? 0 : (av < bv ? -1 : 1) * sign
    }
    return result === 0 ? a.id.localeCompare(b.id) : result
  })
}

function asBytes(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/** 只为成功任务计算压缩比；体积表是按需查询的运行时事实，脏值一律视为不可用。 */
export function rankByCompression(
  entries: readonly TaskHistoryEntry[],
  sizes: Record<string, number | null>,
): CompressionRow[] {
  const table = sizes && typeof sizes === 'object' ? sizes : {}
  const source = Array.isArray(entries) ? entries.filter(isEntryLike) : []

  const rows: CompressionRow[] = source.map((row) => {
    const inputBytes = row.outcome === 'completed' ? asBytes(table[row.inputFile]) : null
    const outputBytes = row.outcome === 'completed' ? asBytes(table[row.outputFile]) : null
    if (inputBytes === null || outputBytes === null) {
      return { id: row.id, inputBytes, outputBytes, ratio: null, savedPercent: null }
    }
    const ratio = Math.round((outputBytes / inputBytes) * 10000) / 10000
    const savedPercent = Math.round((1 - ratio) * 1000) / 10
    return { id: row.id, inputBytes, outputBytes, ratio, savedPercent }
  })

  return rows.sort((a, b) => {
    if (a.ratio === null && b.ratio === null) return a.id.localeCompare(b.id)
    if (a.ratio === null) return 1
    if (b.ratio === null) return -1
    return a.ratio === b.ratio ? a.id.localeCompare(b.id) : a.ratio - b.ratio
  })
}

const CSV_COLUMNS: readonly (keyof TaskHistoryEntry)[] = [
  'id',
  'inputFile',
  'outputFile',
  'presetId',
  'outcome',
  'createdAt',
  'startedAt',
  'completedAt',
  'durationMs',
  'error',
  'errorType',
]

/** CSV 单元格转义；顺带中性化以 = + - @ 开头的公式，避免表格软件执行注入内容。 */

/** 导出为可复制文本：JSON 带版本信封，CSV 带固定表头；两者都只含历史字段。 */
export function exportHistory(
  entries: readonly TaskHistoryEntry[],
  format: 'json' | 'csv',
): string {
  const rows = (Array.isArray(entries) ? entries.filter(isEntryLike) : []).slice(
    0,
    MAX_HISTORY_ROWS,
  )

  if (format === 'csv') {
    const lines = [CSV_COLUMNS.join(',')]
    for (const row of rows) {
      lines.push(CSV_COLUMNS.map((column) => escapeCsvCell(row[column])).join(','))
    }
    return lines.join('\r\n')
  }

  return JSON.stringify(
    {
      format: HISTORY_FORMAT,
      schemaVersion: HISTORY_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      entries: rows,
    },
    null,
    2,
  )
}
