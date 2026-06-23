import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '@/store/taskStore'
import { TaskStatus } from '@/types/task'

const eventHandlers = vi.hoisted(() => new Map<string, (event: { payload: unknown }) => void>())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, handler: (event: { payload: unknown }) => void) => {
    eventHandlers.set(eventName, handler)
    return Promise.resolve(vi.fn())
  }),
}))

describe('taskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    eventHandlers.clear()
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
})
