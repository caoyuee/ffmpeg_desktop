# AGENTS.md — FFmpeg Desktop

当前目录就是 FFmpeg Desktop 项目根目录。权威参考请阅读 `CLAUDE.md`（代码库架构、命令、约束）。

## 编码前必读

**写任何代码前，必须先读 `.agents/docs/前端结构规范.md`**，确保目录结构、命名、样式、i18n 全部合规。

同时遵循 `.agents/skills/` 中的技能流程（design → test → implement → verify）。

## 关键约束速查

| 约束        | 详情                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------- |
| 包管理器    | pnpm 12.18+（强制，pnpm install 前先 `export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh"`；构建审批配置在 pnpm-workspace.yaml 的 allowBuilds） |
| 组件文件    | `PascalCase/PascalCase.vue`，禁止 `index.vue`                                                      |
| 页面入口    | `index.vue`（仅页面允许）                                                                          |
| 脚本        | `<script setup lang="ts">`，TypeScript 泛型 Props/Emits                                            |
| 样式        | `<style scoped>`，CSS 变量 + 回退值，禁止硬编码颜色                                                |
| i18n        | 所有用户可见文本用 `t()`，中英文同步                                                               |
| 对话框      | 禁止原生 `alert/confirm/prompt`，用 `ConfirmDialog`/`Toast`                                        |
| 类型检查    | `vue-tsc --noEmit` 必须通过                                                                        |
| FFmpeg 执行 | 新功能用 task manager 路径（`start_ffmpeg`），不用 legacy executor                                 |

## 目录速查

| 位置                               | 内容                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| `CLAUDE.md`                        | 架构速查、命令、约束、已知问题索引                         |
| `.agents/docs/项目现状审计报告.md` | 项目真实状态与问题分级（P0/P1/P2），接手先读               |
| `.agents/docs/架构与数据流.md`     | 前后端架构、单一执行路径、事件契约、状态版图与持久化清单   |
| `.agents/docs/重构路线图.md`       | 分阶段改造方案（R0 治理 → R1 修复 → R2 收敛 → R3 进化）    |
| `.agents/docs/接力开发手册.md`     | 上手指南与陷阱清单（写代码前必读）                         |
| `.agents/docs/前端结构规范.md`     | 编码规范（写代码前必读）                                   |
| `.agents/docs/UI-UX重设计规范.md`  | 设计 token 与信息架构重设计方向                            |
| `.agents/docs/质量保障与发布.md`   | 测试策略、发布矩阵与标准发布流程                           |
| `.agents/docs/业务操作手册.md`     | 用户操作指南                                               |
| `.agents/docs/archive/`            | 历史文档（复刻期分析、旧审查报告、功能对比清单），仅供考古 |
| `.agents/rules/`                   | Agent 行为规则                                             |
| `.agents/skills/`                  | 技能流程（TDD、debug、code review 等）                     |
| `.agents/specs/`                   | 功能规格说明                                               |
