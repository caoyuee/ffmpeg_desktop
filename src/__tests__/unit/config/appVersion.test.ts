import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { APP_VERSION } from '@/config/appVersion'

// R0-1 回归门禁：四处版本必须始终一致，任何一处漂移都会在 CI 暴露。
// Vitest 的 root 默认为 cwd（项目根），用 cwd 可避开不同运行时 import.meta.url 的 scheme 差异。
const root = process.cwd()
const read = (relative: string) => readFileSync(resolve(root, relative), 'utf8')

const packageJson = JSON.parse(read('package.json')) as { version: string }
const cargoToml = read('src-tauri/Cargo.toml')
const tauriConf = JSON.parse(read('src-tauri/tauri.conf.json')) as { version: string }
const homePage = read('src/pages/Home/index.vue')

const cargoVersion = cargoToml.match(/^\[package\][\s\S]*?^version\s*=\s*"([^"]+)"/m)?.[1]

describe('R0-1 单一版本源', () => {
  it('构建期注入的 APP_VERSION 等于 package.json 版本', () => {
    expect(APP_VERSION).toBe(packageJson.version)
  })

  it('版本号符合 x.y.z', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('Cargo.toml 与 package.json 版本一致', () => {
    expect(cargoVersion).toBe(packageJson.version)
  })

  it('tauri.conf.json 与 package.json 版本一致', () => {
    expect(tauriConf.version).toBe(packageJson.version)
  })

  it('Home 页不再硬编码版本号', () => {
    expect(homePage).toContain('{{ appVersion }}')
    expect(homePage).not.toMatch(/page\.home\.version.*?:\s*\d+\.\d+\.\d+/)
  })
})
