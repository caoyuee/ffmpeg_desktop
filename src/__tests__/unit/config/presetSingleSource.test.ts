import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * R2.4 防复发门禁：预设只存 JSON blob，Rust 不再结构化建模。
 * 前端 schema / 默认值 / 版本常量 / 规范化函数各有唯一定义，
 * 任何一侧把镜像结构或 Date 时间字段加回来都会被这里拦下。
 */
const root = process.cwd()
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')

// 注释里会记录被删除的旧结构名；门禁只检查真实代码（吸取 R2.1/R2.3 正则误伤的教训）。
function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\r\n]*/g, '')
}

function collectSources(relativeDir: string, extensions: RegExp, acc: string[] = []): string[] {
  for (const name of readdirSync(resolve(root, relativeDir))) {
    if (name === '__tests__' || name === 'node_modules' || name === 'target') continue
    const child = join(relativeDir, name)
    if (statSync(resolve(root, child)).isDirectory()) {
      collectSources(child, extensions, acc)
    } else if (extensions.test(name)) {
      acc.push(child)
    }
  }
  return acc
}

const frontendSources = collectSources('src', /\.(ts|vue)$/)
const productionSources = frontendSources.filter((file) => !file.includes('__tests__'))
const rustPreset = 'src-tauri/src/modules/preset_manager.rs'
const libRs = 'src-tauri/src/lib.rs'

const MIRRORED_STRUCTS = [
  'OutputSettings',
  'NamingSettings',
  'DecodeSettings',
  'VideoSettings',
  'EncoderSettings',
  'ResolutionSettings',
  'FrameRateSettings',
  'BitrateControlSettings',
  'ColorManagementSettings',
  'FilterSettings',
  'DenoiseSettings',
  'SharpenSettings',
  'InterpolationSettings',
  'SuperResolutionSettings',
  'SubtitleBurnSettings',
  'SubtitleStyle',
  'FrameServerSettings',
  'AudioSettings',
  'LoudnormSettings',
  'ImageSettings',
  'CustomSettings',
  'TrimSettings',
  'StreamControlSettings',
]

describe('R2.4 PresetData 单一事实源（防复发门禁）', () => {
  it('Rust 侧不再定义任何预设结构体（原 30 个手工镜像删除）', () => {
    const rust = code(rustPreset)
    expect(rust).not.toMatch(/pub struct\b/)
    expect(rust).not.toMatch(/#\[derive\(/)
    expect(rust).not.toMatch(/pub struct PresetData/)
    for (const name of MIRRORED_STRUCTS) {
      expect(rust).not.toContain(name)
    }
  })

  it('Rust 只透传 serde_json::Value，代码体量显著下降', () => {
    const rust = code(rustPreset)
    expect(rust).toMatch(/use serde_json::\{[^}]*Value[^}]*\}/)
    for (const command of [
      'load_presets',
      'save_preset',
      'delete_preset',
      'export_preset',
      'import_preset',
    ]) {
      expect(rust).toContain(`pub fn ${command}`)
    }
    // R1-7：三个目录命令追加可选 dir 参数（自定义预设目录），仍只透传 JSON blob。
    expect(rust).toMatch(/save_preset\(app: AppHandle, preset: Value, dir: Option<String>\)/)
    expect(rust).toMatch(/Result<Vec<Value>, String>/)
    expect(rust).toMatch(/Result<Value, String>/)
    // 只统计生产代码；文件末尾 #[cfg(test)] 单测模块不计入体量。
    const productionRust = rust.split('#[cfg(test)]')[0]!
    expect(productionRust.trim().split('\n').length).toBeLessThan(160)
  })

  it('Rust 文件名拼接前校验 preset id，防止路径穿越', () => {
    const rust = code(rustPreset)
    expect(rust).toMatch(/is_safe_preset_id/)
    expect(rust).toMatch(/fn preset_path\(/)
  })

  it('5 个预设命令仍全部注册在 generate_handler!', () => {
    const handlerBlock = read(libRs).match(/generate_handler!\[([\s\S]*?)\]/)?.[1] ?? ''
    for (const command of [
      'load_presets',
      'save_preset',
      'delete_preset',
      'export_preset',
      'import_preset',
    ]) {
      expect(handlerBlock).toContain(`preset_manager::${command}`)
    }
  })

  it('PresetData / DEFAULT_PRESET / 版本常量各只定义一次', () => {
    expect(frontendSources.filter((f) => /export interface PresetData\b/.test(code(f)))).toEqual([
      'src/types/preset.ts',
    ])
    expect(frontendSources.filter((f) => /export const DEFAULT_PRESET\b/.test(code(f)))).toEqual([
      'src/types/preset.ts',
    ])
    expect(
      frontendSources.filter((f) => /export const PRESET_SCHEMA_VERSION\b/.test(code(f))),
    ).toEqual(['src/types/preset.ts'])
  })

  it('规范化层唯一：createDefaultPreset / normalizePreset 只在 config/presetSchema.ts 定义', () => {
    expect(
      frontendSources.filter((f) => /export function createDefaultPreset\b/.test(code(f))),
    ).toEqual(['src/config/presetSchema.ts'])
    expect(
      frontendSources.filter((f) => /export function normalizePreset\b/.test(code(f))),
    ).toEqual(['src/config/presetSchema.ts'])
  })

  it('时间字段类型谎言已消除：preset.ts 不再出现 Date', () => {
    expect(code('src/types/preset.ts')).not.toMatch(
      /createdAt:\s*Date|updatedAt:\s*Date|new Date\(/,
    )
  })

  it('presetStore 所有后端返回都经过 normalizePreset', () => {
    const store = code('src/store/presetStore.ts')
    expect(store).toMatch(/from "@\/config\/presetSchema"|from '@\/config\/presetSchema'/)
    expect([...store.matchAll(/normalizePreset\(/g)].length).toBeGreaterThanOrEqual(4)
    expect(store).not.toMatch(/presets\.value\s*=\s*loadedPresets/)
    expect(store).not.toMatch(/presets\.value\.push\(preset\)/)
  })

  it('生产代码不再用 { ...DEFAULT_PRESET } 浅拷贝污染共享默认值', () => {
    const offenders = productionSources.filter((file) =>
      /\{\s*\.\.\.DEFAULT_PRESET\s*\}/.test(code(file)),
    )
    expect(offenders).toEqual([])
  })

  it('默认预设实例只由 createDefaultPreset / normalizePreset 产出', () => {
    const store = code('src/store/presetStore.ts')
    expect(store).toMatch(/createDefaultPreset\(\)/)
    expect(store).not.toMatch(/ref<PresetData>\(\{\s*\.\.\.DEFAULT_PRESET/)
  })
})
