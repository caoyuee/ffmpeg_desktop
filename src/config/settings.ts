import type { LanguageCode } from '@/i18n'
import { normalizeWatchRules, type WatchRule } from '@/config/watchFolder'

/**
 * R2.3 设置体系的唯一事实源（纯函数层，不依赖 Vue / Pinia）。
 *
 * 归并前的三套设置各写各的 localStorage：
 *   - settingStore            → 'theme' / 'language'
 *   - utils/appSettings.ts    → 'appSettings'（16 字段）
 *   - ffmpegSettingsStore     → 'ffmpeg_settings'（零调用方，已删除）
 *
 * 现在只有本模块负责 schema、默认值、逐字段规范化、持久化与旧键迁移；
 * 响应式门面是 store/settingsStore.ts。i18n、命令构建、任务队列等
 * Vue 上下文之外的读取方直接调用 loadSettings()，不再自己解析 localStorage。
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type FailedOutputDeleteMode = 'mp4' | 'all' | 'never'
export type TaskPriority = 'low' | 'normal' | 'high'
export type DefaultOutputDir = 'same' | 'custom'

export interface AppSettings {
  schemaVersion: number
  language: LanguageCode
  theme: ThemeMode
  autoCheckUpdate: boolean
  minimizeToTray: boolean
  closeToTray: boolean
  ffmpegPath: string
  ffprobePath: string
  maxConcurrentTasks: number
  taskPriority: TaskPriority
  defaultOutputDir: DefaultOutputDir
  customOutputDir: string
  autoOpenOutputFolder: boolean
  showNotification: boolean
  playSound: boolean
  failedOutputDeleteMode: FailedOutputDeleteMode
  presetDir: string
  logRetentionDays: number
  watchRules: WatchRule[]
}

/** 当前 schema 版本；结构变更时递增，normalizeSettings 负责软升级。 */
export const SETTINGS_SCHEMA_VERSION = 1

/** 唯一的 localStorage 键；旧键只在迁移时读取一次。 */
export const SETTINGS_STORAGE_KEY = 'ffmpegDesktop.settings'

/**
 * 迁移期旧键。'ffmpeg_settings' 对应的 store 从无 UI、从无调用方，
 * 其字段与新 schema 无一一映射，故不参与迁移（旧数据原样保留，不删除）。
 */
export const LEGACY_SETTINGS_KEYS = {
  appSettings: 'appSettings',
  theme: 'theme',
  language: 'language',
  ffmpegSettings: 'ffmpeg_settings',
} as const

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
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
  watchRules: [],
}

const LANGUAGES: readonly LanguageCode[] = ['zh-CN', 'en-US']
const THEMES: readonly ThemeMode[] = ['light', 'dark', 'system']
const DELETE_MODES: readonly FailedOutputDeleteMode[] = ['mp4', 'all', 'never']
const PRIORITIES: readonly TaskPriority[] = ['low', 'normal', 'high']
const OUTPUT_DIRS: readonly DefaultOutputDir[] = ['same', 'custom']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value !== 'string') return fallback
  return allowed.find((item) => item === value) !== undefined ? (value as T) : fallback
}

function integerInRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' && !(typeof value === 'string' && value.trim() !== '')) {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

/**
 * 逐字段规范化：只保留已知字段，脏值回退默认，数字 clamp。
 * 未知/未来 schemaVersion 一律软升级到当前版本，不丢已知值、不带走未知字段。
 */
export function normalizeSettings(value: unknown): AppSettings {
  const raw = isRecord(value) ? value : {}
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    language: oneOf(raw.language, LANGUAGES, DEFAULT_APP_SETTINGS.language),
    theme: oneOf(raw.theme, THEMES, DEFAULT_APP_SETTINGS.theme),
    autoCheckUpdate: bool(raw.autoCheckUpdate, DEFAULT_APP_SETTINGS.autoCheckUpdate),
    minimizeToTray: bool(raw.minimizeToTray, DEFAULT_APP_SETTINGS.minimizeToTray),
    closeToTray: bool(raw.closeToTray, DEFAULT_APP_SETTINGS.closeToTray),
    ffmpegPath: str(raw.ffmpegPath, DEFAULT_APP_SETTINGS.ffmpegPath),
    ffprobePath: str(raw.ffprobePath, DEFAULT_APP_SETTINGS.ffprobePath),
    maxConcurrentTasks: integerInRange(
      raw.maxConcurrentTasks,
      DEFAULT_APP_SETTINGS.maxConcurrentTasks,
      1,
      8,
    ),
    taskPriority: oneOf(raw.taskPriority, PRIORITIES, DEFAULT_APP_SETTINGS.taskPriority),
    defaultOutputDir: oneOf(
      raw.defaultOutputDir,
      OUTPUT_DIRS,
      DEFAULT_APP_SETTINGS.defaultOutputDir,
    ),
    customOutputDir: str(raw.customOutputDir, DEFAULT_APP_SETTINGS.customOutputDir),
    autoOpenOutputFolder: bool(raw.autoOpenOutputFolder, DEFAULT_APP_SETTINGS.autoOpenOutputFolder),
    showNotification: bool(raw.showNotification, DEFAULT_APP_SETTINGS.showNotification),
    playSound: bool(raw.playSound, DEFAULT_APP_SETTINGS.playSound),
    failedOutputDeleteMode: oneOf(
      raw.failedOutputDeleteMode,
      DELETE_MODES,
      DEFAULT_APP_SETTINGS.failedOutputDeleteMode,
    ),
    presetDir: str(raw.presetDir, DEFAULT_APP_SETTINGS.presetDir),
    logRetentionDays: integerInRange(
      raw.logRetentionDays,
      DEFAULT_APP_SETTINGS.logRetentionDays,
      0,
      365,
    ),
    watchRules: normalizeWatchRules(raw.watchRules),
  }
}

/** 读取旧键并合并；theme / language 以独立旧键为准（还原 R1 后 settingStore 覆盖的行为）。 */
function migrateLegacySettings(): AppSettings {
  let legacy: Record<string, unknown> = {}
  try {
    const rawAppSettings = localStorage.getItem(LEGACY_SETTINGS_KEYS.appSettings)
    if (rawAppSettings) {
      const parsed: unknown = JSON.parse(rawAppSettings)
      if (isRecord(parsed)) legacy = { ...parsed }
    }
    const legacyTheme = localStorage.getItem(LEGACY_SETTINGS_KEYS.theme)
    const legacyLanguage = localStorage.getItem(LEGACY_SETTINGS_KEYS.language)
    if (legacyTheme !== null) legacy.theme = legacyTheme
    if (legacyLanguage !== null) legacy.language = legacyLanguage
  } catch {
    // 旧键损坏时按默认值迁移，不让启动流程失败。
    legacy = {}
  }

  const migrated = normalizeSettings(legacy)
  // 迁移期：读旧键写新键。旧键原样保留，供旧版本回退时读取。
  saveSettings(migrated)
  return migrated
}

/** 从唯一键读取；首次运行触发旧键迁移；任何异常都回退默认值。 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw !== null) {
      return normalizeSettings(JSON.parse(raw) as unknown)
    }
    return migrateLegacySettings()
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

/** 写入唯一键；写入前统一规范化，保证磁盘上永远是完整且合法的 schema。 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
  } catch {
    // localStorage 不可用（隐私模式/配额满）时不影响应用运行。
  }
}
