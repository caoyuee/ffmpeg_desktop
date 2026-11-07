export enum TaskStatus {
  Pending = 0,
  Processing = 1,
  Paused = 2,
  Completed = 10,
  Stopped = 20,
  Error = 99,
}

import type { TaskPriority } from '@/config/settings'

/**
 * R1-8：与 Rust `task_manager.rs::ProgressInfo` 对齐。
 * 后端序列化 `Option<T>`，字段缺失时为 `null`；time/bitrate/speed/size 是带单位的字符串
 * （如 "00:01:23.45"、"1234.5 kbps"、"1.23x"、"12345KiB"），展示层必须先解析。
 * 末尾四个字段是前端派生值，后端不会下发。
 */
export interface TaskProgress {
  frame: number | null
  fps: number | null
  time: string | null
  bitrate: string | null
  speed: string | null
  size: string | null
  quality: number
  percentage: number
  estimatedSize: number
  remainingTime: number
}

export interface Task {
  id: string
  inputFile: string
  outputFile: string
  commandLine: string
  presetId: string
  status: TaskStatus
  progress: TaskProgress
  logs: {
    all: string[]
    errors: string[]
  }
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  elapsedTime: number
  pid?: number
  /** R1-4：用户主动停止标记，用于忽略子进程退出后迟到的 ffmpeg-error。 */
  stoppedByUser?: boolean
  error?: string
  errorType?: 'network' | 'permission' | 'not_found' | 'invalid_input' | 'process' | 'unknown'
  /** R3.6：重试链元信息；原任务保留为历史，新任务记录来源与次数。 */
  retryOf?: string
  retryAttempt?: number
  cpuAffinity?: string
  /** P1-2：入队时从设置快照的 taskPriority；调度时高优先级先启动（见 config/queueSchedule.ts）。 */
  priority?: TaskPriority
  preserveFileTimes?: {
    creation: boolean
    modification: boolean
    access: boolean
  }
}

export interface TaskQueueState {
  tasks: Task[]
  maxConcurrent: number
  runningCount: number
  currentTaskId: string | null
}
