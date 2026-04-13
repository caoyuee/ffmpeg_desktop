<template>
  <div class="quality-settings">
    <div class="form-section">
      <h4>质量控制方式</h4>
      <div class="form-group">
        <label>质量模式</label>
        <select v-model="localPreset.video.bitrateControl.mode" @change="onModeChange">
          <option value="CRF">CRF (恒定质量)</option>
          <option value="VBR">VBR (可变比特率)</option>
          <option value="VBR_HQ">VBR HQ (高质量可变比特率)</option>
          <option value="CBR">CBR (恒定比特率)</option>
          <option value="CQP">CQP (恒定量化参数)</option>
        </select>
      </div>

      <div v-if="localPreset.video.bitrateControl.mode === 'CRF' || localPreset.video.bitrateControl.mode === 'CQP'" class="form-group">
        <label>{{ localPreset.video.bitrateControl.mode === 'CRF' ? 'CRF 值 (0-51, 越小质量越好)' : 'QP 值' }}</label>
        <div class="slider-group">
          <input type="range" min="0" max="51" v-model.number="qualityValueNum" @input="onQualityValueChange" />
          <span class="value">{{ localPreset.video.bitrateControl.qualityValue || 23 }}</span>
        </div>
        <div class="quality-hint">
          <span>0: 无损</span>
          <span>23: 默认</span>
          <span>51: 最差</span>
        </div>
      </div>

      <div v-if="localPreset.video.bitrateControl.mode !== 'CRF' && localPreset.video.bitrateControl.mode !== 'CQP'" class="form-group">
        <label>基础比特率 (kbps)</label>
        <input type="text" v-model="localPreset.video.bitrateControl.baseBitrate" @input="onChange" placeholder="如: 5000" />
      </div>
    </div>

    <div v-if="localPreset.video.bitrateControl.mode !== 'CRF' && localPreset.video.bitrateControl.mode !== 'CQP'" class="form-section">
      <h4>比特率控制</h4>
      <div class="form-row">
        <div class="form-group half">
          <label>最低比特率 (kbps)</label>
          <input type="text" v-model="localPreset.video.bitrateControl.minBitrate" @input="onChange" placeholder="可选" />
        </div>
        <div class="form-group half">
          <label>最高比特率 (kbps)</label>
          <input type="text" v-model="localPreset.video.bitrateControl.maxBitrate" @input="onChange" placeholder="可选" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group half">
          <label>缓冲区大小 (kbps)</label>
          <input type="text" v-model="localPreset.video.bitrateControl.bufferSize" @input="onChange" placeholder="可选" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

const qualityValueNum = computed({
  get: () => parseInt(localPreset.value.video.bitrateControl.qualityValue) || 23,
  set: () => {}
});

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onQualityValueChange(event: Event) {
  const target = event.target as HTMLInputElement;
  localPreset.value.video.bitrateControl.qualityValue = target.value;
  onChange();
}

function onModeChange() {
  if (localPreset.value.video.bitrateControl.mode === 'CRF') {
    localPreset.value.video.bitrateControl.qualityValue = '23';
    localPreset.value.video.bitrateControl.qualityParam = 'crf';
    localPreset.value.video.bitrateControl.baseBitrate = '';
  } else if (localPreset.value.video.bitrateControl.mode === 'CQP') {
    localPreset.value.video.bitrateControl.qualityValue = '20';
    localPreset.value.video.bitrateControl.qualityParam = 'qp';
    localPreset.value.video.bitrateControl.baseBitrate = '';
  } else {
    localPreset.value.video.bitrateControl.baseBitrate = '5000';
    localPreset.value.video.bitrateControl.qualityValue = '';
    localPreset.value.video.bitrateControl.qualityParam = '';
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
