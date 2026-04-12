# 色彩管理功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现色彩管理参数面板，支持基本调整、像素格式、色彩空间和色调映射

**Architecture:** 创建 ColorPanel.vue 组件，集成到主页面，扩展命令构建器

**Tech Stack:** Vue 3 + TypeScript + Tauri 2.x

---

## 文件结构

### 需要创建的文件
- `src/components/ColorPanel/ColorPanel.vue` - 色彩管理面板主组件

### 需要修改的文件
- `src/pages/main/index.vue` - 集成色彩管理面板
- `src/utils/commandBuilder.ts` - 扩展色彩空间和色调映射构建逻辑

---

## 任务分解

### Task 1: 创建色彩管理面板组件

**Files:**
- Create: `src/components/ColorPanel/ColorPanel.vue`

- [ ] **Step 1: 创建色彩管理面板主组件**

创建 `src/components/ColorPanel/ColorPanel.vue`，包含：
- 基本调整区块（亮度/对比度/饱和度/伽马滑块）
- 像素格式选择
- 色彩空间设置（色域/传输特性/矩阵系数/色彩范围）
- 色调映射算法选择

- [ ] **Step 2: 提交色彩管理面板组件**

---

### Task 2: 更新命令构建器

**Files:**
- Modify: `src/utils/commandBuilder.ts`

- [ ] **Step 1: 扩展色彩空间构建方法**

更新 `buildColorManagement` 方法，添加：
- 色彩空间参数
- 色调映射滤镜

- [ ] **Step 2: 提交命令构建器更新**

---

### Task 3: 集成色彩管理面板到主页面

**Files:**
- Modify: `src/pages/main/index.vue`

- [ ] **Step 1: 在主页面中添加色彩管理面板**

- [ ] **Step 2: 提交主页面集成**

---

## 验证清单

- [x] 色彩管理面板正确显示在主页面
- [x] 基本调整滑块正确工作
- [x] 像素格式选择正确
- [x] 色彩空间参数正确保存
- [x] 色调映射选项正确工作
- [x] FFmpeg 命令正确包含色彩管理参数

---

## 测试用例

### 测试 1: 基本调整
- 设置亮度为 0.1，对比度为 1.2
- 预期命令包含: `-vf "eq=brightness=0.1:contrast=1.2"`

### 测试 2: 像素格式
- 选择 yuv444p
- 预期命令包含: `-vf "format=yuv444p"`

### 测试 3: 色彩空间
- 设置色域为 bt2020，传输特性为 smpte2084
- 预期命令包含色彩空间参数
