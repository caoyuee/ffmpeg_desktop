import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useTaskStore } from '@/store/taskStore'
import { TaskStatus } from '@/types/task'
import { DEFAULT_APP_SETTINGS, saveSettings } from '@/config/settings'

const eventHandlers = vi.hoisted(() => new Map<string, (event: { payload: unknown }) => void>())
const mockInvoke = vi.hoisted(() => vi.fn())
const mockOpenPath = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, handler: (event: { payload: unknown }) => void) => {
    eventHandlers.set(eventName, handler)
    return Promise.resolve(vi.fn())
  }),
}))

vi.mock('@tauri-apps/plugin-opener', () => ({
  openPath: mockOpenPath,
}))

describe('taskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    eventHandlers.clear()
    mockInvoke.mockReset()
    mockOpenPath.mockReset()
    localStorage.clear()
  })

  it('should add a task and auto-start it', async () => {
    const store = useTaskStore()
    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
    })

    expect(id).toBeTruthy()
    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0]!.inputFile).toBe('test.mp4')
    expect([TaskStatus.Processing, TaskStatus.Error].includes(store.tasks[0]!.status)).toBe(true)
  })

  it('should remove a task', async () => {
    const store = useTaskStore()
    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
    })

    store.removeTask(id)
    expect(store.tasks).toHaveLength(0)
  })

  it('should clear completed tasks only', async () => {
    const store = useTaskStore()

    await store.addTask({
      inputFile: 'a.mp4',
      outputFile: 'a_out.mp4',
      commandLine: '...',
      presetId: '',
    })
    await store.addTask({
      inputFile: 'b.mp4',
      outputFile: 'b_out.mp4',
      commandLine: '...',
      presetId: '',
    })

    store.tasks[0]!.status = TaskStatus.Completed
    store.tasks[1]!.status = TaskStatus.Pending

    store.clearCompletedTasks()
    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0]!.inputFile).toBe('b.mp4')
  })

  it('should track running count', async () => {
    const store = useTaskStore()
    await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: '...',
      presetId: '',
    })

    store.tasks[0]!.status = TaskStatus.Processing
    store.tasks[0]!.pid = 1234
    expect(store.tasks[0]!.status).toBe(TaskStatus.Processing)
  })

  it('should generate unique IDs', async () => {
    const store = useTaskStore()
    const id1 = await store.addTask({
      inputFile: 'a.mp4',
      outputFile: 'a_out.mp4',
      commandLine: '...',
      presetId: '',
    })
    const id2 = await store.addTask({
      inputFile: 'b.mp4',
      outputFile: 'b_out.mp4',
      commandLine: '...',
      presetId: '',
    })

    expect(id1).not.toBe(id2)
  })

  it('should keep a running task active when receiving a non-terminal ffmpeg log error', async () => {
    const store = useTaskStore()
    await store.setupEventListeners()

    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
    })

    const task = store.tasks[0]!
    expect(task.status).toBe(TaskStatus.Processing)
    expect(store.runningCount).toBe(1)

    const logHandler = eventHandlers.get('ffmpeg-log')
    expect(logHandler).toBeDefined()

    logHandler!({
      payload: {
        taskId: id,
        message: 'Non-monotonous DTS in output stream',
        level: 'error',
      },
    })

    expect(task.status).toBe(TaskStatus.Processing)
    expect(store.runningCount).toBe(1)
    expect(task.logs.all).toContain('Non-monotonous DTS in output stream')
    expect(task.logs.errors).toContain('Non-monotonous DTS in output stream')
  })

  it('should not preserve file times when timestamp options are disabled', async () => {
    const store = useTaskStore()
    mockInvoke.mockResolvedValueOnce(1234)
    await store.setupEventListeners()

    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
    })

    const finishHandler = eventHandlers.get('ffmpeg-finish')
    expect(finishHandler).toBeDefined()

    await finishHandler!({ payload: { taskId: id, exitCode: 0 } })

    expect(invoke).not.toHaveBeenCalledWith('preserve_file_times', expect.anything())
  })

  it('should preserve selected file times after a successful task', async () => {
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()

    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
      preserveFileTimes: {
        creation: true,
        modification: true,
        access: false,
      },
    })

    const finishHandler = eventHandlers.get('ffmpeg-finish')
    expect(finishHandler).toBeDefined()

    await finishHandler!({ payload: { taskId: id, exitCode: 0 } })

    expect(invoke).toHaveBeenCalledWith('preserve_file_times', {
      source: 'test.mp4',
      dest: 'output.mp4',
      preserveCreation: true,
      preserveModification: true,
      preserveAccess: false,
    })
  })

  it('should initialize max concurrent tasks from app settings', () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, maxConcurrentTasks: 3 })

    const store = useTaskStore()

    expect(store.maxConcurrent).toBe(3)
  })

  it('should explain FFmpeg path setup when the executable cannot be found', async () => {
    mockInvoke.mockRejectedValueOnce('Failed to start FFmpeg: program not found')
    const store = useTaskStore()

    await store.addTask({
      inputFile: 'test.webm',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -hide_banner -i test.webm output.mp4 -y',
      presetId: '',
    })

    expect(store.tasks[0]!.status).toBe(TaskStatus.Error)
    expect(store.tasks[0]!.error).toContain('未找到 FFmpeg 可执行文件')
    expect(store.tasks[0]!.error).toContain('Failed to start FFmpeg: program not found')
  })

  it('should respect disabled task sound setting on finish', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, playSound: false })
    const audioContext = vi.fn()
    vi.stubGlobal('AudioContext', audioContext)
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()

    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
    })

    const finishHandler = eventHandlers.get('ffmpeg-finish')
    expect(finishHandler).toBeDefined()

    await finishHandler!({ payload: { taskId: id, exitCode: 0 } })

    expect(audioContext).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('should skip failed output deletion when settings disable it', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, failedOutputDeleteMode: 'never' })
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()

    const id = await store.addTask({
      inputFile: 'test.mp4',
      outputFile: 'output.mp4',
      commandLine: 'ffmpeg -i test.mp4 output.mp4',
      presetId: '',
    })

    const errorHandler = eventHandlers.get('ffmpeg-error')
    expect(errorHandler).toBeDefined()

    await errorHandler!({ payload: { taskId: id, message: 'failed', exitCode: 1 } })

    expect(invoke).not.toHaveBeenCalledWith('delete_file', expect.anything())
  })

  it('should open output folder after a successful task when enabled', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, autoOpenOutputFolder: true })
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()

    const id = await store.addTask({
      inputFile: '/videos/source.mp4',
      outputFile: '/exports/output.mp4',
      commandLine: 'ffmpeg -i source.mp4 output.mp4',
      presetId: '',
    })

    const finishHandler = eventHandlers.get('ffmpeg-finish')
    expect(finishHandler).toBeDefined()

    await finishHandler!({ payload: { taskId: id, exitCode: 0 } })

    expect(mockOpenPath).toHaveBeenCalledWith('/exports')
  })
})

// ── 重构路线图 R1-3 / R1-4 / R1-5 回归用例 ──────────────────────────────
describe('taskStore R1 并发与终态保护', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    eventHandlers.clear()
    mockInvoke.mockReset()
    mockOpenPath.mockReset()
    localStorage.clear()
  })

  const baseTask = (name: string) => ({
    inputFile: name,
    outputFile: `out_${name}`,
    commandLine: `ffmpeg -i ${name} out_${name}`,
    presetId: '',
  })
  const startCalls = () => mockInvoke.mock.calls.filter((c) => c[0] === 'start_ffmpeg')

  it('R1-5 对 Processing 任务再次 startTask 不会重复 spawn', async () => {
    const store = useTaskStore()
    const id = await store.addTask(baseTask('a.mp4'))
    expect(startCalls()).toHaveLength(1)

    await store.startTask(id)

    expect(startCalls()).toHaveLength(1)
  })

  it('R1-5 Paused 任务再次 startTask 转调 resume_process 而非重新 spawn', async () => {
    const store = useTaskStore()
    const id = await store.addTask(baseTask('a.mp4'))
    const task = store.tasks[0]!
    task.pid = 4242
    task.status = TaskStatus.Paused
    mockInvoke.mockClear()

    await store.startTask(id)

    expect(startCalls()).toHaveLength(0)
    expect(mockInvoke).toHaveBeenCalledWith('resume_process', { pid: 4242 })
    expect(task.status).toBe(TaskStatus.Processing)
  })

  it('R1-3 startTask 自身带并发闸门，超额调用不会 spawn', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, maxConcurrentTasks: 1 })
    const store = useTaskStore()
    const id1 = await store.addTask(baseTask('a.mp4'), false)
    const id2 = await store.addTask(baseTask('b.mp4'), false)

    await store.startTask(id1)
    await store.startTask(id2)

    expect(startCalls()).toHaveLength(1)
    expect(store.tasks.find((t) => t.id === id2)!.status).toBe(TaskStatus.Pending)
  })

  it('R1-3 tryStartNext 只启动到并发上限，其余保持 Pending', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, maxConcurrentTasks: 2 })
    const store = useTaskStore()
    await store.addTask(baseTask('a.mp4'), false)
    await store.addTask(baseTask('b.mp4'), false)
    await store.addTask(baseTask('c.mp4'), false)

    await store.tryStartNext()

    expect(store.processingTasks).toHaveLength(2)
    expect(store.pendingTasks).toHaveLength(1)
  })

  it('R1-4 用户停止后迟到的 ffmpeg-error 不会改写状态或误删输出', async () => {
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()
    const id = await store.addTask(baseTask('a.mp4'))

    await store.stopTask(id)
    expect(store.tasks[0]!.status).toBe(TaskStatus.Stopped)

    const errorHandler = eventHandlers.get('ffmpeg-error')!
    mockInvoke.mockClear()
    await errorHandler({ payload: { taskId: id, message: 'killed', exitCode: 1 } })

    expect(store.tasks[0]!.status).toBe(TaskStatus.Stopped)
    expect(store.runningCount).toBe(0)
    expect(mockInvoke).not.toHaveBeenCalledWith('delete_file', expect.anything())
  })

  it('R1-4 终态任务忽略后续 finish / error 事件，runningCount 不漂移为负', async () => {
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()
    const id = await store.addTask(baseTask('a.mp4'))
    const finishHandler = eventHandlers.get('ffmpeg-finish')!
    const errorHandler = eventHandlers.get('ffmpeg-error')!

    await finishHandler({ payload: { taskId: id, exitCode: 0 } })
    expect(store.tasks[0]!.status).toBe(TaskStatus.Completed)

    await errorHandler({ payload: { taskId: id, message: 'late', exitCode: 1 } })
    await finishHandler({ payload: { taskId: id, exitCode: 1 } })

    expect(store.tasks[0]!.status).toBe(TaskStatus.Completed)
    expect(store.runningCount).toBe(0)
  })

  it('R1-4 / V1 停止任务后队列中的下一个任务自动启动', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, maxConcurrentTasks: 1 })
    const store = useTaskStore()
    mockInvoke.mockResolvedValue(1234)
    await store.setupEventListeners()
    await store.addTask(baseTask('a.mp4'), false)
    const id2 = await store.addTask(baseTask('b.mp4'), false)
    await store.tryStartNext()
    expect(store.tasks[0]!.status).toBe(TaskStatus.Processing)

    await store.stopTask(store.tasks[0]!.id)

    expect(store.tasks.find((t) => t.id === id2)!.status).toBe(TaskStatus.Processing)
    expect(store.runningCount).toBe(1)
  })
})

// ── 重构路线图 R2.5 队列持久化回归用例 ────────────────────────────────────
describe('taskStore R2.5 队列持久化', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    eventHandlers.clear()
    mockInvoke.mockReset()
    mockOpenPath.mockReset()
    localStorage.clear()
  })

  const baseTask = (name: string) => ({
    inputFile: name,
    outputFile: `out_${name}`,
    commandLine: `ffmpeg -i ${name} out_${name}`,
    presetId: '',
  })

  const persistedTask = (id: string, status: number, extra: Record<string, unknown> = {}) => ({
    id,
    inputFile: `${id}.mp4`,
    outputFile: `${id}_out.mp4`,
    commandLine: `ffmpeg -i ${id}.mp4 ${id}_out.mp4`,
    presetId: '',
    status,
    createdAt: '2026-11-07T01:02:03.000Z',
    ...extra,
  })

  const queueSnapshot = (tasks: unknown[], schemaVersion = 1) =>
    JSON.stringify({ schemaVersion, tasks })

  const saveCalls = () => mockInvoke.mock.calls.filter((c) => c[0] === 'save_task_queue')
  const lastWritten = () =>
    JSON.parse(saveCalls().at(-1)![1]!['snapshot'] as string) as {
      schemaVersion: number
      tasks: Array<Record<string, unknown>>
    }

  const settle = async () => {
    await nextTick()
    await nextTick()
  }

  it('未恢复前默认关闭持久化，普通操作不写盘（保证非主窗口零副作用）', async () => {
    const store = useTaskStore()
    await store.addTask(baseTask('a.mp4'), false)
    await settle()

    expect(saveCalls()).toHaveLength(0)
  })

  it('restoreQueue 读回快照，恢复 Pending / 终态并把 Processing 标记为中断', async () => {
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'load_task_queue') {
        return Promise.resolve(
          queueSnapshot([
            persistedTask('a', TaskStatus.Pending),
            persistedTask('b', TaskStatus.Processing),
            persistedTask('c', TaskStatus.Completed),
          ]),
        )
      }
      return Promise.resolve(1234)
    })
    const store = useTaskStore()

    await store.restoreQueue()

    expect(store.tasks.map((t) => t.status)).toEqual([
      TaskStatus.Pending,
      TaskStatus.Error,
      TaskStatus.Completed,
    ])
    expect(store.tasks[1]!.error).toContain('中断')
    expect(store.tasks[1]!.logs.all).toEqual([])
    // 恢复不等于自动开工：用户必须显式点开始。
    expect(mockInvoke.mock.calls.filter((c) => c[0] === 'start_ffmpeg')).toHaveLength(0)
  })

  it('恢复后把中断结果写回磁盘，避免下次启动重复误判', async () => {
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'load_task_queue') {
        return Promise.resolve(queueSnapshot([persistedTask('b', TaskStatus.Processing)]))
      }
      return Promise.resolve(1234)
    })
    const store = useTaskStore()

    await store.restoreQueue()

    expect(saveCalls().length).toBeGreaterThan(0)
    expect(lastWritten().tasks[0]!['status']).toBe(TaskStatus.Error)
    // v2（第十一轮）：增量字段 priority，版本号随之升级。
    expect(lastWritten().schemaVersion).toBe(2)
  })

  it('恢复后新增/删除/清空任务都会触发写盘，且快照不含日志', async () => {
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'load_task_queue') return Promise.resolve(queueSnapshot([]))
      return Promise.resolve(1234)
    })
    const store = useTaskStore()
    await store.restoreQueue()
    const before = saveCalls().length

    const id = await store.addTask(baseTask('a.mp4'), false)
    store.addTaskLog(id, 'frame= 1')
    store.updateTaskProgress(id, { percentage: 12 })
    await settle()
    const afterLog = saveCalls().length
    expect(afterLog).toBeGreaterThan(before)
    expect(lastWritten().tasks).toHaveLength(1)
    expect(lastWritten().tasks[0]).not.toHaveProperty('logs')
    expect(lastWritten().tasks[0]).not.toHaveProperty('progress')

    // 日志/进度本身不应产生额外写盘。
    store.addTaskLog(id, 'frame= 2')
    store.updateTaskProgress(id, { percentage: 44 })
    await settle()
    expect(saveCalls()).toHaveLength(afterLog)

    store.removeTask(id)
    await settle()
    expect(lastWritten().tasks).toHaveLength(0)
  })

  it('load 失败时不破坏已有任务，且仍启用持久化', async () => {
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'load_task_queue') return Promise.reject(new Error('disk read failed'))
      return Promise.resolve(1234)
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = useTaskStore()
    await store.addTask(baseTask('a.mp4'), false)

    await store.restoreQueue()
    expect(store.tasks).toHaveLength(1)
    expect(saveCalls().length).toBeGreaterThan(0)

    await store.addTask(baseTask('b.mp4'), false)
    await settle()
    expect(lastWritten().tasks).toHaveLength(2)
    warn.mockRestore()
  })

  it('重复 restoreQueue 幂等，不会重复启用或清空刚添加的任务', async () => {
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'load_task_queue') return Promise.resolve(queueSnapshot([]))
      return Promise.resolve(1234)
    })
    const store = useTaskStore()
    await store.restoreQueue()
    await store.addTask(baseTask('a.mp4'), false)
    await settle()

    await store.restoreQueue()
    expect(store.tasks).toHaveLength(1)
  })
})

describe('R3.2 clearHistory（历史视图的唯一清理入口）', () => {
  // 顶层 describe 与主 describe 平级，必须自带隔离，否则会沿用上一组用例的 Pinia 状态。
  beforeEach(() => {
    setActivePinia(createPinia())
    eventHandlers.clear()
    mockInvoke.mockReset()
    mockOpenPath.mockReset()
    localStorage.clear()
  })

  async function seedWithStatuses(statuses: TaskStatus[]) {
    const store = useTaskStore()
    for (let i = 0; i < statuses.length; i += 1) {
      await store.addTask(
        {
          inputFile: `f${i}.mp4`,
          outputFile: `f${i}_out.mp4`,
          commandLine: '...',
          presetId: '',
        },
        false,
      )
      store.tasks[i]!.status = statuses[i]!
    }
    return store
  }

  it('只删除终态任务（Completed/Error/Stopped），返回删除条数', async () => {
    const store = await seedWithStatuses([
      TaskStatus.Completed,
      TaskStatus.Error,
      TaskStatus.Stopped,
      TaskStatus.Pending,
      TaskStatus.Processing,
      TaskStatus.Paused,
    ])

    expect(store.clearHistory()).toBe(3)
    expect(store.tasks.map((t) => t.inputFile)).toEqual(['f3.mp4', 'f4.mp4', 'f5.mp4'])
  })

  it('没有终态时返回 0 且不动队列', async () => {
    const store = await seedWithStatuses([TaskStatus.Pending, TaskStatus.Processing])
    expect(store.clearHistory()).toBe(0)
    expect(store.tasks).toHaveLength(2)
  })

  it('既有 clearCompletedTasks 语义不变：不删 Error', async () => {
    const store = await seedWithStatuses([TaskStatus.Completed, TaskStatus.Error])
    store.clearCompletedTasks()
    expect(store.tasks.map((t) => t.status)).toEqual([TaskStatus.Error])
  })
})

describe('taskStore P1-2 三项设置消费', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    eventHandlers.clear()
    mockInvoke.mockReset()
    mockOpenPath.mockReset()
    localStorage.clear()
  })

  const baseTask = (name: string, priority?: 'low' | 'normal' | 'high') => ({
    inputFile: name,
    outputFile: `out_${name}`,
    commandLine: `ffmpeg -i ${name} out_${name}`,
    presetId: '',
    ...(priority ? { priority } : {}),
  })

  it('taskPriority：tryStartNext 先启动高优先级任务，同级保持插入顺序', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, maxConcurrentTasks: 1 })
    const store = useTaskStore()
    await store.addTask(baseTask('a.mp4', 'low'), false)
    await store.addTask(baseTask('b.mp4', 'high'), false)
    await store.addTask(baseTask('c.mp4'), false)

    await store.tryStartNext()

    const processing = store.tasks.find((t) => t.status === TaskStatus.Processing)
    expect(processing?.inputFile).toBe('b.mp4')
  })

  it('addTask 按设置快照盖 priority 戳，未设置时为 normal', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, taskPriority: 'high' })
    const store = useTaskStore()
    await store.addTask(baseTask('a.mp4'), false)
    expect(store.tasks[0]?.priority).toBe('high')

    localStorage.clear()
    saveSettings({ ...DEFAULT_APP_SETTINGS, taskPriority: 'low' })
    await store.addTask(baseTask('b.mp4'), false)
    expect(store.tasks[1]?.priority).toBe('low')
  })

  it('showNotification=true 时任务完成推送应用内通知', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, showNotification: true })
    const store = useTaskStore()
    await store.setupEventListeners()
    await store.addTask(baseTask('a.mp4'), false)
    const task = store.tasks[0]!

    const { useNotificationStore } = await import('@/store/notificationStore')
    const notifications = useNotificationStore()

    eventHandlers.get('ffmpeg-finish')!({
      payload: { taskId: task.id, exitCode: 0 },
    })
    await nextTick()

    expect(task.status).toBe(TaskStatus.Completed)
    expect(
      notifications.notifications.some((n) => n.messageKey === 'notification.taskCompleted'),
    ).toBe(true)
  })

  it('showNotification=false 时任务完成不推送通知', async () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, showNotification: false })
    const store = useTaskStore()
    await store.setupEventListeners()
    await store.addTask(baseTask('a.mp4'), false)
    const task = store.tasks[0]!

    const { useNotificationStore } = await import('@/store/notificationStore')
    const notifications = useNotificationStore()

    eventHandlers.get('ffmpeg-finish')!({
      payload: { taskId: task.id, exitCode: 0 },
    })
    await nextTick()

    expect(task.status).toBe(TaskStatus.Completed)
    expect(notifications.notifications).toHaveLength(0)
  })
})
