import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const root = resolve(process.cwd())
const code = (p: string) => {
  // 剥离块注释与行注释，防止文档性文字误伤静态扫描（沿用既有门禁教训）。
  return readFileSync(join(root, p), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) yield* walk(full)
    else if (/\.(ts|vue)$/.test(name)) yield full
  }
}

const productionSources = [...walk('src')].filter(
  (f) => !f.includes('__tests__') && !f.includes('node_modules'),
)

describe('R1-7 静态门禁：长期设置生效链路唯一', () => {
  it('resolveOutputFile 只在 taskDraft.ts 定义一次', () => {
    const layer = 'src/config/taskDraft.ts'
    expect(code(layer)).toMatch(/export function resolveOutputFile\(/)
    const offenders = productionSources.filter(
      (f) => f !== layer && /function resolveOutputFile\(/.test(code(f)),
    )
    expect(offenders).toEqual([])
  })

  it('所有 createTaskDraft(s) 生产调用点都接入 taskOutputDir（页面/CLI）或显式传递', () => {
    // 页面与 CLI 调用点必须出现 settings 的 taskOutputDir；纯函数层内部（abCompare/taskDraft）除外。
    const callers = [
      'src/pages/PrepareFiles/index.vue',
      'src/pages/EncodingQueue/index.vue',
      'src/pages/Workbench/index.vue',
      'src/pages/WatchFolder/index.vue',
      'src/pages/IndependentPanel/index.vue',
      'src/pages/ABCompare/index.vue',
      'src/main.ts',
    ]
    const missing = callers.filter((f) => !code(f).includes('taskOutputDir'))
    expect(missing).toEqual([])
  })

  it('settingsStore 提供 taskOutputDir computed 且 settings.ts 仍为唯一设置事实源', () => {
    expect(code('src/store/settingsStore.ts')).toMatch(/taskOutputDir/)
    const offenders = productionSources.filter(
      (f) =>
        f !== 'src/store/settingsStore.ts' &&
        f !== 'src/store/settingsStore.test.ts' &&
        /taskOutputDir/.test(code(f)) &&
        !/config\/taskDraft|pages\/|main\.ts/.test(f),
    )
    // presetStore 允许读 presetDir，但 taskOutputDir 只应出现在设置 store 与调用方。
    expect(offenders.filter((f) => f.includes('presetStore'))).toEqual([])
  })

  it('presetStore 不再有死 ref presetDirectory，且三个命令都透传 dir', () => {
    const store = code('src/store/presetStore.ts')
    expect(store).not.toMatch(/presetDirectory/)
    for (const command of ['load_presets', 'save_preset', 'delete_preset']) {
      expect(store).toMatch(new RegExp(`'${command}'`))
    }
    expect(store).toMatch(/dir:\s*presetDirArg\(\)/)
  })

  it('Rust preset_manager 支持 resolve_preset_dir 且三个命令带 dir 参数', () => {
    const rust = code('src-tauri/src/modules/preset_manager.rs')
    expect(rust).toMatch(/fn resolve_preset_dir\(/)
    expect(rust).toMatch(/pub fn load_presets\(app: AppHandle, dir: Option<String>\)/)
    expect(rust).toMatch(/pub fn save_preset\(app: AppHandle, preset: Value, dir: Option<String>\)/)
    expect(rust).toMatch(
      /pub fn delete_preset\(app: AppHandle, preset_id: String, dir: Option<String>\)/,
    )
    // export/import 是用户选择的外部路径，与预设目录无关，签名必须保持纯文本 IO。
    expect(rust).toMatch(/pub fn export_preset\(file_path: String, content: String\)/)
    expect(rust).toMatch(/pub fn import_preset\(file_path: String\)/)
  })

  it('P1-2 收尾后设置页不再有任何「暂未生效」标注，三项均有语义提示', () => {
    const page = code('src/pages/Settings/index.vue')
    // 第十一轮：taskPriority / showNotification / logRetentionDays 全部接入生效链路，
    // not-effective-tag 从模板与样式中整体移除，防止回流。
    const tags = page.match(/<span class="not-effective-tag"/g) ?? []
    expect(tags).toHaveLength(0)
    expect(page).not.toMatch(/not-effective-tag/)
    // 语义提示替代标注，且与生效链路一一对应。
    expect(page).toMatch(/taskPriorityHint/)
    expect(page).toMatch(/showNotificationHint/)
    expect(page).toMatch(/logRetentionHint/)
    expect(page).not.toMatch(/defaultOutputDir[\s\S]{0,200}not-effective-tag/)
    expect(page).not.toMatch(/customOutputDir[\s\S]{0,200}not-effective-tag/)
    expect(page).not.toMatch(/presetDir[\s\S]{0,200}not-effective-tag/)
  })

  it('三个设置项的消费链路真实存在（防标注复发）', () => {
    // taskPriority → 入队盖章 + 优先级调度。
    const taskStore = code('src/store/taskStore.ts')
    expect(taskStore).toMatch(/taskData\.priority \?\? loadSettings\(\)\.taskPriority/)
    expect(taskStore).toMatch(/pickNextPendingTask\(tasks\.value\)/)
    // showNotification → 终态推送应用内通知。
    expect(taskStore).toMatch(/loadSettings\(\)\.showNotification/)
    // logRetentionDays → 历史页投影过滤。
    const history = code('src/pages/History/index.vue')
    expect(history).toMatch(/filterHistoryByRetention\(/)
    expect(history).toMatch(/logRetentionDays/)
  })
})
