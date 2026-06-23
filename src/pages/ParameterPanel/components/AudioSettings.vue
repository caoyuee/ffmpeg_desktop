<template>
  <div class="audio-settings">
    <div class="form-section">
      <h4>{{ t('page.params.audioEncoder') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.encoder') }}</label>
        <select v-model="localPreset.audio.encoder" @change="onChange">
          <option value="">{{ t('page.params.noAudioProcessing') }}</option>
          <option value="copy">{{ t('page.params.copyStream') }}</option>
          <option value="aac">AAC</option>
          <option value="libfdk_aac">AAC (FDK)</option>
          <option value="libmp3lame">MP3</option>
          <option value="libopus">Opus</option>
          <option value="libvorbis">Vorbis</option>
          <option value="flac">FLAC ({{ t('page.params.lossless') }})</option>
          <option value="alac">ALAC ({{ t('page.params.appleLossless') }})</option>
          <option value="ac3">AC3</option>
          <option value="eac3">E-AC3</option>
          <option value="dca">DTS</option>
          <option value="truehd">TrueHD</option>
          <option value="libtwolame">MP2 (TwoLAME)</option>
          <option value="tta">TTA ({{ t('page.params.lossless') }})</option>
          <option value="pcm_s16le">PCM 16-bit</option>
          <option value="pcm_s24le">PCM 24-bit</option>
          <option value="pcm_s32le">PCM 32-bit</option>
          <option value="wavpack">WavPack</option>
        </select>
      </div>
    </div>

    <div v-if="localPreset.audio.encoder && localPreset.audio.encoder !== 'copy'" class="form-section">
      <h4>{{ t('page.params.audioQuality') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.qualityControl') }}</label>
        <select v-model="localPreset.audio.qualityParam" @change="onChange">
          <option value="">{{ t('page.params.defaultOption') }}</option>
          <option value="bitrate">{{ t('page.params.bitrate') }}</option>
          <option value="quality">{{ t('page.params.qualityLevel') }}</option>
        </select>
      </div>

      <div v-if="localPreset.audio.qualityParam === 'bitrate'" class="form-group">
        <label>{{ t('page.params.bitrateKbps') }}</label>
        <select v-model="localPreset.audio.bitrate" @change="onChange">
          <option value="64">64</option>
          <option value="96">96</option>
          <option value="128">128</option>
          <option value="192">192</option>
          <option value="256">256</option>
          <option value="320">320</option>
        </select>
      </div>

      <div v-if="localPreset.audio.qualityParam === 'quality'" class="form-group">
        <label>{{ t('page.params.qualityLevel') }}</label>
        <div class="slider-group">
          <input type="range" min="0" max="9" v-model.number="qualityValueNum" @input="onQualityValueChange" />
          <span class="value">{{ localPreset.audio.qualityValue || 2 }}</span>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.audioParameters') }}</h4>
      <div class="form-row">
        <div class="form-group half">
          <label>{{ t('page.params.sampleRate') }}</label>
          <select v-model="localPreset.audio.sampleRate" @change="onChange">
            <option value="">{{ t('page.params.keepOriginal') }}</option>
            <option value="8000">8000 Hz</option>
            <option value="16000">16000 Hz</option>
            <option value="22050">22050 Hz</option>
            <option value="44100">44100 Hz</option>
            <option value="48000">48000 Hz</option>
            <option value="96000">96000 Hz</option>
          </select>
        </div>
        <div class="form-group half">
          <label>{{ t('page.params.channelLayout') }}</label>
          <select v-model="localPreset.audio.channelLayout" @change="onChange">
            <option value="">{{ t('page.params.keepOriginal') }}</option>
            <option value="mono">{{ t('page.params.mono') }}</option>
            <option value="stereo">{{ t('page.params.stereo') }}</option>
            <option value="5.1">{{ t('page.params.channel51') }}</option>
            <option value="7.1">{{ t('page.params.channel71') }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.loudnessNormalization') }}</h4>
      <div class="form-row">
        <div class="form-group third">
          <label>{{ t('page.params.targetLoudness') }}</label>
          <input type="text" v-model="localPreset.audio.loudnorm.targetLoudness" @input="onChange" placeholder="-16" />
        </div>
        <div class="form-group third">
          <label>{{ t('page.params.dynamicRange') }}</label>
          <input type="text" v-model="localPreset.audio.loudnorm.dynamicRange" @input="onChange" placeholder="11" />
        </div>
        <div class="form-group third">
          <label>{{ t('page.params.peakLevel') }}</label>
          <input type="text" v-model="localPreset.audio.loudnorm.peakLevel" @input="onChange" placeholder="-1.5" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const { t } = useI18n();
const localPreset = ref<PresetData>({ ...props.preset });

const qualityValueNum = computed({
  get: () => parseInt(localPreset.value.audio.qualityValue) || 2,
  set: () => {}
});

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onQualityValueChange(event: Event) {
  const target = event.target as HTMLInputElement;
  localPreset.value.audio.qualityValue = target.value;
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

.form-group.third {
  flex: 1;
}
</style>
