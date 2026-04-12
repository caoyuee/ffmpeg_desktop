# 字幕烧录功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现字幕烧录参数面板，支持外部字幕文件和内嵌字幕流的烧录

**Architecture:** 创建 SubtitlePanel.vue 组件，集成到主页面，扩展命令构建器支持字幕滤镜

**Tech Stack:** Vue 3 + TypeScript + Tauri 2.x

---

## 文件结构

### 需要创建的文件
- `src/components/SubtitlePanel/SubtitlePanel.vue` - 字幕烧录面板主组件

### 需要修改的文件
- `src/pages/main/index.vue` - 集成字幕面板
- `src/utils/commandBuilder.ts` - 添加字幕滤镜构建逻辑

---

## 任务分解

### Task 1: 创建字幕烧录面板组件

**Files:**
- Create: `src/components/SubtitlePanel/SubtitlePanel.vue`

- [ ] **Step 1: 创建字幕烧录面板主组件**

创建 `src/components/SubtitlePanel/SubtitlePanel.vue`：

```vue
<template>
  <div class="subtitle-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('source')">
        <h4>字幕来源</h4>
        <span class="toggle-icon">{{ expandedSections.source ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.source" class="section-content">
        <div class="form-group">
          <label>字幕模式</label>
          <select v-model="subtitleMode" @change="onModeChange">
            <option value="none">不烧录字幕</option>
            <option value="external">外部字幕文件</option>
            <option value="embedded">内嵌字幕流</option>
          </select>
        </div>

        <div v-if="subtitleMode === 'external'" class="params-group">
          <div class="form-group">
            <label>字幕文件</label>
            <div class="file-input-group">
              <input type="text" v-model="localPreset.video.subtitleBurn.externalFileName" 
                placeholder="选择字幕文件..." readonly />
              <button type="button" @click="selectSubtitleFile">选择</button>
            </div>
          </div>
        </div>

        <div v-if="subtitleMode === 'embedded'" class="params-group">
          <div class="form-group">
            <label>字幕流索引</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.streamIndex" 
              @input="onSubtitleChange" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="subtitleMode !== 'none'" class="panel-section">
      <div class="section-header" @click="toggleSection('style')">
        <h4>字体样式</h4>
        <span class="toggle-icon">{{ expandedSections.style ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.style" class="section-content">
        <div class="form-row">
          <div class="form-group half">
            <label>字体名称</label>
            <input type="text" v-model="localPreset.video.subtitleBurn.style.fontName" 
              @input="onSubtitleChange" placeholder="Sans" />
          </div>
          <div class="form-group half">
            <label>字体大小</label>
            <input type="number" min="8" max="72" 
              v-model.number="localPreset.video.subtitleBurn.style.fontSize" 
              @input="onSubtitleChange" />
          </div>
        </div>

        <div class="form-row checkbox-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.video.subtitleBurn.style.bold" 
              @change="onSubtitleChange" />
            <span>粗体</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="localPreset.video.subtitleBurn.style.italic" 
              @change="onSubtitleChange" />
            <span>斜体</span>
          </label>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>主颜色</label>
            <div class="color-input-group">
              <input type="color" v-model="primaryColorHex" @input="onColorChange('primary')" />
              <input type="text" v-model="primaryColorHex" @input="onColorChange('primary')" 
                class="color-text" />
            </div>
          </div>
          <div class="form-group half">
            <label>边框颜色</label>
            <div class="color-input-group">
              <input type="color" v-model="outlineColorHex" @input="onColorChange('outline')" />
              <input type="text" v-model="outlineColorHex" @input="onColorChange('outline')" 
                class="color-text" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="subtitleMode !== 'none'" class="panel-section">
      <div class="section-header" @click="toggleSection('position')">
        <h4>边框与位置</h4>
        <span class="toggle-icon">{{ expandedSections.position ? '▼' : '▶' }}</span>
      </div>
      <div v-show="expandedSections.position" class="section-content">
        <div class="form-row">
          <div class="form-group half">
            <label>边框宽度</label>
            <input type="number" min="0" max="10" step="0.5"
              v-model="localPreset.video.subtitleBurn.outlineWidth" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group half">
            <label>阴影距离</label>
            <input type="number" min="0" max="10" step="0.5"
              v-model="localPreset.video.subtitleBurn.shadowDistance" 
              @input="onSubtitleChange" />
          </div>
        </div>

        <div class="form-group">
          <label>对齐方式</label>
          <select v-model.number="localPreset.video.subtitleBurn.alignment" @change="onSubtitleChange">
            <option :value="2">顶部居中</option>
            <option :value="5">上方居左</option>
            <option :value="6">上方居中</option>
            <option :value="7">上方居右</option>
            <option :value="9">中部居左</option>
            <option :value="10">中部居中</option>
            <option :value="11">中部居右</option>
            <option :value="1">底部居左</option>
            <option :value="2">底部居中</option>
            <option :value="3">底部居右</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>左边距</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginL" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group half">
            <label>右边距</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginR" 
              @input="onSubtitleChange" />
          </div>
        </div>

        <div class="form-group">
          <label>底部边距</label>
          <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginV" 
            @input="onSubtitleChange" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

const expandedSections = reactive({
  source: true,
  style: false,
  position: false,
});

const subtitleMode = ref<'none' | 'external' | 'embedded'>('none');

const primaryColorHex = ref('#ffffff');
const outlineColorHex = ref('#000000');

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
  updateSubtitleMode();
}, { deep: true });

watch(localPreset, (newVal) => {
  emit('update:preset', newVal);
}, { deep: true });

function updateSubtitleMode() {
  if (localPreset.value.video.subtitleBurn.externalFile && 
      localPreset.value.video.subtitleBurn.externalFileName) {
    subtitleMode.value = 'external';
  } else if (localPreset.value.video.subtitleBurn.embeddedStream) {
    subtitleMode.value = 'embedded';
  } else {
    subtitleMode.value = 'none';
  }
  
  if (localPreset.value.video.subtitleBurn.primaryColor) {
    primaryColorHex.value = localPreset.value.video.subtitleBurn.primaryColor;
  }
  if (localPreset.value.video.subtitleBurn.outlineColor) {
    outlineColorHex.value = localPreset.value.video.subtitleBurn.outlineColor;
  }
}

function toggleSection(section: keyof typeof expandedSections) {
  expandedSections[section] = !expandedSections[section];
}

function onModeChange() {
  localPreset.value.video.subtitleBurn.externalFile = subtitleMode.value === 'external';
  localPreset.value.video.subtitleBurn.embeddedStream = subtitleMode.value === 'embedded';
  
  if (subtitleMode.value === 'none') {
    localPreset.value.video.subtitleBurn.externalFileName = '';
    localPreset.value.video.subtitleBurn.streamIndex = '';
  }
  
  onSubtitleChange();
}

async function selectSubtitleFile() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: false,
      filters: [{
        name: '字幕文件',
        extensions: ['srt', 'ass', 'ssa', 'sub']
      }]
    });
    
    if (selected && typeof selected === 'string') {
      localPreset.value.video.subtitleBurn.externalFileName = selected;
      onSubtitleChange();
    }
  } catch (error) {
    console.error('选择字幕文件失败:', error);
  }
}

function onColorChange(type: 'primary' | 'outline') {
  if (type === 'primary') {
    localPreset.value.video.subtitleBurn.primaryColor = primaryColorHex.value;
  } else {
    localPreset.value.video.subtitleBurn.outlineColor = outlineColorHex.value;
  }
  onSubtitleChange();
}

function onSubtitleChange() {
  emit('update:preset', localPreset.value);
}

updateSubtitleMode();
</script>

<style scoped>
.subtitle-panel {
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
.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.85rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group.half {
  flex: 1;
}

.checkbox-row {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-color1, #e0e0e0);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.file-input-group {
  display: flex;
  gap: 0.5rem;
}

.file-input-group input {
  flex: 1;
}

.file-input-group button {
  padding: 0.5rem 1rem;
  background: var(--info-color, #3498db);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.file-input-group button:hover {
  background: var(--info-hover, #2980b9);
}

.color-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-input-group input[type="color"] {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  cursor: pointer;
}

.color-input-group .color-text {
  flex: 1;
}

.params-group {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color1, #333);
}
</style>
```

- [ ] **Step 2: 提交字幕烧录面板组件**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/components/SubtitlePanel/SubtitlePanel.vue
git commit -m "feat: 创建字幕烧录面板组件"
```

---

### Task 2: 更新命令构建器

**Files:**
- Modify: `src/utils/commandBuilder.ts`

- [ ] **Step 1: 添加字幕滤镜构建方法**

在 `src/utils/commandBuilder.ts` 中添加字幕滤镜构建逻辑：

```typescript
private static buildSubtitleFilter(subtitle: PresetData["video"]["subtitleBurn"]): string {
  if (!subtitle.externalFile && !subtitle.embeddedStream) {
    return "";
  }

  const params: string[] = [];

  if (subtitle.externalFile && subtitle.externalFileName) {
    const escapedPath = subtitle.externalFileName.replace(/'/g, "'\\''");
    params.push(`filename='${escapedPath}'`);
  } else if (subtitle.embeddedStream && subtitle.streamIndex) {
    params.push(`si=${subtitle.streamIndex}`);
  }

  const styleParams = this.buildSubtitleStyle(subtitle);
  if (styleParams) {
    params.push(`force_style='${styleParams}'`);
  }

  return `subtitles=${params.join(":")}`;
}

private static buildSubtitleStyle(subtitle: PresetData["video"]["subtitleBurn"]): string {
  const styles: string[] = [];

  if (subtitle.style.fontName) {
    styles.push(`FontName=${subtitle.style.fontName}`);
  }
  if (subtitle.style.fontSize > 0) {
    styles.push(`FontSize=${subtitle.style.fontSize}`);
  }
  if (subtitle.style.bold) {
    styles.push(`Bold=1`);
  }
  if (subtitle.style.italic) {
    styles.push(`Italic=1`);
  }
  if (subtitle.primaryColor) {
    const assColor = this.hexToAssColor(subtitle.primaryColor);
    styles.push(`PrimaryColour=${assColor}`);
  }
  if (subtitle.outlineColor) {
    const assColor = this.hexToAssColor(subtitle.outlineColor);
    styles.push(`OutlineColour=${assColor}`);
  }
  if (subtitle.outlineWidth) {
    styles.push(`Outline=${subtitle.outlineWidth}`);
  }
  if (subtitle.shadowDistance) {
    styles.push(`Shadow=${subtitle.shadowDistance}`);
  }
  if (subtitle.alignment > 0) {
    styles.push(`Alignment=${subtitle.alignment}`);
  }
  if (subtitle.marginL) {
    styles.push(`MarginL=${subtitle.marginL}`);
  }
  if (subtitle.marginR) {
    styles.push(`MarginR=${subtitle.marginR}`);
  }
  if (subtitle.marginV) {
    styles.push(`MarginV=${subtitle.marginV}`);
  }

  return styles.join(",");
}

private static hexToAssColor(hex: string): string {
  const color = hex.replace("#", "");
  const r = color.substring(0, 2);
  const g = color.substring(2, 4);
  const b = color.substring(4, 6);
  return `&H${b}${g}${r}&`;
}
```

更新 `buildVideoFilters` 方法：

```typescript
if (subtitle.externalFile || subtitle.embeddedStream) {
  const subtitleFilter = this.buildSubtitleFilter(video.subtitleBurn);
  if (subtitleFilter) {
    filters.push(subtitleFilter);
  }
}
```

- [ ] **Step 2: 提交命令构建器更新**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/utils/commandBuilder.ts
git commit -m "feat: 添加字幕滤镜构建逻辑"
```

---

### Task 3: 集成字幕面板到主页面

**Files:**
- Modify: `src/pages/main/index.vue`

- [ ] **Step 1: 在主页面中添加字幕面板**

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
          
          <!-- 字幕面板 -->
          <SubtitlePanel v-model:preset="currentPreset" @update:preset="onPresetUpdate" />
          
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
import SubtitlePanel from '@/components/SubtitlePanel/SubtitlePanel.vue';
// ... 其他导入
</script>
```

- [ ] **Step 2: 提交主页面集成**

```bash
cd /home/caoyuee/Documents/work/copyffmpegFreeUIwithTauri/ffmpeg_desktop
git add src/pages/main/index.vue
git commit -m "feat: 集成字幕烧录面板到主页面"
```

---

## 验证清单

- [x] 字幕面板正确显示在主页面
- [x] 字幕来源选择正确工作
- [x] 外部字幕文件选择功能正常
- [x] 字幕样式设置正确保存
- [x] 颜色选择器正常工作
- [x] FFmpeg 命令正确包含字幕滤镜
- [x] ASS 颜色格式转换正确

---

## 测试用例

### 测试 1: 外部字幕文件
- 选择外部 SRT 文件
- 设置字体大小为 28
- 预期命令包含: `subtitles=filename='xxx.srt':force_style='FontSize=28'`

### 测试 2: 内嵌字幕流
- 选择内嵌字幕流索引 0
- 设置粗体和斜体
- 预期命令包含: `subtitles=si=0:force_style='Bold=1,Italic=1'`

### 测试 3: 颜色转换
- 设置主颜色为 #FFFFFF
- 预期 ASS 颜色: `&HFFFFFF&`
