import type { TaskProgress } from '@/types/task'

/**
 * R2.1：FFmpeg 事件契约单一事实源。
 *
 * 所有 FFmpeg 子进程都由 Rust `task_manager::start_ffmpeg` 管理，事件一律使用
 * `ffmpeg-*` 前缀并携带 `taskId`。legacy executor 的全局无前缀事件
 * （progress / finish / error）已删除，禁止再引入——否则多个监听者会互相串扰。
 *
 * 前端消费方：`store/taskStore.ts`（队列任务）、`hooks/useTransientFFmpegTask.ts`
 * （一次性任务）。Rust 发送方：`src-tauri/src/modules/task_manager.rs`。
 */
export const FFMPEG_EVENTS = {
  progress: 'ffmpeg-progress',
  log: 'ffmpeg-log',
  finish: 'ffmpeg-finish',
  error: 'ffmpeg-error',
} as const

export type FFmpegEventName = (typeof FFMPEG_EVENTS)[keyof typeof FFMPEG_EVENTS]

/** Rust `ProgressInfo` 的序列化结果，字段缺失时为 null。 */
export type FFmpegProgressInfo = Pick<
  TaskProgress,
  'frame' | 'fps' | 'time' | 'bitrate' | 'speed' | 'size'
>

export interface FFmpegProgressPayload {
  taskId: string
  progress: FFmpegProgressInfo
}

/** R1-6 起后端转发全量 stderr 行，level 只区分 error / info。 */
export interface FFmpegLogPayload {
  taskId: string
  level: 'error' | 'info'
  message: string
}

export interface FFmpegFinishPayload {
  taskId: string
  exitCode: number
}

export interface FFmpegErrorPayload {
  taskId: string
  exitCode: number
  message: string
}
