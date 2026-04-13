# 语言切换全局生效修复 Spec

## Why
在设置页面切换语言后，只有设置页面的语言切换了，其他页面包括左侧导航栏还是中文。这是因为导航栏组件使用了硬编码的中文字符串，没有使用 i18n 进行国际化。

## What Changes
- 修改 `NavigationTabs.vue` 使用 `useI18n()` 的 `t()` 函数获取翻译文本
- 确保所有页面组件都使用 i18n 进行文本显示

## Impact
- Affected code: `ffmpeg_desktop/src/components/NavigationTabs/NavigationTabs.vue`

## ADDED Requirements

### Requirement: 全局语言切换
系统应确保语言切换后，所有页面和组件的文本都能正确切换到对应语言。

#### Scenario: 用户切换语言
- **WHEN** 用户在设置页面切换语言
- **THEN** 所有页面包括导航栏、页面标题、按钮等文本都应切换到对应语言

## ROOT CAUSE ANALYSIS

**问题根因：** `NavigationTabs.vue` 第 24-35 行的 `tabs` 数组中，`label` 属性使用了硬编码的中文字符串：

```typescript
const tabs = [
  { id: 'home', label: 'FFD', icon: '🏠', route: '/home' },
  { id: 'queue', label: '编码队列', icon: '📋', route: '/queue' },
  // ... 硬编码中文
];
```

**解决方案：** 使用 `useI18n()` 的 `t()` 函数获取翻译，并使用 `computed` 确保响应式更新。
