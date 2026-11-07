import { DEFAULT_PRESET, PRESET_SCHEMA_VERSION, type PresetData } from '@/types/preset'

/**
 * R2.4 预设校验 / 迁移的唯一入口（纯函数层，不依赖 Vue / Pinia / Tauri）。
 *
 * 方案 B：Rust `preset_manager.rs` 只负责把预设当作 JSON blob 读写，
 * 不再用 30 个 struct 手工镜像 TS 类型。所有 schema 知识都在这里：
 *   - types/preset.ts        → 形状、默认值、版本常量（单一事实源）
 *   - config/presetSchema.ts → 规范化、脏值回退、版本迁移、深拷贝
 *   - store/presetStore.ts   → 唯一响应式门面，所有后端返回值先过 normalizePreset
 *
 * 旧预设（无 schemaVersion）与未来版本一律软升级/软降级到当前版本：
 * 保留所有已知字段，丢弃未知字段，绝不因为格式不符让整份预设丢失。
 */
export { PRESET_SCHEMA_VERSION }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const BITRATE_MODES = ['CRF', 'VBR', 'VBR_HQ', 'CQP', 'CBR', ''] as const
const QUALITY_PARAMS = ['crf', 'cq', 'qp', 'global_quality', ''] as const

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

/** 时间字段可能是旧代码生成的 Date / 时间戳；统一收敛成 ISO 字符串或空串。 */
function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }
  return ''
}

/** 需要按路径特殊处理的叶子字段；键集合即为 PRESET_OVERRIDE_PATHS。 */
const OVERRIDES: Record<string, (value: unknown) => unknown> = {
  schemaVersion: () => PRESET_SCHEMA_VERSION,
  createdAt: normalizeTimestamp,
  updatedAt: normalizeTimestamp,
  'video.bitrateControl.mode': (value) =>
    oneOf(value, BITRATE_MODES, DEFAULT_PRESET.video.bitrateControl.mode),
  'video.bitrateControl.qualityParam': (value) =>
    oneOf(value, QUALITY_PARAMS, DEFAULT_PRESET.video.bitrateControl.qualityParam),
}

/** 供测试验证路径表与 DEFAULT_PRESET 结构同步，防止 schema 演进后路径腐化。 */
export const PRESET_OVERRIDE_PATHS: readonly string[] = Object.keys(OVERRIDES)

/**
 * DEFAULT_PRESET 里这些数组为空，无法从模板推断元素类型，故按字段显式声明。
 * 其余非空数组（formatPriority）直接用模板首元素推断。
 */
const EMPTY_ARRAY_ITEM_TYPES: Record<string, 'string' | 'number'> = {
  advancedParams: 'string',
  shaders: 'string',
  videoStreams: 'string',
  audioStreams: 'string',
  subtitleStreams: 'string',
}

function normalizeNode(template: unknown, value: unknown, path: string): unknown {
  const override = OVERRIDES[path]
  if (override) return override(value)

  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return structuredClone(template)
    if (template.length > 0) {
      const elementTemplate = template[0]
      const expected = typeof elementTemplate
      return value
        .filter(
          (item) => typeof item === expected && (expected !== 'number' || Number.isFinite(item)),
        )
        .map((item) => normalizeNode(elementTemplate, item, `${path}[]`))
    }
    const leafKey = path.split('.').pop() ?? ''
    const itemType = EMPTY_ARRAY_ITEM_TYPES[leafKey] ?? 'string'
    return value.filter(
      (item) => typeof item === itemType && (itemType !== 'number' || Number.isFinite(item)),
    )
  }

  if (isRecord(template)) {
    const raw = isRecord(value) ? value : {}
    const result: Record<string, unknown> = {}
    for (const [key, childTemplate] of Object.entries(template)) {
      result[key] = normalizeNode(childTemplate, raw[key], path ? `${path}.${key}` : key)
    }
    return result
  }

  switch (typeof template) {
    case 'string':
      return typeof value === 'string' ? value : template
    case 'boolean':
      return typeof value === 'boolean' ? value : template
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? value : template
    default:
      return template
  }
}

/**
 * 旧 Rust 结构化建模里 `BitrateControlSettings::advanced_params` 漏了 serde rename，
 * 磁盘上曾写作 snake_case。迁移期把它搬到前端 schema 的 `advancedParams`。
 * 其他旧字段（无 schemaVersion、Option 字段缺失）由 normalizeNode 自动补齐。
 */
function migrateLegacyPreset(value: unknown): unknown {
  if (!isRecord(value)) return value
  try {
    const root = structuredClone(value)
    const bitrateControl = isRecord(root.video) ? root.video.bitrateControl : undefined
    if (
      isRecord(bitrateControl) &&
      Array.isArray(bitrateControl.advanced_params) &&
      !Array.isArray(bitrateControl.advancedParams)
    ) {
      bitrateControl.advancedParams = bitrateControl.advanced_params
    }
    return root
  } catch {
    return value
  }
}

/** 任何来源的预设（磁盘 / 导入 / 页面编辑）进入应用前的唯一入口。 */
export function normalizePreset(value: unknown): PresetData {
  return normalizeNode(DEFAULT_PRESET, migrateLegacyPreset(value), '') as PresetData
}

/** 生成一份独立的默认预设，杜绝 `{ ...DEFAULT_PRESET }` 浅拷贝共享嵌套引用。 */
export function createDefaultPreset(): PresetData {
  return structuredClone(DEFAULT_PRESET)
}
