import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick } from 'vue'
import type { Task, TaskProgress } from '@/types/task'
import { TaskStatus } from '@/types/task'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
// R2.3：设置读取统一走唯一事实源，不再自行解析 localStorage 旧键。
import { loadSettings, type AppSettings } from '@/config/settings'
import { pickNextPendingTask } from '@/config/queueSchedule'
import { useNotificationStore } from '@/store/notificationStore'
// R2.1：事件名与 payload 统一取自契约模块，杜绝无前缀事件回流。
import {
  FFMPEG_EVENTS,
  type FFmpegProgressPayload,
  type FFmpegLogPayload,
  type FFmpegFinishPayload,
  type FFmpegErrorPayload,
} from '@/utils/ffmpegEvents'
// R2.5：队列快照/恢复的唯一 schema 层；Rust 只做 JSON blob 原子透传。
import { serializeTaskQueue, restoreTasks, emptyTaskProgress } from '@/config/taskQueueSchema'
// R3.6：重试策略的唯一执行入口，页面不自行克隆任务。
import { canRetry, nextRetryAttempt, planRetry } from '@/config/taskRetry'
import i18n from '@/i18n'

type ErrorType = 'network' | 'permission' | 'not_found' | 'invalid_input' | 'process' | 'unknown'

/** R1-4：终态任务不再接受状态类事件，避免子进程退出后的迟到事件改写状态。 */
const TERMINAL_STATUSES = new Set<TaskStatus>([
  TaskStatus.Completed,
  TaskStatus.Error,
  TaskStatus.Stopped,
])

function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return String(error)
}

function formatTaskStartError(error: unknown): string {
  const message = formatError(error)
  const normalized = message.toLowerCase()

  if (
    normalized.includes('failed to start ffmpeg') &&
    (normalized.includes('program not found') || normalized.includes('not found'))
  ) {
    return `未找到 FFmpeg 可执行文件。请在“设置 > FFmpeg 路径”中选择 ffmpeg 可执行文件，或将 FFmpeg 安装到系统 PATH。原始错误: ${message}`
  }

  return message
}

let audioCtx: AudioContext | null = null
function playNotification(settings: AppSettings, frequency: number, duration: number) {
  if (!settings.playSound) return

  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = frequency
    gain.gain.value = 0.15
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + duration)
  } catch {
    /* AudioContext may be blocked by browser */
  }
}

function classifyError(error: unknown): ErrorType {
  const message = formatError(error).toLowerCase()

  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return 'network'
  }
  if (
    message.includes('permission') ||
    message.includes('access denied') ||
    message.includes('权限')
  ) {
    return 'permission'
  }
  if (message.includes('not found') || message.includes('不存在') || message.includes('未找到')) {
    return 'not_found'
  }
  if (message.includes('invalid') || message.includes('无效') || message.includes('格式')) {
    return 'invalid_input'
  }
  if (message.includes('process') || message.includes('ffmpeg') || message.includes('进程')) {
    return 'process'
  }
  return 'unknown'
}

function shouldDeleteFailedOutput(
  settings: AppSettings,
  inputFile: string,
  outputFile: string,
): boolean {
  if (!outputFile || outputFile.trim().toLowerCase() === inputFile.trim().toLowerCase()) {
    return false
  }

  if (settings.failedOutputDeleteMode === 'never') {
    return false
  }

  if (settings.failedOutputDeleteMode === 'mp4') {
    return outputFile.trim().toLowerCase().endsWith('.mp4')
  }

  return true
}

function getDirectoryPath(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  if (lastSlash <= 0) return '.'
  return filePath.slice(0, lastSlash)
}

async function openOutputFolder(settings: AppSettings, outputFile: string) {
  if (!settings.autoOpenOutputFolder || !outputFile) return

  try {
    const { openPath } = await import('@tauri-apps/plugin-opener')
    await openPath(getDirectoryPath(outputFile))
  } catch {
    // Opening the folder is a convenience action; the completed task should stay completed.
  }
}

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const maxConcurrent = ref(loadSettings().maxConcurrentTasks)
  // R1-4：并发计数改为派生值，从根上消除手工 ++/-- 的重复扣减与竞态窗口。
  // Paused 的进程仍然存活，继续占用并发额度。
  const runningCount = computed(
    () =>
      tasks.value.filter(
        (t) => t.status === TaskStatus.Processing || t.status === TaskStatus.Paused,
      ).length,
  )
  const currentTaskId = ref<string | null>(null)
  let isStarting = false
  let unlisteners: UnlistenFn[] = []

  // R2.5：只有主窗口（main.ts 判断 label === 'main'）调用 restoreQueue 后才开启写盘。
  // 独立窗口加载同一个 main.ts，会创建第二份 Pinia 实例；两边同时写 tasks.json 会互相覆盖。
  const persistenceEnabled = ref(false)
  let suppressingPersist = false
  let restoring = false
  let hydrated = false
  let latestSnapshot = ''
  let writeInFlight = false

  /** 只含元数据的快照：日志 / 进度变化不会改变它，因此不会触发写盘。 */
  const persistedSnapshot = computed(() => serializeTaskQueue(tasks.value))

  const pendingTasks = computed(() => tasks.value.filter((t) => t.status === TaskStatus.Pending))

  const processingTasks = computed(() =>
    tasks.value.filter((t) => t.status === TaskStatus.Processing),
  )

  function generateId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 16)
    return `task_${timestamp}_${randomPart}`
  }

  async function addTask(
    taskData: Omit<Task, 'id' | 'status' | 'progress' | 'logs' | 'createdAt' | 'elapsedTime'>,
    autoStart: boolean = true,
  ) {
    const task: Task = {
      ...taskData,
      id: generateId(),
      status: TaskStatus.Pending,
      // R1-8：与 Rust ProgressInfo 对齐，未知字段为 null 而非伪造的 0。
      progress: emptyTaskProgress(),
      logs: {
        all: [],
        errors: [],
      },
      createdAt: new Date(),
      elapsedTime: 0,
      // P1-2：taskPriority 的消费点——入队时从设置快照盖优先级戳，调度按此排序。
      priority: taskData.priority ?? loadSettings().taskPriority,
    }

    tasks.value.push(task)
    if (autoStart) {
      await tryStartNext()
    }

    return task.id
  }

  async function startTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return

    // R1-5：入口状态防御，禁止对同一个进程重复 spawn。
    if (task.status === TaskStatus.Processing) return
    if (task.status === TaskStatus.Paused) {
      await resumeTask(taskId)
      return
    }

    // R1-3：并发闸门下沉到 startTask，任何调用方（含"开始全部"）都无法绕过。
    if (runningCount.value >= maxConcurrent.value) return

    // 重启 Error/Stopped 任务时清除停止标记，避免把新进程的错误当成旧进程的尾声。
    task.stoppedByUser = false
    task.status = TaskStatus.Processing
    task.startedAt = new Date()
    currentTaskId.value = taskId

    try {
      const pid = await invoke<number>('start_ffmpeg', {
        command: task.commandLine,
        taskId: task.id,
        cpuAffinity: task.cpuAffinity || null,
      })

      task.pid = pid
    } catch (error) {
      task.status = TaskStatus.Error
      task.error = formatTaskStartError(error)
      task.errorType = classifyError(error)
      addTaskLog(taskId, `任务启动失败: ${task.error}`, true)
      await tryStartNext()
    }
  }

  async function pauseTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task && task.pid) {
      try {
        await invoke('pause_process', { pid: task.pid })
        task.status = TaskStatus.Paused
      } catch (error) {
        const errorMsg = formatError(error)
        addTaskLog(taskId, `暂停任务失败: ${errorMsg}`, true)
      }
    }
  }

  async function resumeTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task && task.pid) {
      try {
        await invoke('resume_process', { pid: task.pid })
        task.status = TaskStatus.Processing
      } catch (error) {
        const errorMsg = formatError(error)
        addTaskLog(taskId, `恢复任务失败: ${errorMsg}`, true)
      }
    }
  }

  async function stopTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task || !task.pid) return

    // R1-4：先打标记，覆盖 await 期间到达的 ffmpeg-error（子进程退出会发该事件）。
    task.stoppedByUser = true
    try {
      await invoke('stop_process', { pid: task.pid })
      task.status = TaskStatus.Stopped
      await tryStartNext()
    } catch (error) {
      task.stoppedByUser = false
      console.error('停止任务失败:', error)
    }
  }

  function removeTask(taskId: string) {
    const index = tasks.value.findIndex((t) => t.id === taskId)
    if (index >= 0) {
      tasks.value.splice(index, 1)
    }
  }

  function reorderTasks(orderedIds: string[]) {
    const taskMap = new Map(tasks.value.map((t) => [t.id, t]))
    tasks.value = orderedIds.map((id) => taskMap.get(id)!).filter(Boolean)
  }

  function clearCompletedTasks() {
    tasks.value = tasks.value.filter(
      (t) => t.status !== TaskStatus.Completed && t.status !== TaskStatus.Stopped,
    )
  }

  /**
   * R3.6：失败/停止任务重试。保留原任务作为历史，克隆一条 Pending 新任务，
   * 输出改到 __retryN 避免覆盖半成品。超过上限或非终态返回 null。
   */
  async function retryTask(taskId: string): Promise<string | null> {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!canRetry(task)) return null
    const attempt = nextRetryAttempt(tasks.value, taskId)
    if (attempt < 0) return null
    const draft = planRetry(task, attempt)
    return await addTask({ ...draft, retryOf: taskId, retryAttempt: attempt }, false)
  }

  // R3.2：历史视图的唯一清理入口。只删终态（含 Error），不影响等待/进行/暂停中的任务。
  function clearHistory(): number {
    const before = tasks.value.length
    tasks.value = tasks.value.filter((t) => !isTerminal(t.status))
    return before - tasks.value.length
  }

  /** R1-3：一次填满可用并发额度；isStarting 保证重入安全。 */
  async function tryStartNext() {
    if (isStarting) return
    isStarting = true

    try {
      while (runningCount.value < maxConcurrent.value) {
        // P1-2：按优先级挑下一个 Pending（high > normal > low，同级稳定）。
        const nextTask = pickNextPendingTask(tasks.value)
        if (!nextTask) break

        await startTask(nextTask.id)
        // 防御：若闸门拒绝启动导致状态未变，立即退出，避免死循环。
        if (nextTask.status === TaskStatus.Pending) break
      }
    } finally {
      isStarting = false
    }
  }

  function updateTaskProgress(taskId: string, progress: Partial<TaskProgress>) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task && !isTerminal(task.status)) {
      task.progress = { ...task.progress, ...progress }
    }
  }

  function addTaskLog(taskId: string, log: string, isError: boolean = false) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) {
      task.logs.all.push(log)
      if (isError) {
        task.logs.errors.push(log)
      }
    }
  }

  async function setupEventListeners() {
    unlisteners.push(
      await listen<FFmpegProgressPayload>(FFMPEG_EVENTS.progress, (event) => {
        const { taskId, progress } = event.payload
        updateTaskProgress(taskId, progress)
      }),
    )

    unlisteners.push(
      await listen<FFmpegFinishPayload>(FFMPEG_EVENTS.finish, async (event) => {
        const { taskId, exitCode } = event.payload
        const task = tasks.value.find((t) => t.id === taskId)
        // R1-4：用户已请求停止或任务已进入终态时，忽略迟到的完成事件。
        if (!task || task.stoppedByUser || isTerminal(task.status)) return

        task.status = exitCode === 0 ? TaskStatus.Completed : TaskStatus.Error
        task.completedAt = new Date()

        // P1-2：showNotification 消费点——按设置推送应用内通知。
        if (loadSettings().showNotification) {
          useNotificationStore().push(
            'notification.taskCompleted',
            {
              file: task.outputFile.split(/[\\/]/).pop() ?? task.outputFile,
            },
            'success',
          )
        }

        const preserveFileTimes = task.preserveFileTimes
        if (
          exitCode === 0 &&
          task.outputFile &&
          task.inputFile &&
          preserveFileTimes &&
          (preserveFileTimes.creation || preserveFileTimes.modification || preserveFileTimes.access)
        ) {
          try {
            await invoke('preserve_file_times', {
              source: task.inputFile,
              dest: task.outputFile,
              preserveCreation: preserveFileTimes.creation,
              preserveModification: preserveFileTimes.modification,
              preserveAccess: preserveFileTimes.access,
            })
          } catch {
            /* ignore */
          }
        }
        const appSettings = loadSettings()
        await openOutputFolder(appSettings, task.outputFile)
        playNotification(appSettings, 800, 0.15)

        await tryStartNext()
      }),
    )

    unlisteners.push(
      await listen<FFmpegLogPayload>(FFMPEG_EVENTS.log, (event) => {
        const { taskId, message, level } = event.payload
        // 日志是事实记录，终态任务也照收，但它不会改写任何状态。
        if (typeof message === 'string') {
          addTaskLog(taskId, message, level === 'error')
        }
      }),
    )

    unlisteners.push(
      await listen<FFmpegErrorPayload>(FFMPEG_EVENTS.error, async (event) => {
        const { taskId, message, exitCode } = event.payload
        const task = tasks.value.find((t) => t.id === taskId)
        // R1-4：主动停止 / 终态保护，避免把 Stopped 改写成 Error 并重复释放并发额度。
        if (!task || task.stoppedByUser || isTerminal(task.status)) {
          if (task && typeof message === 'string') addTaskLog(taskId, message, true)
          return
        }

        task.status = TaskStatus.Error
        task.error = message || `退出码: ${exitCode}`
        addTaskLog(taskId, task.error, true)

        // P1-2：showNotification 消费点——失败同样按设置推送。
        if (loadSettings().showNotification) {
          useNotificationStore().push(
            'notification.taskFailed',
            {
              file: task.outputFile.split(/[\\/]/).pop() ?? task.outputFile,
            },
            'error',
          )
        }

        if (shouldDeleteFailedOutput(loadSettings(), task.inputFile, task.outputFile)) {
          try {
            await invoke('delete_file', { path: task.outputFile })
          } catch {
            /* ignore */
          }
        }
        playNotification(loadSettings(), 300, 0.3)

        await tryStartNext()
      }),
    )

    unlisteners.push(
      await listen<{
        tasks: Array<Parameters<typeof addTask>[0]>
      }>('add-independent-tasks', (event) => {
        const { tasks: newTasks } = event.payload
        if (Array.isArray(newTasks)) {
          newTasks.forEach((t) => {
            addTask(t)
          })
        }
      }),
    )
  }

  /**
   * R2.5：串行化 + 合并写。任何时刻最多一个 invoke 在飞，
   * 且循环保证「最后一次快照」最终一定落盘，不会因并发写出现旧值覆盖新值。
   */
  async function flushPersist(): Promise<void> {
    if (!persistenceEnabled.value) return
    latestSnapshot = persistedSnapshot.value
    if (writeInFlight) return
    writeInFlight = true
    try {
      while (true) {
        const snapshot = latestSnapshot
        try {
          await invoke('save_task_queue', { snapshot })
        } catch (error) {
          // 不静默吞错：磁盘写失败必须可见，但不能阻断队列调度。
          console.warn('[queue] failed to persist task queue:', error)
          break
        }
        if (latestSnapshot === snapshot) break
      }
    } finally {
      writeInFlight = false
    }
  }

  watch(persistedSnapshot, () => {
    if (suppressingPersist) return
    void flushPersist()
  })

  /**
   * R2.5：启动时从 Rust 侧 tasks.json 恢复队列，并同时开启持久化。
   * 恢复期间抑制写盘，避免「先写回空队列」把磁盘内容抹掉；恢复不自动启动任务，
   * 由用户显式重新开始。幂等：重复调用不会二次覆盖已有队列。
   */
  async function restoreQueue(): Promise<void> {
    if (hydrated || restoring) return
    restoring = true
    suppressingPersist = true
    try {
      const raw = await invoke<string>('load_task_queue')
      const interruptedMessage = i18n.global.t('page.queue.interruptedByRestart') as string
      const restored = restoreTasks(raw, interruptedMessage)
      // 已有内存队列且磁盘快照为空时不覆盖，避免启动竞态丢任务。
      if (restored.length > 0 || tasks.value.length === 0) {
        tasks.value = restored
      }
    } catch (error) {
      // 读盘失败不能清空用户已有队列，也不能让启动流程崩溃。
      console.warn('[queue] failed to restore task queue:', error)
    } finally {
      await nextTick()
      suppressingPersist = false
      persistenceEnabled.value = true
      hydrated = true
      await flushPersist()
      restoring = false
    }
  }

  function cleanupEventListeners() {
    unlisteners.forEach((unlisten) => unlisten())
    unlisteners = []
  }

  return {
    tasks,
    maxConcurrent,
    runningCount,
    currentTaskId,
    pendingTasks,
    processingTasks,
    addTask,
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    removeTask,
    reorderTasks,
    clearCompletedTasks,
    clearHistory,
    retryTask,
    tryStartNext,
    updateTaskProgress,
    addTaskLog,
    setupEventListeners,
    cleanupEventListeners,
    restoreQueue,
    flushPersist,
  }
})
