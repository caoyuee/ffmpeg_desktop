import { describe, it, expect } from 'vitest'
import { createDefaultPreset } from '@/config/presetSchema'
import { TaskStatus, type Task, type TaskProgress } from '@/types/task'
import { escapeCsvCell, toCsv } from '@/config/csv'
import { createTaskDraft, createTaskDrafts } from '@/config/taskDraft'
import {
  WATCH_SCHEMA_VERSION,
  WATCH_MEDIA_EXTENSIONS,
  MAX_WATCH_RULES,
  MAX_WATCH_SEEN,
  normalizeWatchRule,
  normalizeWatchRules,
  isWatchableFile,
  planWatchBatch,
  type WatchRule,
} from '@/config/watchFolder'
import { parseCliArgs, buildCliHelp } from '@/config/cliArgs'
import { buildABPlan, diffPresets, compareABResults } from '@/config/abCompare'
import {
  MAX_RETRY_ATTEMPTS,
  canRetry,
  retryBackoffMs,
  retryOutputPath,
  replaceCommandOutput,
  planRetry,
  nextRetryAttempt,
} from '@/config/taskRetry'
import {
  MEDIA_REPORT_FORMAT,
  MEDIA_REPORT_SCHEMA_VERSION,
  normalizeMediaInfo,
  exportMediaReport,
} from '@/config/mediaReport'
import { MONITOR_THROTTLE_MS, buildMonitorCells } from '@/config/taskMonitor'
import { emptyTaskProgress } from '@/config/taskQueueSchema'

const preset = createDefaultPreset()

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_1',
    inputFile: '/media/in.mp4',
    outputFile: '/media/in_output.mp4',
    commandLine: 'ffmpeg -i "/media/in.mp4" "/media/in_output.mp4"',
    presetId: 'p1',
    status: TaskStatus.Error,
    progress: emptyTaskProgress(),
    logs: { all: [], errors: [] },
    createdAt: new Date('2026-11-07T10:00:00Z'),
    elapsedTime: 0,
    ...overrides,
  }
}

describe('R3.7 唯一 CSV 层', () => {
  it('普通文本不加引号，含逗号/引号/换行时正确转义', () => {
    expect(escapeCsvCell('abc')).toBe('abc')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('a"b')).toBe('"a""b"')
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"')
  })

  it('公式注入前缀被中性化，脏值降级为空串', () => {
    expect(escapeCsvCell('=1+2')).toBe("'=1+2")
    expect(escapeCsvCell('+SUM(A1)')).toBe("'+SUM(A1)")
    expect(escapeCsvCell('@cmd')).toBe("'@cmd")
    expect(escapeCsvCell('-1')).toBe("'-1")
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
    expect(escapeCsvCell(12)).toBe('12')
  })

  it('toCsv 使用 CRLF 且表头与行经同一转义', () => {
    const text = toCsv(
      ['name', 'value'],
      [
        ['a,b', '=evil'],
        ['x', 2],
      ],
    )
    expect(text).toBe('name,value\r\n"a,b",\'=evil\r\nx,2')
  })

  it('toCsv 对非数组脏输入返回仅表头', () => {
    expect(toCsv(['a'], null as unknown as [][])).toBe('a')
  })
})

describe('R3 唯一任务草稿层（收敛五处重复的命令构建）', () => {
  it('createTaskDraft 生成完整字段且输出路径由预设决定', () => {
    const draft = createTaskDraft(preset, '/media/clip.mov')
    expect(draft.inputFile).toBe('/media/clip.mov')
    expect(draft.outputFile).toMatch(/^\/media\/.*\.(mp4|mkv|mov|webm|avi)$/)
    expect(draft.commandLine).toContain('ffmpeg')
    expect(draft.commandLine).toContain('/media/clip.mov')
    expect(draft.presetId).toBe(preset.id)
    expect(draft.preserveFileTimes).toBeDefined()
  })

  it('显式 outputFile 覆盖自动路径且进入命令行', () => {
    const draft = createTaskDraft(preset, '/media/clip.mov', '/out/custom.mkv')
    expect(draft.outputFile).toBe('/out/custom.mkv')
    expect(draft.commandLine).toContain('/out/custom.mkv')
  })

  it('createTaskDrafts 逐个生成且过滤空路径', () => {
    const drafts = createTaskDrafts(preset, ['/a.mp4', '', '/b.mkv'])
    expect(drafts).toHaveLength(2)
    expect(drafts.map((d) => d.inputFile)).toEqual(['/a.mp4', '/b.mkv'])
  })

  it('mutating 预设不会影响已生成草稿（互不共享引用）', () => {
    const draft = createTaskDraft(preset, '/a.mp4')
    preset.video.codec = '__changed__'
    expect(draft.commandLine).not.toContain('__changed__')
    preset.video.codec = 'libx264'
  })
})

describe('R3.3 文件夹监控规则与批量计划', () => {
  const rule: WatchRule = {
    id: 'watch_1',
    directory: '/media/inbox',
    presetId: 'p1',
    intervalSec: 15,
    extensions: ['mp4', 'mkv'],
    enabled: true,
    seenPaths: [],
  }

  it('常量与扩展名白名单', () => {
    expect(WATCH_SCHEMA_VERSION).toBe(1)
    expect(WATCH_MEDIA_EXTENSIONS).toContain('mp4')
    expect(WATCH_MEDIA_EXTENSIONS).toContain('mkv')
    expect(MAX_WATCH_RULES).toBeGreaterThan(0)
    expect(MAX_WATCH_SEEN).toBeGreaterThan(0)
  })

  it('规则逐字段规范化：缺字段补默认、脏值回退、未知字段丢弃', () => {
    const normalized = normalizeWatchRule({
      id: 'watch_1',
      directory: '/media/inbox',
      intervalSec: 99999,
      extensions: ['mp4', 'mp4', '../bad', 'MKV'],
      enabled: 'yes',
      seenPaths: 'not-array',
      extra: 1,
    })
    expect(normalized).not.toBeNull()
    expect(normalized!.id).toBe('watch_1')
    expect(normalized!.presetId).toBe('')
    expect(normalized!.intervalSec).toBeLessThanOrEqual(60)
    expect(normalized!.extensions).toEqual(['mp4', 'mkv'])
    expect(normalized!.enabled).toBe(false)
    expect(normalized!.seenPaths).toEqual([])
    expect(normalized).not.toHaveProperty('extra')
  })

  it('缺目录或非法 id 的规则被丢弃；规则数与已见路径数有上限', () => {
    expect(normalizeWatchRule({ id: 'x' })).toBeNull()
    expect(normalizeWatchRule({ id: '../bad', directory: '/x' })).toBeNull()
    const many = Array.from({ length: MAX_WATCH_RULES + 5 }, (_, i) => ({
      id: `w${i}`,
      directory: `/d${i}`,
    }))
    expect(normalizeWatchRules(many)).toHaveLength(MAX_WATCH_RULES)
    const seen = Array.from({ length: MAX_WATCH_SEEN + 10 }, (_, i) => `/f${i}.mp4`)
    expect(normalizeWatchRule({ ...rule, seenPaths: seen })!.seenPaths).toHaveLength(MAX_WATCH_SEEN)
  })

  it('扩展名过滤大小写不敏感且只接受媒体文件', () => {
    expect(isWatchableFile('/d/a.MP4', ['mp4'])).toBe(true)
    expect(isWatchableFile('/d/a.txt', ['mp4'])).toBe(false)
    expect(isWatchableFile('/d/.hidden', ['mp4'])).toBe(false)
    expect(isWatchableFile('/d/noext', ['mp4'])).toBe(false)
  })

  it('planWatchBatch 只返回未见过的新文件，去重并保持顺序', () => {
    const result = planWatchBatch(
      ['/d/a.mp4'],
      ['/d/a.mp4', '/d/b.mkv', '/d/b.mkv', '/d/c.txt', '/d/d.mp4'],
      ['mp4', 'mkv'],
    )
    expect(result.newPaths).toEqual(['/d/b.mkv', '/d/d.mp4'])
    expect(result.nextSeen).toEqual(['/d/a.mp4', '/d/b.mkv', '/d/d.mp4'])
  })

  it('首次扫描不把目录里所有旧文件一次性入队（seed 语义）', () => {
    const result = planWatchBatch([], ['/d/old.mp4'], ['mp4'])
    expect(result.newPaths).toEqual([])
    expect(result.nextSeen).toEqual(['/d/old.mp4'])
  })

  it('脏扫描结果安全降级', () => {
    expect(planWatchBatch(null as unknown as [], ['/d/a.mp4'], ['mp4']).newPaths).toEqual([])
    expect(planWatchBatch([], 'bad' as unknown as [], ['mp4']).nextSeen).toEqual([])
  })
})

describe('R3.4 命令行参数唯一解析层', () => {
  it('跳过 argv[0]，解析长短参数与位置参数', () => {
    const plan = parseCliArgs([
      'ffmpeg-desktop',
      '-i',
      '/media/a.mp4',
      '--preset',
      '/p/p.ffpreset.json',
      '--output',
      '/out/a.mkv',
      '/media/b.mov',
      '--watch',
    ])
    expect(plan.inputs).toEqual(['/media/a.mp4', '/media/b.mov'])
    expect(plan.presetFile).toBe('/p/p.ffpreset.json')
    expect(plan.outputFile).toBe('/out/a.mkv')
    expect(plan.watch).toBe(true)
    expect(plan.help).toBe(false)
    expect(plan.unknown).toEqual([])
  })

  it('兼容旧版 -3fui_file 与裁剪参数', () => {
    const plan = parseCliArgs([
      'ffmpeg-desktop',
      '-3fui_file',
      '/p/old.json',
      '-3fuiVideoHelperInPointTime',
      '00:00:05',
      '-3fuiVideoHelperOutPointTime',
      '00:01:00',
    ])
    expect(plan.presetFile).toBe('/p/old.json')
    expect(plan.trimStart).toBe('00:00:05')
    expect(plan.trimEnd).toBe('00:01:00')
  })

  it('--help / -h 与 --ab 标志', () => {
    expect(parseCliArgs(['app', '--help']).help).toBe(true)
    expect(parseCliArgs(['app', '-h']).help).toBe(true)
    expect(parseCliArgs(['app', '--ab', 'x.mp4']).ab).toBe(true)
  })

  it('缺少值的选项不产生空串，重复 -i 累积输入', () => {
    const plan = parseCliArgs(['app', '-i', '-p', '/p.json', '-i', '/a.mp4', '-i', '/b.mp4'])
    expect(plan.inputs).toEqual(['/a.mp4', '/b.mp4'])
    expect(plan.presetFile).toBe('/p.json')
  })

  it('未知选项进 unknown，不影响已知解析；脏 argv 安全降级', () => {
    const plan = parseCliArgs(['app', '--nope', '-i', '/a.mp4'])
    expect(plan.unknown).toEqual(['--nope'])
    expect(plan.inputs).toEqual(['/a.mp4'])
    expect(parseCliArgs(null as unknown as []).inputs).toEqual([])
  })

  it('帮助文本中英双语且列出关键选项', () => {
    expect(buildCliHelp('zh-CN')).toContain('--preset')
    expect(buildCliHelp('en-US')).toContain('--preset')
    expect(buildCliHelp('zh-CN')).toContain('--watch')
  })
})

describe('R3.5 A/B 参数对比', () => {
  it('两套预设生成两个不冲突的输出与草稿', () => {
    const a = createDefaultPreset()
    const b = createDefaultPreset()
    b.video.codec = 'libx265'
    const plan = buildABPlan('/media/clip.mov', a, b)
    expect(plan.a.outputFile).not.toBe(plan.b.outputFile)
    expect(plan.a.outputFile).toMatch(/__A/)
    expect(plan.b.outputFile).toMatch(/__B/)
    expect(plan.a.inputFile).toBe('/media/clip.mov')
    expect(plan.a.commandLine).not.toBe(plan.b.commandLine)
  })

  it('diffPresets 忽略身份字段，只报真实参数差异', () => {
    const a = createDefaultPreset()
    const b = createDefaultPreset()
    b.id = 'another'
    b.video.codec = 'libx265'
    const diffs = diffPresets(a, b)
    expect(diffs.some((d) => d.path === 'id')).toBe(false)
    expect(diffs).toContainEqual(
      expect.objectContaining({ path: 'video.codec', left: a.video.codec, right: 'libx265' }),
    )
  })

  it('diffPresets 对一致预设返回空数组、脏输入不抛错', () => {
    const a = createDefaultPreset()
    expect(diffPresets(a, createDefaultPreset())).toEqual([])
    expect(diffPresets(null, undefined)).toEqual([])
  })

  it('compareABResults 给出更小体积与更短耗时，缺数据时不误判', () => {
    const result = compareABResults(
      { sizeBytes: 1000, durationMs: 5000 },
      { sizeBytes: 800, durationMs: 7000 },
    )
    expect(result.smaller).toBe('b')
    expect(result.faster).toBe('a')
    expect(
      compareABResults({ sizeBytes: null, durationMs: null }, { sizeBytes: 1, durationMs: 1 })
        .smaller,
    ).toBeNull()
    expect(
      compareABResults({ sizeBytes: 10, durationMs: 10 }, { sizeBytes: 10, durationMs: 10 })
        .smaller,
    ).toBe('tie')
  })
})

describe('R3.6 失败重试与断点续转', () => {
  it('常量与 canRetry：只有 Error / Stopped 且有命令可重试', () => {
    expect(MAX_RETRY_ATTEMPTS).toBe(3)
    expect(canRetry(baseTask())).toBe(true)
    expect(canRetry(baseTask({ status: TaskStatus.Stopped }))).toBe(true)
    expect(canRetry(baseTask({ status: TaskStatus.Completed }))).toBe(false)
    expect(canRetry(baseTask({ status: TaskStatus.Processing }))).toBe(false)
    expect(canRetry(baseTask({ commandLine: '' }))).toBe(false)
  })

  it('退避随次数指数增长且有上限', () => {
    expect(retryBackoffMs(0)).toBe(0)
    expect(retryBackoffMs(1)).toBeGreaterThan(0)
    expect(retryBackoffMs(2)).toBeGreaterThan(retryBackoffMs(1))
    expect(retryBackoffMs(999)).toBeLessThanOrEqual(8000)
  })

  it('重试输出不覆盖原文件，扩展名与目录保留', () => {
    expect(retryOutputPath('/out/a.mp4', 1)).toBe('/out/a__retry1.mp4')
    expect(retryOutputPath('C:\\out\\a.mkv', 2)).toContain('__retry2.mkv')
    expect(retryOutputPath('/out/noext', 1)).toContain('__retry1')
  })

  it('replaceCommandOutput 只替换最后一个 token 且正确引用含空格路径', () => {
    const cmd = 'ffmpeg -i "/media/in.mp4" -c:v libx264 "/media/out.mp4"'
    const next = replaceCommandOutput(cmd, '/media/out__retry1.mp4')
    expect(next).toContain('/media/in.mp4')
    expect(next.trim().endsWith('"/media/out__retry1.mp4"')).toBe(true)
    expect(replaceCommandOutput('', '/x.mp4')).toBe('')
  })

  it('planRetry 生成指向新输出的完整草稿', () => {
    const draft = planRetry(baseTask(), 1)
    expect(draft.outputFile).toContain('__retry1')
    expect(draft.commandLine).toContain('__retry1')
    expect(draft.inputFile).toBe('/media/in.mp4')
  })

  it('nextRetryAttempt 按 retryOf 计数，超过上限返回 -1', () => {
    const tasks = [
      baseTask({ id: 'origin' }),
      baseTask({ id: 'r1', retryOf: 'origin', retryAttempt: 1 }),
      baseTask({ id: 'r2', retryOf: 'origin', retryAttempt: 2 }),
    ]
    expect(nextRetryAttempt(tasks, 'origin')).toBe(3)
    expect(nextRetryAttempt(tasks, 'missing')).toBe(1)
    const capped = [...tasks, baseTask({ id: 'r3', retryOf: 'origin', retryAttempt: 3 })]
    expect(nextRetryAttempt(capped, 'origin')).toBe(-1)
  })
})

describe('R3.7 ffprobe 报告导出', () => {
  const raw = {
    format: {
      filename: '/media/a.mp4',
      format_long_name: 'QuickTime / MOV',
      duration: '12.5',
      size: '2048',
      bit_rate: '1024',
      tags: { title: 'a,b', artist: '=cmd' },
    },
    streams: [
      {
        index: 0,
        codec_type: 'video',
        codec_name: 'h264',
        width: 1920,
        height: 1080,
        r_frame_rate: '30/1',
      },
      { index: 1, codec_type: 'audio', codec_name: 'aac', sample_rate: '48000', channels: 2 },
    ],
  }

  it('常量与规范化：脏值回退、未知字段不带走', () => {
    expect(MEDIA_REPORT_FORMAT).toBe('ffmpeg-desktop/mediainfo')
    expect(MEDIA_REPORT_SCHEMA_VERSION).toBe(1)
    const report = normalizeMediaInfo(raw)
    expect(report.filename).toBe('/media/a.mp4')
    expect(report.duration).toBe(12.5)
    expect(report.size).toBe(2048)
    expect(report.streams).toHaveLength(2)
    expect(report.metadata.title).toBe('a,b')
  })

  it('空 / 脏 ffprobe 输出生成结构完整的空报告', () => {
    const report = normalizeMediaInfo(null, 'fallback.mp4')
    expect(report.filename).toBe('fallback.mp4')
    expect(report.duration).toBe(0)
    expect(report.streams).toEqual([])
  })

  it('JSON 导出带版本信封且 exportedAt 可注入（可测）', () => {
    const report = normalizeMediaInfo(raw)
    const text = exportMediaReport(report, 'json', '2026-11-07T00:00:00.000Z')
    const parsed = JSON.parse(text)
    expect(parsed.format).toBe(MEDIA_REPORT_FORMAT)
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.exportedAt).toBe('2026-11-07T00:00:00.000Z')
    expect(parsed.report.streams).toHaveLength(2)
  })

  it('CSV 导出转义元数据，公式注入被中性化', () => {
    const report = normalizeMediaInfo(raw)
    const text = exportMediaReport(report, 'csv')
    expect(text).toContain('"a,b"')
    expect(text).toContain("'=cmd")
    expect(text.split('\r\n')[0]).toContain('filename')
  })
})

describe('R3.8 任务卡监视墙（等宽数字唯一格式化）', () => {
  it('节流常量为 500ms', () => {
    expect(MONITOR_THROTTLE_MS).toBe(500)
  })

  it('从 TaskProgress 生成等宽字段，缺失值显示占位符', () => {
    const cells = buildMonitorCells({
      ...emptyTaskProgress(),
      fps: 118.4,
      speed: '3.4x',
      size: '812MiB',
      bitrate: '1200kbps',
      remainingTime: 138,
    })
    const byKey = Object.fromEntries(cells.map((c) => [c.key, c.value]))
    expect(byKey.fps).toContain('118')
    expect(byKey.speed).toBe('3.4x')
    expect(byKey.size).toBe('812MiB')
    expect(byKey.eta).toContain('2')
  })

  it('空进度不抛错，全部为占位符', () => {
    const cells = buildMonitorCells(emptyTaskProgress())
    expect(cells.every((c) => typeof c.value === 'string' && c.value.length > 0)).toBe(true)
    expect(buildMonitorCells(null).length).toBe(5)
  })

  it('非法进度安全降级', () => {
    const bad = { fps: Number.NaN } as unknown as TaskProgress
    expect(() => buildMonitorCells(bad)).not.toThrow()
  })
})
