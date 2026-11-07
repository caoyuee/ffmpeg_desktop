import { TaskStatus, type Task, type TaskProgress } from '@/types/task'
import type { TaskPriority } from '@/config/settings'

/**
 * R2.5：任务队列持久化的唯一 schema 层。
 *
 * Rust `modules/task_queue_store.rs` 只把 `tasks.json` 当作 JSON blob 原子透传，
 * 不认识任何任务字段。因此这里独占「哪些字段落盘、脏数据如何清洗、重启后状态如何迁移」
 * 的全部知识，与 R2.4 预设 schema 的分层保持一致。
 *
 * 明确不落盘：logs（体积大且是运行时事实）、progress（高频且重启后无意义）、
 * pid / stoppedByUser / elapsedTime（进程级运行时状态）。
 */
/**
 * v2（第十一轮）：增量字段 priority（P1-2 taskPriority 接入），旧快照缺字段
 * 视为 normal，非破坏性迁移；restore 对任意 schemaVersion 软降级只读已知字段。
 */
export const TASK_QUEUE_SCHEMA_VERSION = 2

/** 队列条数上限，防止异常数据把 tasks.json 撑爆（Rust 侧另有 512 KiB 体积上限）。 */
export const MAX_PERSISTED_TASKS = 500

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/
const ERROR_TYPES = [
  'network',
  'permission',
  'not_found',
  'invalid_input',
  'process',
  'unknown',
] as const

export type TaskErrorType = (typeof ERROR_TYPES)[number]

export interface PersistedTask {
  id: string
  inputFile: string
  outputFile: string
  commandLine: string
  presetId: string
  status: TaskStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  errorType?: TaskErrorType
  retryOf?: string
  retryAttempt?: number
  cpuAffinity?: string
  priority?: TaskPriority
  preserveFileTimes?: {
    creation: boolean
    modification: boolean
    access: boolean
  }
}

export interface PersistedTaskQueue {
  schemaVersion: number
  tasks: PersistedTask[]
}

const KNOWN_STATUSES = new Set<number>([
  TaskStatus.Pending,
  TaskStatus.Processing,
  TaskStatus.Paused,
  TaskStatus.Completed,
  TaskStatus.Stopped,
  TaskStatus.Error,
])

/** 任务进度的唯一空值构造，addTask 与恢复共用，避免两处漂移。 */
export function emptyTaskProgress(): TaskProgress {
  return {
    frame: null,
    fps: null,
    time: null,
    bitrate: null,
    speed: null,
    size: null,
    quality: 0,
    percentage: 0,
    estimatedSize: 0,
    remainingTime: 0,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asIsoString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number.isNaN(Date.parse(value)) ? undefined : new Date(value).toISOString()
}

function asStatus(value: unknown): TaskStatus {
  return typeof value === 'number' && KNOWN_STATUSES.has(value)
    ? (value as TaskStatus)
    : TaskStatus.Pending
}

function asPreserveFileTimes(value: unknown): PersistedTask['preserveFileTimes'] {
  if (!isRecord(value)) return undefined
  if (
    typeof value['creation'] !== 'boolean' ||
    typeof value['modification'] !== 'boolean' ||
    typeof value['access'] !== 'boolean'
  ) {
    return undefined
  }
  return {
    creation: value['creation'],
    modification: value['modification'],
    access: value['access'],
  }
}

/** 显式挑字段构造 DTO，而不是浅拷贝后 delete —— 这样日志与运行时字段从源头就不会泄漏。 */
export function toPersistedQueue(tasks: Task[]): PersistedTaskQueue {
  const persisted: PersistedTask[] = tasks.slice(0, MAX_PERSISTED_TASKS).map((task) => {
    const entry: PersistedTask = {
      id: task.id,
      inputFile: task.inputFile,
      outputFile: task.outputFile,
      commandLine: task.commandLine,
      presetId: task.presetId,
      status: task.status,
      createdAt:
        task.createdAt instanceof Date ? task.createdAt.toISOString() : new Date().toISOString(),
    }
    if (task.startedAt instanceof Date) entry.startedAt = task.startedAt.toISOString()
    if (task.completedAt instanceof Date) entry.completedAt = task.completedAt.toISOString()
    if (typeof task.error === 'string') entry.error = task.error
    if (task.errorType && ERROR_TYPES.includes(task.errorType)) entry.errorType = task.errorType
    if (typeof task.retryOf === 'string' && task.retryOf !== '') entry.retryOf = task.retryOf
    if (
      typeof task.retryAttempt === 'number' &&
      Number.isInteger(task.retryAttempt) &&
      task.retryAttempt > 0
    ) {
      entry.retryAttempt = task.retryAttempt
    }
    if (typeof task.cpuAffinity === 'string') entry.cpuAffinity = task.cpuAffinity
    if (
      typeof task.priority === 'string' &&
      (['low', 'normal', 'high'] as readonly string[]).includes(task.priority)
    ) {
      entry.priority = task.priority as TaskPriority
    }
    const preserve = asPreserveFileTimes(task.preserveFileTimes)
    if (preserve) entry.preserveFileTimes = preserve
    return entry
  })

  return { schemaVersion: TASK_QUEUE_SCHEMA_VERSION, tasks: persisted }
}

export function serializeTaskQueue(tasks: Task[]): string {
  return JSON.stringify(toPersistedQueue(tasks))
}

/**
 * 把磁盘快照还原为可展示的任务对象。
 *
 * 状态迁移：Pending 保持 Pending；终态原样保留（任务历史不丢）；
 * Processing / Paused 说明上次进程被强行终止，标记为 Error 并附带中断说明，
 * 且恢复后**不自动启动**，由用户显式重新开始。
 */
export function restoreTasks(raw: string, interruptedMessage: string): Task[] {
  if (typeof raw !== 'string' || raw.trim() === '') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!isRecord(parsed) || !Array.isArray(parsed['tasks'])) return []

  // schemaVersion 缺失视为 v1；未来版本软降级，只读取已知字段（不做破坏性迁移）。
  const seen = new Set<string>()
  const restored: Task[] = []

  for (const entry of (parsed['tasks'] as unknown[]).slice(0, MAX_PERSISTED_TASKS)) {
    if (!isRecord(entry)) continue

    const id = asString(entry['id'])
    const inputFile = asString(entry['inputFile'])
    const outputFile = asString(entry['outputFile'])
    const commandLine = asString(entry['commandLine'])
    if (!id || !SAFE_ID.test(id) || !inputFile || !outputFile || !commandLine || seen.has(id)) {
      continue
    }
    seen.add(id)

    const persistedStatus = asStatus(entry['status'])
    const wasRunning =
      persistedStatus === TaskStatus.Processing || persistedStatus === TaskStatus.Paused

    const task: Task = {
      id,
      inputFile,
      outputFile,
      commandLine,
      presetId: asString(entry['presetId']) ?? '',
      status: wasRunning ? TaskStatus.Error : persistedStatus,
      progress: emptyTaskProgress(),
      logs: { all: [], errors: [] },
      createdAt: new Date(asIsoString(entry['createdAt']) ?? Date.now()),
      elapsedTime: 0,
    }

    const startedAt = asIsoString(entry['startedAt'])
    const completedAt = asIsoString(entry['completedAt'])
    if (startedAt) task.startedAt = new Date(startedAt)
    if (completedAt) task.completedAt = new Date(completedAt)

    if (wasRunning) {
      task.error = interruptedMessage
      task.errorType = 'process'
    } else {
      const error = asString(entry['error'])
      if (error) task.error = error
      const errorType = asString(entry['errorType'])
      if (errorType && (ERROR_TYPES as readonly string[]).includes(errorType)) {
        task.errorType = errorType as TaskErrorType
      }
    }

    const retryOf = asString(entry['retryOf'])
    if (retryOf) task.retryOf = retryOf
    if (
      typeof entry['retryAttempt'] === 'number' &&
      Number.isInteger(entry['retryAttempt']) &&
      entry['retryAttempt'] > 0
    ) {
      task.retryAttempt = entry['retryAttempt'] as number
    }
    const cpuAffinity = asString(entry['cpuAffinity'])
    if (cpuAffinity) task.cpuAffinity = cpuAffinity
    const priority = asString(entry['priority'])
    if (priority && (['low', 'normal', 'high'] as readonly string[]).includes(priority)) {
      task.priority = priority as TaskPriority
    }
    const preserve = asPreserveFileTimes(entry['preserveFileTimes'])
    if (preserve) task.preserveFileTimes = preserve

    restored.push(task)
  }

  return restored
}
