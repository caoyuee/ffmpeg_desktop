/**
 * 应用版本唯一来源（重构路线图 R0-1）。
 *
 * `__APP_VERSION__` 由 vite.config.ts / vitest.config.ts 在构建期从 package.json 注入。
 * 与 `scripts/bump-version.mjs` 同步的 Cargo.toml、tauri.conf.json 一起构成四处一致的版本。
 * 任何 UI 都不得再硬编码版本号。
 */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'
