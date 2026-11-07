import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { usePresetStore } from '@/store/presetStore'
import { createDefaultPreset } from '@/config/presetSchema'
import {
  PRESET_SHARE_FORMAT,
  PRESET_SHARE_VERSION,
  PresetShareError,
  serializePresetShare,
  encodePresetShareText,
  decodePresetShareText,
} from '@/config/presetShare'
import { DEFAULT_PRESET, PRESET_SCHEMA_VERSION } from '@/types/preset'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const mockedInvoke = invoke as unknown as ReturnType<typeof vi.fn>

describe('presetStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedInvoke.mockReset()
  })

  it('should start with empty presets', () => {
    const store = usePresetStore()
    expect(store.presets).toEqual([])
  })

  it('should have current preset initialized', () => {
    const store = usePresetStore()
    expect(store.currentPreset).toBeDefined()
    expect(store.currentPreset.name).toBe('默认预设')
  })

  it('当前预设带 schemaVersion 且是独立深拷贝', () => {
    const store = usePresetStore()
    expect(store.currentPreset.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    store.currentPreset.video.encoder.codec = 'libx264'
    store.currentPreset.video.filters.superResolution.shaders.push('x')
    expect(DEFAULT_PRESET.video.encoder.codec).toBe('')
    expect(DEFAULT_PRESET.video.filters.superResolution.shaders).toEqual([])
  })

  it('should have presetCount computed', () => {
    const store = usePresetStore()
    expect(store.presetCount).toBe(0)
  })

  it('should have loadPresets method', () => {
    const store = usePresetStore()
    expect(typeof store.loadPresets).toBe('function')
  })

  it('should have savePreset method', () => {
    const store = usePresetStore()
    expect(typeof store.savePreset).toBe('function')
  })

  it('should have deletePreset method', () => {
    const store = usePresetStore()
    expect(typeof store.deletePreset).toBe('function')
  })

  it('should have importPreset method', () => {
    const store = usePresetStore()
    expect(typeof store.importPreset).toBe('function')
  })

  it('should have exportPreset method', () => {
    const store = usePresetStore()
    expect(typeof store.exportPreset).toBe('function')
  })
})

describe('R2.4 presetStore：后端 JSON blob 一律经前端规范化', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedInvoke.mockReset()
  })

  it('loadPresets 把旧预设（无 schemaVersion / 缺字段 / 脏值）规范化', async () => {
    mockedInvoke.mockResolvedValue([
      { id: 'legacy-1', name: '老预设', video: { encoder: { codec: 'libx264' } } },
      { id: 'legacy-2', name: 42, output: { container: { bad: 1 } } },
      null,
    ])
    const store = usePresetStore()
    await store.loadPresets()

    // R1-7：未配置 presetDir 时显式传 null，Rust 回退默认目录。
    expect(mockedInvoke).toHaveBeenCalledWith('load_presets', { dir: null })
    expect(store.presets).toHaveLength(3)
    expect(store.presets[0]!.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(store.presets[0]!.video.encoder.codec).toBe('libx264')
    expect(store.presets[0]!.audio.loudnorm.peakLevel).toBe(DEFAULT_PRESET.audio.loudnorm.peakLevel)
    expect(store.presets[1]!.name).toBe(DEFAULT_PRESET.name)
    expect(store.presets[1]!.output.container).toBe(DEFAULT_PRESET.output.container)
    expect(store.presets[2]).toEqual(DEFAULT_PRESET)
  })

  it('loadPresets 后端返回非数组或抛错时都回退空列表', async () => {
    const store = usePresetStore()
    mockedInvoke.mockResolvedValue({ unexpected: true })
    await store.loadPresets()
    expect(store.presets).toEqual([])

    mockedInvoke.mockRejectedValue(new Error('disk error'))
    await expect(store.loadPresets()).resolves.toBeUndefined()
    expect(store.presets).toEqual([])
  })

  it('savePreset 提交前带上 schemaVersion 与完整 schema', async () => {
    const partial = createDefaultPreset()
    partial.name = '新预设'
    partial.video.encoder.codec = 'libx265'
    mockedInvoke.mockImplementation(async (_cmd: string, payload: { preset: unknown }) => ({
      ...(payload.preset as Record<string, unknown>),
      id: 'generated-id',
      createdAt: '2026-11-07T00:00:00Z',
      updatedAt: '2026-11-07T00:00:00Z',
    }))

    const store = usePresetStore()
    const saved = await store.savePreset(partial)

    const [command, payload] = mockedInvoke.mock.calls[0] as [
      string,
      { preset: Record<string, unknown> },
    ]
    expect(command).toBe('save_preset')
    expect(payload.preset.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(payload.preset.name).toBe('新预设')
    expect((payload.preset.video as Record<string, unknown>).encoder).toBeDefined()
    expect(saved.id).toBe('generated-id')
    expect(saved.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(store.presets).toHaveLength(1)
  })

  it('savePreset 同 id 覆盖而不是重复追加', async () => {
    const store = usePresetStore()
    const preset = createDefaultPreset()
    preset.id = 'same-id'
    mockedInvoke.mockImplementation(
      async (_cmd: string, payload: { preset: unknown }) => payload.preset,
    )

    await store.savePreset(preset)
    await store.savePreset(preset)
    expect(store.presets).toHaveLength(1)
  })

  it('savePreset 失败时抛出且不改列表', async () => {
    mockedInvoke.mockRejectedValue(new Error('write failed'))
    const store = usePresetStore()
    await expect(store.savePreset(createDefaultPreset())).rejects.toThrow('write failed')
    expect(store.presets).toEqual([])
  })

  it('importPreset 读回分享文档、经规范化后由 savePreset 生成新 id', async () => {
    const source = createDefaultPreset()
    source.id = 'foreign-id'
    source.name = '分享来的预设'
    source.video.encoder.codec = 'libx264'
    const document = serializePresetShare(source, '2026-11-07T06:00:00.000Z')
    mockedInvoke.mockImplementation(async (command: string, payload: { preset?: unknown }) => {
      if (command === 'import_preset') return document
      return { ...(payload.preset as Record<string, unknown>), id: 'fresh-id' }
    })

    const store = usePresetStore()
    const imported = await store.importPreset('/tmp/preset.ffpreset.json')

    expect(mockedInvoke).toHaveBeenCalledWith('import_preset', {
      filePath: '/tmp/preset.ffpreset.json',
    })
    expect(mockedInvoke).toHaveBeenCalledWith(
      'save_preset',
      expect.objectContaining({
        preset: expect.objectContaining({ id: '', name: '分享来的预设' }),
      }),
    )
    expect(imported.id).toBe('fresh-id')
    expect(imported.schemaVersion).toBe(PRESET_SCHEMA_VERSION)
    expect(imported.video.encoder.codec).toBe('libx264')
    expect(imported.video.filters.denoise.param1).toBe(DEFAULT_PRESET.video.filters.denoise.param1)
    expect(store.presets).toEqual([imported])
  })

  it('duplicatePreset 清空 id 与时间字段，不共享嵌套引用', async () => {
    mockedInvoke.mockImplementation(async (_cmd: string, payload: { preset: unknown }) => ({
      ...(payload.preset as Record<string, unknown>),
      id: 'new-id',
    }))
    const store = usePresetStore()
    const source = createDefaultPreset()
    source.id = 'source-id'
    source.name = '源预设'
    source.createdAt = '2024-01-01T00:00:00Z'
    source.video.encoder.codec = 'libx264'
    store.presets = [source]

    const duplicated = await store.duplicatePreset('source-id')
    expect(duplicated).not.toBeNull()
    expect(duplicated!.name).toBe('源预设 (副本)')
    const submitted = (
      mockedInvoke.mock.calls[0] as [string, { preset: Record<string, unknown> }]
    )[1].preset
    expect(submitted.id).toBe('')
    expect(submitted.createdAt).toBe('')
    expect(submitted.updatedAt).toBe('')
    ;(submitted.video as Record<string, unknown>).encoder = { codec: 'modified' }
    expect(source.video.encoder.codec).toBe('libx264')
  })

  it('setCurrentPreset / resetCurrentPreset 都是深拷贝', () => {
    const store = usePresetStore()
    const source = createDefaultPreset()
    source.video.encoder.codec = 'libx264'
    store.setCurrentPreset(source)
    source.video.encoder.codec = 'changed'
    expect(store.currentPreset.video.encoder.codec).toBe('libx264')

    store.currentPreset.video.encoder.codec = 'libx265'
    store.resetCurrentPreset()
    expect(store.currentPreset.video.encoder.codec).toBe('')
    expect(store.currentPreset).toEqual(DEFAULT_PRESET)
  })

  it('deletePreset 移除列表项；删掉当前预设时回退默认', async () => {
    mockedInvoke.mockResolvedValue(undefined)
    const store = usePresetStore()
    const preset = createDefaultPreset()
    preset.id = 'to-delete'
    store.presets = [preset]
    store.setCurrentPreset(preset)

    await store.deletePreset('to-delete')
    expect(mockedInvoke).toHaveBeenCalledWith('delete_preset', { presetId: 'to-delete', dir: null })
    expect(store.presets).toEqual([])
    expect(store.currentPreset).toEqual(DEFAULT_PRESET)
  })

  it('exportPreset 写出标准 envelope，剥离本地身份', async () => {
    mockedInvoke.mockResolvedValue(undefined)
    const store = usePresetStore()
    const preset = createDefaultPreset()
    preset.id = 'local-id'
    preset.createdAt = '2024-01-01T00:00:00.000Z'
    preset.name = '我的预设'

    await store.exportPreset(preset, '/tmp/out.ffpreset.json')

    const [command, payload] = mockedInvoke.mock.calls[0] as [
      string,
      { filePath: string; content: string },
    ]
    expect(command).toBe('export_preset')
    expect(payload.filePath).toBe('/tmp/out.ffpreset.json')
    // 断言需要沿任意 JSON 深层路径取值，这里保留 any 是测试意图
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const document = JSON.parse(payload.content) as Record<string, any>
    expect(document.format).toBe(PRESET_SHARE_FORMAT)
    expect(document.version).toBe(PRESET_SHARE_VERSION)
    expect(document.preset.id).toBe('')
    expect(document.preset.createdAt).toBe('')
    expect(document.preset.name).toBe('我的预设')
    expect(preset.id).toBe('local-id')
  })
})

describe('R3.1 presetStore：分享通道统一走 config/presetShare', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedInvoke.mockReset()
  })

  function mockSave() {
    mockedInvoke.mockImplementation(async (command: string, payload: { preset?: unknown }) => {
      if (command === 'import_preset') return ''
      return { ...(payload.preset as Record<string, unknown>), id: 'fresh-id' }
    })
  }

  it('importPreset 兼容 R2.4 之前的旧版裸预设 JSON', async () => {
    const legacy = JSON.stringify({
      id: 'old',
      name: '旧文件',
      video: { encoder: { codec: 'libx265' } },
    })
    mockedInvoke.mockImplementation(async (command: string, payload: { preset?: unknown }) => {
      if (command === 'import_preset') return legacy
      return { ...(payload.preset as Record<string, unknown>), id: 'fresh-id' }
    })
    const store = usePresetStore()
    const imported = await store.importPreset('/tmp/legacy.json')

    expect(imported.name).toBe('旧文件')
    expect(imported.video.encoder.codec).toBe('libx265')
    expect(imported.id).toBe('fresh-id')
    expect(store.presets).toHaveLength(1)
  })

  it('importPreset 遇到损坏 / 未来版本文档时拒绝落盘', async () => {
    const future = JSON.stringify({
      format: PRESET_SHARE_FORMAT,
      version: PRESET_SHARE_VERSION + 1,
      exportedAt: '2026-11-07T06:00:00.000Z',
      preset: createDefaultPreset(),
    })
    mockedInvoke.mockResolvedValue(future)
    const store = usePresetStore()
    await expect(store.importPreset('/tmp/future.json')).rejects.toThrow(PresetShareError)
    expect(mockedInvoke).toHaveBeenCalledTimes(1)
    expect(store.presets).toEqual([])

    mockedInvoke.mockReset()
    mockedInvoke.mockResolvedValue('{broken')
    await expect(store.importPreset('/tmp/broken.json')).rejects.toThrow(PresetShareError)
    expect(mockedInvoke).toHaveBeenCalledTimes(1)
    expect(store.presets).toEqual([])
  })

  it('importShareText 解析 FFD1 分享码并落盘', async () => {
    mockSave()
    const store = usePresetStore()
    const source = createDefaultPreset()
    source.id = 'foreign'
    source.name = '来自分享码'
    const encoded = encodePresetShareText(source)
    if (!encoded.ok) throw new Error('unexpected encode failure')

    const imported = await store.importShareText(encoded.text)
    expect(mockedInvoke).toHaveBeenCalledWith(
      'save_preset',
      expect.objectContaining({
        preset: expect.objectContaining({ name: '来自分享码', id: '' }),
      }),
    )
    expect(imported.id).toBe('fresh-id')
    expect(store.presets).toEqual([imported])
  })

  it('importShareText 非法输入抛错，不产生任何写盘调用', async () => {
    const store = usePresetStore()
    await expect(store.importShareText('nonsense')).rejects.toThrow(PresetShareError)
    expect(mockedInvoke).not.toHaveBeenCalled()
    expect(store.presets).toEqual([])
  })

  it('createShareText 返回可往返的分享码，且不泄露本地 id', () => {
    const store = usePresetStore()
    const source = createDefaultPreset()
    source.id = 'secret-id'
    source.name = '分享预设'

    const result = store.createShareText(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const decoded = decodePresetShareText(result.text)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.preset.name).toBe('分享预设')
    expect(decoded.preset.id).toBe('')
    expect(result.text).not.toContain('secret-id')
  })

  it('importPreset 读盘失败时原样抛出，队列不受影响', async () => {
    mockedInvoke.mockRejectedValue(new Error('disk error'))
    const store = usePresetStore()
    await expect(store.importPreset('/tmp/missing.json')).rejects.toThrow('disk error')
    expect(store.presets).toEqual([])
  })
})
