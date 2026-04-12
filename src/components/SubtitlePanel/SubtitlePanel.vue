<template>
  <div class="subtitle-panel">
    <div class="panel-section">
      <div class="section-header" @click="toggleSection('source')">
        <h4>字幕烧录</h4>
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
            <option :value="0">默认</option>
            <option :value="1">左上</option>
            <option :value="2">中上</option>
            <option :value="3">右上</option>
            <option :value="4">左中</option>
            <option :value="5">居中</option>
            <option :value="6">右中</option>
            <option :value="7">左下</option>
            <option :value="8">中下</option>
            <option :value="9">右下</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group third">
            <label>左边距</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginL" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group third">
            <label>右边距</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginR" 
              @input="onSubtitleChange" />
          </div>
          <div class="form-group third">
            <label>垂直边距</label>
            <input type="number" min="0" v-model="localPreset.video.subtitleBurn.marginV" 
              @input="onSubtitleChange" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });
const subtitleMode = ref<'none' | 'external' | 'embedded'>('none');
const primaryColorHex = ref('#ffffff');
const outlineColorHex = ref('#000000');

const expandedSections = reactive({
  source: false,
  style: false,
  position: false,
});

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
  updateSubtitleMode();
}, { deep: true });

watch(localPreset, (newVal) => {
  emit('update:preset', newVal);
}, { deep: true });

function updateSubtitleMode() {
  if (localPreset.value.video.subtitleBurn.externalFile) {
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

onMounted(() => {
  updateSubtitleMode();
});
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
  box-sizing: border-box;
}

.form-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group.half {
  flex: 1;
}

.form-group.third {
  flex: 1;
}

.params-group {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color1, #333);
}

.checkbox-row {
  align-items: center;
  gap: 1.5rem;
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
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--info-color, #3498db);
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.file-input-group button:hover {
  background: var(--info-color-hover, #2980b9);
}

.color-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-input-group input[type="color"] {
  width: 36px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.color-input-group .color-text {
  flex: 1;
  text-transform: uppercase;
}
</style>
