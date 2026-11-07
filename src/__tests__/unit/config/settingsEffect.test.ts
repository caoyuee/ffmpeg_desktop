import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/store/settingsStore'
import { usePresetStore } from '@/store/presetStore'
import { createTaskDraft, resolveOutputFile } from '@/config/taskDraft'
import { createDefaultPreset } from '@/config/presetSchema'
import type { PresetData } from '@/types/preset'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const mockedInvoke = invoke as unknown as ReturnType<typeof vi.fn>

/** 构造一个输出目录/扩展名可控的规范化预设。 */
function presetWith(location: string, container = 'mkv'): PresetData {
  const preset = createDefaultPreset()
  preset.output.location = location
  preset.output.container = container
  return preset
}

describe('R1-7 resolveOutputFile（defaultOutputDir/customOutputDir 的唯一决策点）', () => {
  it('未提供 outputDir 时保持既有行为（preset.output.location 决定目录）', () => {
    const path = resolveOutputFile(presetWith('/from/preset/'), '/videos/a.mp4')
    expect(path).toBe('/from/preset/a_output.mkv')
  })

  it('outputDir 非空时覆盖 preset.output.location，但保留命名与扩展名规则', () => {
    const path = resolveOutputFile(presetWith('/from/preset/'), '/videos/a.mp4', '/custom/out')
    expect(path.startsWith('/custom/out/')).toBe(true)
    expect(path.endsWith('.mkv')).toBe(true)
    expect(path).toContain('a_output')
    expect(path).not.toContain('/from/preset/')
  })

  it('空串 / 空白 outputDir 回退到既有行为', () => {
    const preset = presetWith('/from/preset/')
    expect(resolveOutputFile(preset, '/videos/a.mp4', '')).toBe('/from/preset/a_output.mkv')
    expect(resolveOutputFile(preset, '/videos/a.mp4', '   ')).toBe('/from/preset/a_output.mkv')
    expect(resolveOutputFile(preset, '/videos/a.mp4', undefined)).toBe('/from/preset/a_output.mkv')
  })

  it('outputDir 已带结尾分隔符时不再重复', () => {
    const path = resolveOutputFile(presetWith(''), '/videos/a.mp4', '/custom/out/')
    expect(path).toBe('/custom/out/a_output.mkv')
  })

  it('createTaskDraft 第 4 参透传 outputDir；显式 outputFile 时不受影响', () => {
    const draft = createTaskDraft(
      presetWith('/from/preset/'),
      '/videos/a.mp4',
      undefined,
      '/custom',
    )
    expect(draft.outputFile.startsWith('/custom/')).toBe(true)

    const explicit = createTaskDraft(
      presetWith('/from/preset/'),
      '/videos/a.mp4',
      '/explicit/out.mkv',
      '/custom',
    )
    expect(explicit.outputFile).toBe('/explicit/out.mkv')
  })
})

describe('R1-7 settingsStore.taskOutputDir（唯一输出目录 computed）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('默认（same）返回空串，调用方回退既有行为', () => {
    const store = useSettingsStore()
    expect(store.taskOutputDir).toBe('')
  })

  it('custom 模式返回规范化后的 customOutputDir；空值回退空串', () => {
    const store = useSettingsStore()
    store.update({ defaultOutputDir: 'custom', customOutputDir: '  /my/out  ' })
    expect(store.taskOutputDir).toBe('/my/out')

    store.update({ customOutputDir: '   ' })
    expect(store.taskOutputDir).toBe('')

    store.update({ defaultOutputDir: 'same' })
    expect(store.taskOutputDir).toBe('')
  })
})

describe('R1-7 presetStore 预设目录透传 Rust', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockedInvoke.mockReset()
  })

  it('未配置 presetDir 时 dir 传 null（Rust 回退默认目录）', async () => {
    mockedInvoke.mockResolvedValue([])
    const store = usePresetStore()
    await store.loadPresets()
    expect(mockedInvoke).toHaveBeenCalledWith('load_presets', { dir: null })
  })

  it('配置 presetDir 后 load/save/delete 都把目录传给 Rust', async () => {
    const settings = useSettingsStore()
    settings.update({ presetDir: '/my/presets' })

    mockedInvoke.mockImplementation((_cmd: string, args: Record<string, unknown>) => {
      if (args && 'preset' in args) return Promise.resolve(args.preset)
      return Promise.resolve([])
    })
    const store = usePresetStore()
    await store.loadPresets()
    expect(mockedInvoke).toHaveBeenCalledWith('load_presets', { dir: '/my/presets' })

    const saved = await store.savePreset(createDefaultPreset())
    expect(mockedInvoke).toHaveBeenCalledWith('save_preset', {
      preset: expect.anything(),
      dir: '/my/presets',
    })
    expect(saved).toBeTruthy()

    await store.deletePreset('p-1')
    expect(mockedInvoke).toHaveBeenCalledWith('delete_preset', {
      presetId: 'p-1',
      dir: '/my/presets',
    })
  })
})
