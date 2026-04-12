<template>
  <div class="audio-settings">
    <div class="form-section">
      <h4>音频编码器</h4>
      <div class="form-group">
        <label>编码类别</label>
        <select v-model="encoderCategory" @change="onCategoryChange">
          <option value="aac">AAC</option>
          <option value="mp3">MP3</option>
          <option value="opus">Opus</option>
          <option value="flac">FLAC</option>
          <option value="ac3">AC3</option>
          <option value="copy">直接复制</option>
        </select>
      </div>

      <div v-if="encoderCategory !== 'copy'" class="form-group">
        <label>具体编码</label>
        <select v-model="localPreset.audio.encoder.codec" @change="onChange">
          <option v-for="enc in availableEncoders" :key="enc.value" :value="enc.value">
            {{ enc.label }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="encoderCategory !== 'copy'" class="form-section">
      <h4>音频质量</h4>
      <div class="form-group">
        <label>质量控制方式</label>
        <select v-model="localPreset.audio.quality.mode" @change="onChange">
          <option value="bitrate">比特率</option>
          <option value="quality">质量等级</option>
        </select>
      </div>

      <div v-if="localPreset.audio.quality.mode === 'bitrate'" class="form-group">
        <label>比特率 (kbps)</label>
        <select v-model.number="localPreset.audio.quality.bitrate" @change="onChange">
          <option :value="64">64</option>
          <option :value="96">96</option>
          <option :value="128">128</option>
          <option :value="192">192</option>
          <option :value="256">256</option>
          <option :value="320">320</option>
        </select>
      </div>

      <div v-if="localPreset.audio.quality.mode === 'quality'" class="form-group">
        <label>质量等级</label>
        <div class="slider-group">
          <input type="range" min="0" max="9" v-model.number="localPreset.audio.quality.quality" @input="onChange" />
          <span class="value">{{ localPreset.audio.quality.quality || 2 }}</span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>音频参数</h4>
      <div class="form-row">
        <div class="form-group half">
          <label>采样率</label>
          <select v-model="localPreset.audio.sampleRate" @change="onChange">
            <option value="">保持原样</option>
            <option value="8000">8000 Hz</option>
            <option value="16000">16000 Hz</option>
            <option value="22050">22050 Hz</option>
            <option value="44100">44100 Hz</option>
            <option value="48000">48000 Hz</option>
            <option value="96000">96000 Hz</option>
          </select>
        </div>
        <div class="form-group half">
          <label>声道</label>
          <select v-model="localPreset.audio.channels" @change="onChange">
            <option value="">保持原样</option>
            <option value="1">单声道</option>
            <option value="2">立体声</option>
            <option value="6">5.1 声道</option>
            <option value="8">7.1 声道</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>音量调节 (dB)</label>
        <div class="slider-group">
          <input type="range" min="-20" max="20" step="0.5" v-model.number="localPreset.audio.volume" @input="onChange" />
          <span class="value">{{ localPreset.audio.volume || 0 }} dB</span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>音频滤镜</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.audio.normalize" @change="onChange" />
          <span>音量标准化</span>
        </label>
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="localPreset.audio.denoise" @change="onChange" />
          <span>音频降噪</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });
const encoderCategory = ref('aac');

const encoderOptions: Record<string, { value: string; label: string }[]> = {
  aac: [
    { value: 'aac', label: 'AAC (内置)' },
    { value: 'libfdk_aac', label: 'libfdk_aac (高质量)' },
  ],
  mp3: [
    { value: 'libmp3lame', label: 'libmp3lame' },
  ],
  opus: [
    { value: 'libopus', label: 'libopus' },
  ],
  flac: [
    { value: 'flac', label: 'FLAC (无损)' },
  ],
  ac3: [
    { value: 'ac3', label: 'AC3' },
  ],
  copy: [
    { value: 'copy', label: '直接复制' },
  ],
};

const availableEncoders = computed(() => {
  return encoderOptions[encoderCategory.value] || [];
});

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

function onCategoryChange() {
  const encoders = encoderOptions[encoderCategory.value];
  if (encoders && encoders.length > 0) {
    localPreset.value.audio.encoder.codec = encoders[0].value;
  }
  onChange();
}

function onChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.audio-settings {
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
  min-width: 60px;
  text-align: right;
  font-family: monospace;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}
</style>
