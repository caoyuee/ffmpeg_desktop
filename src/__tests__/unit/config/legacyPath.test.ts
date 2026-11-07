import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { FFMPEG_EVENTS } from '@/utils/ffmpegEvents'

// R2.1 防复发门禁：legacy executor 删除后，任何人都不能把无前缀事件 / 旧 command 加回来。
// 《架构与数据流》§3 规定：所有 FFmpeg 进程由 task_manager 管理，事件一律 ffmpeg-* 前缀 + taskId。
// Vitest root 默认是项目根，用 cwd 可避开不同运行时 import.meta.url 的 scheme 差异。
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
const rustSources = collectSources('src-tauri/src', /\.rs$/)

describe('R2.1 FFmpeg 执行路径统一（防复发门禁）', () => {
  it('前端不再调用 legacy execute_ffmpeg_command / stop_convert', () => {
    const offenders = frontendSources.filter((file) =>
      /invoke\(\s*['"](?:execute_ffmpeg_command|stop_convert)['"]/.test(read(file)),
    )
    expect(offenders).toEqual([])
  })

  it('前端不再监听无前缀 progress / finish / error 事件', () => {
    const offenders = frontendSources.filter((file) =>
      /listen\(\s*['"](?:progress|finish|error)['"]/.test(read(file)),
    )
    expect(offenders).toEqual([])
  })

  it('hooks/index.ts 不再导出已删除的 legacy hook', () => {
    expect(read('src/hooks/index.ts')).not.toMatch(/useFFmpegCommand/)
  })

  it('Rust 注册表与模块导出不再包含 legacy command', () => {
    expect(read('src-tauri/src/lib.rs')).not.toMatch(/\b(?:execute_ffmpeg_command|stop_convert)\b/)
    expect(read('src-tauri/src/commands/mod.rs')).not.toMatch(/legacy_executor/)
  })

  it('legacy executor、无前缀事件枚举与死代码 hook 已删除', () => {
    const removed = [
      'src/hooks/useFFmpegCommand.ts',
      'src-tauri/src/commands/legacy_executor.rs',
      'src-tauri/src/utility/_executor.rs',
      'src-tauri/src/utility/_constant.rs',
      'src-tauri/src/utility/mod.rs',
    ]
    expect(removed.filter(exists)).toEqual([])
  })

  it('Rust 源码不再定义或发射无前缀 FFmpeg 事件', () => {
    expect(rustSources.filter((file) => /FFmpegEvent/.test(read(file)))).toEqual([])
    // 只看 emit/emit_payload 的事件名参数（可能是第一个或第二个实参），
    // 不能跨语句扫描，否则 "error" 这类日志 level 字符串会造成误报。
    const legacyEmit = /\bemit(?:_payload)?\(\s*(?:[^,()]+,\s*)?["'](?:progress|finish|error)["']/
    expect(rustSources.filter((file) => legacyEmit.test(read(file)))).toEqual([])
  })

  it('事件契约常量与 Rust task_manager 的 emit 字符串一一对应', () => {
    const rust = read('src-tauri/src/modules/task_manager.rs')
    const emitted = new Set(
      Array.from(rust.matchAll(/\.emit\(\s*"(ffmpeg-[a-z]+)"/g), (match) => match[1]!),
    )
    const contract = new Set<string>(Object.values(FFMPEG_EVENTS))

    expect(contract).toEqual(emitted)
    for (const name of contract) {
      expect(name.startsWith('ffmpeg-')).toBe(true)
    }
  })
})
