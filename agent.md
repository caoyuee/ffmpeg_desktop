# FFmpeg Desktop - AI Agent 规范

## 项目概述

FFmpeg Desktop 是一个基于 **Tauri 2.x + Vue 3 + TypeScript** 的跨平台 FFmpeg 图形化界面应用。

### 技术栈
- **前端框架**: Vue 3.5+ (Composition API)
- **桌面框架**: Tauri 2.x
- **状态管理**: Pinia 3.x
- **路由**: Vue Router 4.x
- **国际化**: Vue I18n 9.x
- **构建工具**: Vite 7.x
- **包管理器**: pnpm 10.27+

---

## 项目结构

```
ffmpeg_desktop/
├── src/                    # Vue 前端源码
│   ├── components/         # 可复用组件
│   │   ├── ColorPanel/     # 色彩管理面板
│   │   ├── Dialogs/        # 对话框组件 (ConfirmDialog, Toast, CropDialog 等)
│   │   ├── FilterPanel/    # 滤镜面板
│   │   ├── NavigationTabs/ # 导航标签
│   │   ├── PresetManager/  # 预设管理器
│   │   ├── StreamPanel/    # 流控制面板
│   │   ├── SubtitlePanel/  # 字幕面板
│   │   ├── TaskQueue/      # 任务队列组件
│   │   └── TrimPanel/      # 裁剪面板
│   ├── pages/              # 页面组件
│   │   ├── EncodingQueue/  # 编码队列
│   │   ├── Home/           # 首页
│   │   ├── MediaInfo/      # 媒体信息
│   │   ├── Merge/          # 视频合并
│   │   ├── Mux/            # 混流
│   │   ├── ParameterPanel/ # 参数面板
│   │   ├── Performance/    # 性能监控
│   │   ├── Player/         # 播放器
│   │   ├── PrepareFiles/   # 文件准备
│   │   ├── QualityAssess/  # 画质评测
│   │   └── Settings/       # 设置
│   ├── store/              # Pinia 状态管理
│   ├── i18n/               # 国际化配置
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── hooks/              # Vue 组合式函数
│   └── assets/             # 静态资源
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── library/        # 核心库 (ffmpeg, probe, file, process 等)
│   │   ├── modules/        # 功能模块 (menus, tray, task_manager 等)
│   │   └── utility/        # 工具函数
│   └── tauri.conf.json     # Tauri 配置
└── package.json
```

---

## 编码规范

### Vue 组件规范

1. **使用 Composition API + `<script setup>`**
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

### TypeScript 规范

1. **类型定义放在 `src/types/` 目录**
2. **使用 `import type` 导入类型**
3. **避免使用 `any`，使用 `unknown` 或具体类型**

### 样式规范

1. **使用 CSS 变量实现主题切换**
```css
.element {
  background: var(--bg-color1, #1e1e1e);
  color: var(--text-color1, #e0e0e0);
}
```

2. **使用 `scoped` 样式**
```vue
<style scoped>
.container { ... }
</style>
```

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
- 中文: `src/i18n/locales/zh-CN.ts`
- 英文: `src/i18n/locales/en-US.ts`

### 翻译键命名规范
```
page.<pageName>.<key>     // 页面翻译
common.<key>              // 通用翻译
message.<key>             // 消息翻译
task.status.<key>         // 任务状态
```

---

## 状态管理 (Pinia)

### Store 文件位置
`src/store/` 目录下，以 `*Store.ts` 命名

### 使用示例
```typescript
import { useTaskStore } from '@/store/taskStore';
const taskStore = useTaskStore();
```

### 可用 Store
- `taskStore` - 任务管理
- `presetStore` - 预设管理
- `settingStore` - 设置管理
- `ffmpegSettingsStore` - FFmpeg 配置
- `logsStore` - 日志管理

---

## 对话框组件

**禁止使用浏览器原生弹窗** (`alert`, `confirm`, `prompt`)

### 使用 ConfirmDialog
```vue
<script setup>
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue';
const showDialog = ref(false);

function onConfirm() {
  // 确认逻辑
}
</script>

<template>
  <ConfirmDialog
    v-model="showDialog"
    title="确认操作"
    message="确定要执行此操作吗？"
    confirmText="确定"
    cancelText="取消"
    @confirm="onConfirm"
  />
</template>
```

### 使用 Toast
```vue
<script setup>
import Toast from '@/components/Dialogs/Toast.vue';
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
</script>

<template>
  <Toast v-model="showToast" :message="toastMessage" :type="toastType" />
</template>
```

---

## Tauri API 使用

### 文件对话框
```typescript
import { open, save } from '@tauri-apps/plugin-dialog';

const file = await open({ multiple: false });
const path = await save({ defaultPath: 'output.mp4' });
```

### 调用 Rust 后端
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('command_name', { arg1: value });
```

---

## 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 类型检查
vue-tsc --noEmit

# Tauri 开发
pnpm tauri dev

# Tauri 构建
pnpm tauri build
```

---

## 注意事项

1. **不要创建不必要的文件** - 优先编辑现有文件
2. **不要添加注释** - 除非用户明确要求
3. **使用 i18n** - 所有用户可见文本必须使用 `t()` 函数
4. **类型安全** - 所有代码必须通过 TypeScript 类型检查
5. **主题兼容** - 所有样式必须支持明暗主题切换
6. **禁止原生弹窗** - 使用自定义 Dialog 和 Toast 组件
