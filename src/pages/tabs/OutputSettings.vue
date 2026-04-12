<template>
  <div class="output-settings">
    <div class="form-section">
      <div class="form-group">
        <label>输出容器</label>
        <div class="input-row">
          <select v-model="localPreset.output.container" @change="onChange">
            <option value="mp4">MP4</option>
            <option value="mkv">MKV</option>
            <option value="webm">WebM</option>
            <option value="avi">AVI</option>
            <option value="mov">MOV</option>
            <option value="flv">FLV</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.noOutputParams" @change="onChange" />
          <span>不使用输出文件参数</span>
        </label>
      </div>

      <div class="form-group">
        <label>输出目录</label>
        <select v-model="localPreset.output.directory" @change="onChange">
          <option value="same">与源文件相同</option>
          <option value="custom">自定义目录</option>
          <option value="desktop">桌面</option>
          <option value="documents">文档</option>
        </select>
      </div>

      <div v-if="localPreset.output.directory === 'custom'" class="form-group">
        <label>自定义目录</label>
        <div class="input-row">
          <input type="text" v-model="localPreset.output.customDirectory" @input="onChange" />
          <button @click="selectDirectory">选择</button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>自动命名</h4>
      <div class="form-group">
        <label class="switch-label">
          <span>关闭</span>
          <input type="checkbox" v-model="localPreset.output.autoNaming" @change="onChange" />
          <span>开启</span>
        </label>
      </div>

      <template v-if="localPreset.output.autoNaming">
        <div class="form-group">
          <label>自动命名选项</label>
          <select v-model="localPreset.output.namingOption" @change="onChange">
            <option value="suffix">仅添加后缀</option>
            <option value="prefix">仅添加前缀</option>
            <option value="replace">替换文件名</option>
            <option value="custom">完全自定义</option>
          </select>
        </div>

        <div class="form-group">
          <label>开头文本</label>
          <input type="text" v-model="localPreset.output.prefixText" @input="onChange" />
        </div>

        <div class="form-group">
          <label>替代文本</label>
          <input type="text" v-model="localPreset.output.replaceText" @input="onChange" />
        </div>

        <div class="form-group">
          <label>结尾文本</label>
          <input type="text" v-model="localPreset.output.suffixText" @input="onChange" />
        </div>
      </template>
    </div>

    <div class="form-section">
      <h4>时间戳保留</h4>
      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.preserveCreationTime" @change="onChange" />
          <span>保留创建时间</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.preserveModifyTime" @change="onChange" />
          <span>保留修改时间</span>
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.output.preserveAccessTime" @change="onChange" />
          <span>保留访问时间</span>
        </label>
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

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

function onChange() {
  emit('update:preset', localPreset.value);
}

async function selectDirectory() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true });
  if (selected && typeof selected === 'string') {
    localPreset.value.output.customDirectory = selected;
    onChange();
  }
}
</script>

<style scoped>
.output-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.form-group input[type="text"],
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
  background: var(--bg-color3, #404040);
  border: 1px solid var(--border-color1, #555);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  cursor: pointer;
  white-space: nowrap;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-color2, #808080);
}
</style>
