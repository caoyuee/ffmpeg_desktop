<template>
  <div class="quality-settings">
    <div class="form-section">
      <h4>质量控制方式</h4>
      <div class="form-group">
        <label>质量模式</label>
        <select v-model="localPreset.video.quality.mode" @change="onModeChange">
          <option value="crf">CRF (恒定质量)</option>
          <option value="bitrate">CBR/VBR (恒定/可变比特率)</option>
          <option value="qp">QP (恒定量化参数)</option>
        </select>
      </div>

      <div v-if="localPreset.video.quality.mode === 'crf'" class="form-group">
        <label>CRF 值 (0-51, 越小质量越好)</label>
        <div class="slider-group">
          <input type="range" min="0" max="51" v-model.number="localPreset.video.quality.crf" @input="onChange" />
          <span class="value">{{ localPreset.video.quality.crf || 23 }}</span>
        </div>
        <div class="quality-hint">
          <span>0: 无损</span>
          <span>23: 默认</span>
          <span>51: 最差</span>
        </div>
      </div>

      <div v-if="localPreset.video.quality.mode === 'bitrate'" class="form-group">
        <label>目标比特率 (kbps)</label>
        <input type="number" v-model.number="localPreset.video.quality.bitrate" @input="onChange" min="1" />
      </div>

      <div v-if="localPreset.video.quality.mode === 'qp'" class="form-group">
        <label>QP 值</label>
        <input type="number" v-model.number="localPreset.video.quality.qp" @input="onChange" min="0" max="51" />
      </div>
    </div>

    <div v-if="localPreset.video.quality.mode === 'bitrate'" class="form-section">
      <h4>比特率控制</h4>
      <div class="form-row">
        <div class="form-group half">
          <label>基础比特率 (kbps)</label>
          <input type="number" v-model.number="localPreset.video.quality.baseBitrate" @input="onChange" min="0" />
        </div>
        <div class="form-group half">
          <label>缓冲区大小 (kbps)</label>
          <input type="number" v-model.number="localPreset.video.quality.bufferSize" @input="onChange" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label>最低比特率 (kbps)</label>
          <input type="number" v-model.number="localPreset.video.quality.minBitrate" @input="onChange" min="0" />
        </div>
        <div class="form-group half">
          <label>最高比特率 (kbps)</label>
          <input type="number" v-model.number="localPreset.video.quality.maxBitrate" @input="onChange" min="0" />
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>编码遍数</h4>
      <div class="form-group">
        <label>遍数模式</label>
        <select v-model="localPreset.video.quality.pass" @change="onChange">
          <option value="">单遍</option>
          <option value="1">两遍编码 (第一遍)</option>
          <option value="2">两遍编码 (第二遍)</option>
        </select>
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

function onModeChange() {
  if (localPreset.value.video.quality.mode === 'crf') {
    localPreset.value.video.quality.crf = 23;
  } else if (localPreset.value.video.quality.mode === 'bitrate') {
    localPreset.value.video.quality.bitrate = 5000;
  }
  onChange();
}

function onChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.quality-settings {
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

.slider-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-group input[type="range"] {
  flex: 1;
}

.slider-group .value {
  min-width: 40px;
  text-align: right;
  font-family: monospace;
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
}

.quality-hint {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-color2, #606060);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}
</style>
