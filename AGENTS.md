# AGENTS.md — FFmpeg Desktop

当前目录就是 FFmpeg Desktop 项目根目录。权威参考请阅读 `CLAUDE.md`（代码库架构、命令、约束）。

## 编码前必读

**写任何代码前，必须先读 `.agents/docs/前端结构规范.md`**，确保目录结构、命名、样式、i18n 全部合规。

同时遵循 `.agents/skills/` 中的技能流程（design → test → implement → verify）。

## 关键约束速查

| 约束 | 详情 |
|------|------|
| 包管理器 | pnpm 10.27+（强制，pnpm install 前先 `export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh"`） |
| 组件文件 | `PascalCase/PascalCase.vue`，禁止 `index.vue` |
| 页面入口 | `index.vue`（仅页面允许） |
| 脚本 | `<script setup lang="ts">`，TypeScript 泛型 Props/Emits |
| 样式 | `<style scoped>`，CSS 变量 + 回退值，禁止硬编码颜色 |
| i18n | 所有用户可见文本用 `t()`，中英文同步 |
| 对话框 | 禁止原生 `alert/confirm/prompt`，用 `ConfirmDialog`/`Toast` |
| 类型检查 | `vue-tsc --noEmit` 必须通过 |
| FFmpeg 执行 | 新功能用 task manager 路径（`start_ffmpeg`），不用 legacy executor |

## 目录速查

| 位置 | 内容 |
|------|------|
| `CLAUDE.md` | 完整架构、命令、已知问题 |
| `.agents/docs/前端结构规范.md` | 编码规范（写代码前必读） |
| `.agents/docs/功能对比清单.md` | 与 FFmpegFreeUI 原版功能差异 |
| `.agents/docs/业务操作手册.md` | 用户操作指南 |
| `.agents/rules/` | Agent 行为规则 |
| `.agents/skills/` | 技能流程（TDD、debug、code review 等） |
| `.agents/docs/` | 项目文档和代码审查历史 |
| `.agents/specs/` | 功能规格说明 |
