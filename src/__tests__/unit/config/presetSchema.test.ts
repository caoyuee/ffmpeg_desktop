import { describe, it, expect } from 'vitest'
import {
  PRESET_SCHEMA_VERSION,
  PRESET_OVERRIDE_PATHS,
  createDefaultPreset,
  normalizePreset,
} from '@/config/presetSchema'
import { DEFAULT_PRESET } from '@/types/preset'

/**
 * R2.4：预设只在前端建模。config/presetSchema.ts 是规范化 / 迁移 / 校验的唯一入口，
 * 后端 Rust 只透传 JSON blob。这里守住 schema 契约与脏数据边界。
 */
describe('R2.4 预设单一事实源：schema 契约', () => {
  it('schemaVersion 常量为 1，默认预设自带版本', () => {
    expect(PRESET_SCHEMA_VERSION).toBe(1)
    expect(DEFAULT_PRESET.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
  })

  it('createdAt / updatedAt 是字符串，不再谎称 Date', () => {
    expect(typeof DEFAULT_PRESET.createdAt).toBe('string')
    expect(typeof DEFAULT_PRESET.updatedAt).toBe('string')
  })

  it('createDefaultPreset 返回独立深拷贝，不污染 DEFAULT_PRESET', () => {
    const a = createDefaultPreset()
    const b = createDefaultPreset()
    expect(a).toEqual(DEFAULT_PRESET)

    a.video.encoder.preset = 'slow'
    a.video.filters.superResolution.shaders.push('shader.glsl')
    a.streamControl.videoStreams.push('0')
    a.output.naming.suffixText = '_out'

    expect(DEFAULT_PRESET.video.encoder.preset).toBe('')
    expect(DEFAULT_PRESET.video.filters.superResolution.shaders).toEqual([])
    expect(DEFAULT_PRESET.streamControl.videoStreams).toEqual([])
    expect(DEFAULT_PRESET.output.naming.suffixText).toBe('')
    expect(b.video.encoder.preset).toBe('')
    expect(b.video.filters.superResolution.shaders).toEqual([])
  })

  it('特殊字段路径全部真实存在于 DEFAULT_PRESET（防止路径表腐化）', () => {
    expect(PRESET_OVERRIDE_PATHS.length).toBeGreaterThan(0)
    for (const path of PRESET_OVERRIDE_PATHS) {
      const keys = path.split('.')
      let node: unknown = DEFAULT_PRESET
      for (const key of keys) {
        expect(node).toBeTypeOf('object')
        expect(Object.prototype.hasOwnProperty.call(node, key)).toBe(true)
        node = (node as Record<string, unknown>)[key]
      }
      expect(['number', 'string', 'boolean']).toContain(typeof node)
      // 路径表本身不应重复
      expect(new Set(PRESET_OVERRIDE_PATHS).size).toBe(PRESET_OVERRIDE_PATHS.length)
    }
  })
})

describe('R2.4 normalizePreset：脏值 / 缺字段 / 未知字段', () => {
  it('非对象输入一律回退默认预设', () => {
    for (const bad of [null, undefined, 42, 'preset', [1, 2, 3], true]) {
      expect(normalizePreset(bad)).toEqual(DEFAULT_PRESET)
    }
  })

  it('保留所有合法字段值', () => {
    const result = normalizePreset({
      id: 'abc-123',
      name: '我的预设',
      output: { container: '.mkv', naming: { useAutoNaming: false, suffixText: '_x' } },
      video: { encoder: { codec: 'libx265' }, bitrateControl: { qualityValue: '18' } },
      streamControl: { videoStreams: ['0', '2'] },
    })
    expect(result.id).toBe('abc-123')
    expect(result.name).toBe('我的预设')
    expect(result.output.container).toBe('.mkv')
    expect(result.output.naming.useAutoNaming).toBe(false)
    expect(result.output.naming.suffixText).toBe('_x')
    expect(result.video.encoder.codec).toBe('libx265')
    expect(result.video.bitrateControl.qualityValue).toBe('18')
    expect(result.streamControl.videoStreams).toEqual(['0', '2'])
  })

  it('缺字段从默认预设补齐，嵌套对象也补齐', () => {
    const result = normalizePreset({ name: '只有名字', video: { encoder: { codec: 'av1' } } })
    expect(result.video.encoder.codec).toBe('av1')
    expect(result.video.encoder.category).toBe(DEFAULT_PRESET.video.encoder.category)
    expect(result.video.filters.denoise.method).toBe(DEFAULT_PRESET.video.filters.denoise.method)
    expect(result.video.subtitleBurn.formatPriority).toEqual([-1, -1, -1])
    expect(result.audio.loudnorm.targetLoudness).toBe(DEFAULT_PRESET.audio.loudnorm.targetLoudness)
    expect(result.streamControl.attachmentOption).toBe(
      DEFAULT_PRESET.streamControl.attachmentOption,
    )
    expect(result.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
  })

  it('脏值按类型回退默认，不让坏数据进入命令构建', () => {
    const result = normalizePreset({
      id: 99,
      name: null,
      output: { container: { bad: true }, naming: { useAutoNaming: 'yes' } },
      video: {
        bitrateControl: { qualityValue: 18, advancedParams: 'not-an-array' },
        filters: { deinterlace: 'strong', rotation: null },
      },
      streamControl: { subtitleOperation: false },
    })
    expect(result.id).toBe(DEFAULT_PRESET.id)
    expect(result.name).toBe(DEFAULT_PRESET.name)
    expect(result.output.container).toBe(DEFAULT_PRESET.output.container)
    expect(result.output.naming.useAutoNaming).toBe(true)
    expect(result.video.bitrateControl.qualityValue).toBe(
      DEFAULT_PRESET.video.bitrateControl.qualityValue,
    )
    expect(result.video.bitrateControl.advancedParams).toEqual([])
    expect(result.video.filters.deinterlace).toBe(DEFAULT_PRESET.video.filters.deinterlace)
    expect(result.video.filters.rotation).toBe(DEFAULT_PRESET.video.filters.rotation)
    expect(result.streamControl.subtitleOperation).toBe(
      DEFAULT_PRESET.streamControl.subtitleOperation,
    )
  })

  it('丢弃未知字段（前端 schema 是唯一事实源）', () => {
    const result = normalizePreset({
      name: '带垃圾字段',
      futureOnly: { a: 1 },
      output: { container: '.mp4', unknownNested: 1 },
    }) as unknown as Record<string, unknown>
    expect(result.futureOnly).toBeUndefined()
    expect((result.output as Record<string, unknown>).unknownNested).toBeUndefined()
  })

  it('返回对象与输入、默认值都不共享引用', () => {
    const input = createDefaultPreset()
    input.video.encoder.codec = 'libx264'
    const result = normalizePreset(input)
    result.video.encoder.codec = 'libvpx-vp9'
    result.video.filters.superResolution.shaders.push('a')
    expect(input.video.encoder.codec).toBe('libx264')
    expect(DEFAULT_PRESET.video.encoder.codec).toBe('')
    expect(DEFAULT_PRESET.video.filters.superResolution.shaders).toEqual([])
  })
})

describe('R2.4 normalizePreset：版本迁移与联合类型', () => {
  it('旧预设（无 schemaVersion）软升级到当前版本并保留已知值', () => {
    const legacy = createDefaultPreset() as unknown as Record<string, unknown>
    delete legacy.schemaVersion
    legacy.name = 'v0 老预设'
    legacy.video = { encoder: { codec: 'libx264' } }
    const result = normalizePreset(legacy)
    expect(result.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(result.name).toBe('v0 老预设')
    expect(result.video.encoder.codec).toBe('libx264')
  })

  it('旧预设的 Date 时间字段转成 ISO 字符串', () => {
    const stamp = new Date('2024-05-01T08:00:00.000Z')
    const result = normalizePreset({ createdAt: stamp, updatedAt: stamp.getTime() })
    expect(result.createdAt).toBe('2024-05-01T08:00:00.000Z')
    expect(result.updatedAt).toBe('2024-05-01T08:00:00.000Z')
  })

  it('非法时间字段回退空字符串', () => {
    expect(normalizePreset({ createdAt: { bad: 1 }, updatedAt: new Date(NaN) }).createdAt).toBe('')
    expect(normalizePreset({ createdAt: { bad: 1 }, updatedAt: new Date(NaN) }).updatedAt).toBe('')
  })

  it('旧 Rust 预设的 advanced_params 别名迁移到 advancedParams', () => {
    const result = normalizePreset({
      name: '旧预设',
      video: { bitrateControl: { advanced_params: ['-x264-params', 'keyint=60'] } },
    })
    expect(result.video.bitrateControl.advancedParams).toEqual(['-x264-params', 'keyint=60'])
    expect(result.video.bitrateControl.qualityValue).toBe(
      DEFAULT_PRESET.video.bitrateControl.qualityValue,
    )
    expect(result.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
  })

  it('未来版本软降级到当前版本，不丢已知字段', () => {
    const result = normalizePreset({ schemaVersion: PRESET_SCHEMA_VERSION + 5, name: '来自未来' })
    expect(result.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(result.name).toBe('来自未来')
  })

  it('bitrateControl.mode / qualityParam 只接受合法枚举，非法值回退默认', () => {
    expect(
      normalizePreset({ video: { bitrateControl: { mode: 'CBR', qualityParam: 'qp' } } }).video
        .bitrateControl.mode,
    ).toBe('CBR')
    expect(
      normalizePreset({ video: { bitrateControl: { mode: '', qualityParam: '' } } }).video
        .bitrateControl.mode,
    ).toBe('')
    expect(
      normalizePreset({ video: { bitrateControl: { mode: 'NONSENSE' } } }).video.bitrateControl
        .mode,
    ).toBe(DEFAULT_PRESET.video.bitrateControl.mode)
    expect(
      normalizePreset({ video: { bitrateControl: { qualityParam: 123 } } }).video.bitrateControl
        .qualityParam,
    ).toBe(DEFAULT_PRESET.video.bitrateControl.qualityParam)
  })

  it('interpolation.mode 是普通字符串，不被 bitrate 枚举误伤', () => {
    expect(
      normalizePreset({ video: { filters: { interpolation: { mode: 'custom-algo' } } } }).video
        .filters.interpolation.mode,
    ).toBe('custom-algo')
  })
})

describe('R2.4 normalizePreset：数组字段', () => {
  it('空模板数组按声明的元素类型过滤', () => {
    const result = normalizePreset({
      video: {
        bitrateControl: { advancedParams: ['-x264-params', 7, null] },
        filters: { superResolution: { shaders: ['a.glsl', 'b.glsl', {}] } },
      },
      streamControl: { videoStreams: ['0', 1, '2'], audioStreams: ['a'], subtitleStreams: [] },
    })
    expect(result.video.bitrateControl.advancedParams).toEqual(['-x264-params'])
    expect(result.video.filters.superResolution.shaders).toEqual(['a.glsl', 'b.glsl'])
    expect(result.streamControl.videoStreams).toEqual(['0', '2'])
    expect(result.streamControl.audioStreams).toEqual(['a'])
    expect(result.streamControl.subtitleStreams).toEqual([])
  })

  it('非数组输入回退默认数组（且是独立副本）', () => {
    const result = normalizePreset({
      streamControl: { videoStreams: '0' },
      video: { subtitleBurn: { formatPriority: 'all' } },
    })
    expect(result.streamControl.videoStreams).toEqual([])
    expect(result.video.subtitleBurn.formatPriority).toEqual([-1, -1, -1])
    result.video.subtitleBurn.formatPriority.push(9)
    expect(DEFAULT_PRESET.video.subtitleBurn.formatPriority).toEqual([-1, -1, -1])
  })

  it('非空模板数组按元素类型规范化并过滤 NaN', () => {
    const result = normalizePreset({
      video: { subtitleBurn: { formatPriority: [1, 'bad', 2, Number.NaN] } },
    })
    expect(result.video.subtitleBurn.formatPriority).toEqual([1, 2])
  })
})
