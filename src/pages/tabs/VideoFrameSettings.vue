<template>
  <div class="video-frame-settings">
    <div class="form-section">
      <h4>分辨率</h4>
      <div class="form-group">
        <label>缩放模式</label>
        <select v-model="localPreset.video.resolution.mode" @change="onChange">
          <option value="keep">保持原样</option>
          <option value="width">指定宽度</option>
          <option value="height">指定高度</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div v-if="localPreset.video.resolution.mode !== 'keep'" class="form-row">
        <div class="form-group half">
          <label>宽度</label>
          <input type="number" v-model.number="localPreset.video.resolution.width" @input="onChange" min="1" />
        </div>
        <div class="form-group half">
          <label>高度</label>
          <input type="number" v-model.number="localPreset.video.resolution.height" @input="onChange" min="1" />
        </div>
      </div>

      <div class="form-group">
        <label>缩放算法</label>
        <select v-model="localPreset.video.resolution.scaler" @change="onChange">
          <option value="bicubic">Bicubic (推荐)</option>
          <option value="bilinear">Bilinear</option>
          <option value="lanczos">Lanczos</option>
          <option value="spline">Spline</option>
          <option value="neighbor">Nearest Neighbor</option>
        </select>
      </div>
    </div>

    <div class="form-section">
      <h4>帧速率</h4>
      <div class="form-group">
        <label>帧率模式</label>
        <select v-model="localPreset.video.frameRate.mode" @change="onChange">
          <option value="keep">保持原样</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div v-if="localPreset.video.frameRate.mode === 'custom'" class="form-group">
        <label>帧率值</label>
        <input type="number" v-model.number="localPreset.video.frameRate.value" @input="onChange" min="1" step="0.001" />
      </div>
    </div>

    <div class="form-section">
      <h4>画面裁剪</h4>
      <div class="form-group">
        <label>裁剪参数</label>
        <div class="input-row">
          <input type="text" v-model="localPreset.video.crop" @input="onChange" placeholder="如: 1920:1080:0:0" />
          <button @click="openCropDialog">裁剪窗口</button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>高级功能</h4>
      <div class="form-row">
        <button class="advanced-btn" @click="openInterpolation">插帧参数</button>
        <button class="advanced-btn" @click="openDenoise">降噪参数</button>
        <button class="advanced-btn" @click="openSuperResolution">超分参数</button>
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

function openCropDialog() {
  alert('裁剪窗口功能开发中...');
}

function openInterpolation() {
  alert('插帧参数功能开发中...');
}

function openDenoise() {
  alert('降噪参数功能开发中...');
}

function openSuperResolution() {
  alert('超分参数功能开发中...');
}
</script>

<style scoped>
.video-frame-settings {
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
  background: var(--bg-color3, #404040);
  border: 1px solid var(--border-color1, #555);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  cursor: pointer;
  white-space: nowrap;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}

.advanced-btn {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-color3, #303030);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  cursor: pointer;
}

.advanced-btn:hover {
  background: var(--hover-bg, #404040);
}
</style>
