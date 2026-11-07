import { describe, it, expect } from 'vitest'
import { TaskStatus, type Task } from '@/types/task'
import {
  HISTORY_FORMAT,
  HISTORY_SCHEMA_VERSION,
  MAX_HISTORY_ROWS,
  buildTaskHistory,
  summarizeHistory,
  filterHistory,
  sortHistory,
  rankByCompression,
  exportHistory,
  filterHistoryByRetention,
  isHistoryTask,
  type TaskHistoryEntry,
} from '@/config/taskHistory'

/** 造一条完整任务；时间固定，便于断言 ISO 与耗时。 */
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't-default',
    inputFile: '/media/in.mp4',
    outputFile: '/media/out.mp4',
    commandLine: 'ffmpeg -i /media/in.mp4 /media/out.mp4',
    presetId: 'p1',
    status: TaskStatus.Completed,
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
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    startedAt: new Date('2026-11-01T10:00:05.000Z'),
    completedAt: new Date('2026-11-01T10:01:05.000Z'),
    elapsedTime: 0,
    ...overrides,
  }
}

function entry(overrides: Partial<TaskHistoryEntry> = {}): TaskHistoryEntry {
  return {
    id: 'e-default',
    inputFile: 'a.mp4',
    outputFile: 'a_out.mp4',
    presetId: 'p1',
    outcome: 'completed',
    createdAt: '2026-11-01T10:00:00.000Z',
    startedAt: '2026-11-01T10:00:05.000Z',
    completedAt: '2026-11-01T10:01:05.000Z',
    durationMs: 60_000,
    ...overrides,
  }
}

describe('R3.2 buildTaskHistory —— 队列快照的唯一历史投影', () => {
  it('只保留终态任务，Pending/Processing/Paused 不算历史', () => {
    const tasks = [
      makeTask({ id: 'a', status: TaskStatus.Completed }),
      makeTask({ id: 'b', status: TaskStatus.Error }),
      makeTask({ id: 'c', status: TaskStatus.Stopped }),
      makeTask({ id: 'd', status: TaskStatus.Pending }),
      makeTask({ id: 'e', status: TaskStatus.Processing }),
      makeTask({ id: 'f', status: TaskStatus.Paused }),
    ]
    expect(buildTaskHistory(tasks).map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('isHistoryTask 与终态集合一致', () => {
    expect(isHistoryTask(makeTask({ status: TaskStatus.Completed }))).toBe(true)
    expect(isHistoryTask(makeTask({ status: TaskStatus.Error }))).toBe(true)
    expect(isHistoryTask(makeTask({ status: TaskStatus.Stopped }))).toBe(true)
    expect(isHistoryTask(makeTask({ status: TaskStatus.Pending }))).toBe(false)
    expect(isHistoryTask(makeTask({ status: TaskStatus.Processing }))).toBe(false)
    expect(isHistoryTask(makeTask({ status: TaskStatus.Paused }))).toBe(false)
    expect(isHistoryTask(makeTask({ status: 123 as TaskStatus }))).toBe(false)
  })

  it('把 TaskStatus 映射成稳定的 outcome 字符串', () => {
    const result = buildTaskHistory([
      makeTask({ id: 'a', status: TaskStatus.Completed }),
      makeTask({ id: 'b', status: TaskStatus.Error }),
      makeTask({ id: 'c', status: TaskStatus.Stopped }),
    ])
    expect(result.map((e) => e.outcome)).toEqual(['completed', 'failed', 'stopped'])
  })

  it('durationMs 由 startedAt → completedAt 计算，时间统一为 ISO 字符串', () => {
    const [row] = buildTaskHistory([makeTask()])
    expect(row!.durationMs).toBe(60_000)
    expect(row!.createdAt).toBe('2026-11-01T10:00:00.000Z')
    expect(row!.startedAt).toBe('2026-11-01T10:00:05.000Z')
    expect(row!.completedAt).toBe('2026-11-01T10:01:05.000Z')
  })

  it('缺失 / 非法时间不会伪造耗时，也不产生 Invalid Date 字符串', () => {
    const rows = buildTaskHistory([
      makeTask({ id: 'a', startedAt: undefined }),
      makeTask({ id: 'b', completedAt: undefined }),
      makeTask({
        id: 'c',
        startedAt: new Date('not-a-date'),
        completedAt: new Date('also-bad'),
        createdAt: new Date('bad'),
      }),
    ])
    expect(rows.every((row) => row.durationMs === null)).toBe(true)
    expect(rows.find((r) => r.id === 'a')!.startedAt).toBeNull()
    expect(rows.find((r) => r.id === 'c')!.createdAt).toBeNull()
    expect(JSON.stringify(rows)).not.toContain('Invalid')
  })

  it('完成时间早于开始时间（脏快照）时耗时为 null', () => {
    const [row] = buildTaskHistory([
      makeTask({
        startedAt: new Date('2026-11-01T11:00:00.000Z'),
        completedAt: new Date('2026-11-01T10:00:00.000Z'),
      }),
    ])
    expect(row!.durationMs).toBeNull()
  })

  it('非数组、null、脏元素安全降级为空列表', () => {
    expect(buildTaskHistory(null as unknown as Task[])).toEqual([])
    expect(buildTaskHistory(undefined as unknown as Task[])).toEqual([])
    expect(buildTaskHistory([null, 42, 'x', {}] as unknown as Task[])).toEqual([])
  })

  it('重复 id 去重，只保留第一条', () => {
    const rows = buildTaskHistory([
      makeTask({ id: 'dup', inputFile: 'first.mp4' }),
      makeTask({ id: 'dup', inputFile: 'second.mp4' }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.inputFile).toBe('first.mp4')
  })

  it('默认按完成时间降序；缺时间的排后，且不修改入参数组', () => {
    const tasks = [
      makeTask({ id: 'old', completedAt: new Date('2026-10-01T00:00:00.000Z') }),
      makeTask({ id: 'no-time', completedAt: undefined }),
      makeTask({ id: 'new', completedAt: new Date('2026-11-05T00:00:00.000Z') }),
    ]
    expect(buildTaskHistory(tasks).map((e) => e.id)).toEqual(['new', 'old', 'no-time'])
    expect(tasks.map((t) => t.id)).toEqual(['old', 'no-time', 'new'])
  })

  it('错误类型与错误信息随失败任务进入历史', () => {
    const [row] = buildTaskHistory([
      makeTask({ status: TaskStatus.Error, error: 'ffmpeg exited 1', errorType: 'process' }),
    ])
    expect(row!.error).toBe('ffmpeg exited 1')
    expect(row!.errorType).toBe('process')
  })

  it(`超过 ${MAX_HISTORY_ROWS} 条时截断，防止导出撑爆内存`, () => {
    const tasks = Array.from({ length: MAX_HISTORY_ROWS + 5 }, (_, i) => makeTask({ id: `t${i}` }))
    expect(buildTaskHistory(tasks)).toHaveLength(MAX_HISTORY_ROWS)
  })
})

describe('R3.2 summarizeHistory —— 统计口径唯一', () => {
  const mixed = [
    entry({
      id: 'a',
      outcome: 'completed',
      durationMs: 60_000,
      completedAt: '2026-11-01T10:01:05.000Z',
    }),
    entry({
      id: 'b',
      outcome: 'failed',
      durationMs: 30_000,
      errorType: 'process',
      completedAt: '2026-11-01T12:00:00.000Z',
    }),
    entry({
      id: 'c',
      outcome: 'stopped',
      durationMs: null,
      completedAt: '2026-11-02T09:00:00.000Z',
    }),
  ]

  it('空历史返回全零汇总，成功率不是 NaN', () => {
    const summary = summarizeHistory([])
    expect(summary.total).toBe(0)
    expect(summary.successRate).toBe(0)
    expect(summary.totalDurationMs).toBe(0)
    expect(summary.averageDurationMs).toBe(0)
    expect(summary.longestDurationMs).toBe(0)
    expect(summary.dailyBreakdown).toEqual([])
  })

  it('混合结果：总数、各状态计数与成功率（保留 1 位小数）', () => {
    const summary = summarizeHistory(mixed)
    expect(summary.total).toBe(3)
    expect(summary.completed).toBe(1)
    expect(summary.failed).toBe(1)
    expect(summary.stopped).toBe(1)
    expect(summary.successRate).toBe(33.3)
  })

  it('全部成功时成功率为 100', () => {
    expect(summarizeHistory([entry(), entry({ id: 'x' })]).successRate).toBe(100)
  })

  it('耗时只统计有效样本：总数 / 均值 / 最长 / 样本数', () => {
    const summary = summarizeHistory(mixed)
    expect(summary.durationSampleCount).toBe(2)
    expect(summary.totalDurationMs).toBe(90_000)
    expect(summary.averageDurationMs).toBe(45_000)
    expect(summary.longestDurationMs).toBe(60_000)
  })

  it('错误类型分布把缺失 errorType 归入 unknown', () => {
    const summary = summarizeHistory([
      entry({ id: 'a', outcome: 'failed', errorType: 'process' }),
      entry({ id: 'b', outcome: 'failed', errorType: 'network' }),
      entry({ id: 'c', outcome: 'failed' }),
    ])
    expect(summary.errorTypeBreakdown).toEqual({ process: 1, network: 1, unknown: 1 })
  })

  it('按天分桶、日期升序，且分列统计三种结果', () => {
    const summary = summarizeHistory([
      entry({ id: 'a', outcome: 'completed', completedAt: '2026-11-02T01:00:00.000Z' }),
      entry({ id: 'b', outcome: 'failed', completedAt: '2026-11-01T01:00:00.000Z' }),
      entry({ id: 'c', outcome: 'stopped', completedAt: '2026-11-02T02:00:00.000Z' }),
      entry({ id: 'd', outcome: 'completed', completedAt: '2026-11-02T03:00:00.000Z' }),
    ])
    expect(summary.dailyBreakdown).toEqual([
      { date: '2026-11-01', completed: 0, failed: 1, stopped: 0 },
      { date: '2026-11-02', completed: 2, failed: 0, stopped: 1 },
    ])
  })

  it('时间完全缺失的条目不产生 "undefined" 日期桶', () => {
    const summary = summarizeHistory([entry({ completedAt: null, createdAt: null })])
    expect(summary.dailyBreakdown).toEqual([])
  })

  it('脏输入安全降级', () => {
    expect(summarizeHistory(null as unknown as TaskHistoryEntry[]).total).toBe(0)
    expect(summarizeHistory([null, 1, 'x'] as unknown as TaskHistoryEntry[]).total).toBe(0)
  })
})

describe('R3.2 filterHistory / sortHistory', () => {
  const rows = [
    entry({ id: 'a', outcome: 'completed', inputFile: 'Holiday.mp4', durationMs: 60_000 }),
    entry({
      id: 'b',
      outcome: 'failed',
      inputFile: 'clip,raw.mkv',
      error: 'disk full',
      durationMs: 10_000,
    }),
    entry({ id: 'c', outcome: 'stopped', inputFile: 'demo.mp4', durationMs: null }),
  ]

  it('按 outcome 筛选，all 返回全部', () => {
    expect(filterHistory(rows, { outcome: 'failed' }).map((e) => e.id)).toEqual(['b'])
    expect(filterHistory(rows, { outcome: 'all' })).toHaveLength(3)
    expect(filterHistory(rows, {})).toHaveLength(3)
  })

  it('关键字大小写不敏感，覆盖输入/输出/预设/错误', () => {
    expect(filterHistory(rows, { query: 'HOLIDAY' }).map((e) => e.id)).toEqual(['a'])
    expect(filterHistory(rows, { query: 'clip,raw' }).map((e) => e.id)).toEqual(['b'])
    expect(filterHistory(rows, { query: 'p1' })).toHaveLength(3)
    expect(filterHistory(rows, { query: 'disk FULL' }).map((e) => e.id)).toEqual(['b'])
  })

  it('关键字首尾空格被忽略，非法 outcome 不过滤出脏结果', () => {
    expect(filterHistory(rows, { query: '   demo  ' }).map((e) => e.id)).toEqual(['c'])
    expect(filterHistory(rows, { outcome: 'nope' as 'all' })).toEqual([])
  })

  it('durationMs 降序把 null 排最后，inputFile 升序按字典序', () => {
    expect(sortHistory(rows, 'durationMs').map((e) => e.id)).toEqual(['a', 'b', 'c'])
    expect(sortHistory(rows, 'inputFile', 'asc').map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('completedAt 升序且排序不修改入参数组', () => {
    const dated = [
      entry({ id: 'a', completedAt: '2026-11-03T00:00:00.000Z' }),
      entry({ id: 'b', completedAt: '2026-11-01T00:00:00.000Z' }),
    ]
    expect(sortHistory(dated, 'completedAt', 'asc').map((e) => e.id)).toEqual(['b', 'a'])
    expect(dated.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

describe('R3.2 rankByCompression —— 体积是按需查询的运行时事实', () => {
  it('计算 output/input 比率与节省百分比，压缩最多的排最前', () => {
    const rows = [
      entry({ id: 'a', inputFile: 'a.mp4', outputFile: 'a_out.mp4' }),
      entry({ id: 'b', inputFile: 'b.mp4', outputFile: 'b_out.mp4' }),
    ]
    const sizes = {
      'a.mp4': 1000,
      'a_out.mp4': 250,
      'b.mp4': 1000,
      'b_out.mp4': 800,
    }
    const ranked = rankByCompression(rows, sizes)
    expect(ranked.map((r) => r.id)).toEqual(['a', 'b'])
    expect(ranked[0]!.ratio).toBe(0.25)
    expect(ranked[0]!.savedPercent).toBe(75)
    expect(ranked[1]!.ratio).toBe(0.8)
    expect(ranked[1]!.savedPercent).toBe(20)
  })

  it('非成功任务、缺体积、0/负/NaN 体积都返回 null 并排在末尾', () => {
    const rows = [
      entry({ id: 'a', outcome: 'failed' }),
      entry({ id: 'b', inputFile: 'b.mp4', outputFile: 'b_out.mp4' }),
      entry({ id: 'c', inputFile: 'c.mp4', outputFile: 'c_out.mp4' }),
    ]
    const ranked = rankByCompression(rows, {
      'a.mp4': 100,
      a_out: 50,
      'b.mp4': 0,
      'b_out.mp4': Number.NaN,
      'c.mp4': -1,
      'c_out.mp4': 100,
    })
    expect(ranked.every((r) => r.ratio === null && r.savedPercent === null)).toBe(true)
    expect(ranked.find((r) => r.id === 'b')!.inputBytes).toBeNull()
  })

  it('体积表本身脏数据（null / 字符串）不抛错', () => {
    const ranked = rankByCompression([entry()], {
      'a.mp4': null,
      'a_out.mp4': '999' as unknown as number,
    })
    expect(ranked[0]!.ratio).toBeNull()
  })
})

describe('R3.2 exportHistory —— 带版本信封的可复制导出', () => {
  it('JSON 导出带格式标识、schema 版本、导出时间与条目', () => {
    const parsed = JSON.parse(exportHistory([entry()], 'json'))
    expect(parsed.format).toBe(HISTORY_FORMAT)
    expect(parsed.schemaVersion).toBe(HISTORY_SCHEMA_VERSION)
    expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].id).toBe('e-default')
  })

  it('CSV 首行是固定表头，含逗号/引号/换行的字段被正确转义', () => {
    const csv = exportHistory(
      [entry({ inputFile: 'a,b.mp4', error: 'say "hi"\nnext line' })],
      'csv',
    )
    const lines = csv.split('\r\n')
    expect(lines[0]).toContain('inputFile')
    expect(csv).toContain('"a,b.mp4"')
    expect(csv).toContain('"say ""hi""\nnext line"')
  })

  it('CSV 注入防护：公式前缀被中性化', () => {
    const csv = exportHistory(
      [entry({ inputFile: '=SUM(1)', outputFile: '@cmd', presetId: '+1' })],
      'csv',
    )
    expect(csv).toContain("'=SUM(1)")
    expect(csv).toContain("'@cmd")
    expect(csv).toContain("'+1")
  })

  it('空历史导出仍合法（CSV 只有表头，JSON 空数组）', () => {
    expect(exportHistory([], 'csv').split('\r\n')).toHaveLength(1)
    expect(JSON.parse(exportHistory([], 'json')).entries).toEqual([])
  })

  it('导出不包含日志、命令行、进度等运行时字段', () => {
    const text = exportHistory([entry()], 'json')
    expect(text).not.toContain('commandLine')
    expect(text).not.toContain('logs')
    expect(text).not.toContain('progress')
  })
})

describe('filterHistoryByRetention（P1-2：logRetentionDays 消费层）', () => {
  const NOW = Date.parse('2026-11-07T12:00:00.000Z')

  it('0 或非法天数表示永久保留，原样返回', () => {
    const entries = [entry(), entry({ id: 'e-old', completedAt: '2020-01-01T00:00:00.000Z' })]
    expect(filterHistoryByRetention(entries, 0, NOW)).toHaveLength(2)
    expect(filterHistoryByRetention(entries, -5, NOW)).toHaveLength(2)
    expect(filterHistoryByRetention(entries, Number.NaN, NOW)).toHaveLength(2)
  })

  it('按 completedAt 过滤超期条目', () => {
    const entries = [
      entry({ id: 'e-fresh', completedAt: '2026-11-07T08:00:00.000Z' }),
      entry({ id: 'e-edge', completedAt: '2026-11-01T12:00:00.000Z' }),
      entry({ id: 'e-old', completedAt: '2026-10-30T23:59:59.000Z' }),
    ]
    // cutoff = NOW - 7天 = 2026-10-31T12:00Z；边界值 e-edge 恰好保留，e-old 已超期。
    const kept = filterHistoryByRetention(entries, 7, NOW)
    expect(kept.map((row) => row.id)).toEqual(['e-fresh', 'e-edge'])
  })

  it('completedAt 缺失时回退 createdAt', () => {
    const entries = [
      entry({ id: 'e-a', completedAt: null, createdAt: '2026-11-07T08:00:00.000Z' }),
      entry({ id: 'e-b', completedAt: null, createdAt: '2020-01-01T00:00:00.000Z' }),
    ]
    expect(filterHistoryByRetention(entries, 7, NOW).map((row) => row.id)).toEqual(['e-a'])
  })

  it('无任何时间戳的脏条目保留，不因数据缺失丢历史', () => {
    const entries = [entry({ id: 'e-dirty', completedAt: null, createdAt: null })]
    expect(filterHistoryByRetention(entries, 7, NOW)).toHaveLength(1)
  })

  it('保留条数按天取整：不满一天按一天算', () => {
    const entries = [
      entry({ id: 'e-a', completedAt: '2026-11-07T00:00:00.000Z' }),
      entry({ id: 'e-b', completedAt: '2026-11-06T00:00:00.000Z' }),
    ]
    // retentionDays=1.5 取整为 1 天，只留近 24 小时内的 e-a。
    const kept = filterHistoryByRetention(entries, 1.5, NOW)
    expect(kept.map((row) => row.id)).toEqual(['e-a'])
  })
})
