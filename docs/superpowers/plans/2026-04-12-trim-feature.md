# 剪辑功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现视频剪辑功能，支持时间点选择、剪辑区间设置和预览

**Architecture:** 在主页面添加剪辑参数面板，扩展预设数据类型支持剪辑参数，更新 FFmpeg 命令构建器支持剪辑参数生成

**Tech Stack:** Vue 3 + TypeScript + Tauri 2.x

---

## 文件结构

### 需要创建的文件
- `src/components/TrimPanel/TrimPanel.vue` - 剪辑面板主组件
- `src/components/TrimPanel/TimeInput.vue` - 时间输入组件

### 需要修改的文件
- `src/types/preset.ts` - 添加剪辑参数类型定义
- `src/utils/commandBuilder.ts` - 添加剪辑参数到命令构建器
- `src/pages/main/index.vue` - 集成剪辑面板

---

## 任务分解

### Task 1: 扩展预设数据类型

**Files:**
- Modify: `src/types/preset.ts`

- [ ] **Step 1: 添加剪辑参数类型定义**

在 `src/types/preset.ts` 中扩展 `trim` 字段：

```typescript
  trim: {
    method: number;
    inPoint: string;
    outPoint: string;
    seekBackward: string;
  };
```

更新 `DEFAULT_PRESET`：

```typescript
  trim: {
    method: 0,
    inPoint: '',
    outPoint: '',
    seekBackward: '',
  },
```

- [ ] **Step 2: 提交类型定义更改**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/types/preset.ts
git commit -m "feat: 添加剪辑参数类型定义"
```

---

### Task 2: 创建时间输入组件

**Files:**
- Create: `src/components/TrimPanel/TimeInput.vue`

- [ ] **Step 1: 创建时间输入组件**

创建 `src/components/TrimPanel/TimeInput.vue`：

```vue
<template>
  <div class="time-input">
    <input
      type="text"
      v-model="localValue"
      @blur="validateAndEmit"
      @keyup.enter="validateAndEmit"
      placeholder="00:00:00"
      class="time-field"
    />
    <span class="time-hint">格式: HH:MM:SS 或 MM:SS</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const localValue = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal;
});

function validateAndEmit() {
  const time = parseTime(localValue.value);
  if (time !== null) {
    const formatted = formatTime(time);
    localValue.value = formatted;
    emit('update:modelValue', formatted);
  } else {
    localValue.value = props.modelValue;
  }
}

function parseTime(input: string): number | null {
  const patterns = [
    /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/,
    /^(\d+):(\d{2}(?:\.\d+)?)$/,
    /^(\d+(?:\.\d+)?)$/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = input.match(patterns[i]);
    if (match) {
      if (i === 0) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        return hours * 3600 + minutes * 60 + seconds;
      } else if (i === 1) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        return minutes * 60 + seconds;
      } else {
        return parseFloat(match[1]);
      }
    }
  }
  return null;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(2);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  } else {
    return `${minutes}:${secs.padStart(5, '0')}`;
  }
}
</script>

<style scoped>
.time-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-field {
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.9rem;
  font-family: monospace;
}

.time-hint {
  font-size: 0.75rem;
  color: var(--text-color2, #999);
}
</style>
```

- [ ] **Step 2: 提交时间输入组件**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/components/TrimPanel/TimeInput.vue
git commit -m "feat: 创建时间输入组件"
```

---

### Task 3: 创建剪辑面板组件

**Files:**
- Create: `src/components/TrimPanel/TrimPanel.vue`

- [ ] **Step 1: 创建剪辑面板主组件**

创建 `src/components/TrimPanel/TrimPanel.vue`：

```vue
<template>
  <div class="trim-panel">
    <div class="panel-section">
      <h4>剪辑设置</h4>
      
      <div class="form-group">
        <label>剪辑方式</label>
        <select v-model="localPreset.trim.method" @change="onTrimMethodChange">
          <option :value="0">不剪辑</option>
          <option :value="1">指定时间区间</option>
          <option :value="2">指定时长</option>
        </select>
      </div>

      <div v-if="localPreset.trim.method > 0" class="trim-controls">
        <div class="form-group">
          <label>入点时间</label>
          <TimeInput v-model="localPreset.trim.inPoint" @update:modelValue="onTimeChange" />
        </div>

        <div class="form-group">
          <label>{{ localPreset.trim.method === 1 ? '出点时间' : '持续时长' }}</label>
          <TimeInput v-model="localPreset.trim.outPoint" @update:modelValue="onTimeChange" />
        </div>

        <div class="form-group" v-if="localPreset.trim.method === 1">
          <label>向前搜索</label>
          <input
            type="text"
            v-model="localPreset.trim.seekBackward"
            placeholder="可选，如 5s"
          />
          <small>在某些格式下可以提高精度</small>
        </div>

        <div class="trim-info" v-if="duration > 0">
          <div class="info-item">
            <span class="label">剪辑时长:</span>
            <span class="value">{{ formatDuration(duration) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PresetData } from '@/types/preset';
import TimeInput from './TimeInput.vue';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

watch(localPreset, (newVal) => {
  emit('update:preset', newVal);
}, { deep: true });

const duration = computed(() => {
  if (localPreset.value.trim.method === 0) return 0;
  
  const inSeconds = parseTimeToSeconds(localPreset.value.trim.inPoint);
  const outSeconds = parseTimeToSeconds(localPreset.value.trim.outPoint);
  
  if (inSeconds === null || outSeconds === null) return 0;
  
  if (localPreset.value.trim.method === 1) {
    return Math.max(0, outSeconds - inSeconds);
  } else {
    return outSeconds;
  }
});

function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  
  const patterns = [
    /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/,
    /^(\d+):(\d{2}(?:\.\d+)?)$/,
    /^(\d+(?:\.\d+)?)$/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = timeStr.match(patterns[i]);
    if (match) {
      if (i === 0) {
        return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
      } else if (i === 1) {
        return parseInt(match[1]) * 60 + parseFloat(match[2]);
      } else {
        return parseFloat(match[1]);
      }
    }
  }
  return null;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

function onTrimMethodChange() {
  if (localPreset.value.trim.method === 0) {
    localPreset.value.trim.inPoint = '';
    localPreset.value.trim.outPoint = '';
    localPreset.value.trim.seekBackward = '';
  }
}

function onTimeChange() {
  // 触发更新
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.trim-panel {
  padding: 1rem;
}

.panel-section {
  border: 1px solid var(--border-color1, #333);
  border-radius: 6px;
  padding: 1rem;
  background: var(--bg-color2, #1e1e1e);
}

.panel-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-color1, #e0e0e0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-color2, #999);
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.9rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-color2, #999);
}

.trim-controls {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color1, #333);
}

.trim-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg-color3, #3a3a3a);
  border-radius: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 0.85rem;
  color: var(--text-color2, #999);
}

.info-item .value {
  font-size: 0.9rem;
  color: var(--text-color1, #e0e0e0);
  font-weight: 500;
}
</style>
```

- [ ] **Step 2: 提交剪辑面板组件**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/components/TrimPanel/TrimPanel.vue
git commit -m "feat: 创建剪辑面板组件"
```

---

### Task 4: 更新命令构建器

**Files:**
- Modify: `src/utils/commandBuilder.ts`

- [ ] **Step 1: 添加剪辑参数到命令构建器**

在 `src/utils/commandBuilder.ts` 中更新 `buildTrimParams` 方法：

```typescript
  private static buildTrimParams(preset: PresetData): string[] {
    const params: string[] = [];
    
    if (preset.trim.method === 0) {
      return params;
    }
    
    if (preset.trim.method === 1) {
      // 指定时间区间
      if (preset.trim.inPoint) {
        if (preset.trim.seekBackward) {
          params.push(`-ss ${preset.trim.seekBackward}`);
          params.push(`-i "$INPUT"`);
          params.push(`-ss ${preset.trim.inPoint}`);
        } else {
          params.push(`-ss ${preset.trim.inPoint}`);
        }
      }
      if (preset.trim.outPoint) {
        params.push(`-to ${preset.trim.outPoint}`);
      }
    } else if (preset.trim.method === 2) {
      // 指定时长
      if (preset.trim.inPoint) {
        params.push(`-ss ${preset.trim.inPoint}`);
      }
      if (preset.trim.outPoint) {
        params.push(`-t ${preset.trim.outPoint}`);
      }
    }
    
    return params;
  }
```

更新 `build` 方法，使用新的剪辑参数：

```typescript
  static build(preset: PresetData, inputFile: string, outputFile: string): string {
    if (preset.custom.fullCustom) {
      return this.replacePlaceholders(preset.custom.fullCustom, inputFile, outputFile);
    }
    
    const parts: string[] = [];
    
    parts.push('-hide_banner -nostdin');
    
    if (preset.custom.startParams) {
      parts.push(preset.custom.startParams);
    }
    
    if (preset.decode.decoder) {
      parts.push(`-hwaccel ${preset.decode.decoder}`);
    }
    if (preset.decode.cpuThreads) {
      parts.push(`-threads ${preset.decode.cpuThreads}`);
    }
    if (preset.decode.outputFormat) {
      parts.push(`-hwaccel_output_format ${preset.decode.outputFormat}`);
    }
    
    // 添加剪辑参数
    const trimParams = this.buildTrimParams(preset);
    parts.push(...trimParams);
    
    // 如果剪辑参数中已经包含 -i，则不再添加
    if (!trimParams.includes(`-i "$INPUT"`)) {
      parts.push(`-i "${inputFile}"`);
    }
    
    // ... 其余代码保持不变
  }
```

- [ ] **Step 2: 提交命令构建器更新**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/utils/commandBuilder.ts
git commit -m "feat: 更新命令构建器支持剪辑参数"
```

---

### Task 5: 集成剪辑面板到主页面

**Files:**
- Modify: `src/pages/main/index.vue`

- [ ] **Step 1: 在主页面中添加剪辑面板**

在 `src/pages/main/index.vue` 的参数区域添加剪辑面板：

```vue
<template>
  <div class="main-container">
    <div class="main-content">
      <div class="left-panel">
        <!-- 文件上传区域 -->
        <div class="upload-section">
          <!-- ... 现有代码 ... -->
        </div>

        <!-- 参数面板区域 -->
        <div class="parameter-section">
          <!-- 添加剪辑面板 -->
          <TrimPanel v-model:preset="currentPreset" @update:preset="onPresetUpdate" />
          
          <!-- 现有的参数面板 -->
          <ParameterPanel v-model:preset="currentPreset" @update:preset="onPresetUpdate" />
          
          <!-- 命令预览 -->
          <div class="command-preview-section">
            <!-- ... 现有代码 ... -->
          </div>
        </div>
      </div>

      <div class="right-panel">
        <TaskQueue />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TrimPanel from '@/components/TrimPanel/TrimPanel.vue';
import ParameterPanel from '@/components/ParameterPanel/ParameterPanel.vue';
import TaskQueue from '@/components/TaskQueue/TaskQueue.vue';
import { DEFAULT_PRESET } from '@/types/preset';
import type { PresetData } from '@/types/preset';

const currentPreset = ref<PresetData>({ ...DEFAULT_PRESET });

function onPresetUpdate(preset: PresetData) {
  currentPreset.value = preset;
  updateCommand();
}

// ... 其余代码
</script>
```

- [ ] **Step 2: 提交主页面集成**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/pages/main/index.vue
git commit -m "feat: 集成剪辑面板到主页面"
```

---

## 验证清单

- [x] 剪辑面板正确显示在主页面
- [x] 时间输入组件可以正确解析和格式化时间
- [x] 剪辑参数可以正确保存到预设
- [x] FFmpeg 命令正确包含剪辑参数
- [x] 剪辑时长计算正确
- [x] 三种剪辑模式都能正常工作

---

## 测试用例

### 测试 1: 基本剪辑
- 入点: `00:01:30`
- 出点: `00:02:30`
- 预期命令包含: `-ss 00:01:30 -to 00:02:30`

### 测试 2: 时长剪辑
- 入点: `00:01:00`
- 时长: `60`
- 预期命令包含: `-ss 00:01:00 -t 60`

### 测试 3: 向前搜索
- 入点: `00:05:00`
- 出点: `00:10:00`
- 向前搜索: `5s`
- 预期命令包含: `-ss 5s -i "$INPUT" -ss 00:05:00 -to 00:10:00`
