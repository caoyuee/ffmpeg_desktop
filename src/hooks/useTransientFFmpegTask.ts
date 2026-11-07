import { ref, type Ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { createListenerRegistry, type ListenerRegistry } from '@/utils/listenerRegistry'
import {
  FFMPEG_EVENTS,
  type FFmpegProgressPayload,
  type FFmpegLogPayload,
  type FFmpegFinishPayload,
  type FFmpegErrorPayload,
  type FFmpegProgressInfo,
} from '@/utils/ffmpegEvents'

/**
 * R2.1：一次性 FFmpeg 任务执行器。
 *
 * 画质评测（QualityAssess）这类不进编码队列、但同样要跑 ffmpeg 的功能，
 * 一律经由 `task_manager::start_ffmpeg` 执行，并只消费 `ffmpeg-*` 前缀事件。
 * 与 `taskStore` 的分工：队列任务由 store 统一调度（含并发闸门），一次性任务
 * 由本 hook 调度；两者共享同一 Rust 进程管理实现与事件契约，不再有第二套 executor。
 *
 * 监听器由 `createListenerRegistry` 统一登记/释放（R1-13），启动失败、完成、报错、
 * 手动停止、组件卸载都会释放，避免全局监听器累积。
 */
export interface TransientTaskHandlers {
  /** 全量 stderr 行，level 由后端标注。 */
  onLog?: (line: string, level: 'error' | 'info') => void
  onProgress?: (progress: FFmpegProgressInfo) => void
  onFinish?: (exitCode: number) => void
  onError?: (message: string) => void
}

export interface TransientFFmpegTask {
  isRunning: Ref<boolean>
  /** 返回本次任务的 taskId；调用方一般只需用它做日志关联。 */
  start(command: string, handlers: TransientTaskHandlers): Promise<string>
  stop(): Promise<void>
  /** 组件卸载时调用：释放监听器，不主动 kill 子进程。 */
  dispose(): void
}

export function useTransientFFmpegTask(): TransientFFmpegTask {
  const isRunning = ref(false)
  let pid: number | null = null
  let registry: ListenerRegistry | null = null

  function finalize() {
    isRunning.value = false
    registry?.cleanup()
    registry = null
    pid = null
  }

  async function start(command: string, handlers: TransientTaskHandlers): Promise<string> {
    if (isRunning.value) {
      throw new Error('A transient FFmpeg task is already running')
    }

    const id = `transient_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    isRunning.value = true

    const current = createListenerRegistry()
    registry = current

    const isCurrentTask = (payload: { taskId?: unknown } | null | undefined): boolean =>
      !!payload && payload.taskId === id

    // 先注册监听器再启动进程，避免丢掉进程刚启动时吐出的 stderr 行。
    current.add(
      await listen<FFmpegLogPayload>(FFMPEG_EVENTS.log, (event) => {
        if (!isCurrentTask(event.payload)) return
        const { message, level } = event.payload
        if (typeof message === 'string') handlers.onLog?.(message, level)
      }),
    )

    current.add(
      await listen<FFmpegProgressPayload>(FFMPEG_EVENTS.progress, (event) => {
        if (!isCurrentTask(event.payload)) return
        handlers.onProgress?.(event.payload.progress)
      }),
    )

    current.add(
      await listen<FFmpegFinishPayload>(FFMPEG_EVENTS.finish, (event) => {
        if (!isCurrentTask(event.payload)) return
        const exitCode = event.payload.exitCode ?? 0
        finalize()
        if (exitCode === 0) handlers.onFinish?.(exitCode)
        else handlers.onError?.(`FFmpeg exited with code ${exitCode}`)
      }),
    )

    current.add(
      await listen<FFmpegErrorPayload>(FFMPEG_EVENTS.error, (event) => {
        if (!isCurrentTask(event.payload)) return
        const message = event.payload.message || `FFmpeg exited with code ${event.payload.exitCode}`
        finalize()
        handlers.onError?.(message)
      }),
    )

    try {
      pid = await invoke<number>('start_ffmpeg', {
        command,
        taskId: id,
        cpuAffinity: null,
      })
    } catch (error) {
      finalize()
      throw error
    }

    return id
  }

  async function stop(): Promise<void> {
    if (!isRunning.value) return
    const activePid = pid

    try {
      // 与 taskStore.stopTask 一致，走 task_manager 的 SIGTERM / taskkill。
      if (activePid !== null) {
        await invoke('stop_process', { pid: activePid })
      }
    } finally {
      // 子进程被 kill 后会补发 ffmpeg-error；提前释放监听器，避免把主动停止显示成失败。
      finalize()
    }
  }

  function dispose(): void {
    finalize()
  }

  return { isRunning, start, stop, dispose }
}
