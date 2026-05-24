# FFmpeg Desktop - AI Agent 规范

## 项目概述

FFmpeg Desktop 是一个基于 **Tauri 2.9 + Vue 3.5 + TypeScript 5.9** 的跨平台 FFmpeg 图形化界面应用，复刻自 VB.NET 原版 FFmpegFreeUI（版本 5.3.0）。当前版本约为原版 90% 核心功能。

### 技术栈
- **前端框架**: Vue 3.5+ (Composition API + `<script setup lang="ts">`)
- **桌面框架**: Tauri 2.9
- **状态管理**: Pinia 3.x
- **路由**: Vue Router 4.x
- **国际化**: Vue I18n 9.x
- **构建工具**: Vite 7.x
- **包管理器**: pnpm 10.27+

### 版本
- `package.json`: 0.1.1
- `Cargo.toml` / `tauri.conf.json`: 0.1.2

---

## 关键架构知识

### 两条 FFmpeg 执行路径

项目中有**两套独立的** FFmpeg 执行机制，这是最重要的架构细节：

| 维度 | 新路径（task manager，推荐） | 旧路径（legacy executor） |
|---|---|---|
| Rust 入口 | `modules/task_manager.rs::start_ffmpeg` | `utility/_executor.rs::execute_ffmpeg` |
| 前端 invoke 命令 | `start_ffmpeg` | `execute_ffmpeg_command` |
| IPC 事件名 | `ffmpeg-progress`, `ffmpeg-finish`, `ffmpeg-error` | `progress`, `finish`, `error` |
| 进度数据 | 结构化（frame/fps/time/bitrate/speed/size） | 原始 stderr 行 `{delim, line}` |
| 多任务支持 | 是（`TASK_PROCESSES` HashMap） | 否（`GLOBAL_PID` 单进程） |
| 暂停/恢复 | Unix: SIGSTOP/SIGCONT; Windows: 未实现 | 不支持 |
| stdin 交互 | 是（`send_ffmpeg_stdin`） | 否 |
| CPU 亲和性 | Unix only | 否 |
| 前端消费者 | `taskStore`（`src/store/taskStore.ts`） | `useFFmpegCommand` hook（`src/hooks/useFFmpegCommand.ts`） |
| 适用场景 | 任务队列、批量编码 | 一次性简单命令（如画质评测页面） |

**新功能一律使用 task manager 路径。**

### 两个命令构建器

- `src/utils/commandBuilder.ts` — 基于完整 `PresetData` 构建 FFmpeg 命令（参数面板使用）
- `src/utils/ffmpegCommandBuilder.ts` — 独立构建器，基于 `FFmpegCommandOptions`，含 18 种容器格式兼容性自动检查

### Rust PresetData 不完整

`preset_manager.rs` 中的 `PresetData` 结构体仅包含 `output`/`video`(encoder+resolution+frameRate+bitrateControl)/`audio`/`custom` 字段，**缺少** colorManagement、filters、subtitleBurn、frameServer、trim、streamControl、image、decode 等字段。保存预设时这些数据会**静默丢失**。

---

## 项目结构

```
ffmpeg_desktop/
├── src/                    # Vue 前端源码
│   ├── pages/              # 12 个路由页面
│   │   ├── Home/           # 欢迎页/快速开始
│   │   ├── EncodingQueue/  # 编码队列（默认页）
│   │   ├── PrepareFiles/   # 准备文件
│   │   ├── ParameterPanel/ # 参数面板（核心，12 个子标签）
│   │   ├── Merge/          # 视频合并
│   │   ├── Mux/            # 混流
│   │   ├── Player/         # ffplay 播放器
│   │   ├── Performance/    # 性能监控
│   │   ├── QualityAssess/  # 画质评测（VMAF/SSIM/PSNR）
│   │   ├── MediaInfo/      # 媒体信息
│   │   ├── Settings/       # 设置
│   │   ├── IndependentPanel/ # 独立参数面板（单独窗口）
│   │   └── MainLayout/     # 主布局（NavigationTabs + router-view）
│   ├── components/         # 可复用组件
│   │   ├── ColorPanel/     # 色彩管理面板
│   │   ├── Dialogs/        # 对话框（ConfirmDialog, Toast, CropDialog, InterpolationDialog, FrameBlendDialog, SuperResolutionDialog, StreamSelectorDialog）
│   │   ├── FilterPanel/    # 滤镜面板
│   │   ├── NavigationTabs/ # 导航标签（11 个标签页）
│   │   ├── PresetManager/  # 预设管理器
│   │   ├── StreamPanel/    # 流控制面板
│   │   ├── SubtitlePanel/  # 字幕面板
│   │   ├── TaskQueue/      # 任务队列组件（TaskQueue, TaskItem, TaskProgress）
│   │   ├── TrimPanel/      # 裁剪面板（含 TimeInput）
│   │   └── VideoPlayer/    # 视频播放器（自定义控件）
│   ├── store/              # Pinia 状态管理（7 个 store）
│   ├── i18n/               # 国际化（zh-CN 完整，en-US）
│   ├── hooks/              # 组合式函数（useFFmpegCommand, useFileList, useMediaProbe, useCodecFilter, useFormatters）
│   ├── utils/              # 工具函数（2 个命令构建器, progressParser, ffmpegPath）
│   ├── apis/               # InvokeApi.ts（FFmpeg 工具检测封装）
│   ├── config/             # codecDatabase.ts（20 种编码器 meta 数据）
│   ├── types/              # TypeScript 类型（preset.ts 200+ 行, task.ts）
│   └── assets/             # 静态资源和全局 CSS
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── library/        # 核心库（ffmpeg, probe, file, process, path, string, tauri）
│   │   ├── modules/        # 功能模块（task_manager, preset_manager, menus, tray, windows）
│   │   └── utility/        # 工具（旧版 executor, 事件常量）
│   ├── config/             # 运行时配置（codec.json, ffmpeg-settings.json）
│   └── tauri.conf.json     # Tauri 配置
└── package.json
```

---

## 编码规范

### Vue 组件规范

1. **使用 Composition API + `<script setup lang="ts">`**
```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const count = ref(0);
</script>
```

2. **组件命名**: 使用 PascalCase，文件夹以组件名命名，主文件为 `index.vue`

3. **Props 定义**: 使用 TypeScript 接口
```typescript
interface Props {
  preset: PresetData;
  disabled?: boolean;
}
const props = defineProps<Props>();
```

4. **Emits 定义**: 使用类型化 emits
```typescript
const emit = defineEmits<{
  'update:preset': [preset: PresetData];
  'change': [value: string];
}>();
```

5. **参数面板组件遵循统一的 v-model/emit 协议**: 所有参数子组件通过 `@update:preset` emit + 深度 watch 来双向同步 `localPreset` 与 store 中的 `currentPreset`

### TypeScript 规范

1. **类型定义放在 `src/types/` 目录**
2. **使用 `import type` 导入纯类型**
3. **避免使用 `any`**，使用 `unknown` 或具体类型
4. **必须通过 `vue-tsc --noEmit`** 严格检查：`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noImplicitOverride`

### 样式规范

1. **使用 CSS 变量实现主题切换**，支持亮色/暗色/跟随系统
```css
.element {
  background: var(--bg-color1, #1e1e1e);
  color: var(--text-color1, #e0e0e0);
}
```

2. **必须使用 `scoped` 样式**
3. **严禁硬编码颜色值**

---

## 国际化 (i18n)

### 使用方式

```typescript
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

// 模板中使用
{{ t('page.home.title') }}
```

### 翻译文件位置
- 中文: `src/i18n/locales/zh-CN.ts`（完整）
- 英文: `src/i18n/locales/en-US.ts`

### 翻译键命名规范
```
page.<pageName>.<key>       // 页面翻译
common.<key>                // 通用翻译
message.<key>               // 消息翻译
task.status.<key>           // 任务状态
encoder.video.<key>         // 编码器
filter.<name>.<key>         // 滤镜
dialog.<name>.<key>         // 对话框
validation.<key>            // 验证
about.<key>                 // 关于
```

---

## 状态管理 (Pinia)

### Store 文件位置
`src/store/` 目录下，以 `*Store.ts` 命名

### 使用示例
```typescript
import { useTaskStore } from '@/store';
const taskStore = useTaskStore();
```

### 可用 Store

| Store | 持久化方式 | 用途 |
|---|---|---|
| `taskStore` | 内存 | 任务队列、进度追踪、生命周期管理 |
| `presetStore` | Rust 后端 JSON 文件 | 预设 CRUD + 导入/导出 |
| `ffmpegSettingsStore` | localStorage (`ffmpeg_settings`) | 编码器选择和全局参数 |
| `settingStore` | localStorage (`theme`, `language`) | 主题、语言 |
| `fileListStore` | 内存 | 文件列表（简单数组） |
| `logsStore` | 内存 | 操作日志 |
| `softInfoStore` | 内存 | FFmpeg 工具检测 |

---

## 对话框组件

**禁止使用浏览器原生弹窗** (`alert`, `confirm`, `prompt`)

### ConfirmDialog
```vue
<script setup>
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue';
const showDialog = ref(false);
</script>

<template>
  <ConfirmDialog
    v-model="showDialog"
    title="确认操作"
    message="确定要执行此操作吗？"
    @confirm="onConfirm"
  />
</template>
```

### Toast
```vue
<script setup>
import Toast from '@/components/Dialogs/Toast.vue';
</script>

<template>
  <Toast v-model="showToast" :message="msg" type="success" :duration="2000" />
</template>
```

### 特殊对话框
- **CropDialog**: 交互式画面裁剪，支持帧提取预览、宽高比锁定、放大镜
- **InterpolationDialog**: 帧插值参数（minterpolate 滤镜）
- **SuperResolutionDialog**: 超分参数（libplacebo + 自定义着色器）
- **StreamSelectorDialog**: 可视化媒体流选择器（**已实现但 Mux 页面未使用**）

---

## Tauri API 使用

### 调用 Rust 后端
```typescript
import { invoke } from '@tauri-apps/api/core';

// 新路径（推荐，用于任务管理）
const pid = await invoke('start_ffmpeg', { command, taskId, cpuAffinity });

// 旧路径（仅用于简单一次性命令）
await invoke('execute_ffmpeg_command', { command });
```

### 事件监听
```typescript
import { listen } from '@tauri-apps/api/event';

// 新路径事件
listen('ffmpeg-progress', (event) => { /* 结构化进度数据 */ });
listen('ffmpeg-finish', (event) => { /* 任务完成 */ });
listen('ffmpeg-error', (event) => { /* 错误 */ });

// 旧路径事件（无前缀，原始 stderr 数据）
listen('progress', (event) => { /* { delim, line } */ });
```

---

## 已知问题清单

### Bug
- **`taskStore.ts`**: `playNotification` 函数和 `audioCtx` 变量被错误嵌套在 `classifyError` 函数体内部，导致通知音效不可用
- **`lib.rs::toggle_ffplay_pause`**: 忽略 `pause: bool` 参数，始终发送空格
- **`QualityAssess/index.vue`**: ffmpeg 滤镜链构建有误（`libvmaf,ssim,psnr` 不应合并为单个 filter_complex）
- **`PresetManager.vue`**: 预设编辑器中的音频编码器选择器缺少 `v-model` 绑定

### 桩代码/未完成功能
- **`VideoFrameSettings.vue`**: 裁剪窗口、插帧、降噪、超分按钮显示 Toast "功能开发中..."，但对应 Dialog 组件已完全实现——只需连线
- **`Mux/index.vue`**: `openStreamSelector()` 为桩代码，未使用已实现的 `StreamSelectorDialog` 组件
- **Windows 暂停/恢复**: `task_manager.rs` 返回 "not implemented"
- **Windows FFmpeg 自动安装**: `_ffmpeg.rs` 为空桩
- **GPU/磁盘监控**: `get_system_metrics` 返回全 0
- **`menus.rs::setup_menus`**: 死代码，从未被调用

### 架构问题
- **Rust PresetData 不完整**: 保存预设时 colorManagement/filters/subtitleBurn/trim/streamControl 等字段会丢失
- **两条 FFmpeg 执行路径并存**: 事件名不一致，增加维护成本
- **两个命令构建器功能重叠**: `commandBuilder.ts` 和 `ffmpegCommandBuilder.ts` 应统一
