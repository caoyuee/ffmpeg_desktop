import type { PresetData } from '@/types/preset'
import { createTaskDraft, resolveOutputFile, type TaskDraft } from '@/config/taskDraft'

/**
 * R3.5：A/B 参数对比的唯一计划 / 差异 / 结果层。
 *
 * 不重新实现命令构建：两套草稿都经 createTaskDraft，只把输出文件名加 __A / __B
 * 后缀避免互相覆盖。差异清单忽略本地身份字段，只呈现真实参数变化。
 */

/** 这些字段是本地身份 / 时间，不属于「参数差异」。 */
const IGNORED_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'schemaVersion'])

export interface PresetDiff {
  path: string
  left: unknown
  right: unknown
}

export interface ABPlan {
  a: TaskDraft
  b: TaskDraft
}

export interface ABResult {
  sizeBytes: number | null
  durationMs: number | null
}

export interface ABVerdict {
  smaller: 'a' | 'b' | 'tie' | null
  faster: 'a' | 'b' | 'tie' | null
}

function withLabel(path: string, label: 'A' | 'B'): string {
  const dot = path.lastIndexOf('.')
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  if (dot > slash) return `${path.slice(0, dot)}__${label}${path.slice(dot)}`
  return `${path}__${label}`
}

export function buildABPlan(
  inputFile: string,
  presetA: PresetData,
  presetB: PresetData,
  outputDir?: string,
): ABPlan {
  // R1-7：输出目录决策复用 taskDraft 唯一入口，A/B 两侧都遵循用户输出目录设置。
  const baseA = resolveOutputFile(presetA, inputFile, outputDir)
  const baseB = resolveOutputFile(presetB, inputFile, outputDir)
  return {
    a: createTaskDraft(presetA, inputFile, withLabel(baseA, 'A')),
    b: createTaskDraft(presetB, inputFile, withLabel(baseB, 'B')),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function walk(left: unknown, right: unknown, path: string, out: PresetDiff[], depth: number): void {
  if (depth > 8 || out.length >= 200) return
  if (isRecord(left) && isRecord(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    for (const key of keys) {
      if (IGNORED_KEYS.has(key)) continue
      walk(left[key], right[key], path ? `${path}.${key}` : key, out, depth + 1)
    }
    return
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      out.push({ path, left: left.length, right: right.length })
      return
    }
    left.forEach((item, index) => walk(item, right[index], `${path}[${index}]`, out, depth + 1))
    return
  }
  if (!Object.is(left, right)) out.push({ path, left, right })
}

export function diffPresets(a: unknown, b: unknown): PresetDiff[] {
  if (!isRecord(a) || !isRecord(b)) return []
  const out: PresetDiff[] = []
  walk(a, b, '', out, 0)
  return out
}

function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function verdict(left: number | null, right: number | null): 'a' | 'b' | 'tie' | null {
  if (left === null || right === null) return null
  if (left === right) return 'tie'
  return left < right ? 'a' : 'b'
}

export function compareABResults(a: ABResult, b: ABResult): ABVerdict {
  return {
    smaller: verdict(numeric(a?.sizeBytes), numeric(b?.sizeBytes)),
    faster: verdict(numeric(a?.durationMs), numeric(b?.durationMs)),
  }
}
