import { describe, it, expect } from 'vitest'
import { TaskStatus, type Task } from '@/types/task'
import {
  TASK_QUEUE_SCHEMA_VERSION,
  MAX_PERSISTED_TASKS,
  toPersistedQueue,
  serializeTaskQueue,
  restoreTasks,
} from '@/config/taskQueueSchema'

const INTERRUPTED = '任务因应用退出而中断'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_1',
    inputFile: 'a.mp4',
    outputFile: 'a_out.mp4',
    commandLine: 'ffmpeg -i a.mp4 a_out.mp4',
    presetId: 'preset_1',
    status: TaskStatus.Pending,
    progress: {
      frame: 120,
      fps: 30,
      time: '00:00:04.00',
      bitrate: '1200kbits/s',
      speed: '1.2x',
      size: '1024KiB',
      quality: 0,
      percentage: 42,
      estimatedSize: 999,
      remainingTime: 12,
    },
    logs: { all: ['frame= 120'], errors: ['some ffmpeg error'] },
    createdAt: new Date('2026-11-07T01:02:03.000Z'),
    elapsedTime: 12.5,
    pid: 4321,
    stoppedByUser: true,
    cpuAffinity: '0-3',
    preserveFileTimes: { creation: true, modification: false, access: false },
    ...overrides,
  }
}

describe('R2.5 队列快照契约', () => {
  it('版本号与容量上限是明确的常量', () => {
    // v2（第十一轮）：增量字段 priority；旧快照缺字段按 normal 处理，非破坏性。
    expect(TASK_QUEUE_SCHEMA_VERSION).toBe(2)
    expect(MAX_PERSISTED_TASKS).toBeGreaterThanOrEqual(100)
    expect(MAX_PERSISTED_TASKS).toBeLessThanOrEqual(2000)
  })

  it('toPersistedQueue 只保留任务元数据，剔除日志/进度/pid/运行时标记', () => {
    const snapshot = toPersistedQueue([makeTask()])

    expect(snapshot.schemaVersion).toBe(TASK_QUEUE_SCHEMA_VERSION)
    expect(snapshot.tasks).toHaveLength(1)
    const persisted = snapshot.tasks[0]!
    expect(persisted.id).toBe('task_1')
    expect(persisted.inputFile).toBe('a.mp4')
    expect(persisted.outputFile).toBe('a_out.mp4')
    expect(persisted.commandLine).toBe('ffmpeg -i a.mp4 a_out.mp4')
    expect(persisted.presetId).toBe('preset_1')
    expect(persisted.status).toBe(TaskStatus.Pending)
    expect(persisted.createdAt).toBe('2026-11-07T01:02:03.000Z')
    expect(persisted.cpuAffinity).toBe('0-3')
    expect(persisted.preserveFileTimes).toEqual({
      creation: true,
      modification: false,
      access: false,
    })

    const raw = persisted as unknown as Record<string, unknown>
    for (const excluded of ['logs', 'progress', 'pid', 'stoppedByUser', 'elapsedTime']) {
      expect(raw).not.toHaveProperty(excluded)
    }
  })

  it('serializeTaskQueue 输出可被 JSON.parse 的紧凑快照', () => {
    const serialized = serializeTaskQueue([makeTask()])
    const parsed = JSON.parse(serialized) as { schemaVersion: number; tasks: unknown[] }
    expect(parsed.schemaVersion).toBe(2)
    expect(parsed.tasks).toHaveLength(1)
    expect(serialized).not.toContain('logs')
    expect(serialized).not.toContain('frame= 120')
  })

  it('空队列也写出带版本号的合法快照', () => {
    expect(JSON.parse(serializeTaskQueue([]))).toEqual({
      schemaVersion: 2,
      tasks: [],
    })
  })
})

describe('R2.5 恢复语义', () => {
  const snapshotOf = (tasks: Task[]) => serializeTaskQueue(tasks)

  it('空/损坏/非对象输入一律降级为空队列，不抛异常', () => {
    for (const raw of ['', 'null', '[]', '"text"', '{broken', '{}', '{"tasks":"nope"}']) {
      expect(restoreTasks(raw, INTERRUPTED)).toEqual([])
    }
  })

  it('Pending 保持 Pending；终态原样保留；Processing/Paused 标记为中断错误', () => {
    const raw = snapshotOf([
      makeTask({ id: 'a', status: TaskStatus.Pending }),
      makeTask({ id: 'b', status: TaskStatus.Processing }),
      makeTask({ id: 'c', status: TaskStatus.Paused }),
      makeTask({ id: 'd', status: TaskStatus.Completed }),
      makeTask({ id: 'e', status: TaskStatus.Stopped }),
      makeTask({ id: 'f', status: TaskStatus.Error, error: '原错误' }),
    ])

    const restored = restoreTasks(raw, INTERRUPTED)
    expect(restored.map((t) => t.status)).toEqual([
      TaskStatus.Pending,
      TaskStatus.Error,
      TaskStatus.Error,
      TaskStatus.Completed,
      TaskStatus.Stopped,
      TaskStatus.Error,
    ])
    expect(restored[1]!.error).toBe(INTERRUPTED)
    expect(restored[1]!.errorType).toBe('process')
    expect(restored[2]!.error).toBe(INTERRUPTED)
    expect(restored[5]!.error).toBe('原错误')
  })

  it('恢复出的任务重置运行时字段，且不带 pid / 用户停止标记', () => {
    const restored = restoreTasks(
      snapshotOf([makeTask({ status: TaskStatus.Processing })]),
      INTERRUPTED,
    )
    const task = restored[0]!
    expect(task.logs).toEqual({ all: [], errors: [] })
    expect(task.progress.percentage).toBe(0)
    expect(task.progress.frame).toBeNull()
    expect(task.elapsedTime).toBe(0)
    expect(task.pid).toBeUndefined()
    expect(task.stoppedByUser).toBeUndefined()
  })

  it('时间字段恢复为 Date 实例，非法时间回退到当前时间', () => {
    const restored = restoreTasks(snapshotOf([makeTask()]), INTERRUPTED)
    expect(restored[0]!.createdAt).toBeInstanceOf(Date)
    expect(restored[0]!.createdAt.toISOString()).toBe('2026-11-07T01:02:03.000Z')

    const broken = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        {
          id: 'x',
          inputFile: 'i',
          outputFile: 'o',
          commandLine: 'c',
          presetId: '',
          status: 0,
          createdAt: 'not-a-date',
        },
      ],
    })
    const fallback = restoreTasks(broken, INTERRUPTED)
    expect(fallback[0]!.createdAt).toBeInstanceOf(Date)
    expect(Number.isNaN(fallback[0]!.createdAt.getTime())).toBe(false)
  })

  it('缺字段 / 非法状态 / 未知字段 / 重复 id 全部清洗', () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [
        { id: 'dup', inputFile: 'i', outputFile: 'o', commandLine: 'c', presetId: '', status: 0 },
        {
          id: 'dup',
          inputFile: 'i2',
          outputFile: 'o2',
          commandLine: 'c2',
          presetId: '',
          status: 10,
        },
        { inputFile: 'no-id', outputFile: 'o', commandLine: 'c', presetId: '', status: 0 },
        {
          id: 'weird',
          inputFile: 'i',
          outputFile: 'o',
          commandLine: 'c',
          presetId: '',
          status: 777,
          unexpected: true,
          logs: ['leak'],
        },
        null,
        'text',
      ],
    })
    const restored = restoreTasks(raw, INTERRUPTED)
    expect(restored.map((t) => t.id)).toEqual(['dup', 'weird'])
    expect(restored[1]!.status).toBe(TaskStatus.Pending)
    expect(restored[1]!.logs).toEqual({ all: [], errors: [] })
    expect(restored[1] as unknown as Record<string, unknown>).not.toHaveProperty('unexpected')
  })

  it('无版本号的旧快照软升级；未来版本软降级但不丢已知字段', () => {
    const legacy = JSON.stringify({
      tasks: [
        {
          id: 'old',
          inputFile: 'i',
          outputFile: 'o',
          commandLine: 'c',
          presetId: '',
          status: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    expect(restoreTasks(legacy, INTERRUPTED)[0]!.id).toBe('old')

    const future = JSON.stringify({
      schemaVersion: 99,
      tasks: [
        {
          id: 'future',
          inputFile: 'i',
          outputFile: 'o',
          commandLine: 'c',
          presetId: '',
          status: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    expect(restoreTasks(future, INTERRUPTED)[0]!.id).toBe('future')
  })

  it('超过上限的快照只保留前 MAX_PERSISTED_TASKS 条，防止磁盘膨胀', () => {
    const tasks = Array.from({ length: MAX_PERSISTED_TASKS + 25 }, (_, index) =>
      makeTask({ id: `task_${index}` }),
    )
    expect(restoreTasks(snapshotOf(tasks), INTERRUPTED)).toHaveLength(MAX_PERSISTED_TASKS)
  })

  it('恢复结果是全新对象，不与原快照共享引用', () => {
    const first = restoreTasks(snapshotOf([makeTask()]), INTERRUPTED)
    const second = restoreTasks(snapshotOf([makeTask()]), INTERRUPTED)
    first[0]!.logs.all.push('mutated')
    expect(second[0]!.logs.all).toEqual([])
  })

  it('P1-2：priority 合法值随快照持久化并还原', () => {
    const tasks = [
      makeTask({ id: 'task_high', priority: 'high' }),
      makeTask({ id: 'task_low', priority: 'low' }),
    ]
    const restored = restoreTasks(snapshotOf(tasks), INTERRUPTED)
    expect(restored[0]!.priority).toBe('high')
    expect(restored[1]!.priority).toBe('low')
    const json = JSON.parse(serializeTaskQueue(tasks))
    expect(json.schemaVersion).toBe(2)
    expect(json.tasks[0].priority).toBe('high')
  })

  it('P1-2：缺 priority 的旧快照还原后无该字段，脏值被丢弃', () => {
    const restored = restoreTasks(snapshotOf([makeTask()]), INTERRUPTED)
    expect(restored[0]!.priority).toBeUndefined()

    const raw = JSON.stringify({
      schemaVersion: 1,
      tasks: [{ ...JSON.parse(serializeTaskQueue([makeTask()])).tasks[0], priority: 'urgent' }],
    })
    expect(restoreTasks(raw, INTERRUPTED)[0]!.priority).toBeUndefined()
  })
})
