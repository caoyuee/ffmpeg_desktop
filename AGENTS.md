# AGENTS.md — FFmpeg Desktop

项目位于 `ffmpeg_desktop/`。以下所有前端和 Rust 命令均相对于该目录。`FFmpegFreeUI-main/` 为 VB.NET 原版参考项目，仅作参考——切勿编辑。

## 快速参考

```bash
cd ffmpeg_desktop

pnpm install                  # 必须使用 pnpm（packageManager 字段强制要求）
pnpm dev                      # Vite 开发服务器（仅浏览器，不含 Tauri）
pnpm tauri dev                # 完整桌面应用（前端 + Rust 后端）
pnpm build                    # 类型检查（vue-tsc --noEmit）然后 vite build
pnpm typecheck                # 仅类型检查

pnpm test:run                 # Vitest 单次运行（happy-dom 环境）
pnpm test                     # Vitest 监听模式
cd src-tauri && cargo test    # Rust 单元测试
pnpm test:all                 # 前端 + 后端 + 覆盖率报告
```

## 架构

- **前端**: Vue 3.5（Composition API，`<script setup lang="ts">`），Pinia 3，Vue Router 4，vue-i18n 9
- **后端**: Tauri 2.9（Rust）——入口位于 `src-tauri/src/lib.rs` 的 `run()` 函数
- **打包**: Vite 构建到 `dist/`，Tauri 将其封装为原生二进制
- 前端通过 `invoke(commandName, args)`（来自 `@tauri-apps/api/core`）调用 Rust。命令名即 Rust 中 `#[tauri::command]` 函数名
- 路径别名 `@` → `src/`（在 `vite.config.ts` 和 `vitest.config.ts` 中均配置）

### 两条 FFmpeg 执行路径

项目存在**两套独立的** FFmpeg 执行机制，了解这一点至关重要：

| 维度 | 旧路径（legacy） | 新路径（task manager） |
|---|---|---|
| Rust 入口 | `lib.rs::execute_ffmpeg_command` → `utility/_executor.rs` | `modules/task_manager.rs::start_ffmpeg` |
| 命令解析 | 自定义 parser（仅双引号，不处理转义） | `shell_words` crate |
| IPC 事件名 | `progress`, `finish`, `error` | `ffmpeg-progress`, `ffmpeg-finish`, `ffmpeg-error` |
| 进度内容 | 原始 stderr 行 `{delim, line}` | 结构化解析（frame/fps/time/bitrate/speed/size） |
| 多任务/暂停/stdin | 不支持 | 支持（Unix: SIGSTOP/SIGCONT；Windows: 未实现） |
| 前端消费者 | `useFFmpegCommand` hook | `taskStore` |
| 适用场景 | 简单一次性命令（画质评测） | 完整任务队列管理 |

**新功能一律使用 task manager 路径**（`start_ffmpeg` 命令 + `ffmpeg-progress` 等事件）。legacy executor 仅用于一次性简单命令（如画质评测页面），应逐步淘汰。

## 前端结构

| 目录 | 用途 |
|---|---|
| `src/pages/` | 路由级页面组件（12 个页面） |
| `src/components/` | 可复用 UI 组件：TaskQueue, ParameterPanel, Dialogs（ConfirmDialog, Toast, CropDialog, StreamSelectorDialog）, FilterPanel, ColorPanel, SubtitlePanel, TrimPanel, StreamPanel, NavigationTabs, VideoPlayer |
| `src/store/` | Pinia store（见下文表格） |
| `src/hooks/` | 组合式函数：`useFFmpegCommand`, `useFileList`, `useMediaProbe`, `useCodecFilter`, `useFormatters` |
| `src/utils/` | `commandBuilder.ts`（基于 PresetData 构建完整 FFmpeg 命令），`ffmpegCommandBuilder.ts`（独立命令构建器，含 18 种容器格式兼容性检查），`progressParser.ts`（stderr 进度解析），`ffmpegPath.ts`（从 localStorage 读取自定义路径） |
| `src/apis/` | `InvokeApi.ts` — FFmpeg 工具检测的简单封装（仅 2 个方法，其余 invoke 调用直接写在 store/hooks 中） |
| `src/config/` | `codecDatabase.ts` — 20 种编码器的 meta 数据（preset/profile/tune/pixFmt），207 行 |
| `src/i18n/` | Vue I18n 语言包（`zh-CN`，`en-US`） |

### Pinia Store

| Store | 持久化方式 | 用途 |
|---|---|---|
| `taskStore` | 内存 | 任务队列、进度追踪、任务生命周期 |
| `presetStore` | Rust 后端 JSON 文件 → app data dir `presets/` | 预设 CRUD + 导入/导出 |
| `fileListStore` | 内存 | 输入文件列表（简单字符串数组） |
| `ffmpegSettingsStore` | `localStorage`（键 `ffmpeg_settings`） | 编码器选择和参数状态 |
| `settingStore` | `localStorage`（键 `theme`, `language`） | 主题/语言设置 |
| `logsStore` | 内存 | 操作日志 |
| `softInfoStore` | 内存 | FFmpeg 工具检测和系统信息 |

注意：`@tauri-store/pinia` 插件在 `main.ts` 中对整个 Pinia 实例注册，但各个 store 的实际持久化方式各异——presetStore 通过手动 `invoke()` 调用将数据持久化到 Rust 后端，ffmpegSettingsStore 和 settingStore 使用 localStorage。

## Rust 后端结构

| 目录 | 文件 | 用途 |
|---|---|---|
| `src-tauri/src/library/` | `_ffmpeg.rs`, `_probe.rs`, `_process.rs`, `_file.rs`, `_path.rs`, `_string.rs`, `_tauri.rs`, `_error.rs` | 基础库：FFmpeg 检测/安装、媒体探测、进程 kill、文件 IO、IPC 事件发送 |
| `src-tauri/src/modules/` | `task_manager.rs`, `preset_manager.rs`, `menus.rs`, `tray.rs`, `windows.rs` | 功能模块：任务管理、预设 CRUD、菜单栏（未使用）、系统托盘、多窗口 |
| `src-tauri/src/utility/` | `_executor.rs`, `_constant.rs` | 旧版命令执行器、事件名枚举 |
| `src-tauri/config/` | `codec.json`, `ffmpeg-settings.json` | 运行时配置（通过 `resources` 打包），包含编解码器定义和默认设置 |

- `lib.rs` 注册所有 `#[tauri::command]` 函数（33+ 个命令）。`run()` 函数初始化插件、设置系统托盘、注册关闭拦截器。
- **任务管理**: `task_manager.rs` 将进程追踪在 `TASK_PROCESSES: HashMap<String, TaskProcess>`（多任务）中，通过 regex 解析 stderr 进度并以 Tauri 事件（`ffmpeg-progress`, `ffmpeg-finish`, `ffmpeg-error`）发送
- **旧版执行器**: `GLOBAL_PID` 仅被 `utility/_executor.rs` 使用（单任务场景），由 `execute_ffmpeg_command`/`stop_convert` 命令驱动
- **预设**: 以 JSON 文件形式持久化在 `<app_data>/presets/` 下，通过 `preset_manager.rs` 管理，UUID 作为文件名
- **已知问题**: `menus.rs::setup_menus` 已定义但从未被调用；`toggle_ffplay_pause` 忽略其 boolean 参数；`get_system_metrics` 中 GPU/磁盘指标为桩代码（全为 0）

## Rust PresetData 不完整

**重要**: `preset_manager.rs` 中定义的 `PresetData` Rust 结构体**缺少大量字段**，仅包含 `output`、`video`（仅 encoder/resolution/frameRate/bitrateControl）、`audio`、`custom`。前端 TypeScript `PresetData` 接口包含完整的 `colorManagement`、`filters`（deinterlace/denoise/sharpen/interpolation/superResolution/rotation/flip）、`subtitleBurn`、`frameServer`、`trim`、`streamControl`、`image`、`decode` 等字段。**保存预设时会丢失这些字段的数据**。

## 关键约束

- **pnpm only**。`package.json` 中 `packageManager` 字段强制要求
- **`vue-tsc --noEmit` 必须通过**才能 `vite build`。严格 TS：`noUnusedLocals`、`noUnusedParameters`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitReturns`、`noImplicitOverride`
- **所有用户可见文本必须使用 i18n**（`t()` from `vue-i18n`）。翻译键：`src/i18n/locales/{zh-CN,en-US}.ts`
- **禁用原生弹窗**（`alert`、`confirm`、`prompt`）。使用 `ConfirmDialog` 和 `Toast`（`src/components/Dialogs/`）
- **Scoped 样式搭配 CSS 变量**以支持明暗主题。严禁硬编码颜色
- **Vitest mock 所有 Tauri API** 在 `src/__tests__/setup.ts` ——前端测试不能调用真实 Rust 命令

## 测试

- **前端**: Vitest + `happy-dom` + `@vue/test-utils`。Setup mock 在 `src/__tests__/setup.ts`
- **后端**: `cargo test`。覆盖率通过 `cargo tarpaulin`。`task_manager.rs` 有 11 个单元测试；其他模块无测试
- 覆盖率阈值在 `vitest.config.ts`（lines ≥85%、branches ≥75%、functions ≥80%、statements ≥85%）
- 测试文件:
  - `src/__tests__/unit/stores/`: taskStore, presetStore, logsStore, settingStore 测试
  - `src/__tests__/unit/utils/`: progressParser, commandBuilder, useFormatters, ffmpegCommandBuilder 测试
  - `src/__tests__/unit/components/`: ConfirmDialog 测试
  - `src/__tests__/factories/`: preset, task 测试工厂
- `pnpm test:all` 运行前后端测试并生成 `test-reports/TEST_REPORT.md`

## i18n 键命名约定

```
page.<pageName>.<key>       e.g. page.home.title
common.<key>                e.g. common.save
message.<key>               e.g. message.success
task.status.<key>           e.g. task.status.processing
encoder.video.<key>         e.g. encoder.video.codec
filter.<name>.<key>         e.g. filter.denoise.title
dialog.<name>.<key>         e.g. dialog.confirm.title
validation.<key>            e.g. validation.required
about.<key>                 e.g. about.version
```

## Tauri 配置要点

- 开发服务器端口: 1421（`tauri.conf.json` 中固定）
- `tauri.conf.json` 中的 CSP 将 `connect-src` 限制为 `self` + `https://api.github.com`
- `src-tauri/` 已排除在 Vite 文件监听之外
- `src-tauri/target/` 已被 gitignore（Rust 构建产物）
- 平台特定覆盖: `tauri.{linux,macos,windows}.conf.json`
- 打包资源: `src-tauri/config/*`

## 已知代码问题

### Bug
- **`taskStore.ts`**: `playNotification` 函数和 `audioCtx` 变量被错误地嵌套在 `classifyError` 函数体内部，导致 `playNotification` 在 `setupEventListeners` 中不可用
- **`lib.rs::toggle_ffplay_pause`**: 接受 `pause: bool` 但完全忽略，始终发送空格字符

### 桩代码/未实现
- **`VideoFrameSettings.vue`**: 裁剪窗口、插帧参数、降噪参数、超分参数按钮均为桩代码（显示 Toast "功能开发中..."），尽管对应的 Dialog 组件（CropDialog、InterpolationDialog、SuperResolutionDialog）已完全实现
- **`Mux/index.vue`**: `openStreamSelector()` 为桩代码，从未打开已实现的 `StreamSelectorDialog` 组件
- **`PresetManager.vue`**: 预设编辑器中音频编码器选择器缺少 `v-model` 绑定
- **Windows 暂停/恢复**: `task_manager.rs` 返回 "not implemented"
- **Windows FFmpeg 自动安装**: `_ffmpeg.rs::install_ffmpeg_windows()` 为空桩
- **GPU/磁盘监控**: `get_system_metrics` 返回全 0

### 架构重复
- 两个命令构建器（`commandBuilder.ts` + `ffmpegCommandBuilder.ts`）功能有重叠
- 两个文件列表实现（`fileListStore` + `useFileList` hook）互不关联
- 两条 FFmpeg 执行路径（legacy executor + task manager），事件名不一致

## 版本

- `package.json`: 0.1.1
- `Cargo.toml`: 0.1.2
- `tauri.conf.json`: 0.1.2
