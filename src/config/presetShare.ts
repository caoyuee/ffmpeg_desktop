import { normalizePreset } from '@/config/presetSchema'
import type { PresetData } from '@/types/preset'

/**
 * R3.1 预设分享格式的唯一事实源（纯函数层，不依赖 Vue / Pinia / Tauri / DOM）。
 *
 * 分层沿用 R2.4 的方案 B：
 *   - types/preset.ts         → 预设形状、默认值、schemaVersion
 *   - config/presetSchema.ts  → 规范化 / 脏值回退 / 版本软迁移
 *   - config/presetShare.ts   → 分享信封、文本分享码、导入校验、文件名
 *   - store/presetStore.ts    → 唯一响应式门面
 *   - Rust preset_manager.rs  → 纯文本 IO，不认识任何预设或分享格式
 *
 * 设计要点：
 *   1. 分享文件带 format/version 标识，未来版本明确拒绝而非猜测结构；
 *      旧版「裸预设 JSON」继续可读，标记为 legacy 以兼容 R2.4 之前导出的文件。
 *   2. 分享内容不含 id / createdAt / updatedAt，避免把本地身份与时间带入他人环境；
 *      导入一律经 savePreset 生成新 id，绝不覆盖已有预设。
 *   3. 文本分享码用无外部依赖的 UTF-8 + base64url 编解码，中文预设名可无损往返。
 */
export const PRESET_SHARE_FORMAT = 'ffmpeg-desktop/preset'
export const PRESET_SHARE_VERSION = 1
export const PRESET_SHARE_TEXT_PREFIX = 'FFD1:'
export const SHARE_FILE_EXTENSION = 'ffpreset.json'
export const MAX_SHARE_TEXT_BYTES = 64 * 1024

export type PresetShareErrorCode =
  | 'invalidJson'
  | 'invalidDocument'
  | 'unsupportedVersion'
  | 'invalidPreset'
  | 'invalidText'
  | 'textTooLarge'

export interface PresetShareDocument {
  format: string
  version: number
  exportedAt: string
  preset: PresetData
}

export type PresetShareResult =
  | { ok: true; preset: PresetData; legacy: boolean; version: number }
  | { ok: false; code: PresetShareErrorCode }

export type PresetShareTextResult =
  { ok: true; text: string } | { ok: false; code: PresetShareErrorCode }

/** 供 UI / store 抛出可分类错误，文案由 i18n 按 code 映射。 */
export class PresetShareError extends Error {
  readonly code: PresetShareErrorCode

  constructor(code: PresetShareErrorCode) {
    super(code)
    this.name = 'PresetShareError'
    this.code = code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 已知顶层字段从唯一 schema 派生，避免在这里维护第二份字段清单。 */
const KNOWN_TOP_LEVEL_KEYS: readonly string[] = Object.keys(normalizePreset({}))

/** 任何进入分享文档 / 导入队列的预设都必须规范化并剥离本地身份。 */
function cleanPreset(value: unknown): PresetData {
  const preset = normalizePreset(value)
  preset.id = ''
  preset.createdAt = ''
  preset.updatedAt = ''
  return preset
}

export function createShareDocument(
  preset: PresetData,
  exportedAt: string = new Date().toISOString(),
): PresetShareDocument {
  return {
    format: PRESET_SHARE_FORMAT,
    version: PRESET_SHARE_VERSION,
    exportedAt,
    preset: cleanPreset(preset),
  }
}

/** 文件导出：格式化 JSON，便于人工阅读与版本管理。 */
export function serializePresetShare(preset: PresetData, exportedAt?: string): string {
  return JSON.stringify(createShareDocument(preset, exportedAt), null, 2)
}

/** 解析分享文件 / JSON 文本；同时兼容 R2.4 之前的裸预设 JSON。 */
export function parsePresetShare(raw: string): PresetShareResult {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, code: 'invalidJson' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, code: 'invalidJson' }
  }
  if (!isRecord(parsed)) {
    return { ok: false, code: 'invalidDocument' }
  }

  let payload: unknown = parsed
  let legacy = true
  let version = 0

  if ('format' in parsed) {
    if (parsed.format !== PRESET_SHARE_FORMAT) {
      return { ok: false, code: 'invalidDocument' }
    }
    const rawVersion = parsed.version
    if (typeof rawVersion !== 'number' || !Number.isInteger(rawVersion) || rawVersion < 1) {
      return { ok: false, code: 'invalidDocument' }
    }
    if (rawVersion > PRESET_SHARE_VERSION) {
      return { ok: false, code: 'unsupportedVersion' }
    }
    legacy = false
    version = rawVersion
    payload = parsed.preset
  } else if (!KNOWN_TOP_LEVEL_KEYS.some((key) => key in parsed)) {
    // 至少命中一个已知预设字段，避免把任意 JSON 误当成预设导入。
    return { ok: false, code: 'invalidPreset' }
  }

  if (!isRecord(payload)) {
    return { ok: false, code: 'invalidPreset' }
  }
  return { ok: true, preset: cleanPreset(payload), legacy, version }
}

const BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** 纯 JS base64url，避免 btoa/atob 在不同运行环境的可用性与 Unicode 差异。 */
function bytesToBase64Url(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!
    const b1 = i + 1 < bytes.length ? bytes[i + 1]! : undefined
    const b2 = i + 2 < bytes.length ? bytes[i + 2]! : undefined
    const chunk = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0)
    out += BASE64URL_CHARS[(chunk >>> 18) & 63] + BASE64URL_CHARS[(chunk >>> 12) & 63]
    if (b1 !== undefined) out += BASE64URL_CHARS[(chunk >>> 6) & 63]
    if (b2 !== undefined) out += BASE64URL_CHARS[chunk & 63]
  }
  return out
}

function base64UrlToBytes(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null
  const bytes: number[] = []
  for (let i = 0; i < text.length; i += 4) {
    const chunk = text.slice(i, i + 4)
    const values = [...chunk].map((char) => BASE64URL_CHARS.indexOf(char))
    if (values.some((value) => value < 0)) return null
    const chunkValue =
      ((values[0] ?? 0) << 18) |
      ((values[1] ?? 0) << 12) |
      ((values[2] ?? 0) << 6) |
      (values[3] ?? 0)
    const byteCount = chunk.length - 1
    bytes.push((chunkValue >>> 16) & 255)
    if (byteCount > 1) bytes.push((chunkValue >>> 8) & 255)
    if (byteCount > 2) bytes.push(chunkValue & 255)
  }
  return Uint8Array.from(bytes)
}

/** 文本分享码：FFD1: + base64url(紧凑分享文档)，超长拒绝生成。 */
export function encodePresetShareText(
  preset: PresetData,
  exportedAt?: string,
): PresetShareTextResult {
  const json = JSON.stringify(createShareDocument(preset, exportedAt))
  const bytes = new TextEncoder().encode(json)
  if (bytes.length > MAX_SHARE_TEXT_BYTES) {
    return { ok: false, code: 'textTooLarge' }
  }
  return { ok: true, text: PRESET_SHARE_TEXT_PREFIX + bytesToBase64Url(bytes) }
}

export function decodePresetShareText(text: string): PresetShareResult {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (trimmed.length > MAX_SHARE_TEXT_BYTES) {
    return { ok: false, code: 'textTooLarge' }
  }
  if (!trimmed.startsWith(PRESET_SHARE_TEXT_PREFIX)) {
    return { ok: false, code: 'invalidText' }
  }
  const encoded = trimmed.slice(PRESET_SHARE_TEXT_PREFIX.length)
  if (!encoded) return { ok: false, code: 'invalidText' }

  const bytes = base64UrlToBytes(encoded)
  if (!bytes) return { ok: false, code: 'invalidText' }

  let json: string
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, code: 'invalidText' }
  }
  return parsePresetShare(json)
}

/** UI 唯一入口：自动识别 FFD1 分享码、v1 分享文件 JSON、旧版裸预设 JSON。 */
export function parsePresetShareInput(raw: string): PresetShareResult {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (trimmed.startsWith(PRESET_SHARE_TEXT_PREFIX)) {
    return decodePresetShareText(trimmed)
  }
  return parsePresetShare(trimmed)
}

/** 生成可读且跨平台安全的文件名；中文等非 ASCII 字符原样保留。 */
export function suggestShareFileName(preset: PresetData): string {
  const raw = typeof preset?.name === 'string' ? preset.name.trim() : ''
  const slug =
    raw
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, 60) || 'preset'
  return `${slug}.${SHARE_FILE_EXTENSION}`
}
