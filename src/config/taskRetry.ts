import { TaskStatus, type Task } from '@/types/task'
import type { TaskDraft } from '@/config/taskDraft'

/**
 * R3.6：失败重试 / 断点续转的唯一策略层。
 *
 * 语义：不「原地复活」旧任务（历史必须保留），而是克隆出一条全新的 Pending 任务，
 * 输出改到 `__retryN` 新路径避免覆盖上一次的半成品；命令只替换末尾的输出 token。
 * taskStore.retryTask 是唯一执行入口，页面不自行克隆。
 */
export const MAX_RETRY_ATTEMPTS = 3
const MAX_BACKOFF_MS = 8000

export function canRetry(task: Task | null | undefined): boolean {
  if (!task) return false
  if (task.status !== TaskStatus.Error && task.status !== TaskStatus.Stopped) return false
  return typeof task.commandLine === 'string' && task.commandLine.trim() !== ''
}

export function retryBackoffMs(attempt: number): number {
  if (!Number.isFinite(attempt) || attempt <= 0) return 0
  return Math.min(1000 * 2 ** (Math.floor(attempt) - 1), MAX_BACKOFF_MS)
}

export function retryOutputPath(outputFile: string, attempt: number): string {
  const path = typeof outputFile === 'string' ? outputFile : ''
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1
  if (!path) return `__retry${safeAttempt}`
  const dot = path.lastIndexOf('.')
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (dot > slash) return `${path.slice(0, dot)}__retry${safeAttempt}${path.slice(dot)}`
  return `${path}__retry${safeAttempt}`
}

/** 引号感知的分词：FFmpeg 命令最后一个 token 一定是输出路径。 */
function tokenize(commandLine: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (const char of commandLine) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (/\s/.test(char)) {
      if (current !== '') {
        tokens.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current !== '') tokens.push(current)
  return tokens
}

function quoteToken(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

export function replaceCommandOutput(commandLine: string, newOutput: string): string {
  if (typeof commandLine !== 'string' || commandLine.trim() === '') return ''
  const tokens = tokenize(commandLine)
  if (tokens.length === 0) return ''
  tokens[tokens.length - 1] = quoteToken(newOutput)
  return tokens.map((token) => (/\s/.test(token) ? quoteToken(token) : token)).join(' ')
}

export function planRetry(task: Task, attempt: number): TaskDraft {
  const outputFile = retryOutputPath(task.outputFile, attempt)
  const draft: TaskDraft = {
    inputFile: task.inputFile,
    outputFile,
    commandLine: replaceCommandOutput(task.commandLine, outputFile),
    presetId: task.presetId,
  }
  if (typeof task.cpuAffinity === 'string') draft.cpuAffinity = task.cpuAffinity
  if (task.preserveFileTimes) draft.preserveFileTimes = { ...task.preserveFileTimes }
  return draft
}

/** 同源任务（含自己）已有几条重试链；超过上限返回 -1，阻止无限重试。 */
export function nextRetryAttempt(tasks: readonly Task[], sourceId: string): number {
  const list = Array.isArray(tasks) ? tasks : []
  const count = list.filter((task) => task?.retryOf === sourceId).length
  const next = count + 1
  return next > MAX_RETRY_ATTEMPTS ? -1 : next
}
