/**
 * R3.3：文件夹监控（批量应用预设）的唯一规则与批量计划层。
 *
 * 规则本身作为 AppSettings.watchRules 的一部分，经 config/settings.ts 的唯一
 * localStorage 键持久化（不新开第二个设置通道）；Rust 只复用已有的
 * `list_media_files` 做目录递归枚举，不认识 watch / 预设 / 任务任何概念。
 * 页面用定时器轮询并把 planWatchBatch 的结果交给 createTaskDraft 入队。
 */
export const WATCH_SCHEMA_VERSION = 1

export const WATCH_MEDIA_EXTENSIONS = [
  'mp4',
  'mkv',
  'avi',
  'mov',
  'flv',
  'webm',
  'wmv',
  'm4v',
  'ts',
  'mp3',
  'wav',
  'flac',
  'm4a',
  'aac',
] as const

export const MAX_WATCH_RULES = 8
export const MAX_WATCH_SEEN = 2000
export const MAX_WATCH_BATCH = 50

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/
const SAFE_EXT = /^[a-z0-9]{1,8}$/
const ALLOWED = new Set<string>(WATCH_MEDIA_EXTENSIONS)

export interface WatchRule {
  id: string
  directory: string
  presetId: string
  intervalSec: number
  extensions: string[]
  enabled: boolean
  seenPaths: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '' || seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result.slice(-limit)
}

export function normalizeWatchRule(value: unknown): WatchRule | null {
  if (!isRecord(value)) return null
  const id = value['id']
  const directory = value['directory']
  if (typeof id !== 'string' || !SAFE_ID.test(id)) return null
  if (typeof directory !== 'string' || directory.trim() === '') return null

  const rawInterval = value['intervalSec']
  const intervalSec =
    typeof rawInterval === 'number' && Number.isFinite(rawInterval)
      ? Math.min(60, Math.max(1, Math.round(rawInterval)))
      : 15

  const rawExtensions = Array.isArray(value['extensions']) ? value['extensions'] : []
  const extensions = Array.from(
    new Set(
      rawExtensions
        .filter((ext): ext is string => typeof ext === 'string')
        .map((ext) => ext.trim().toLowerCase().replace(/^\./, ''))
        .filter((ext) => SAFE_EXT.test(ext) && ALLOWED.has(ext)),
    ),
  )
  if (extensions.length === 0) extensions.push(...WATCH_MEDIA_EXTENSIONS)

  return {
    id,
    directory: directory.trim(),
    presetId: typeof value['presetId'] === 'string' ? value['presetId'] : '',
    intervalSec,
    extensions,
    enabled: value['enabled'] === true,
    seenPaths: uniqueStrings(value['seenPaths'], MAX_WATCH_SEEN),
  }
}

export function normalizeWatchRules(value: unknown): WatchRule[] {
  if (!Array.isArray(value)) return []
  const rules: WatchRule[] = []
  const ids = new Set<string>()
  for (const item of value) {
    if (rules.length >= MAX_WATCH_RULES) break
    const rule = normalizeWatchRule(item)
    if (!rule || ids.has(rule.id)) continue
    ids.add(rule.id)
    rules.push(rule)
  }
  return rules
}

export function isWatchableFile(path: string, extensions: readonly string[]): boolean {
  if (typeof path !== 'string') return false
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const name = path.slice(slash + 1)
  if (!name || name.startsWith('.')) return false
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return false
  const ext = name.slice(dot + 1).toLowerCase()
  const allowed = new Set((Array.isArray(extensions) ? extensions : []).map((e) => e.toLowerCase()))
  return allowed.size > 0 ? allowed.has(ext) : ALLOWED.has(ext)
}

export interface WatchBatch {
  newPaths: string[]
  nextSeen: string[]
}

/**
 * seed 语义：第一次扫描（seen 为空）只建立基线，不把目录里的历史文件一次性灌进队列。
 * 之后每轮只把新出现且符合扩展名的文件入队，并维护有上限的去重已见集合。
 */
export function planWatchBatch(
  seen: readonly string[],
  scanned: readonly string[],
  extensions: readonly string[],
): WatchBatch {
  if (!Array.isArray(seen) || !Array.isArray(scanned)) return { newPaths: [], nextSeen: [] }

  const candidates = uniqueStrings(scanned, MAX_WATCH_SEEN).filter((path) =>
    isWatchableFile(path, extensions),
  )
  const seenSet = new Set(seen.filter((p): p is string => typeof p === 'string'))

  if (seenSet.size === 0) {
    return { newPaths: [], nextSeen: candidates.slice(-MAX_WATCH_SEEN) }
  }

  const newPaths = candidates.filter((path) => !seenSet.has(path)).slice(0, MAX_WATCH_BATCH)
  const nextSeen = Array.from(new Set([...seenSet, ...newPaths])).slice(-MAX_WATCH_SEEN)
  return { newPaths, nextSeen }
}
