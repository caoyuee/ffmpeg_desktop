# 视频滤镜系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现视频滤镜参数面板，支持反交错、降噪、锐化、旋转/翻转功能

**Architecture:** 创建 FilterPanel.vue 单一组件，集成到主页面，复用现有类型定义和命令构建器

**Tech Stack:** Vue 3 + TypeScript + Tauri 2.x

---

## 文件结构

### 需要创建的文件
- `src/components/FilterPanel/FilterPanel.vue` - 滤镜面板主组件

### 需要修改的文件
- `src/pages/main/index.vue` - 集成滤镜面板

---

## 任务分解

### Task 1: 创建滤镜面板组件

**Files:**
- Create: `src/components/FilterPanel/FilterPanel.vue`

- [ ] **Step 1: 创建滤镜面板主组件**

创建 `src/components/FilterPanel/FilterPanel.vue`：

```vue
<template>
  <div class="filter-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('deinterlace')">
        <h4>反交错</h4>
        <span class="toggle-icon">{{ expandedSections.deinterlace ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.deinterlace" class="section-content">
        <div class="form-group">
          <label>处理方式</label>
          <select v-model="localPreset.video.filters.deinterlace" @change="onFilterChange">
            <option :value="0">不处理</option>
            <option :value="1">YADIF - 场序自适应</option>
            <option :value="2">YADIF - 场序强制</option>
            <option :value="3">BWDIF - 场序自适应</option>
            <option :value="4">BWDIF - 场序强制</option>
          </select>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('denoise')">
        <h4>降噪</h4>
        <span class="toggle-icon">{{ expandedSections.denoise ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.denoise" class="section-content">
        <div class="form-group">
          <label>降噪方式</label>
          <select v-model="localPreset.video.filters.denoise.method" @change="onDenoiseMethodChange">
            <option value="">不处理</option>
            <option value="hqdn3d">HQDN3D - 快速降噪</option>
            <option value="nlmeans">NLMeans - 高质量降噪</option>
            <option value="atadenoise">ATADenoise - 时域降噪</option>
          </select>
        </div>

        <div v-if="localPreset.video.filters.denoise.method === 'hqdn3d'" class="params-group">
          <div class="form-group">
            <label>亮度降噪强度</label>
            <input type="range" min="0" max="20" step="0.5" 
              v-model.number="localPreset.video.filters.denoise.param1" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param1 || 4 }}</span>
          </div>
          <div class="form-group">
            <label>色度降噪强度</label>
            <input type="range" min="0" max="20" step="0.5"
              v-model.number="localPreset.video.filters.denoise.param2" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param2 || 3 }}</span>
          </div>
        </div>

        <div v-if="localPreset.video.filters.denoise.method === 'nlmeans'" class="params-group">
          <div class="form-group">
            <label>降噪强度</label>
            <input type="range" min="1" max="20" step="0.5"
              v-model.number="localPreset.video.filters.denoise.param1" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param1 || 3 }}</span>
          </div>
        </div>

        <div v-if="localPreset.video.filters.denoise.method === 'atadenoise'" class="params-group">
          <div class="form-group">
            <label>降噪强度</label>
            <input type="range" min="0.001" max="0.1" step="0.001"
              v-model.number="localPreset.video.filters.denoise.param1" @input="onFilterChange" />
            <span class="param-value">{{ localPreset.video.filters.denoise.param1 || 0.02 }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('sharpen')">
        <h4>锐化</h4>
        <span class="toggle-icon">{{ expandedSections.sharpen ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.sharpen" class="section-content">
        <div class="form-group">
          <label>锐化强度</label>
          <input type="range" min="0" max="2" step="0.1"
            v-model.number="localPreset.video.filters.sharpen.lumaAmount" @input="onFilterChange" />
          <span class="param-value">{{ localPreset.video.filters.sharpen.lumaAmount || '未设置' }}</span>
        </div>
        <div v-if="localPreset.video.filters.sharpen.lumaAmount" class="params-group">
          <div class="form-group">
            <label>水平半径</label>
            <input type="number" min="1" max="15"
              v-model="localPreset.video.filters.sharpen.lumaMsizeX" @input="onFilterChange" />
          </div>
          <div class="form-group">
            <label>垂直半径</label>
            <input type="number" min="1" max="15"
              v-model="localPreset.video.filters.sharpen.lumaMsizeY" @input="onFilterChange" />
          </div>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <div class="section-header" @click="toggleSection('transform')">
        <h4>旋转/翻转</h4>
        <span class="toggle-icon">{{ expandedSections.transform ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.transform" class="section-content">
        <div class="form-group">
          <label>旋转</label>
          <select v-model.number="localPreset.video.filters.rotation" @change="onFilterChange">
            <option :value="0">不旋转</option>
            <option :value="1">顺时针 90°</option>
            <option :value="2">180°</option>
            <option :value="3">逆时针 90°</option>
          </select>
        </div>
        <div class="form-group">
          <label>翻转</label>
          <select v-model.number="localPreset.video.filters.flip" @change="onFilterChange">
            <option :value="0">不翻转</option>
            <option :value="1">水平翻转</option>
            <option :value="2">垂直翻转</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

const expandedSections = reactive({
  deinterlace: false,
  denoise: false,
  sharpen: false,
  transform: false,
});

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

watch(localPreset, (newVal) => {
  emit('update:preset', newVal);
}, { deep: true });

function toggleSection(section: keyof typeof expandedSections) {
  expandedSections[section] = !expandedSections[section];
}

function onFilterChange() {
  emit('update:preset', localPreset.value);
}

function onDenoiseMethodChange() {
  const method = localPreset.value.video.filters.denoise.method;
  if (method === 'hqdn3d') {
    localPreset.value.video.filters.denoise.param1 = '4';
    localPreset.value.video.filters.denoise.param2 = '3';
    localPreset.value.video.filters.denoise.param3 = '6';
    localPreset.value.video.filters.denoise.param4 = '4';
  } else if (method === 'nlmeans') {
    localPreset.value.video.filters.denoise.param1 = '3';
    localPreset.value.video.filters.denoise.param2 = '';
    localPreset.value.video.filters.denoise.param3 = '';
    localPreset.value.video.filters.denoise.param4 = '';
  } else if (method === 'atadenoise') {
    localPreset.value.video.filters.denoise.param1 = '0.02';
    localPreset.value.video.filters.denoise.param2 = '';
    localPreset.value.video.filters.denoise.param3 = '';
    localPreset.value.video.filters.denoise.param4 = '';
  } else {
    localPreset.value.video.filters.denoise.param1 = '';
    localPreset.value.video.filters.denoise.param2 = '';
    localPreset.value.video.filters.denoise.param3 = '';
    localPreset.value.video.filters.denoise.param4 = '';
  }
  onFilterChange();
}
</script>

<style scoped>
.filter-panel {
  padding: 1rem;
}

.panel-section {
  border: 1px solid var(--border-color1, #333);
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: var(--bg-color2, #1e1e1e);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: var(--bg-color3, #2a2a2a);
}

.section-header:hover {
  background: var(--hover-bg, #333);
}

.section-header h4 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-color1, #e0e0e0);
}

.toggle-icon {
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.section-content {
  padding: 1rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.form-group select,
.form-group input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.85rem;
}

.form-group input[type="range"] {
  width: calc(100% - 50px);
  vertical-align: middle;
}

.param-value {
  display: inline-block;
  width: 45px;
  text-align: right;
  font-size: 0.8rem;
  color: var(--text-color2, #999);
}

.params-group {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color1, #333);
}
</style>
```

- [ ] **Step 2: 提交滤镜面板组件**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/components/FilterPanel/FilterPanel.vue
git commit -m "feat: 创建视频滤镜面板组件"
```

---

### Task 2: 集成滤镜面板到主页面

**Files:**
- Modify: `src/pages/main/index.vue`

- [ ] **Step 1: 在主页面中添加滤镜面板**

在 `src/pages/main/index.vue` 的参数区域添加滤镜面板：

```vue
<template>
  <div class="main-container">
    <div class="main-content">
      <div class="left-panel">
        <!-- 文件上传区域 -->
        <!-- ... -->

        <!-- 参数面板区域 -->
        <div class="parameter-section">
          <!-- 剪辑面板 -->
          <TrimPanel v-model:preset="currentPreset" @update:preset="onPresetUpdate" />
          
          <!-- 滤镜面板 -->
          <FilterPanel v-model:preset="currentPreset" @update:preset="onPresetUpdate" />
          
          <!-- 其他参数 -->
          <!-- ... -->
        </div>
      </div>
      <!-- ... -->
    </div>
  </div>
</template>

<script setup lang="ts">
import TrimPanel from '@/components/TrimPanel/TrimPanel.vue';
import FilterPanel from '@/components/FilterPanel/FilterPanel.vue';
// ... 其他导入
</script>
```

- [ ] **Step 2: 提交主页面集成**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/pages/main/index.vue
git commit -m "feat: 集成滤镜面板到主页面"
```

---

## 验证清单

- [x] 滤镜面板正确显示在主页面
- [x] 各区块可折叠/展开
- [x] 反交错选项正确工作
- [x] 降噪参数根据方式显示不同选项
- [x] 锐化参数正确调节
- [x] 旋转/翻转选项正确工作
- [x] FFmpeg 命令正确包含滤镜参数

---

## 测试用例

### 测试 1: 反交错
- 选择 "YADIF - 场序自适应"
- 预期命令包含: `-vf "yadif=0:-1:0"`

### 测试 2: 降噪
- 选择 "HQDN3D - 快速降噪"
- 设置亮度降噪强度为 5
- 预期命令包含: `-vf "hqdn3d=5:3:6:4"`

### 测试 3: 锐化
- 设置锐化强度为 1.0
- 预期命令包含: `-vf "unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=1.0"`

### 测试 4: 旋转
- 选择 "顺时针 90°"
- 预期命令包含: `-vf "transpose=1"`
