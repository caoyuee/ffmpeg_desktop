import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { SETTINGS_STORAGE_KEY } from '@/config/settings'

// R2.3 防复发门禁：三套设置 + 两套文件列表模型合一后，
// 任何人都不能再把旧 store、旧 localStorage 键或局部文件列表状态加回来。
// 《架构与数据流》§4 规定：设置只有 config/settings.ts + store/settingsStore.ts 两层。
const root = process.cwd()
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')
const exists = (relative: string) => existsSync(resolve(root, relative))

// 注释里会记录被删除的旧模块名；门禁只检查真实代码引用（吸取 R2.1 正则误伤的教训）。
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
const e2eSources = collectSources('e2e', /\.ts$/)
// 迁移代码必须读旧键，除此之外前端源码不应再出现旧键。
const withoutMigration = frontendSources.filter((f) => f !== 'src/config/settings.ts')

describe('R2.3 状态体系统一（防复发门禁）', () => {
  it('旧设置模块与半孤立 hook 已删除', () => {
    const removed = [
      'src/store/settingStore.ts',
      'src/store/ffmpegSettingsStore.ts',
      'src/utils/appSettings.ts',
      'src/hooks/useFileList.ts',
      'src/__tests__/unit/stores/settingStore.test.ts',
    ]
    expect(removed.filter(exists)).toEqual([])
  })

  it('单一事实源与唯一 store 各自只定义一次', () => {
    expect(SETTINGS_STORAGE_KEY).toBe('ffmpegDesktop.settings')
    expect(
      frontendSources.filter((f) => /export const SETTINGS_STORAGE_KEY/.test(code(f))),
    ).toEqual(['src/config/settings.ts'])
    expect(frontendSources.filter((f) => /export const useSettingsStore/.test(code(f)))).toEqual([
      'src/store/settingsStore.ts',
    ])
    expect(
      frontendSources.filter((f) => /export const DEFAULT_APP_SETTINGS/.test(code(f))),
    ).toEqual(['src/config/settings.ts'])
  })

  it('前端源码不再引用旧设置 store / 旧读写函数 / 局部文件列表 hook', () => {
    const offenders = frontendSources.filter((file) =>
      /useSettingStore|useFFmpegSettingsStore|loadAppSettings|saveAppSettings|utils\/appSettings|useFileList\b/.test(
        code(file),
      ),
    )
    expect(offenders).toEqual([])
  })

  it('除迁移代码外，不再直接读写旧的 localStorage 设置键', () => {
    const offenders = withoutMigration.filter((file) =>
      /["'](?:appSettings|ffmpeg_settings|setting_info)["']|getItem\(\s*["'](?:theme|language)["']|setItem\(\s*["'](?:theme|language)["']/.test(
        code(file),
      ),
    )
    expect(offenders).toEqual([])
  })

  it('store/index.ts 只导出归一的 settingsStore 与 fileListStore', () => {
    const barrel = code('src/store/index.ts')
    expect(barrel).toMatch(/useSettingsStore/)
    expect(barrel).toMatch(/useFileListStore/)
    expect(barrel).not.toMatch(/useSettingStore|useFFmpegSettingsStore/)
  })

  it('hooks/index.ts 不再导出已删除的 useFileList', () => {
    expect(code('src/hooks/index.ts')).not.toMatch(/useFileList/)
  })

  it('FileItem 模型只在 types 定义一次，fileListStore 以它为状态类型', () => {
    const definers = frontendSources.filter((file) =>
      /export interface FileItem\b/.test(code(file)),
    )
    expect(definers).toEqual(['src/types/fileList.ts'])

    const store = code('src/store/fileListStore.ts')
    expect(store).toMatch(/ref<FileItem\[\]>/)
    expect(store).toMatch(/@\/types\/fileList/)
  })

  it('E2E 也只读写唯一设置键，不再断言旧的 localStorage 键', () => {
    const offenders = e2eSources.filter((file) =>
      /(?:getItem|setItem)\(\s*["'](?:appSettings|ffmpeg_settings|theme|language)["']/.test(
        code(file),
      ),
    )
    expect(offenders).toEqual([])
  })

  it('设置页不再持有本地 settings 副本或调用旧的 load/save', () => {
    const page = code('src/pages/Settings/index.vue')
    expect(page).toMatch(/useSettingsStore/)
    expect(page).not.toMatch(/ref<AppSettings>|loadAppSettings|saveAppSettings/)
  })
})
