import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_APP_SETTINGS,
  LEGACY_SETTINGS_KEYS,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from '@/config/settings'

// R2.3 红测试：三套设置归一后的唯一事实源契约。
// config/settings.ts 是纯函数模块（不依赖 Vue/Pinia），store 与 i18n 都从这里取值。
describe('R2.3 设置单一事实源（config/settings）', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('唯一存储键与 schema version 固定', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('ffmpegDesktop.settings')
    expect(SETTINGS_SCHEMA_VERSION).toBe(1)
    expect(DEFAULT_APP_SETTINGS.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
  })

  it('默认值覆盖全部 16 个业务字段', () => {
    expect(DEFAULT_APP_SETTINGS).toMatchObject({
      language: 'zh-CN',
      theme: 'system',
      autoCheckUpdate: true,
      minimizeToTray: false,
      closeToTray: false,
      ffmpegPath: '',
      ffprobePath: '',
      maxConcurrentTasks: 2,
      taskPriority: 'normal',
      defaultOutputDir: 'same',
      customOutputDir: '',
      autoOpenOutputFolder: false,
      showNotification: true,
      playSound: false,
      failedOutputDeleteMode: 'mp4',
      presetDir: '',
      logRetentionDays: 30,
    })
  })

  it('saveSettings 只写唯一键，并带上 schemaVersion', () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, ffmpegPath: '/opt/ffmpeg' })

    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    expect(keys).toEqual([SETTINGS_STORAGE_KEY])
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toMatchObject({
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      ffmpegPath: '/opt/ffmpeg',
    })
  })

  it('loadSettings 读回保存的值，且返回的对象与默认值形状一致', () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, theme: 'dark', maxConcurrentTasks: 5 })

    const loaded = loadSettings()
    expect(loaded.theme).toBe('dark')
    expect(loaded.maxConcurrentTasks).toBe(5)
    expect(Object.keys(loaded).sort()).toEqual(Object.keys(DEFAULT_APP_SETTINGS).sort())
  })

  it('迁移期读旧键写新键：appSettings + theme + language 合并后落到唯一键', () => {
    localStorage.setItem(
      LEGACY_SETTINGS_KEYS.appSettings,
      JSON.stringify({
        ffmpegPath: '/usr/bin/ffmpeg',
        maxConcurrentTasks: 4,
        playSound: true,
        theme: 'dark', // 旧 appSettings 里的 theme 是脏数据
        language: 'en-US', // 旧 appSettings 里的 language 是脏数据
      }),
    )
    localStorage.setItem(LEGACY_SETTINGS_KEYS.theme, 'light')
    localStorage.setItem(LEGACY_SETTINGS_KEYS.language, 'zh-CN')

    const loaded = loadSettings()

    // theme/language 以独立的旧键为准（还原 R1 后 Settings 页 settingStore 覆盖的行为）
    expect(loaded.theme).toBe('light')
    expect(loaded.language).toBe('zh-CN')
    expect(loaded.ffmpegPath).toBe('/usr/bin/ffmpeg')
    expect(loaded.maxConcurrentTasks).toBe(4)
    expect(loaded.playSound).toBe(true)
    // 迁移结果立即写入新键，后续不再依赖旧键
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull()
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!).theme).toBe('light')
  })

  it('只有 appSettings 时也能迁移，缺失字段用默认值补齐', () => {
    localStorage.setItem(
      LEGACY_SETTINGS_KEYS.appSettings,
      JSON.stringify({
        customOutputDir: '/tmp/out',
      }),
    )

    const loaded = loadSettings()
    expect(loaded.customOutputDir).toBe('/tmp/out')
    expect(loaded.maxConcurrentTasks).toBe(DEFAULT_APP_SETTINGS.maxConcurrentTasks)
    expect(loaded.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
  })

  it('新键存在后旧键不再参与读取（单一事实源）', () => {
    saveSettings({ ...DEFAULT_APP_SETTINGS, theme: 'dark' })
    localStorage.setItem(LEGACY_SETTINGS_KEYS.theme, 'light')
    localStorage.setItem(LEGACY_SETTINGS_KEYS.appSettings, JSON.stringify({ theme: 'light' }))

    expect(loadSettings().theme).toBe('dark')
  })

  it('损坏的新键 JSON 回退到默认值，不抛异常', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{broken json')
    expect(loadSettings()).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('逐字段规范化：越界数字、非法枚举、错误类型、未知字段', () => {
    const normalized = normalizeSettings({
      maxConcurrentTasks: 99,
      logRetentionDays: -3,
      theme: 'neon',
      language: 'fr-FR',
      failedOutputDeleteMode: 'sometimes',
      taskPriority: 'urgent',
      defaultOutputDir: 'elsewhere',
      minimizeToTray: 'yes',
      ffmpegPath: 42,
      showNotification: null,
      unknownFutureField: 'keep me out',
    })

    expect(normalized.maxConcurrentTasks).toBe(8)
    expect(normalized.logRetentionDays).toBe(0)
    expect(normalized.theme).toBe(DEFAULT_APP_SETTINGS.theme)
    expect(normalized.language).toBe(DEFAULT_APP_SETTINGS.language)
    expect(normalized.failedOutputDeleteMode).toBe(DEFAULT_APP_SETTINGS.failedOutputDeleteMode)
    expect(normalized.taskPriority).toBe(DEFAULT_APP_SETTINGS.taskPriority)
    expect(normalized.defaultOutputDir).toBe(DEFAULT_APP_SETTINGS.defaultOutputDir)
    expect(normalized.minimizeToTray).toBe(false)
    expect(normalized.ffmpegPath).toBe('')
    expect(normalized.showNotification).toBe(true)
    expect(normalized).not.toHaveProperty('unknownFutureField')
  })

  it('数字字符串在下限时被 clamp，小数与 NaN 回退默认值', () => {
    expect(normalizeSettings({ maxConcurrentTasks: '3' }).maxConcurrentTasks).toBe(3)
    expect(normalizeSettings({ maxConcurrentTasks: 0 }).maxConcurrentTasks).toBe(1)
    expect(normalizeSettings({ maxConcurrentTasks: 2.5 }).maxConcurrentTasks).toBe(2)
    expect(normalizeSettings({ maxConcurrentTasks: 'abc' }).maxConcurrentTasks).toBe(2)
    expect(normalizeSettings({ logRetentionDays: 999 }).logRetentionDays).toBe(365)
  })

  it('来自未来版本的数据按已知字段软升级，不丢已知值也不带走未知字段', () => {
    const result = loadSettingsFrom({
      schemaVersion: SETTINGS_SCHEMA_VERSION + 5,
      theme: 'light',
      ffmpegPath: '/future/ffmpeg',
      brandNewField: 'unknown',
    })

    expect(result.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION)
    expect(result.theme).toBe('light')
    expect(result.ffmpegPath).toBe('/future/ffmpeg')
    expect(result).not.toHaveProperty('brandNewField')
  })

  it('localStorage 不可用时 load 回退默认值、save 不抛异常', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    expect(loadSettings()).toEqual(DEFAULT_APP_SETTINGS)
    expect(() => saveSettings(DEFAULT_APP_SETTINGS)).not.toThrow()
  })
})

function loadSettingsFrom(value: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value))
  return loadSettings()
}
