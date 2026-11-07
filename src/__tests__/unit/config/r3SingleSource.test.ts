import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import zhCN from '@/i18n/locales/zh-CN'
import enUS from '@/i18n/locales/en-US'

// R3.3~R3.8 防复发门禁：功能可以加，但「唯一事实源 / Rust 零业务知识 / 生效链路」
// 三条架构底线不能破。所有源码扫描一律先剥离注释（吸取 R2.1/R3.1 正则误伤教训）。
const root = process.cwd()
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')
const exists = (relative: string) => existsSync(resolve(root, relative))
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
const frontend = collectSources('src', /\.(ts|vue)$/)
const production = frontend.filter((f) => !f.includes('__tests__') && !f.includes('factories'))

function definers(symbol: string): string[] {
  return production.filter((f) =>
    new RegExp(`export (?:function|const|interface|class) ${symbol}\\b`).test(code(f)),
  )
}

describe('R3.3~R3.8 唯一事实源', () => {
  it('八个 config 层都存在，且关键导出各只定义一次', () => {
    const layers = [
      'src/config/csv.ts',
      'src/config/taskDraft.ts',
      'src/config/watchFolder.ts',
      'src/config/cliArgs.ts',
      'src/config/abCompare.ts',
      'src/config/taskRetry.ts',
      'src/config/mediaReport.ts',
      'src/config/taskMonitor.ts',
    ]
    expect(layers.filter((f) => !exists(f))).toEqual([])

    const symbols = [
      'escapeCsvCell',
      'createTaskDraft',
      'normalizeWatchRule',
      'parseCliArgs',
      'buildABPlan',
      'planRetry',
      'normalizeMediaInfo',
      'buildMonitorCells',
    ]
    symbols.forEach((symbol) => {
      expect(definers(symbol), `${symbol} 应只有一处定义`).toHaveLength(1)
    })
  })

  it('任务草稿是唯一命令构建入口：生产代码不再各自调用 FFmpegCommandBuilder.build', () => {
    const offenders = production.filter(
      (f) => f !== 'src/config/taskDraft.ts' && /FFmpegCommandBuilder\.build\(/.test(code(f)),
    )
    expect(offenders).toEqual([])
    expect(code('src/config/taskDraft.ts')).toMatch(/FFmpegCommandBuilder\.build\(/)
  })

  it('CSV 转义只在 config/csv.ts 定义，history 与 mediaReport 都复用它', () => {
    expect(definers('escapeCsvCell')).toEqual(['src/config/csv.ts'])
    expect(code('src/config/taskHistory.ts')).toMatch(/escapeCsvCell/)
    // mediaReport 走 toCsv() 整表导出（escapeCsvCell 由 csv.ts 内部消费）
    expect(code('src/config/mediaReport.ts')).toMatch(/toCsv/)
  })
})

describe('R3.4 命令行集成：Rust 零 CLI 知识 + 真实生效链路', () => {
  it('startup_args.rs 只返回原始 argv', () => {
    const rust = code('src-tauri/src/commands/startup_args.rs')
    expect(rust).toMatch(/Vec<String>/)
    expect(rust).not.toMatch(/serde_json|"input_file"|"preset_file"|"-3fui_file"/)
  })

  it('tauri.conf.json 声明文件关联（双击打开视频）', () => {
    const conf = read('src-tauri/tauri.conf.json')
    expect(conf).toMatch(/fileAssociations/)
    expect(conf).toMatch(/mp4/)
  })

  it('main.ts 经 parseCliArgs 解析并把输入真正送进队列', () => {
    const main = code('src/main.ts')
    expect(main).toMatch(/parseCliArgs/)
    expect(main).toMatch(/createTaskDraft|createTaskDrafts/)
    expect(main).toMatch(/addTask\(/)
  })

  it('CLI 解析层不依赖 Tauri / Vue', () => {
    const cli = code('src/config/cliArgs.ts')
    expect(cli).not.toMatch(/@tauri-apps|from ["']vue["']|pinia/)
  })
})

describe('R3 其余候选：页面只消费 config 层', () => {
  it('WatchFolder 页走唯一批量计划 + 已有 Rust 目录扫描，不自行 JSON.parse', () => {
    const page = code('src/pages/WatchFolder/index.vue')
    expect(page).toMatch(/planWatchBatch/)
    expect(page).toMatch(/list_media_files/)
    expect(page).toMatch(/createTaskDraft/)
    expect(page).not.toMatch(/JSON\.parse\(/)
  })

  it('ABCompare 页走唯一 A/B 计划，不自行构建命令或解析 JSON', () => {
    const page = code('src/pages/ABCompare/index.vue')
    expect(page).toMatch(/buildABPlan/)
    expect(page).not.toMatch(/FFmpegCommandBuilder\.build\(|JSON\.parse\(/)
  })

  it('MediaInfo 页报告导出只调 config 层', () => {
    const page = code('src/pages/MediaInfo/index.vue')
    expect(page).toMatch(/exportMediaReport/)
    expect(page).toMatch(/normalizeMediaInfo/)
  })

  it('重试只走 taskStore.retryTask，页面不自行克隆任务', () => {
    expect(definers('retryTask')).toEqual([]) // store 内部函数，不应在别处再定义 store
    const store = code('src/store/taskStore.ts')
    expect(store).toMatch(/function retryTask\(/)
    expect(store).toMatch(/planRetry\(/)
    expect(production.filter((f) => /function retryTask\(/.test(code(f)))).toEqual([
      'src/store/taskStore.ts',
    ])
  })

  it('TaskItem 监视墙使用唯一格式化层与 500ms 节流常量', () => {
    const item = code('src/components/TaskQueue/TaskItem.vue')
    expect(item).toMatch(/buildMonitorCells|MONITOR_THROTTLE_MS/)
    expect(read('src/components/TaskQueue/TaskItem.vue')).toMatch(/data-testid="monitor-line"/)
  })
})

describe('R3.8 UI/UX 重设计：token、base、信息架构', () => {
  it('theme.css 提供语义 token 且明暗两套都定义', () => {
    const theme = read('src/assets/styles/theme.css')
    ;[
      '--color-bg',
      '--color-surface',
      '--color-border',
      '--color-text',
      '--color-accent',
      '--color-ok',
      '--color-warn',
      '--color-err',
      '--fs-m',
      '--sp-4',
      '--r-md',
      '--sh-2',
      '--dur-base',
      '--ease-out',
    ].forEach((token) => expect(theme).toContain(token))
    // CSS 引号风格由 Prettier（singleQuote）统一，这里只断言语义不锁定引号
    expect(theme).toMatch(/data-theme=['"]light['"]/)
    expect(theme).toMatch(/data-theme=['"]dark['"]/)
  })

  it('global.css 补齐焦点可见与动效降级', () => {
    const global = read('src/assets/styles/global.css')
    expect(global).toMatch(/:focus-visible/)
    expect(global).toMatch(/prefers-reduced-motion/)
    expect(global).toMatch(/tabular-nums/)
  })

  it('导航改为语义 nav + 可聚焦 button + aria-current，且分组', () => {
    const nav = read('src/components/NavigationTabs/NavigationTabs.vue')
    expect(nav).toMatch(/<nav\b/)
    expect(nav).toMatch(/<button\b/)
    expect(nav).toMatch(/aria-current/)
    expect(code('src/components/NavigationTabs/NavigationTabs.vue')).toMatch(/workbench/)
  })

  it('默认落地页改为工作台，旧路由仍保留（不破坏既有入口）', () => {
    const router = code('src/router/index.ts')
    expect(router).toMatch(/redirect: '\/workbench'/)
    expect(router).toMatch(/path: 'queue'/)
    expect(router).toMatch(/path: 'history'/)
    expect(exists('src/pages/Workbench/index.vue')).toBe(true)
  })

  it('工作台空态与管道三区', () => {
    const page = read('src/pages/Workbench/index.vue')
    expect(page).toMatch(/data-testid="workbench-empty"/)
    expect(page).toMatch(/data-testid="workbench-files"/)
    expect(page).toMatch(/data-testid="workbench-params"/)
    expect(page).toMatch(/data-testid="workbench-queue"/)
  })
})

describe('R3 中英 i18n 一致性', () => {
  it('新增导航键双语齐全', () => {
    ;['workbench', 'watch', 'abCompare'].forEach((key) => {
      expect(zhCN.nav).toHaveProperty(key)
      expect(enUS.nav).toHaveProperty(key)
    })
  })

  it('新增页面分组键双语齐全', () => {
    ;['workbench', 'watch', 'abCompare', 'cli'].forEach((key) => {
      expect(zhCN.page).toHaveProperty(key)
      expect(enUS.page).toHaveProperty(key)
    })
    expect(zhCN.page.mediainfo).toHaveProperty('exportJson')
    expect(enUS.page.mediainfo).toHaveProperty('exportJson')
    expect(zhCN.page.queue).toHaveProperty('retry')
    expect(enUS.page.queue).toHaveProperty('retry')
  })

  it('i18n 结构与值数量对齐（新分组不漏译）', () => {
    const zhKeys = Object.keys((zhCN.page as Record<string, unknown>).workbench as object).sort()
    const enKeys = Object.keys((enUS.page as Record<string, unknown>).workbench as object).sort()
    expect(enKeys).toEqual(zhKeys)
    const zhWatch = Object.keys((zhCN.page as Record<string, unknown>).watch as object).sort()
    const enWatch = Object.keys((enUS.page as Record<string, unknown>).watch as object).sort()
    expect(enWatch).toEqual(zhWatch)
  })
})

describe('R3 命令注册表未膨胀', () => {
  it('generate_handler! 仍为 39 项，且没有新增 watch / retry / report 命令', () => {
    const lib = read('src-tauri/src/lib.rs')
    const handler = /generate_handler!\[([\s\S]*?)\]/.exec(lib)?.[1] ?? ''
    const entries = handler
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    expect(entries).toHaveLength(39)
    expect(handler).not.toMatch(/watch_folder|retry_task|export_report|load_history|save_history/)
  })
})
