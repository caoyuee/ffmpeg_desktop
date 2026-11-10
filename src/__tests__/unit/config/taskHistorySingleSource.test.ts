import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * R3.2 防复发门禁：任务历史是「队列快照的只读投影」，不是第二份状态。
 * 聚合口径只在 config/taskHistory.ts 定义一次；Rust 只提供纯文件体积查询，
 * 不认识历史/统计 schema；不引入独立的历史持久化文件或第二套持久化命令。
 */
const root = process.cwd()
const read = (relative: string) =>
  existsSync(resolve(root, relative)) ? readFileSync(resolve(root, relative), 'utf8') : ''

// 注释里会记录旧机制与设计决策；门禁只扫描真实代码（沿用 R2.1/R2.3/R2.4/R3.1 的教训）。
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

const frontendProduction = collectSources('src', /\.(ts|vue)$/).filter(
  (file) => !file.includes('__tests__'),
)
const rustProduction = collectSources('src-tauri/src', /\.rs$/)
const historyLayer = 'src/config/taskHistory.ts'
const historyPage = 'src/pages/History/index.vue'
const libRs = 'src-tauri/src/lib.rs'
const handlerBlock = read(libRs).match(/generate_handler!\[([\s\S]*?)\]/)?.[1] ?? ''
const handlerEntries = handlerBlock
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean)

/** 统计某个导出函数在整个前端生产代码里的定义次数。 */
function definitionCount(name: string): number {
  const pattern = new RegExp(`export (?:async )?function ${name}\\b`, 'g')
  return frontendProduction.reduce((sum, file) => sum + (code(file).match(pattern)?.length ?? 0), 0)
}

describe('R3.2 任务历史与统计（防复发门禁）', () => {
  it('唯一聚合层存在，且所有口径函数各只定义一次', () => {
    const layer = code(historyLayer)
    expect(layer.length).toBeGreaterThan(1000)
    for (const name of [
      'buildTaskHistory',
      'summarizeHistory',
      'filterHistory',
      'sortHistory',
      'rankByCompression',
      'exportHistory',
      'isHistoryTask',
    ]) {
      expect(definitionCount(name)).toBe(1)
    }
    expect(layer).toMatch(/HISTORY_SCHEMA_VERSION/)
    expect(layer).toMatch(/HISTORY_FORMAT/)
  })

  it('字节格式化只定义一次，历史层不重复造轮子', () => {
    expect(definitionCount('formatBytes')).toBe(1)
    expect(code(historyLayer)).not.toMatch(/function formatBytes\b/)
  })

  it('Rust 侧零历史/统计知识，只有通用文件体积查询', () => {
    const rust = rustProduction.map(code).join('\n')
    expect(rust).not.toMatch(/successRate|TaskHistory|HISTORY_SCHEMA_VERSION/)
    expect(rust).not.toContain('ffmpeg-desktop/history')
    expect(rust).not.toContain('history.json')
    expect(rust).not.toMatch(/load_history|save_history|history_store/)
  })

  it('get_file_sizes 在 file_commands 定义、mod.rs 导出、lib.rs 注册', () => {
    expect(code('src-tauri/src/commands/file_commands.rs')).toMatch(/fn get_file_sizes\b/)
    expect(code('src-tauri/src/commands/mod.rs')).toMatch(/get_file_sizes/)
    expect(handlerBlock).toContain('get_file_sizes')
  })

  it('注册表为 40 项（RM1 新增 exe 路径查询），5 个预设命令仍在', () => {
    expect(handlerEntries).toHaveLength(40)
    for (const name of [
      'load_presets',
      'save_preset',
      'delete_preset',
      'export_preset',
      'import_preset',
    ]) {
      expect(handlerBlock).toContain(`preset_manager::${name}`)
    }
  })

  it('没有独立的历史持久化命令或第二套队列快照', () => {
    const allFrontend = frontendProduction.map(code).join('\n')
    expect(allFrontend).not.toMatch(/load_task_history|save_task_history|history\.json/)
    expect(rustProduction.map(code).join('\n')).not.toMatch(/tasks_history|history_snapshot/)
  })

  it('历史页面从 taskStore.tasks 派生，不维护第二份状态', () => {
    const page = code(historyPage)
    expect(page.length).toBeGreaterThan(0)
    expect(page).toMatch(/useTaskStore\(/)
    expect(page).toMatch(/buildTaskHistory\(/)
    expect(page).not.toMatch(/ref<\s*Task(?:HistoryEntry)?\[\]\s*>\(/)
    expect(page).not.toMatch(/JSON\.parse\(/)
  })

  it('路由 /history 与导航项都已接入', () => {
    expect(code('src/router/index.ts')).toContain("path: 'history'")
    expect(code('src/components/NavigationTabs/NavigationTabs.vue')).toContain("'/history'")
  })

  it('store 暴露 clearHistory，且只清终态', () => {
    const store = code('src/store/taskStore.ts')
    expect(store).toMatch(/function clearHistory\b/)
    expect(store).toMatch(/clearHistory,/)
  })

  it('中英文案都有 nav.history 与 page.history 的统计/筛选/导出键', () => {
    const zh = read('src/i18n/locales/zh-CN.ts')
    const en = read('src/i18n/locales/en-US.ts')
    for (const key of [
      'history:',
      'successRate',
      'totalTasks',
      'avgDuration',
      'compression',
      'copyCsv',
      'copyJson',
      'clearHistory',
      'empty',
    ]) {
      expect(zh).toContain(key)
      expect(en).toContain(key)
    }
  })
})
