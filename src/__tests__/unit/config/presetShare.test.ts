import { describe, it, expect } from 'vitest'
import {
  PRESET_SHARE_FORMAT,
  PRESET_SHARE_VERSION,
  PRESET_SHARE_TEXT_PREFIX,
  SHARE_FILE_EXTENSION,
  MAX_SHARE_TEXT_BYTES,
  createShareDocument,
  serializePresetShare,
  parsePresetShare,
  encodePresetShareText,
  decodePresetShareText,
  parsePresetShareInput,
  suggestShareFileName,
  type PresetShareErrorCode,
} from '@/config/presetShare'
import { createDefaultPreset } from '@/config/presetSchema'
import { DEFAULT_PRESET, PRESET_SCHEMA_VERSION } from '@/types/preset'

const EXPORTED_AT = '2026-11-07T06:00:00.000Z'

function sample() {
  const preset = createDefaultPreset()
  preset.id = 'local-uuid'
  preset.name = '影视压制 4K'
  preset.createdAt = '2024-01-01T00:00:00.000Z'
  preset.updatedAt = '2024-06-01T00:00:00.000Z'
  preset.video.encoder.codec = 'libx265'
  preset.video.bitrateControl.qualityValue = '20'
  return preset
}

describe('R3.1 预设分享格式契约', () => {
  it('格式标识、版本、文本前缀与文件扩展名固定', () => {
    expect(PRESET_SHARE_FORMAT).toBe('ffmpeg-desktop/preset')
    expect(PRESET_SHARE_VERSION).toBe(1)
    expect(PRESET_SHARE_TEXT_PREFIX).toBe('FFD1:')
    expect(SHARE_FILE_EXTENSION).toBe('ffpreset.json')
    expect(MAX_SHARE_TEXT_BYTES).toBe(64 * 1024)
  })

  it('createShareDocument 生成 envelope 且清除本地身份字段', () => {
    const doc = createShareDocument(sample(), EXPORTED_AT)
    expect(doc.format).toBe(PRESET_SHARE_FORMAT)
    expect(doc.version).toBe(PRESET_SHARE_VERSION)
    expect(doc.exportedAt).toBe(EXPORTED_AT)
    expect(doc.preset.id).toBe('')
    expect(doc.preset.createdAt).toBe('')
    expect(doc.preset.updatedAt).toBe('')
    expect(doc.preset.name).toBe('影视压制 4K')
    expect(doc.preset.video.encoder.codec).toBe('libx265')
  })

  it('序列化输出是带 schemaVersion 的完整合法预设，且不污染入参', () => {
    const source = sample()
    const json = serializePresetShare(source, EXPORTED_AT)
    const parsed = JSON.parse(json) as Record<string, unknown>

    expect(parsed.format).toBe(PRESET_SHARE_FORMAT)
    expect(parsed.version).toBe(PRESET_SHARE_VERSION)
    expect((parsed.preset as Record<string, unknown>).schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(source.id).toBe('local-uuid')
    expect(source.createdAt).toBe('2024-01-01T00:00:00.000Z')
    ;(parsed.preset as Record<string, unknown>).name = 'tampered'
    expect(source.name).toBe('影视压制 4K')
  })

  it('序列化前经 normalizePreset：脏值回退 + 未知字段丢弃', () => {
    const dirty = sample() as unknown as Record<string, unknown>
    dirty.unknownTopLevel = 'should be dropped'
    ;(dirty.video as Record<string, unknown>).encoder = { codec: 42, ghost: true }
    const doc = JSON.parse(serializePresetShare(dirty as never, EXPORTED_AT)) as {
      // 断言需要沿任意 JSON 深层路径取值，这里保留 any 是测试意图
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      preset: Record<string, any>
    }

    expect(doc.preset.unknownTopLevel).toBeUndefined()
    expect(doc.preset.video.encoder.codec).toBe(DEFAULT_PRESET.video.encoder.codec)
    expect(doc.preset.video.encoder.ghost).toBeUndefined()
    expect(doc.preset.video.encoder.preset).toBe(DEFAULT_PRESET.video.encoder.preset)
  })
})

describe('R3.1 parsePresetShare：版本兼容与错误码', () => {
  const codes: PresetShareErrorCode[] = [
    'invalidJson',
    'invalidDocument',
    'unsupportedVersion',
    'invalidPreset',
    'invalidText',
    'textTooLarge',
  ]

  it('错误码集合完整且互斥', () => {
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('标准 v1 文档可解析，preset 经规范化且不带本地身份', () => {
    const json = serializePresetShare(sample(), EXPORTED_AT)
    const result = parsePresetShare(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.legacy).toBe(false)
    expect(result.version).toBe(PRESET_SHARE_VERSION)
    expect(result.preset.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(result.preset.id).toBe('')
    expect(result.preset.video.bitrateControl.qualityValue).toBe('20')
    expect(result.preset.audio.loudnorm.peakLevel).toBe(DEFAULT_PRESET.audio.loudnorm.peakLevel)
  })

  it('未来 envelope 版本拒绝导入，避免误读未知结构', () => {
    const doc = createShareDocument(sample(), EXPORTED_AT)
    doc.version = PRESET_SHARE_VERSION + 1
    expect(parsePresetShare(JSON.stringify(doc))).toEqual({ ok: false, code: 'unsupportedVersion' })
  })

  it('未知 format / 非法 version / 非对象顶层一律拒绝', () => {
    const doc = createShareDocument(sample(), EXPORTED_AT) as unknown as Record<string, unknown>
    doc.format = 'some-other-tool'
    expect(parsePresetShare(JSON.stringify(doc))).toEqual({ ok: false, code: 'invalidDocument' })

    doc.format = PRESET_SHARE_FORMAT
    doc.version = '1'
    expect(parsePresetShare(JSON.stringify(doc))).toEqual({ ok: false, code: 'invalidDocument' })

    expect(parsePresetShare('[1, 2]')).toEqual({ ok: false, code: 'invalidDocument' })
  })

  it('损坏 JSON / 空文本 → invalidJson', () => {
    expect(parsePresetShare('{not json')).toEqual({ ok: false, code: 'invalidJson' })
    expect(parsePresetShare('   ')).toEqual({ ok: false, code: 'invalidJson' })
  })

  it('缺少 preset 或 preset 不是对象 → invalidPreset', () => {
    const doc = createShareDocument(sample(), EXPORTED_AT) as unknown as Record<string, unknown>
    delete doc.preset
    expect(parsePresetShare(JSON.stringify(doc))).toEqual({ ok: false, code: 'invalidPreset' })

    doc.preset = null
    expect(parsePresetShare(JSON.stringify(doc))).toEqual({ ok: false, code: 'invalidPreset' })
  })

  it('旧版裸预设 JSON 向后兼容，并标记为 legacy', () => {
    const legacy = { id: 'old-id', name: '老导出文件', video: { encoder: { codec: 'libx264' } } }
    const result = parsePresetShare(JSON.stringify(legacy))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.legacy).toBe(true)
    expect(result.version).toBe(0)
    expect(result.preset.name).toBe('老导出文件')
    expect(result.preset.video.encoder.codec).toBe('libx264')
    expect(result.preset.id).toBe('')
    expect(result.preset.audio.encoder).toBe(DEFAULT_PRESET.audio.encoder)
  })

  it('裸 JSON 至少要有一个已知预设字段，否则拒绝', () => {
    expect(parsePresetShare('{}')).toEqual({ ok: false, code: 'invalidPreset' })
    expect(parsePresetShare('{"somethingElse":1}')).toEqual({ ok: false, code: 'invalidPreset' })
  })

  it('未来 preset.schemaVersion 交给 normalizePreset 软降级', () => {
    const doc = createShareDocument(sample(), EXPORTED_AT)
    ;(doc.preset as unknown as Record<string, unknown>).schemaVersion = 999
    const result = parsePresetShare(JSON.stringify(doc))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preset.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
  })

  it('解析结果是深拷贝，修改结果不影响 DEFAULT_PRESET', () => {
    const result = parsePresetShare(serializePresetShare(sample(), EXPORTED_AT))
    if (!result.ok) throw new Error('unexpected failure')
    result.preset.video.encoder.codec = 'changed'
    result.preset.video.filters.superResolution.shaders.push('x')
    expect(DEFAULT_PRESET.video.encoder.codec).toBe('')
    expect(DEFAULT_PRESET.video.filters.superResolution.shaders).toEqual([])
  })
})

describe('R3.1 文本分享码（无外部依赖、UTF-8 安全）', () => {
  it('编码带 FFD1: 前缀，中文名可无损往返', () => {
    const encoded = encodePresetShareText(sample(), EXPORTED_AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    expect(encoded.text.startsWith(PRESET_SHARE_TEXT_PREFIX)).toBe(true)
    expect(encoded.text).not.toContain('+')
    expect(encoded.text).not.toContain('/')
    expect(encoded.text).not.toContain('=')

    const decoded = decodePresetShareText(encoded.text)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.preset.name).toBe('影视压制 4K')
    expect(decoded.preset.video.encoder.codec).toBe('libx265')
    expect(decoded.preset.id).toBe('')
  })

  it('分享码可携带换行/空白，解析前自动 trim', () => {
    const encoded = encodePresetShareText(sample(), EXPORTED_AT)
    if (!encoded.ok) throw new Error('unexpected failure')
    const decoded = decodePresetShareText(`  \n${encoded.text}\n  `)
    expect(decoded.ok).toBe(true)
  })

  it('无前缀或非法 base64 → invalidText', () => {
    expect(decodePresetShareText('just-a-string')).toEqual({ ok: false, code: 'invalidText' })
    expect(decodePresetShareText('FFD1:!!!not-base64!!!')).toEqual({
      ok: false,
      code: 'invalidText',
    })
  })

  it('超长输入 → textTooLarge，不进入 JSON 解析', () => {
    const huge = PRESET_SHARE_TEXT_PREFIX + 'A'.repeat(MAX_SHARE_TEXT_BYTES + 1)
    expect(decodePresetShareText(huge)).toEqual({ ok: false, code: 'textTooLarge' })
  })

  it('超大预设拒绝生成分享码（仍可导出文件）', () => {
    const preset = sample()
    preset.custom.fullCustom = 'x'.repeat(MAX_SHARE_TEXT_BYTES + 1)
    const encoded = encodePresetShareText(preset, EXPORTED_AT)
    expect(encoded.ok).toBe(false)
    if (encoded.ok) return
    expect(encoded.code).toBe('textTooLarge')
    expect(serializePresetShare(preset, EXPORTED_AT)).toContain(PRESET_SHARE_FORMAT)
  })

  it('parsePresetShareInput 自动识别分享码 / envelope JSON / 旧裸 JSON', () => {
    const encoded = encodePresetShareText(sample(), EXPORTED_AT)
    if (!encoded.ok) throw new Error('unexpected failure')

    for (const input of [
      encoded.text,
      serializePresetShare(sample(), EXPORTED_AT),
      JSON.stringify({ name: 'legacy', output: { container: '.mkv' } }),
    ]) {
      const result = parsePresetShareInput(input)
      expect(result.ok).toBe(true)
    }
    expect(parsePresetShareInput('nonsense')).toEqual({ ok: false, code: 'invalidJson' })
  })
})

describe('R3.1 导出文件名', () => {
  it('基于预设名生成友好且安全的 .ffpreset.json 文件名', () => {
    const preset = sample()
    expect(suggestShareFileName(preset)).toBe('影视压制 4K.ffpreset.json')
  })

  it('剔除路径分隔符、控制字符与保留字符，并限制长度', () => {
    const preset = createDefaultPreset()
    preset.name = '  ../a:b*c?"d"|e\\f  '
    const name = suggestShareFileName(preset)
    expect(name.endsWith('.ffpreset.json')).toBe(true)
    expect(name).not.toContain('/')
    expect(name).not.toContain('\\')
    expect(name).not.toContain(':')
    expect(name).not.toContain('|')

    preset.name = 'x'.repeat(200)
    expect(suggestShareFileName(preset).length).toBeLessThan(80)
  })

  it('空名称回退为 preset，不产生以点开头的文件名', () => {
    const preset = createDefaultPreset()
    preset.name = '   ...   '
    const name = suggestShareFileName(preset)
    expect(name).toBe('preset.ffpreset.json')
  })
})
