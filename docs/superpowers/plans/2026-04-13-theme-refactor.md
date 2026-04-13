# 主题系统重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构全局 CSS 样式，支持 light/dark/system 三种主题切换模式，并删除未使用的样式文件

**Architecture:** 
- 使用 CSS 变量实现主题切换
- 通过 `prefers-color-scheme` 媒体查询支持系统主题
- 使用 Pinia store 管理主题状态，持久化到 localStorage

**Tech Stack:** Vue 3, Pinia, CSS Variables, TypeScript

---

## 文件结构

**修改文件：**
- `ffmpeg_desktop/src/assets/styles/theme.css` - 重构主题变量定义
- `ffmpeg_desktop/src/store/settingStore.ts` - 增强主题切换逻辑
- `ffmpeg_desktop/src/main.ts` - 初始化主题

**删除文件：**
- `ffmpeg_desktop/src/assets/styles/settings.css` - 未使用的样式文件

---

### Task 1: 删除未使用的 settings.css 文件

**Files:**
- Delete: `ffmpeg_desktop/src/assets/styles/settings.css`

- [ ] **Step 1: 确认文件未被使用**

运行搜索确认 settings.css 没有被任何地方引用：
```bash
grep -r "settings.css" ffmpeg_desktop/src/
```
预期结果：无匹配

- [ ] **Step 2: 删除文件**

```bash
rm ffmpeg_desktop/src/assets/styles/settings.css
```

- [ ] **Step 3: 验证构建**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

---

### Task 2: 重构 theme.css 支持三种主题模式

**Files:**
- Modify: `ffmpeg_desktop/src/assets/styles/theme.css`

- [ ] **Step 1: 重写 theme.css 文件**

将文件重写为支持 light/dark/system 三种模式：

```css
/* ==================== 主题变量定义 ==================== */

/* 浅色主题（默认） */
:root,
:root[data-theme="light"] {
  /* 字体颜色 */
  --font-color1: #2c3e50;
  --font-success-color: #27ae60;
  --font-error-color: #e74c3c;
  --font-warning-color: #e67e22;
  --font-info-color: #3498db;

  /* 按钮颜色 */
  --btn-font-color1: #2c3e50;
  --btn-bg-color1: #ecf0f1;
  --btn-bg-color2: #27ae60;
  --btn-bg-color3: #e74c3c;
  --btn-box-shadow1: rgba(52, 73, 94, 0.15);
  --btn-hover-border-color1: #3498db;
  --btn-active-bg-color1: #d5dbdb;
  --btn-border-color1: #229954;
  --btn-border-color2: #c0392b;
  --btn-active-border-color1: #2980b9;

  /* 开关组件 */
  --switch-circle-bg-color1: #ffffff;
  --switch-bg-active-color1: #3498db;
  --switch-bg-inactive-color2: #95a5a6;

  /* 链接颜色 */
  --ele-a-color1: #3498db;
  --ele-a-hover-color1: #2980b9;

  /* 背景颜色 */
  --bg-color1: #ffffff;
  --bg-color2: #f8f9fa;
  --bg-color3: #ecf0f1;
  --bg-color4: #e8e8e8;
  --bg-color5: #d5d5d5;
  --border-color1: #dee2e6;

  /* 文本颜色 */
  --text-color1: #2c3e50;
  --text-color2: #7f8c8d;

  /* 布局颜色 */
  --header-bg: #ffffff;
  --sidebar-bg: #f8f9fa;
  --card-bg: #ffffff;

  /* 输入框颜色 */
  --input-bg: #ffffff;
  --input-border: #bdc3c7;
  --input-focus-border: #3498db;

  /* 状态颜色 */
  --warning-color: #f39c12;
  --info-color: #3498db;
  --disabled-color: #95a5a6;
  --success-color: #27ae60;
  --error-color: #e74c3c;
  --active-color: #9acd32;

  /* 交互反馈 */
  --hover-bg: rgba(52, 152, 219, 0.08);
  --active-bg: rgba(52, 152, 219, 0.15);
  --selected-bg: rgba(52, 152, 219, 0.12);

  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(44, 62, 80, 0.08);
  --shadow-md: 0 4px 8px rgba(44, 62, 80, 0.12);
  --shadow-lg: 0 8px 16px rgba(44, 62, 80, 0.15);

  /* 滚动条 */
  --scrollbar-track: #ecf0f1;
  --scrollbar-thumb: #bdc3c7;
  --scrollbar-thumb-hover: #95a5a6;

  /* 分隔线 */
  --divider-color: #dee2e6;

  /* 表格 */
  --table-header-bg: #ecf0f1;
  --table-row-even: #f8f9fa;
  --table-row-hover: #e8eef2;

  /* 模态框 */
  --modal-overlay: rgba(44, 62, 80, 0.6);
  --modal-bg: #ffffff;

  /* 工具提示 */
  --tooltip-bg: #34495e;
  --tooltip-text: #ecf0f1;

  /* 标签/徽章 */
  --tag-bg: #ecf0f1;
  --tag-text: #2c3e50;
  --tag-success-bg: #27ae60;
  --tag-error-bg: #e74c3c;
  --tag-warning-bg: #f39c12;
  --tag-info-bg: #3498db;

  /* 导航菜单 */
  --nav-item-bg: transparent;
  --nav-item-hover-bg: rgba(52, 152, 219, 0.1);
  --nav-item-active-bg: #3498db;
  --nav-item-text: #2c3e50;
  --nav-item-active-text: #ffffff;

  /* 文件列表 */
  --file-item-active-bg: rgba(52, 152, 219, 0.15);
  --file-item-active-text: #2c3e50;
}

/* 深色主题 */
:root[data-theme="dark"] {
  /* 字体颜色 */
  --font-color1: #ecf0f1;
  --font-success-color: #2ecc71;
  --font-error-color: #e74c3c;
  --font-warning-color: #f39c12;
  --font-info-color: #5dade2;

  /* 按钮颜色 */
  --btn-font-color1: #ecf0f1;
  --btn-bg-color1: #34495e;
  --btn-bg-color2: #27ae60;
  --btn-bg-color3: #c0392b;
  --btn-box-shadow1: rgba(0, 0, 0, 0.5);
  --btn-hover-border-color1: #5dade2;
  --btn-active-bg-color1: #4a5f7f;
  --btn-border-color1: #2ecc71;
  --btn-border-color2: #e74c3c;
  --btn-active-border-color1: #3498db;

  /* 开关组件 */
  --switch-circle-bg-color1: #ecf0f1;
  --switch-bg-active-color1: #2980b9;
  --switch-bg-inactive-color2: #5d6d7e;

  /* 链接颜色 */
  --ele-a-color1: #5dade2;
  --ele-a-hover-color1: #85c1e9;

  /* 背景颜色 */
  --bg-color1: #181818;
  --bg-color2: #242424;
  --bg-color3: #303030;
  --bg-color4: #383838;
  --bg-color5: #404040;
  --border-color1: #333333;

  /* 文本颜色 */
  --text-color1: #c0c0c0;
  --text-color2: #808080;

  /* 布局颜色 */
  --header-bg: #242424;
  --sidebar-bg: #1a1a1a;
  --card-bg: #2a2a2a;

  /* 输入框颜色 */
  --input-bg: #2a2a2a;
  --input-border: #404040;
  --input-focus-border: #5dade2;

  /* 状态颜色 */
  --warning-color: #f39c12;
  --info-color: #5dade2;
  --disabled-color: #7f8c8d;
  --success-color: #2ecc71;
  --error-color: #e74c3c;
  --active-color: #9acd32;

  /* 交互反馈 */
  --hover-bg: rgba(255, 255, 255, 0.05);
  --active-bg: rgba(255, 255, 255, 0.1);
  --selected-bg: rgba(154, 205, 50, 0.15);

  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.35);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.3);

  /* 滚动条 */
  --scrollbar-track: #2a2a2a;
  --scrollbar-thumb: #404040;
  --scrollbar-thumb-hover: #505050;

  /* 分隔线 */
  --divider-color: #333333;

  /* 表格 */
  --table-header-bg: #2a2a2a;
  --table-row-even: #222222;
  --table-row-hover: #333333;

  /* 模态框 */
  --modal-overlay: rgba(0, 0, 0, 0.75);
  --modal-bg: #2a2a2a;

  /* 工具提示 */
  --tooltip-bg: #404040;
  --tooltip-text: #ecf0f1;

  /* 标签/徽章 */
  --tag-bg: #404040;
  --tag-text: #ecf0f1;
  --tag-success-bg: #27ae60;
  --tag-error-bg: #c0392b;
  --tag-warning-bg: #e67e22;
  --tag-info-bg: #2980b9;

  /* 导航菜单 */
  --nav-item-bg: transparent;
  --nav-item-hover-bg: rgba(255, 255, 255, 0.08);
  --nav-item-active-bg: #2980b9;
  --nav-item-text: #c0c0c0;
  --nav-item-active-text: #ffffff;

  /* 文件列表 */
  --file-item-active-bg: rgba(154, 205, 50, 0.2);
  --file-item-active-text: #c0c0c0;
}

/* 系统主题 - 跟随系统偏好 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]),
  :root[data-theme="system"] {
    /* 深色主题变量 */
    --font-color1: #ecf0f1;
    --font-success-color: #2ecc71;
    --font-error-color: #e74c3c;
    --font-warning-color: #f39c12;
    --font-info-color: #5dade2;

    --btn-font-color1: #ecf0f1;
    --btn-bg-color1: #34495e;
    --btn-bg-color2: #27ae60;
    --btn-bg-color3: #c0392b;
    --btn-box-shadow1: rgba(0, 0, 0, 0.5);
    --btn-hover-border-color1: #5dade2;
    --btn-active-bg-color1: #4a5f7f;
    --btn-border-color1: #2ecc71;
    --btn-border-color2: #e74c3c;
    --btn-active-border-color1: #3498db;

    --switch-circle-bg-color1: #ecf0f1;
    --switch-bg-active-color1: #2980b9;
    --switch-bg-inactive-color2: #5d6d7e;

    --ele-a-color1: #5dade2;
    --ele-a-hover-color1: #85c1e9;

    --bg-color1: #181818;
    --bg-color2: #242424;
    --bg-color3: #303030;
    --bg-color4: #383838;
    --bg-color5: #404040;
    --border-color1: #333333;

    --text-color1: #c0c0c0;
    --text-color2: #808080;

    --header-bg: #242424;
    --sidebar-bg: #1a1a1a;
    --card-bg: #2a2a2a;

    --input-bg: #2a2a2a;
    --input-border: #404040;
    --input-focus-border: #5dade2;

    --warning-color: #f39c12;
    --info-color: #5dade2;
    --disabled-color: #7f8c8d;
    --success-color: #2ecc71;
    --error-color: #e74c3c;
    --active-color: #9acd32;

    --hover-bg: rgba(255, 255, 255, 0.05);
    --active-bg: rgba(255, 255, 255, 0.1);
    --selected-bg: rgba(154, 205, 50, 0.15);

    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.35);
    --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.3);

    --scrollbar-track: #2a2a2a;
    --scrollbar-thumb: #404040;
    --scrollbar-thumb-hover: #505050;

    --divider-color: #333333;

    --table-header-bg: #2a2a2a;
    --table-row-even: #222222;
    --table-row-hover: #333333;

    --modal-overlay: rgba(0, 0, 0, 0.75);
    --modal-bg: #2a2a2a;

    --tooltip-bg: #404040;
    --tooltip-text: #ecf0f1;

    --tag-bg: #404040;
    --tag-text: #ecf0f1;
    --tag-success-bg: #27ae60;
    --tag-error-bg: #c0392b;
    --tag-warning-bg: #e67e22;
    --tag-info-bg: #2980b9;

    --nav-item-bg: transparent;
    --nav-item-hover-bg: rgba(255, 255, 255, 0.08);
    --nav-item-active-bg: #2980b9;
    --nav-item-text: #c0c0c0;
    --nav-item-active-text: #ffffff;

    --file-item-active-bg: rgba(154, 205, 50, 0.2);
    --file-item-active-text: #c0c0c0;
  }
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme]),
  :root[data-theme="system"] {
    /* 浅色主题变量 - 与 :root 相同 */
    --font-color1: #2c3e50;
    --font-success-color: #27ae60;
    --font-error-color: #e74c3c;
    --font-warning-color: #e67e22;
    --font-info-color: #3498db;

    --btn-font-color1: #2c3e50;
    --btn-bg-color1: #ecf0f1;
    --btn-bg-color2: #27ae60;
    --btn-bg-color3: #e74c3c;
    --btn-box-shadow1: rgba(52, 73, 94, 0.15);
    --btn-hover-border-color1: #3498db;
    --btn-active-bg-color1: #d5dbdb;
    --btn-border-color1: #229954;
    --btn-border-color2: #c0392b;
    --btn-active-border-color1: #2980b9;

    --switch-circle-bg-color1: #ffffff;
    --switch-bg-active-color1: #3498db;
    --switch-bg-inactive-color2: #95a5a6;

    --ele-a-color1: #3498db;
    --ele-a-hover-color1: #2980b9;

    --bg-color1: #ffffff;
    --bg-color2: #f8f9fa;
    --bg-color3: #ecf0f1;
    --bg-color4: #e8e8e8;
    --bg-color5: #d5d5d5;
    --border-color1: #dee2e6;

    --text-color1: #2c3e50;
    --text-color2: #7f8c8d;

    --header-bg: #ffffff;
    --sidebar-bg: #f8f9fa;
    --card-bg: #ffffff;

    --input-bg: #ffffff;
    --input-border: #bdc3c7;
    --input-focus-border: #3498db;

    --warning-color: #f39c12;
    --info-color: #3498db;
    --disabled-color: #95a5a6;
    --success-color: #27ae60;
    --error-color: #e74c3c;
    --active-color: #9acd32;

    --hover-bg: rgba(52, 152, 219, 0.08);
    --active-bg: rgba(52, 152, 219, 0.15);
    --selected-bg: rgba(52, 152, 219, 0.12);

    --shadow-sm: 0 2px 4px rgba(44, 62, 80, 0.08);
    --shadow-md: 0 4px 8px rgba(44, 62, 80, 0.12);
    --shadow-lg: 0 8px 16px rgba(44, 62, 80, 0.15);

    --scrollbar-track: #ecf0f1;
    --scrollbar-thumb: #bdc3c7;
    --scrollbar-thumb-hover: #95a5a6;

    --divider-color: #dee2e6;

    --table-header-bg: #ecf0f1;
    --table-row-even: #f8f9fa;
    --table-row-hover: #e8eef2;

    --modal-overlay: rgba(44, 62, 80, 0.6);
    --modal-bg: #ffffff;

    --tooltip-bg: #34495e;
    --tooltip-text: #ecf0f1;

    --tag-bg: #ecf0f1;
    --tag-text: #2c3e50;
    --tag-success-bg: #27ae60;
    --tag-error-bg: #e74c3c;
    --tag-warning-bg: #f39c12;
    --tag-info-bg: #3498db;

    --nav-item-bg: transparent;
    --nav-item-hover-bg: rgba(52, 152, 219, 0.1);
    --nav-item-active-bg: #3498db;
    --nav-item-text: #2c3e50;
    --nav-item-active-text: #ffffff;

    --file-item-active-bg: rgba(52, 152, 219, 0.15);
    --file-item-active-text: #2c3e50;
  }
}

/* 过渡动画 */
:root {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

- [ ] **Step 2: 验证 CSS 语法**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

---

### Task 3: 更新 settingStore.ts 支持三种主题模式

**Files:**
- Modify: `ffmpeg_desktop/src/store/settingStore.ts`

- [ ] **Step 1: 重写 settingStore.ts**

```typescript
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useSettingStore = defineStore('setting_info', {
  state: () => ({
    theme: (localStorage.getItem('theme') as ThemeMode) || 'system',
    language: localStorage.getItem('language') || 'zh-CN',
  }),
  actions: {
    updateTheme(theme: ThemeMode) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      this.applyTheme()
    },
    applyTheme() {
      const root = document.documentElement
      
      if (this.theme === 'system') {
        root.removeAttribute('data-theme')
      } else {
        root.setAttribute('data-theme', this.theme)
      }
    },
    updateLanguage(language: string) {
      this.language = language
      localStorage.setItem('language', language)
    },
    initTheme() {
      this.applyTheme()
      
      // 监听系统主题变化
      if (this.theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        mediaQuery.addEventListener('change', () => {
          this.applyTheme()
        })
      }
    },
  },
})
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

---

### Task 4: 更新 main.ts 初始化主题

**Files:**
- Modify: `ffmpeg_desktop/src/main.ts`

- [ ] **Step 1: 添加主题初始化**

```typescript
import { createApp } from "vue";
import App from "./App.vue";
import "./assets/styles/global.css"
import { createPinia } from 'pinia'
import { createPlugin } from '@tauri-store/pinia';
import router from '@/router/index'
import i18n from '@/i18n'
import { useSettingStore } from '@/store/settingStore'

const app = createApp(App)
const pinia = createPinia()
pinia.use(createPlugin());
app.use(pinia)
app.use(router)
app.use(i18n)

// 初始化主题
const settingStore = useSettingStore()
settingStore.initTheme()

app.mount("#app");
```

- [ ] **Step 2: 验证构建**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

---

### Task 5: 更新 Settings 页面支持主题切换

**Files:**
- Modify: `ffmpeg_desktop/src/pages/Settings/index.vue`

- [ ] **Step 1: 更新主题选择部分**

找到主题选择部分，修改为：

```vue
<div class="form-group">
  <label>{{ t('page.settings.theme') }}</label>
  <select v-model="localSettings.theme" @change="onThemeChange">
    <option value="light">{{ t('page.settings.themeLight') }}</option>
    <option value="dark">{{ t('page.settings.themeDark') }}</option>
    <option value="system">{{ t('page.settings.themeSystem') }}</option>
  </select>
</div>
```

- [ ] **Step 2: 添加主题切换方法**

在 script 部分添加：

```typescript
import { useSettingStore, type ThemeMode } from '@/store/settingStore'

const settingStore = useSettingStore()

function onThemeChange() {
  settingStore.updateTheme(localSettings.value.theme as ThemeMode)
  saveSettings()
}
```

- [ ] **Step 3: 验证构建**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

---

### Task 6: 更新 i18n 添加主题翻译

**Files:**
- Modify: `ffmpeg_desktop/src/i18n/locales/zh-CN.ts`
- Modify: `ffmpeg_desktop/src/i18n/locales/en-US.ts`

- [ ] **Step 1: 更新中文翻译**

在 zh-CN.ts 的 settings 部分确保有：

```typescript
theme: '主题',
themeLight: '浅色',
themeDark: '深色',
themeSystem: '跟随系统',
```

- [ ] **Step 2: 更新英文翻译**

在 en-US.ts 的 settings 部分确保有：

```typescript
theme: 'Theme',
themeLight: 'Light',
themeDark: 'Dark',
themeSystem: 'System',
```

- [ ] **Step 3: 验证构建**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

---

### Task 7: 最终验证

- [ ] **Step 1: 运行完整构建**

```bash
cd ffmpeg_desktop && npm run build
```
预期结果：构建成功

- [ ] **Step 2: 测试主题切换功能**

启动应用，在设置页面测试三种主题模式切换是否正常工作。

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-13-theme-refactor.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
