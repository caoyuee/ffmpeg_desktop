import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useTaskStore } from '@/store/taskStore'
import { TaskStatus } from '@/types/task'

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
    localStorage.setItem('appSettings', JSON.stringify({ maxConcurrentTasks: 3 }))

    const store = useTaskStore()

    expect(store.maxConcurrent).toBe(3)
  })

  it('should respect disabled task sound setting on finish', async () => {
    localStorage.setItem('appSettings', JSON.stringify({ playSound: false }))
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
    localStorage.setItem('appSettings', JSON.stringify({ failedOutputDeleteMode: 'never' }))
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
    localStorage.setItem('appSettings', JSON.stringify({ autoOpenOutputFolder: true }))
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
