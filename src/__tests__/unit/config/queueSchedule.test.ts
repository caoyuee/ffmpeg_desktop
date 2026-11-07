import { describe, expect, it } from 'vitest'
import { pickNextPendingTask } from '@/config/queueSchedule'
import { TaskStatus, type Task } from '@/types/task'

function makeTask(id: string, status: TaskStatus, priority?: Task['priority']): Task {
  return {
    id,
    inputFile: `/in/${id}.mkv`,
    outputFile: `/out/${id}.mkv`,
    commandLine: 'ffmpeg',
    presetId: 'p',
    status,
    progress: {
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
    },
    logs: { all: [], errors: [] },
    createdAt: new Date(0),
    elapsedTime: 0,
    priority,
  }
}

describe('pickNextPendingTask（P1-2：taskPriority 接入调度）', () => {
  it('优先级高的任务先启动：high > normal > low', () => {
    const tasks = [
      makeTask('a', TaskStatus.Pending, 'low'),
      makeTask('b', TaskStatus.Pending, 'high'),
      makeTask('c', TaskStatus.Pending, 'normal'),
    ]
    expect(pickNextPendingTask(tasks)?.id).toBe('b')
  })

  it('同级优先级保持插入顺序（稳定）', () => {
    const tasks = [
      makeTask('a', TaskStatus.Pending, 'normal'),
      makeTask('b', TaskStatus.Pending, 'normal'),
    ]
    expect(pickNextPendingTask(tasks)?.id).toBe('a')
  })

  it('未设置 priority 的任务视为 normal', () => {
    const tasks = [makeTask('a', TaskStatus.Pending, 'low'), makeTask('b', TaskStatus.Pending)]
    expect(pickNextPendingTask(tasks)?.id).toBe('b')
  })

  it('非法 priority 值同样视为 normal，不抛错', () => {
    const tasks = [
      makeTask('a', TaskStatus.Pending, 'low'),
      makeTask('b', TaskStatus.Pending, 'urgent' as Task['priority']),
    ]
    expect(pickNextPendingTask(tasks)?.id).toBe('b')
  })

  it('只挑 Pending，忽略运行中与终态任务', () => {
    const tasks = [
      makeTask('run', TaskStatus.Processing, 'high'),
      makeTask('done', TaskStatus.Completed, 'high'),
      makeTask('wait', TaskStatus.Pending, 'low'),
    ]
    expect(pickNextPendingTask(tasks)?.id).toBe('wait')
  })

  it('空队列 / 无 Pending 返回 undefined', () => {
    expect(pickNextPendingTask([])).toBeUndefined()
    expect(pickNextPendingTask([makeTask('done', TaskStatus.Completed)])).toBeUndefined()
  })
})
