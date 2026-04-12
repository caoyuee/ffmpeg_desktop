<template>
  <div class="subtitle-settings">
    <div class="form-section">
      <h4>字幕来源</h4>
      <div class="form-group">
        <label>字幕模式</label>
        <select v-model="subtitleMode" @change="onModeChange">
          <option value="none">不处理字幕</option>
          <option value="external">外部字幕文件</option>
          <option value="embedded">内嵌字幕流</option>
        </select>
      </div>

      <div v-if="subtitleMode === 'external'" class="form-group">
        <label>字幕文件</label>
        <div class="input-row">
          <input type="text" v-model="localPreset.video.subtitleBurn.externalFileName" readonly placeholder="选择字幕文件..." />
          <button @click="selectSubtitleFile">选择</button>
        </div>
      </div>

      <div v-if="subtitleMode === 'embedded'" class="form-group">
        <label>字幕流索引</label>
        <input type="number" v-model.number="localPreset.video.subtitleBurn.streamIndex" min="0" />
      </div>
    </div>

    <div v-if="subtitleMode !== 'none'" class="form-section">
      <h4>字幕样式</h4>
      <div class="form-row">
        <div class="form-group half">
          <label>字体名称</label>
          <input type="text" v-model="localPreset.video.subtitleBurn.style.fontName" @input="onChange" placeholder="Sans" />
        </div>
        <div class="form-group half">
          <label>字体大小</label>
          <input type="number" v-model.number="localPreset.video.subtitleBurn.style.fontSize" @input="onChange" min="8" max="72" />
        </div>
      </div>

      <div class="form-row checkbox-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.video.subtitleBurn.style.bold" @change="onChange" />
          <span>粗体</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.video.subtitleBurn.style.italic" @change="onChange" />
          <span>斜体</span>
        </label>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label>主颜色</label>
          <div class="color-input">
            <input type="color" v-model="primaryColor" @input="onColorChange('primary')" />
            <input type="text" v-model="primaryColor" @input="onColorChange('primary')" />
          </div>
        </div>
        <div class="form-group half">
          <label>边框颜色</label>
          <div class="color-input">
            <input type="color" v-model="outlineColor" @input="onColorChange('outline')" />
            <input type="text" v-model="outlineColor" @input="onColorChange('outline')" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="subtitleMode !== 'none'" class="form-section">
      <h4>边框与位置</h4>
      <div class="form-row">
        <div class="form-group third">
          <label>边框宽度</label>
          <input type="number" v-model.number="localPreset.video.subtitleBurn.outlineWidth" @input="onChange" min="0" max="10" step="0.5" />
        </div>
        <div class="form-group third">
          <label>阴影距离</label>
          <input type="number" v-model.number="localPreset.video.subtitleBurn.shadowDistance" @input="onChange" min="0" max="10" step="0.5" />
        </div>
        <div class="form-group third">
          <label>对齐方式</label>
          <select v-model.number="localPreset.video.subtitleBurn.alignment" @change="onChange">
            <option :value="2">底部居中</option>
            <option :value="1">底部居左</option>
            <option :value="3">底部居右</option>
            <option :value="5">上方居中</option>
            <option :value="8">中下</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group third">
          <label>左边距</label>
          <input type="number" v-model.number="localPreset.video.subtitleBurn.marginL" @input="onChange" min="0" />
        </div>
        <div class="form-group third">
          <label>右边距</label>
          <input type="number" v-model.number="localPreset.video.subtitleBurn.marginR" @input="onChange" min="0" />
        </div>
        <div class="form-group third">
          <label>垂直边距</label>
          <input type="number" v-model.number="localPreset.video.subtitleBurn.marginV" @input="onChange" min="0" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });
const subtitleMode = ref<'none' | 'external' | 'embedded'>('none');
const primaryColor = ref('#ffffff');
const outlineColor = ref('#000000');

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
  updateSubtitleMode();
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
    primaryColor.value = localPreset.value.video.subtitleBurn.primaryColor;
  }
  if (localPreset.value.video.subtitleBurn.outlineColor) {
    outlineColor.value = localPreset.value.video.subtitleBurn.outlineColor;
  }
}

function onModeChange() {
  localPreset.value.video.subtitleBurn.externalFile = subtitleMode.value === 'external';
  localPreset.value.video.subtitleBurn.embeddedStream = subtitleMode.value === 'embedded';
  onChange();
}

function onChange() {
  emit('update:preset', localPreset.value);
}

async function selectSubtitleFile() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [{ name: '字幕文件', extensions: ['srt', 'ass', 'ssa', 'sub'] }],
  });
  if (selected && typeof selected === 'string') {
    localPreset.value.video.subtitleBurn.externalFileName = selected;
    onChange();
  }
}

function onColorChange(type: 'primary' | 'outline') {
  if (type === 'primary') {
    localPreset.value.video.subtitleBurn.primaryColor = primaryColor.value;
  } else {
    localPreset.value.video.subtitleBurn.outlineColor = outlineColor.value;
  }
  onChange();
}
</script>

<style scoped>
.subtitle-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  padding: 16px;
}

.form-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  box-sizing: border-box;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-row input {
  flex: 1;
}

.input-row button {
  padding: 8px 16px;
  background: var(--info-color, #3498db);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}

.form-group.third {
  flex: 1;
}

.checkbox-row {
  align-items: center;
  gap: 24px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}

.color-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input input[type="color"] {
  width: 40px;
  height: 32px;
  padding: 2px;
  cursor: pointer;
}

.color-input input[type="text"] {
  flex: 1;
  text-transform: uppercase;
}
</style>
