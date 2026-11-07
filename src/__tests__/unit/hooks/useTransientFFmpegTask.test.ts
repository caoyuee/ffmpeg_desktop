import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTransientFFmpegTask } from '@/hooks/useTransientFFmpegTask'
import { FFMPEG_EVENTS } from '@/utils/ffmpegEvents'

const harness = vi.hoisted(() => ({
  handlers: new Map<string, Array<(event: { payload: unknown }) => void>>(),
  unlisteners: [] as Array<ReturnType<typeof vi.fn>>,
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ invoke: harness.invoke }))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, handler: (event: { payload: unknown }) => void) => {
    const list = harness.handlers.get(eventName) ?? []
    list.push(handler)
    harness.handlers.set(eventName, list)
    // 真实 Tauri 中 unlisten 后不再收到事件；mock 同步移除，避免测试出现假阳性。
    const unlisten = vi.fn(() => {
      const index = list.indexOf(handler)
      if (index >= 0) list.splice(index, 1)
    })
    harness.unlisteners.push(unlisten)
    return Promise.resolve(unlisten)
  }),
}))

function emit(eventName: string, payload: unknown) {
  for (const handler of harness.handlers.get(eventName) ?? []) {
    handler({ payload })
  }
}

function allReleased() {
  return (
    harness.unlisteners.length > 0 && harness.unlisteners.every((fn) => fn.mock.calls.length === 1)
  )
}

describe('useTransientFFmpegTask（R2.1 一次性任务执行器）', () => {
  beforeEach(() => {
    harness.handlers.clear()
    harness.unlisteners.length = 0
    harness.invoke.mockReset()
    harness.invoke.mockImplementation((command: string) =>
      Promise.resolve(command === 'start_ffmpeg' ? 4242 : undefined),
    )
  })

  it('经由 start_ffmpeg 启动，注册四个 ffmpeg-* 事件并携带 taskId', async () => {
    const task = useTransientFFmpegTask()
    const id = await task.start('ffmpeg -i a.mp4 -f null -', {})

    expect(id).toMatch(/^transient_/)
    expect(harness.invoke).toHaveBeenCalledWith('start_ffmpeg', {
      command: 'ffmpeg -i a.mp4 -f null -',
      taskId: id,
      cpuAffinity: null,
    })
    expect(task.isRunning.value).toBe(true)
    expect(Array.from(harness.handlers.keys()).sort()).toEqual(Object.values(FFMPEG_EVENTS).sort())
  })

  it('只消费属于本次 taskId 的日志与进度', async () => {
    const task = useTransientFFmpegTask()
    const onLog = vi.fn()
    const onProgress = vi.fn()
    const id = await task.start('ffmpeg ...', { onLog, onProgress })

    emit(FFMPEG_EVENTS.log, { taskId: 'other-task', level: 'info', message: 'noise' })
    emit(FFMPEG_EVENTS.progress, { taskId: 'other-task', progress: { frame: 1 } })
    expect(onLog).not.toHaveBeenCalled()
    expect(onProgress).not.toHaveBeenCalled()

    emit(FFMPEG_EVENTS.log, { taskId: id, level: 'info', message: 'VMAF score: 95.1' })
    emit(FFMPEG_EVENTS.progress, { taskId: id, progress: { frame: 42 } })
    expect(onLog).toHaveBeenCalledWith('VMAF score: 95.1', 'info')
    expect(onProgress).toHaveBeenCalledWith({ frame: 42 })
  })

  it('完成时回调 onFinish 并释放全部监听器', async () => {
    const task = useTransientFFmpegTask()
    const onFinish = vi.fn()
    const onError = vi.fn()
    const id = await task.start('ffmpeg ...', { onFinish, onError })

    emit(FFMPEG_EVENTS.finish, { taskId: id, exitCode: 0 })

    expect(onFinish).toHaveBeenCalledWith(0)
    expect(onError).not.toHaveBeenCalled()
    expect(task.isRunning.value).toBe(false)
    expect(allReleased()).toBe(true)
    expect(Array.from(harness.handlers.values()).every((list) => list.length === 0)).toBe(true)
  })

  it('失败时回调 onError 并释放全部监听器', async () => {
    const task = useTransientFFmpegTask()
    const onError = vi.fn()
    const id = await task.start('ffmpeg ...', { onError })

    emit(FFMPEG_EVENTS.error, { taskId: id, exitCode: 1, message: 'ffmpeg failed' })

    expect(onError).toHaveBeenCalledWith('ffmpeg failed')
    expect(task.isRunning.value).toBe(false)
    expect(allReleased()).toBe(true)
  })

  it('启动失败时回滚状态并释放监听器', async () => {
    harness.invoke.mockRejectedValue(new Error('ffmpeg not found'))
    const task = useTransientFFmpegTask()

    await expect(task.start('ffmpeg ...', {})).rejects.toThrow('ffmpeg not found')
    expect(task.isRunning.value).toBe(false)
    expect(allReleased()).toBe(true)
  })

  it('停止走 stop_process，且主动停止后迟到的 ffmpeg-error 不再回调', async () => {
    const task = useTransientFFmpegTask()
    const onError = vi.fn()
    const id = await task.start('ffmpeg ...', { onError })

    await task.stop()

    expect(harness.invoke).toHaveBeenCalledWith('stop_process', { pid: 4242 })
    expect(task.isRunning.value).toBe(false)
    expect(allReleased()).toBe(true)

    emit(FFMPEG_EVENTS.error, { taskId: id, exitCode: -15, message: 'killed' })
    expect(onError).not.toHaveBeenCalled()
  })

  it('dispose 与并发保护', async () => {
    const task = useTransientFFmpegTask()
    await task.start('ffmpeg ...', {})

    await expect(task.start('ffmpeg ...', {})).rejects.toThrow('already running')
    expect(harness.invoke).toHaveBeenCalledTimes(1)

    task.dispose()
    expect(task.isRunning.value).toBe(false)
    expect(allReleased()).toBe(true)
  })
})
