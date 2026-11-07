import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * R3.1 防复发门禁：预设分享格式只有一处定义。
 * Rust 只做纯文本 IO，不认识 envelope、版本或 format 标识；
 * store / UI 不得自行 JSON.parse 或拼第二套格式。
 */
const root = process.cwd()
const read = (relative: string): string => {
  const path = resolve(root, relative)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

// 注释里会记录旧实现与历史结构名；门禁只检查真实代码（沿用 R2.1/R2.3/R2.5 的教训）。
function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\r\n]*/g, '')
}

function collectSources(relativeDir: string, extensions: RegExp, acc: string[] = []): string[] {
  const dir = resolve(root, relativeDir)
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules' || name === 'target') continue
    const child = join(relativeDir, name)
    if (statSync(resolve(root, child)).isDirectory()) {
      collectSources(child, extensions, acc)
    } else if (extensions.test(name)) {
      acc.push(child.replace(/\\/g, '/'))
    }
  }
  return acc
}

const frontendSources = collectSources('src', /\.(ts|vue)$/)
const productionSources = frontendSources.filter((file) => !file.includes('__tests__'))
const shareLayer = 'src/config/presetShare.ts'
const store = 'src/store/presetStore.ts'
const manager = 'src/components/PresetManager/PresetManager.vue'
const rustPreset = 'src-tauri/src/modules/preset_manager.rs'
const libRs = 'src-tauri/src/lib.rs'

const PRESET_COMMANDS = [
  'load_presets',
  'save_preset',
  'delete_preset',
  'export_preset',
  'import_preset',
]

describe('R3.1 预设分享格式单一事实源（防复发门禁）', () => {
  it('格式常量 / 版本常量 / 扩展名只定义一次', () => {
    for (const symbol of [
      'PRESET_SHARE_FORMAT',
      'PRESET_SHARE_VERSION',
      'PRESET_SHARE_TEXT_PREFIX',
      'SHARE_FILE_EXTENSION',
      'MAX_SHARE_TEXT_BYTES',
    ]) {
      const owners = frontendSources.filter((file) =>
        new RegExp(`export const ${symbol}\\b`).test(code(file)),
      )
      expect(owners, `${symbol} 应只在 config/presetShare.ts 定义`).toEqual([shareLayer])
    }
  })

  it('序列化 / 解析 / 文本编码函数只定义一次', () => {
    for (const symbol of [
      'createShareDocument',
      'serializePresetShare',
      'parsePresetShare',
      'encodePresetShareText',
      'decodePresetShareText',
      'parsePresetShareInput',
      'suggestShareFileName',
    ]) {
      const owners = frontendSources.filter((file) =>
        new RegExp(`export function ${symbol}\\b`).test(code(file)),
      )
      expect(owners, `${symbol} 应只在 config/presetShare.ts 定义`).toEqual([shareLayer])
    }
  })

  it('分享层复用 normalizePreset，不另建 schema 默认值', () => {
    const layer = code(shareLayer)
    expect(layer).toMatch(/from ["']@\/config\/presetSchema["']/)
    expect(layer).toMatch(/normalizePreset\(/)
    expect(layer).not.toMatch(/import\s*\{[^}]*DEFAULT_PRESET/)
    expect(layer).not.toMatch(/\{\s*\.\.\.DEFAULT_PRESET\s*\}/)
  })

  it('Rust 不认识分享格式，导出/导入只是纯文本 IO', () => {
    const rust = code(rustPreset)
    expect(rust).not.toContain('ffmpeg-desktop/preset')
    expect(rust).not.toContain('PresetShareDocument')
    expect(rust).not.toMatch(/pub struct\b/)
    expect(rust).toMatch(/pub fn export_preset\([^)]*content: String/)
    expect(rust).toMatch(/pub fn import_preset\([^)]*\) -> Result<String, String>/)
    expect(rust).not.toMatch(/import_preset[\s\S]{0,200}serde_json::from_str/)
  })

  it('5 个预设命令仍全部注册，注册表为 39 项（R3.2 体积查询）', () => {
    const handlerBlock = read(libRs).match(/generate_handler!\[([\s\S]*?)\]/)?.[1] ?? ''
    for (const command of PRESET_COMMANDS) {
      expect(handlerBlock).toContain(`preset_manager::${command}`)
    }
    const entries = handlerBlock
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
    expect(entries).toHaveLength(39)
  })

  it('presetStore 只通过分享层读写文件，不直接拼裸 JSON', () => {
    const source = code(store)
    expect(source).toMatch(/from ["']@\/config\/presetShare["']/)
    expect(source).toMatch(/serializePresetShare\(/)
    expect(source).toMatch(/parsePresetShare\(/)
    expect(source).not.toMatch(/JSON\.stringify/)
    expect(source).not.toMatch(/JSON\.parse/)
    expect(source).not.toMatch(/localStorage/)
  })

  it('UI 不自行解析 JSON，也不硬编码格式标识', () => {
    const ui = code(manager)
    expect(ui).not.toMatch(/JSON\.parse/)
    expect(ui).not.toMatch(/JSON\.stringify/)
    expect(ui).not.toContain('ffmpeg-desktop/preset')
    expect(ui).toMatch(/from ["']@\/config\/presetShare["']/)
  })

  it('生产代码里没有第二套分享码前缀或编解码实现', () => {
    // 只针对分享码：Player 等页面本就用 btoa 做 data URL，与本功能无关，不应误伤。
    const offenders = productionSources.filter(
      (file) => file !== shareLayer && /FFD1:|bytesToBase64Url|base64UrlToBytes/.test(code(file)),
    )
    expect(offenders).toEqual([])
  })

  it('分享错误码在中英文案中各有一一对应的文案', () => {
    for (const locale of ['src/i18n/locales/zh-CN.ts', 'src/i18n/locales/en-US.ts']) {
      const source = code(locale)
      for (const key of [
        'invalidJson',
        'invalidDocument',
        'unsupportedVersion',
        'invalidPreset',
        'invalidText',
        'textTooLarge',
      ]) {
        expect(source, `${locale} 缺少 ${key}`).toContain(`${key}:`)
      }
    }
  })
})
