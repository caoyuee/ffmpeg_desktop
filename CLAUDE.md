# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

编写代码前**必须先读** `.agents/docs/前端结构规范.md`，确保目录结构、组件命名、样式、i18n 全部合规。

当前目录就是 FFmpeg Desktop 项目根目录。所有命令均相对于本目录执行。

## 快速参考

```bash
pnpm install                  # 必须使用 pnpm（package.json 中 packageManager 强制指定）
pnpm dev                      # Vite 开发服务器（仅浏览器，不含 Tauri）
pnpm tauri dev                # 完整桌面应用（前端 + Rust 后端）
pnpm build                    # 先类型检查（vue-tsc --noEmit）再 vite build
pnpm typecheck                # 仅类型检查

pnpm test:run                 # Vitest 单次运行（happy-dom 环境）
pnpm test                     # Vitest 监听模式
cd src-tauri && cargo test    # Rust 单元测试
pnpm test:all                 # 前端 + 后端测试 + 覆盖率报告
```

## 架构

- **前端**: Vue 3.5（Composition API，`<script setup lang="ts">`），Pinia 3，Vue Router 4，vue-i18n 9
- **后端**: Tauri 2.9（Rust），入口 `src-tauri/src/lib.rs` 的 `run()` 函数
- **打包**: Vite 构建到 `dist/`，Tauri 将其封装为原生二进制
- 前端通过 `invoke(commandName, args)`（来自 `@tauri-apps/api/core`）调用 Rust。命令名即 Rust 中 `#[tauri::command]` 函数名
- 路径别名 `@` → `src/`（在 `vite.config.ts` 和 `vitest.config.ts` 中配置）
- 应用通过 `src/main.ts` 启动，初始化 Pinia（含 `@tauri-store/pinia` 持久化插件）、Router、i18n、主题和任务事件监听

## 前端结构

| 目录 | 用途 |
|---|---|
| `src/pages/` | 路由级页面组件（12 个页面：Home, EncodingQueue, PrepareFiles, ParameterPanel, Merge, Mux, Player, Performance, QualityAssess, MediaInfo, Settings, IndependentPanel） |
| `src/components/` | 可复用 UI 组件：TaskQueue, ParameterPanel, PresetManager, Dialogs（ConfirmDialog, Toast, CropDialog, StreamSelectorDialog）, FilterPanel, ColorPanel, SubtitlePanel, TrimPanel, StreamPanel, NavigationTabs, VideoPlayer |
| `src/store/` | Pinia store（见下表） |
| `src/hooks/` | 组合式函数：`useFFmpegCommand`, `useFileList`, `useMediaProbe`, `useCodecFilter`, `useFormatters` |
| `src/utils/` | 纯工具函数：`commandBuilder.ts`（基于 PresetData 构建 FFmpeg 命令），`ffmpegCommandBuilder.ts`（基于 FFmpegCommandOptions 的独立命令构建器，含格式兼容性检查），`progressParser.ts`（stderr 进度解析），`ffmpegPath.ts`（从 localStorage 读取自定义路径） |
| `src/apis/` | `InvokeApi.ts` — FFmpeg 工具检测的封装调用（仅 2 个方法，其余 invoke 调用直接写在 store/hooks 中） |
| `src/config/` | `codecDatabase.ts` — 编解码器元数据（preset/profile/tune/pixFmt），覆盖 20 种编码器，207 行 |
| `src/i18n/` | vue-i18n 语言文件：`zh-CN`（完整），`en-US` |

### Pinia Store

| Store | 持久化方式 | 用途 |
|---|---|---|
| `taskStore` | 内存（非持久化） | 任务队列、进度追踪、任务生命周期。通过 `setupEventListeners()` 监听 Tauri 事件（`ffmpeg-progress`, `ffmpeg-finish`, `ffmpeg-error`）|
| `presetStore` | `@tauri-store/pinia` 插件 → app data dir JSON 文件 | 编码预设 CRUD + 导入/导出 + 复制 |
| `fileListStore` | 内存 | 输入文件列表（简单字符串数组） |
| `ffmpegSettingsStore` | `localStorage`（键 `ffmpeg_settings`） | 编码器选择和参数状态，全局 FFmpeg 参数生成，硬件编码器映射 |
| `settingStore` | `localStorage`（键 `theme`, `language`） | 主题（light/dark/system），语言，自动检测浏览器语言 |
| `logsStore` | 内存 | 操作日志（简单字符串数组） |
| `softInfoStore` | 内存 | FFmpeg/FFprobe/FFplay 工具检测和系统信息 |

### 路由

所有路由均为 `MainLayout`（`/`）的子路由，默认重定向到 `/queue`：

| 路由 | 页面 | 说明 |
|---|---|---|
| `/home` | Home | 欢迎页/快速开始 |
| `/queue` | EncodingQueue | 编码队列（默认页） |
| `/prepare` | PrepareFiles | 准备文件（拖拽添加） |
| `/params` | ParameterPanel | 参数面板（核心编码参数配置） |
| `/merge` | Merge | 视频合并（concat） |
| `/mux` | Mux | 混流工具 |
| `/player` | Player | ffplay 播放器（嵌入窗口，支持播放控制） |
| `/performance` | Performance | 性能监控（CPU/内存/FFmpeg 进程） |
| `/quality` | QualityAssess | 画质评测（VMAF/SSIM/PSNR） |
| `/mediainfo` | MediaInfo | 媒体信息（ffprobe JSON） |
| `/settings` | Settings | 全局设置 |
| `/independent-panel` | IndependentPanel | 独立参数面板（单独窗口，为不同文件指定不同参数） |

## Rust 后端结构

### 两条 FFmpeg 执行路径（重要）

项目存在**两套独立的 FFmpeg 执行机制**：

| 维度 | 旧路径（legacy executor） | 新路径（task manager） |
|---|---|---|
| Rust 入口 | `lib.rs::execute_ffmpeg_command` → `utility/_executor.rs` | `lib.rs` → `modules/task_manager.rs::start_ffmpeg` |
| 命令解析 | 自定义 parser（仅处理双引号，不处理单引号和转义） | `shell_words` crate（更稳健） |
| 事件名 | `progress`, `finish`, `error`（无前缀） | `ffmpeg-progress`, `ffmpeg-finish`, `ffmpeg-error`（带 `ffmpeg-` 前缀） |
| 进度内容 | 原始 stderr 行（`{delim, line}`） | 结构化解析（frame/fps/time/bitrate/speed/size） |
| 暂停/恢复 | 不支持 | 支持（Unix: SIGSTOP/SIGCONT，Windows: 未实现） |
| 多任务 | 仅单任务（`GLOBAL_PID`） | 多任务（`TASK_PROCESSES` HashMap） |
| stdin 交互 | 不支持 | 支持（`send_ffmpeg_stdin`） |
| CPU 亲和性 | 不支持 | 支持（Unix only, `sched_setaffinity`） |
| 前端调用 | `useFFmpegCommand` hook | `taskStore` |
| 用途 | 简单的单次命令执行 | 完整的任务队列管理 |

**新代码应使用 task manager 路径。** legacy executor 仅用于简单的一次性命令执行场景。

### 源码目录

| 目录 | 文件 | 用途 |
|---|---|---|
| `src-tauri/src/library/` | `_ffmpeg.rs`, `_probe.rs`, `_process.rs`, `_file.rs`, `_path.rs`, `_string.rs`, `_tauri.rs`, `_error.rs` | 基础库：FFmpeg 检测/安装、媒体探测、进程 Kill、文件 IO、路径工具、IPC 事件发送 |
| `src-tauri/src/modules/` | `task_manager.rs`, `preset_manager.rs`, `menus.rs`, `tray.rs`, `windows.rs` | 功能模块：任务管理、预设 CRUD、菜单栏、系统托盘、多窗口 |
| `src-tauri/src/utility/` | `_executor.rs`, `_constant.rs` | legacy 命令执行器、事件名枚举 |
| `src-tauri/config/` | `codec.json`, `ffmpeg-settings.json` | 运行时配置（通过 `resources` 打包进二进制，通过 `read_json_file` 读取） |

### lib.rs 关键全局状态

- `GLOBAL_PID: Mutex<Option<u32>>` — legacy 执行器的单进程 PID，仅被 `execute_ffmpeg_command`/`stop_convert` 使用
- `FFPLAY_PROCESS: Mutex<Option<Child>>` — ffplay 播放器进程
- `TRAY_SETTINGS: Mutex<TraySettings>` — 托盘行为设置
- `INDEPENDENT_PANEL_FILES: Mutex<Vec<String>>` — 独立面板文件列表

### Rust 单元测试

仅在 `task_manager.rs` 中有 11 个测试，覆盖 `parse_progress` 函数和所有正则表达式。其他模块无测试。

## 已知代码问题和平台差异

### Bug
- **`taskStore.ts`**: `playNotification` 函数和 `audioCtx` 变量被错误地嵌套在 `classifyError` 函数体内部（第 22-36 行），导致 `playNotification` 在 `setupEventListeners` 中不可用（TypeScript 编译时应该报错，但 `noUnusedLocals` 可能掩盖了此问题）
- **`lib.rs::toggle_ffplay_pause`**: 接受 `pause: bool` 参数但完全忽略，始终向 ffplay 发送空格

### 未实现/桩代码
- **Windows 暂停/恢复**: `task_manager.rs` 中 `pause_process`/`resume_process` 在 Windows 上返回 `"not implemented"`
- **Windows FFmpeg 自动安装**: `_ffmpeg.rs::install_ffmpeg_windows()` 是空桩
- **GPU 监控**: `get_system_metrics` 返回的 GPU 数据全部为 0，温度字段为 null，磁盘读写速度为 0
- **`menus.rs::setup_menus`**: 定义了但从未在 `lib.rs::run()` 中调用（死代码）

### 架构注意事项
- **两条执行路径**: 新功能应使用 task manager 路径（`start_ffmpeg`/`ffmpeg-progress` 事件），legacy executor 应逐步淘汰
- **两个命令构建器**: `commandBuilder.ts`（基于 PresetData，用于参数面板）和 `ffmpegCommandBuilder.ts`（基于 FFmpegCommandOptions，用于简单场景）— 功能有重叠
- **两个文件列表实现**: `fileListStore`（简单数组）和 `useFileList` hook（带状态的 FileItem 对象）— 互不关联
- **PresetData Rust 结构体不完整**: `preset_manager.rs` 中定义的 `PresetData` 缺少 `colorManagement`, `filters`, `subtitleBurn`, `frameServer`, `trim`, `streamControl`, `loudnorm`, `image` 等字段 — 保存/加载预设时这些数据会丢失

## 关键约束

- **必须 pnpm**。`package.json` 中 `packageManager: "pnpm@10.27.0"`，`engines.pnpm: ">=10.27.0"`
- **`vue-tsc --noEmit` 必须通过**才能构建。严格 TS 选项：`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`
- **所有用户可见文本必须使用 i18n**（`t()` from `vue-i18n`）。翻译键约定：`page.<pageName>.<key>`, `common.<key>`, `message.<key>`, `task.status.<key>`, `encoder.<category>.<key>`, `filter.<name>.<key>` 等
- **禁用原生弹窗**（`alert`, `confirm`, `prompt`），使用 `ConfirmDialog` 和 `Toast`（`src/components/Dialogs/`）
- **必须使用 scoped 样式和 CSS 变量**以支持明暗主题切换，严禁硬编码颜色值
- **前端测试 Mock 所有 Tauri API**（`src/__tests__/setup.ts`），不能调用真实 Rust 命令

## 测试

- **前端**: Vitest + `happy-dom` + `@vue/test-utils`。Mock 在 `src/__tests__/setup.ts`
- **后端**: `cargo test`，覆盖率用 `cargo tarpaulin`
- **覆盖率阈值**（`vitest.config.ts`）: lines ≥85%, functions ≥80%, branches ≥75%, statements ≥85%
- 测试文件位置:
  - `src/__tests__/unit/stores/`: taskStore, presetStore, logsStore, settingStore
  - `src/__tests__/unit/utils/`: progressParser, commandBuilder, useFormatters, ffmpegCommandBuilder
  - `src/__tests__/unit/components/`: ConfirmDialog
  - `src/__tests__/factories/`: preset, task 测试工厂

## Tauri 配置要点

- 开发服务器端口: 1421（`tauri.conf.json` 中固定）
- CSP 限制 `connect-src` 为 `self` + `https://api.github.com`
- `src-tauri/` 已排除在 Vite 文件监听之外
- 平台特定覆盖: `tauri.{linux,macos,windows}.conf.json`
- 打包资源: `src-tauri/config/*`
- 应用标识符: `com.william.ffmpeg_desktop`
- 主窗口: 1500x900，最小 1200x700

## 版本

- `package.json`: 0.1.6
- `src-tauri/Cargo.toml`: 0.1.6
- `src-tauri/tauri.conf.json`: 0.1.6
