import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * R2.5 防复发门禁：任务队列只有一条持久化通道。
 * Rust 只做 JSON blob 原子透传（不镜像 Task 结构体），前端只有一份快照/恢复 schema，
 * 且只有主窗口能做恢复与写盘（独立窗口加载同一个 main.ts，会有第二份 Pinia 实例）。
 */
const root = process.cwd()
const read = (relative: string) =>
  existsSync(resolve(root, relative)) ? readFileSync(resolve(root, relative), 'utf8') : ''

// 注释里会记录旧机制与已删结构名；门禁只扫描真实代码（沿用 R2.1/R2.3/R2.4 的教训）。
function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\r\n]*/g, '')
}

function collectSources(relativeDir: string, extensions: RegExp, acc: string[] = []): string[] {
  if (!existsSync(resolve(root, relativeDir))) return acc
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
const rustStore = 'src-tauri/src/modules/task_queue_store.rs'
const libRs = 'src-tauri/src/lib.rs'

describe('R2.5 任务队列持久化（防复发门禁）', () => {
  it('Rust 持久化模块存在且只透传 JSON 字符串，不重建 Task 结构体', () => {
    const rust = code(rustStore)
    expect(rust.length).toBeGreaterThan(0)
    expect(rust).not.toMatch(/pub struct\b/)
    expect(rust).not.toMatch(/struct Task\b/)
    expect(rust).not.toMatch(/enum TaskStatus\b/)
    expect(rust).toMatch(/load_task_queue/)
    expect(rust).toMatch(/save_task_queue/)
  })

  it('落盘位置固定为 app data dir 的 tasks.json，且写入是原子替换', () => {
    const rust = code(rustStore)
    expect(rust).toMatch(/app_data_dir\(\)/)
    expect(rust).toContain('tasks.json')
    expect(rust).toMatch(/rename\(/)
    expect(rust).toMatch(/\.tmp|\.with_extension|tmp_path/)
  })

  it('Rust 侧有体积上限与 JSON 对象校验，防止误把日志 blob 写进磁盘', () => {
    const rust = code(rustStore)
    expect(rust).toMatch(/MAX_QUEUE_BYTES|MAX_SNAPSHOT_BYTES/)
    expect(rust).toMatch(/serde_json::from_str|from_str::<Value>/)
    expect(rust).toMatch(/is_object\(\)/)
  })

  it('两个队列命令都已注册进 generate_handler!', () => {
    const handlerBlock = read(libRs).match(/generate_handler!\[([\s\S]*?)\]/)?.[1] ?? ''
    expect(handlerBlock).toContain('task_queue_store::load_task_queue')
    expect(handlerBlock).toContain('task_queue_store::save_task_queue')
  })

  it('Rust 模块已挂到 modules/mod.rs', () => {
    expect(code('src-tauri/src/modules/mod.rs')).toMatch(/pub mod task_queue_store/)
  })

  it('快照 schema / 序列化 / 恢复各自只有一处定义', () => {
    expect(
      frontendSources.filter((f) => /export const TASK_QUEUE_SCHEMA_VERSION\b/.test(code(f))),
    ).toEqual(['src/config/taskQueueSchema.ts'])
    expect(
      frontendSources.filter((f) => /export function toPersistedQueue\b/.test(code(f))),
    ).toEqual(['src/config/taskQueueSchema.ts'])
    expect(
      frontendSources.filter((f) => /export function serializeTaskQueue\b/.test(code(f))),
    ).toEqual(['src/config/taskQueueSchema.ts'])
    expect(frontendSources.filter((f) => /export function restoreTasks\b/.test(code(f)))).toEqual([
      'src/config/taskQueueSchema.ts',
    ])
  })

  it('taskStore 走唯一 schema 层，且持久化默认关闭（不影响非主窗口/单测）', () => {
    const store = code('src/store/taskStore.ts')
    expect(store).toMatch(/from "@\/config\/taskQueueSchema"|from '@\/config\/taskQueueSchema'/)
    expect(store).toMatch(/restoreTasks\(/)
    expect(store).toMatch(/toPersistedQueue\(|serializeTaskQueue\(/)
    expect(store).toMatch(/persistenceEnabled/)
    expect(store).toMatch(
      /persistenceEnabled\s*=\s*ref\(false\)|const persistenceEnabled\s*=\s*ref\(false\)/,
    )
    expect(store).toMatch(/watch\(/)
  })

  it('main.ts 只在主窗口恢复队列并启用持久化', () => {
    const main = code('src/main.ts')
    expect(main).toContain("'main'")
    expect(main).toMatch(/getCurrentWindow\(\)/)
    expect(main).toMatch(/restoreQueue\(\)/)
  })

  it('生产代码不把任务队列写进 localStorage（禁止第二套通道）', () => {
    const offenders = productionSources.filter((file) =>
      /localStorage\.setItem\([^)]*(?:tasks|queue)/i.test(code(file)),
    )
    expect(offenders).toEqual([])
  })
})
