import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// P0-1 的根因是「实现了 #[tauri::command] 但没注册进 generate_handler!」。
// 这个静态门禁让 commands/mod.rs 里导出的每个命令都必须出现在注册表中。
const root = process.cwd()
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')

const libRs = read('src-tauri/src/lib.rs')
const commandsMod = read('src-tauri/src/commands/mod.rs')

const handlerBlock = libRs.match(/generate_handler!\[([\s\S]*?)\]/)?.[1] ?? ''
const handlerEntries = handlerBlock
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)
const registered = new Set(
  handlerEntries
    .map((entry) => entry.split('::').pop()?.trim())
    .filter((name): name is string => Boolean(name)),
)

const exportedNames = [
  ...[...commandsMod.matchAll(/pub use \w+::\{([^}]+)\}/g)].flatMap((match) =>
    match[1]!.split(',').map((name) => name.trim()),
  ),
  ...[...commandsMod.matchAll(/pub use \w+::(\w+);/g)].map((match) => match[1]!),
].filter(Boolean)

describe('Tauri 命令注册表一致性', () => {
  it('generate_handler! 块可解析且非空', () => {
    expect(registered.size).toBeGreaterThan(20)
  })

  it('commands/mod.rs 导出的每个命令都已注册', () => {
    const missing = [...new Set(exportedNames)].filter((name) => !registered.has(name))
    expect(missing).toEqual([])
  })

  it('注册表里的裸命令都有导出来源（R2.1 删除后不留悬空符号）', () => {
    const exported = new Set(exportedNames)
    // probe_media_info 由 lib.rs 直接从 library::_probe 引入；带 :: 的项来自 modules::*。
    const unknown = handlerEntries
      .filter((entry) => !entry.includes('::') && entry !== 'probe_media_info')
      .filter((entry) => !exported.has(entry))
    expect(unknown).toEqual([])
  })

  it('R1-1 parse_startup_args 已注册（命令行启动参数）', () => {
    expect(registered.has('parse_startup_args')).toBe(true)
  })

  it('R1-9 list_media_files 已注册（文件夹递归扫描）', () => {
    expect(registered.has('list_media_files')).toBe(true)
  })

  it('R2.5 队列持久化两个命令已注册', () => {
    expect(registered.has('load_task_queue')).toBe(true)
    expect(registered.has('save_task_queue')).toBe(true)
  })
})
