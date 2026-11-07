import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

// R2.2 防复发门禁：命令构建器合一后，格式兼容性元数据只能有一个来源，
// 且不允许再出现「静默修改用户选择 + console.warn」的旧路径。
// Vitest root 默认是项目根，用 cwd 避开不同运行时 import.meta.url 的 scheme 差异。
const root = process.cwd()
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')
const exists = (relative: string) => existsSync(resolve(root, relative))

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

describe('R2.2 命令构建器合一（防复发门禁）', () => {
  it('旧构建器与零调用方的 codec filter hook 已删除', () => {
    const removed = [
      'src/utils/ffmpegCommandBuilder.ts',
      'src/hooks/useCodecFilter.ts',
      'src/__tests__/unit/utils/ffmpegCommandBuilder.test.ts',
    ]
    expect(removed.filter(exists)).toEqual([])
  })

  it('前端源码不再引用 ffmpegCommandBuilder 或 useCodecFilter', () => {
    const offenders = frontendSources.filter((file) =>
      /(?:ffmpegCommandBuilder|useCodecFilter)/.test(read(file)),
    )
    expect(offenders).toEqual([])
  })

  it('FORMAT_COMPATIBILITY 只在 codecDatabase.ts 定义一次', () => {
    const definers = frontendSources.filter((file) =>
      /export const FORMAT_COMPATIBILITY/.test(read(file)),
    )
    expect(definers).toEqual(['src/config/codecDatabase.ts'])
  })

  it('FFmpegCommandBuilder 类只剩主线的 commandBuilder.ts 一份', () => {
    const definers = frontendSources.filter((file) =>
      /export class FFmpegCommandBuilder/.test(read(file)),
    )
    expect(definers).toEqual(['src/utils/commandBuilder.ts'])
  })

  it('不再有静默切换编码器并只打 console.warn 的逻辑', () => {
    const offenders = frontendSources.filter((file) =>
      /ensureCompatibleCodec|自动切换|已自动切换/.test(read(file)),
    )
    expect(offenders).toEqual([])
  })

  it('OutputSettings 的兼容性确认必须由用户点击触发', () => {
    const ui = read('src/pages/ParameterPanel/components/OutputSettings.vue')
    expect(ui).toMatch(/data-testid="use-recommended"/)
    expect(ui).toMatch(/data-testid="keep-current"/)
    expect(ui).not.toMatch(/ensureCompatibleCodec/)
  })
})
