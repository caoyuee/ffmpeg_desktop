# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

当前目录就是 FFmpeg Desktop 项目根目录。所有命令均相对于本目录执行。

**编码前必读**：`.agents/docs/前端结构规范.md`（硬性规范）+ `.agents/docs/接力开发手册.md`（陷阱清单）。项目完整状态见 `.agents/docs/项目现状审计报告.md`（含 P0/P1/P2 问题分级），本文只保留开发所需的速查事实。

## 快速参考

```bash
# pnpm 不在 PATH 时：export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh"
pnpm install                  # 必须 pnpm（packageManager 强制 12.18.0）
pnpm dev                      # 仅浏览器（Tauri API 全 mock）
pnpm tauri dev                # 完整桌面应用
pnpm build / pnpm typecheck   # vue-tsc --noEmit 必须通过
pnpm test:run / test:coverage # Vitest（happy-dom）
cd src-tauri && cargo test    # Rust 单测（cargo 可能需要 ~/.cargo/bin 进 PATH）
bash scripts/preflight.sh     # 全量预检（含 CSP 断言）
```

## 架构速查

- **前端**：Vue 3.5（`<script setup lang="ts">`）、Pinia 3、Vue Router 4、vue-i18n 9、Vite 7。别名 `@` → `src/`。
- **后端**：Tauri 2.9（Rust），入口 `src-tauri/src/lib.rs::run()`，`generate_handler!` 注册 **39 个 command**（R1 新增 2 个、R2.1 移除 2 个 legacy、R2.5 新增 2 个队列持久化命令；R3.1 未新增命令只改签名；R3.2 新增 `get_file_sizes` 通用体积查询；R3.3~R3.8 未新增命令，`parse_startup_args` 改为纯 argv 透传；R1-7 收官时 `load/save/delete_preset` 增加可选 `dir` 参数，命令数不变）。
- **路由**：`/` 重定向 `/workbench`（R3.8 工作台为管道起点）；15 个业务页（R3.2 新增 `/history`，R3.8 新增 `/workbench` `/watch` `/ab`）+ `/independent-panel`（独立窗口），全部挂 MainLayout；导航按「工作流/工具/监视/系统」四组。
- **单一执行路径（R2.1 起，关键）**：所有 FFmpeg 进程都走 `modules/task_manager.rs::start_ffmpeg`（shell_words 解析、`ffmpeg-progress/finish/error/log` 事件带 taskId）。队列任务由 `taskStore` 并发调度；一次性任务（画质评测）走 `hooks/useTransientFFmpegTask`。事件名与 payload 的单一事实源是 `utils/ffmpegEvents.ts`；legacy executor 与无前缀事件已删除，`legacyPath.test.ts` 防止回流。
- **命令构建与元数据单一事实源（R2.2 起，关键）**：命令行只由 `utils/commandBuilder.ts::FFmpegCommandBuilder.build` 生成；编码器与容器兼容性元数据只在 `config/codecDatabase.ts`（`CODEC_DATABASE` + `FORMAT_COMPATIBILITY` + 纯查询函数）。旧构建器与 `useCodecFilter` 已删除，**禁止静默改写用户选择的编码器**——OutputSettings 必须由用户点击确认后才调整；新增元数据不得另起模块，`singleBuilder.test.ts` 会拦。
- **状态管理（R2.3 起）**：设置只有 `config/settings.ts`（schema/默认值/规范化/唯一键/旧键迁移）+ `store/settingsStore.ts`（setup 风格响应式门面）；文件列表只有 `store/fileListStore.ts`（`FileItem[]` + 派生 `files` 视图）。`settingStore`/`appSettings`/`ffmpegSettingsStore`/`useFileList` 已删，`config/stateUnification.test.ts` 防止回流。其余：taskStore/presetStore/logsStore/softInfoStore/hardwareCapabilityStore。
- **设置单一事实源（R2.3 起，关键）**：Vue 外读写设置用 `config/settings.ts::loadSettings()/saveSettings()`，Vue 内用 `store/settingsStore.ts::commit()/update()`；禁止再直接读写 `theme`/`language`/`appSettings`/`ffmpeg_settings`，禁止新增设置 store 或页面本地 settings 副本。
- **预设单一事实源（R2.4 起，关键）**：`types/preset.ts` 是形状/默认值/`PRESET_SCHEMA_VERSION` 的唯一定义，`config/presetSchema.ts` 是 `normalizePreset` / `createDefaultPreset` 的唯一入口；Rust `preset_manager.rs` 只透传 `serde_json::Value`，**禁止在 Rust 侧重建预设结构体**。任何后端预设返回值必须先过 `normalizePreset`；`createdAt/updatedAt` 是 ISO 字符串不是 `Date`；禁止 `{ ...DEFAULT_PRESET }` 浅拷贝。防线：`config/presetSingleSource.test.ts`。
- **队列持久化（R2.5 起，关键）**：`config/taskQueueSchema.ts` 是快照 DTO / 清洗 / 重启状态迁移的唯一入口，`store/taskStore.ts` 独占 `restoreQueue()` / `flushPersist()` 调度，Rust `modules/task_queue_store.rs` 只原子透传 `tasks.json` blob，**禁止在 Rust 重建 Task 结构体**。快照只含元数据（`logs` / `progress` / `pid` / `stoppedByUser` / `elapsedTime` 不落盘）；只有 `main.ts` 的主窗口（`label === 'main'`）能恢复与写盘，独立窗口必须保持 `persistenceEnabled = false`，否则两份 Pinia 实例会互相覆盖磁盘。禁止用 localStorage 另起队列持久化通道。防线：`config/taskQueuePersistence.test.ts`。
- **预设分享格式（R3.1 起，关键）**：`config/presetShare.ts` 是分享信封（format `ffmpeg-desktop/preset` v1）/ 版本兼容 / 6 类错误码 / `FFD1:` 文本分享码 / `.ffpreset.json` 文件名的唯一入口；Rust `preset_manager.rs` 的 `export_preset` / `import_preset` 只做纯文本 IO，**禁止在 Rust 解析预设或分享格式**；分享内容剥离 `id`/`createdAt`/`updatedAt`，导入一律经 `savePreset` 生成新 id；禁止在 store / UI 自行 `JSON.parse` 或另建第二套格式。防线：`config/presetShareSingleSource.test.ts`。
- **任务历史（R3.2 起，关键）**：`config/taskHistory.ts` 是终态投影 / 统计口径 / 筛选排序 / 压缩比 / CSV·JSON 导出的唯一入口；历史是 `taskStore.tasks` 的**只读投影**，禁止另建 `history.json`、第二份状态或独立持久化命令；文件体积只经 Rust `get_file_sizes` 按需查询且不落盘；清空只走 `taskStore.clearHistory()`（不动进行中任务，且 `clearCompletedTasks()` 语义不变）；禁止在页面自行统计或 `JSON.parse`。防线：`taskHistorySingleSource.test.ts`。
- **R3 管道扩展（R3.3~R3.8 起，关键）**：任务草稿只走 `config/taskDraft.ts`（`createTaskDraft(s)` / `previewCommand`，四处调用方已收敛，禁止再手写 `generateOutputPath + FFmpegCommandBuilder.build + 字段拷贝`）；CLI 解析只走 `config/cliArgs.ts`（Rust 只回原始 argv，禁止把参数名搬回 `startup_args.rs`）；监控规则只存 `AppSettings.watchRules`；重试只走 `config/taskRetry.ts` + `taskStore.retryTask()`；报告导出只走 `config/mediaReport.ts`；CSV 只走 `config/csv.ts`。**R1-7 设置生效（第十轮起，关键）**：输出目录默认值只走 `settingsStore.taskOutputDir` → `taskDraft.resolveOutputFile`（新入队调用方必须注入第 4 参 `outputDir`，显式 outputFile 不受设置影响）；预设目录只经 `presetStore.presetDirArg()` 以 `dir` 参数传给 Rust（空串传 null，Rust `resolve_preset_dir` 空值回退默认目录），禁止在 Rust 持有目录状态。防线：`config/settingsEffectSingleSource.test.ts`。
- 详见 `.agents/docs/架构与数据流.md`（事件契约、命令注册表、TS↔Rust 类型对齐表）。

## 已知问题索引（开发时避让）

完整清单见《项目现状审计报告》，高频踩坑摘要：

> 2026-11-07 已完成 R0 + R1 全部 P0/P1 + R2.1~R2.5（R2 架构收敛全部收口）+ R3 全阶段（R3.1 分享生态、R3.2 任务历史、R3.3~R3.8 监控/CLI/A-B/重试/报告/UI 轻改）；下表中的「已修 / 已删」项均有回归测试或静态门禁守护。路线图 R0~R3 全部收口。

- ✅ 已修：`parse_startup_args` 已注册 + `commands/mod.rs` 导出；新增 command **必须同时注册**（`commandRegistry.test.ts` 静态门禁）
- ✅ 已修：`TaskQueue` emit `select`、TaskItem 选中态、stdin 链路；`startTask` 自带并发闸门，`tryStartNext()` 一次填满额度
- ✅ 已修：`TaskProgress` 与 Rust `ProgressInfo` 对齐（`string | null` + `utils/progressFormat.ts` 解析）
- ✅ 已删：legacy 无前缀事件与 `execute_ffmpeg_command` / `stop_convert`；**禁止新增无前缀 `listen`**，每个 `listen` 必须有对应 `unlisten`（`listenerRegistry` 统一释放）；新增 FFmpeg 事件必须登记进 `utils/ffmpegEvents.ts`
- 路径处理统一走 `src/utils/pathUtils.ts`（normalize + `split(/[\\/]/)`，Windows 兼容）
- 版本四处文件已统一（package.json / Cargo.toml / tauri.conf.json / Home 读 `__APP_VERSION__`）；**tag `v0.1.7` 仍与版本文件 0.1.6 不一致，R0-2 待决策**
- `scripts/release-all.sh` 的 REPO_DIR 指向父目录，当前布局下不可直接运行

## 关键约束

- **必须 pnpm ≥12.18**（v11+ 起构建审批用 pnpm-workspace.yaml 的 allowBuilds；脚本子进程不再包含 pnpm 自身，npm scripts 内禁止递归调用 pnpm）；`vue-tsc --noEmit` 必须通过（严格模式：noUnusedLocals/noUncheckedIndexedAccess/exactOptionalPropertyTypes 等）
- **所有用户可见文本必须 i18n**（`t()`），中英同步；禁硬编码中文
- **禁原生弹窗**（alert/confirm/prompt），用 ConfirmDialog/Toast
- **scoped 样式 + CSS 变量 + 回退值**，禁硬编码颜色；主题 light/dark/system 三态
- 组件 `PascalCase/PascalCase.vue` 禁 index.vue；页面入口才允许 index.vue
- 前端测试 mock 全部 Tauri API（`src/__tests__/setup.ts`）
- CSP 已收紧（`default-src 'self'`，connect-src 白名单含 api.github.com/gitee.com）；构建期 `assert-csp-safe-build.mjs` 断言无 eval——不要引入需要动态代码执行的依赖

## 测试

- 前端：Vitest + happy-dom，**66 文件 / 543 用例**全绿（2026-11-07，R1-7 收官后；净增 15 例为设置生效契约 / 静态门禁用例）
- 覆盖率阈值（`coverage.thresholds`，已验证生效）：lines 56 / functions 42 / branches 51 / statements 56，约定只升不降；当前实测 68.40 / 58.85 / 63.12 / 68.60（lines/functions/branches/statements，R1-7 收官后四项均较 R3.8 提升；按不顶峰值原则保持阈值不变、未下调）
- 后端：`cargo check` + `cargo test` 本机通过（2026-11-07，R1-7 收官复验）：**33 个 Rust 单测全绿**，仅 3 个既有 dead_code 警告 → V6 已定案
- E2E：Playwright，**浏览器 + Tauri mock 层**，不证明桌面功能可用
- 覆盖率数字必须实测（`pnpm test:coverage`），禁止引用历史报告结论

## Tauri 配置速查

- 开发端口 1421；identifier `com.william.ffmpeg-desktop`（连字符）
- 主窗口 1280×800，最小 1024×640
- 平台覆盖：`tauri.{linux,macos,windows}.conf.json`；无更新器构建用 `tauri.no-updater.conf.json`
- updater endpoint 指向 GitHub Releases（macOS 无 CI 构建，updater manifest 只覆盖 linux/windows x86_64）

## 文档同步义务

改代码必须同步文档：架构变更 →《架构与数据流》；发布变更 →《质量保障与发布》；UI 变更 →《UI-UX重设计规范》；修复审计问题 → 更新《项目现状审计报告》对应条目的证据等级。
