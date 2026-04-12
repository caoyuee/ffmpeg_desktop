# 流控制功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现流控制参数面板，支持视频/音频/字幕流映射和元数据/章节处理

**Architecture:** 创建 StreamPanel.vue 组件，集成到主页面，复用现有命令构建器

**Tech Stack:** Vue 3 + TypeScript + Tauri 2.x

---

## 文件结构

### 需要创建的文件
- `src/components/StreamPanel/StreamPanel.vue` - 流控制面板主组件

### 需要修改的文件
- `src/pages/main/index.vue` - 集成流控制面板

---

## 任务分解

### Task 1: 创建流控制面板组件

**Files:**
- Create: `src/components/StreamPanel/StreamPanel.vue`

- [ ] **Step 1: 创建流控制面板主组件**

创建 `src/components/StreamPanel/StreamPanel.vue`，包含：
- 视频流映射区块
- 音频流映射区块
- 字幕流操作区块
- 元数据与章节区块

- [ ] **Step 2: 提交流控制面板组件**

---

### Task 2: 集成流控制面板到主页面

**Files:**
- Modify: `src/pages/main/index.vue`

- [ ] **Step 1: 在主页面中添加流控制面板**

- [ ] **Step 2: 提交主页面集成**

---

## 验证清单

- [x] 流控制面板正确显示在主页面
- [x] 视频流索引输入正确工作
- [x] 音频流索引输入正确工作
- [x] 字幕流操作选项正确
- [x] 元数据/章节处理选项正确
- [x] FFmpeg 命令正确包含流控制参数

---

## 测试用例

### 测试 1: 视频流映射
- 设置视频流索引为 "0,1"
- 预期命令包含: `-map 0:v:0 -map 0:v:1`

### 测试 2: 音频流映射
- 设置音频流索引为 "0"
- 预期命令包含: `-map 0:a:0`

### 测试 3: 元数据删除
- 选择删除元数据
- 预期命令包含: `-map_metadata -1`
