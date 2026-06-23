<template>
  <div class="video-encoder-settings">
    <div class="form-section">
      <div class="form-group">
        <label>{{ t('page.params.encoderCategory') }}</label>
        <select v-model="localPreset.video.encoder.category" @change="onCategoryChange">
          <option value="h264">H.264/AVC</option>
          <option value="h265">H.265/HEVC</option>
          <option value="av1">AV1</option>
          <option value="vp9">VP9</option>
          <option value="vp8">VP8</option>
          <option value="mpeg2">MPEG-2</option>
          <option value="mpeg4">MPEG-4</option>
          <option value="prores">ProRes</option>
          <option value="theora">Theora</option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.specificEncoder') }}</label>
        <select v-model="localPreset.video.encoder.codec" @change="onCodecChange">
          <option v-for="enc in availableEncoders" :key="enc.value" :value="enc.value">
            {{ enc.label }}
          </option>
        </select>
      </div>

      <div v-if="codecPresets.length" class="form-group">
        <label>{{ t('page.params.encoderPreset') }}</label>
        <select v-model="localPreset.video.encoder.preset" @change="onChange">
          <option value="">{{ t('page.params.defaultOption') }}</option>
          <option v-for="p in codecPresets" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div v-if="codecProfiles.length" class="form-group">
        <label>{{ t('page.params.profile') }}</label>
        <select v-model="localPreset.video.encoder.profile" @change="onChange">
          <option value="">{{ t('page.params.auto') }}</option>
          <option v-for="p in codecProfiles" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div v-if="codecTunes.length" class="form-group">
        <label>{{ t('page.params.tune') }}</label>
        <select v-model="localPreset.video.encoder.tune" @change="onChange">
          <option value="">{{ t('common.none') }}</option>
          <option v-for="t in codecTunes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label>{{ t('page.params.gpuAcceleration') }}</label>
          <input type="text" v-model="localPreset.video.encoder.gpu" @input="onChange" :placeholder="t('page.params.gpuPlaceholder')" />
        </div>
        <div class="form-group half">
          <label>{{ t('page.params.threads') }}</label>
          <input type="text" v-model="localPreset.video.encoder.threads" @input="onChange" :placeholder="t('page.params.threadsPlaceholder')" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';
import { getCodecMeta } from '@/config/codecDatabase';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const { t } = useI18n();
const localPreset = ref<PresetData>({ ...props.preset });

const encoderOptions: Record<string, { value: string; label: string }[]> = {
  h264: [
    { value: 'libx264', label: 'libx264 (CPU)' },
    { value: 'h264_nvenc', label: 'h264_nvenc (NVIDIA)' },
    { value: 'h264_qsv', label: 'h264_qsv (Intel QSV)' },
    { value: 'h264_amf', label: 'h264_amf (AMD)' },
    { value: 'h264_videotoolbox', label: 'h264_videotoolbox (macOS)' },
    { value: 'h264_vaapi', label: 'h264_vaapi (VAAPI/Linux)' },
    { value: 'h264_vulkan', label: 'h264_vulkan (Vulkan)' },
  ],
  h265: [
    { value: 'libx265', label: 'libx265 (CPU)' },
    { value: 'libkvazaar', label: 'libkvazaar (CPU)' },
    { value: 'hevc_nvenc', label: 'hevc_nvenc (NVIDIA)' },
    { value: 'hevc_qsv', label: 'hevc_qsv (Intel QSV)' },
    { value: 'hevc_amf', label: 'hevc_amf (AMD)' },
    { value: 'hevc_videotoolbox', label: 'hevc_videotoolbox (macOS)' },
    { value: 'hevc_vaapi', label: 'hevc_vaapi (VAAPI/Linux)' },
    { value: 'hevc_vulkan', label: 'hevc_vulkan (Vulkan)' },
  ],
  av1: [
    { value: 'libaom-av1', label: 'libaom-av1 (CPU)' },
    { value: 'libsvtav1', label: 'libsvtav1 (SVT-AV1)' },
    { value: 'librav1e', label: 'librav1e (rav1e)' },
    { value: 'av1_nvenc', label: 'av1_nvenc (NVIDIA)' },
    { value: 'av1_qsv', label: 'av1_qsv (Intel QSV)' },
    { value: 'av1_amf', label: 'av1_amf (AMD)' },
    { value: 'av1_vaapi', label: 'av1_vaapi (VAAPI/Linux)' },
    { value: 'av1_vulkan', label: 'av1_vulkan (Vulkan)' },
    { value: 'av1_d3d12va', label: 'av1_d3d12va (D3D12)' },
  ],
  vp9: [
    { value: 'libvpx-vp9', label: 'libvpx-vp9 (CPU)' },
    { value: 'libsvt_vp9', label: 'libsvt_vp9 (SVT-VP9)' },
    { value: 'vp9_qsv', label: 'vp9_qsv (Intel QSV)' },
    { value: 'vp9_vaapi', label: 'vp9_vaapi (VAAPI)' },
  ],
  vp8: [
    { value: 'libvpx', label: 'libvpx (CPU)' },
    { value: 'vp8_vaapi', label: 'vp8_vaapi (VAAPI)' },
  ],
  mpeg2: [
    { value: 'mpeg2video', label: 'mpeg2video (CPU)' },
  ],
  mpeg4: [
    { value: 'mpeg4', label: 'mpeg4' },
  ],
  prores: [
    { value: 'prores_ks', label: 'ProRes (CPU)' },
    { value: 'prores_aw', label: 'ProRes AW (Apple)' },
  ],
  theora: [
    { value: 'libtheora', label: 'libtheora (CPU)' },
  ],
};

const availableEncoders = computed(() => {
  return encoderOptions[localPreset.value.video.encoder.category] || [];
});

const codecMeta = computed(() => {
  return getCodecMeta(localPreset.value.video.encoder.codec);
});

const codecPresets = computed(() => codecMeta.value.presets);
const codecProfiles = computed(() => codecMeta.value.profiles);
const codecTunes = computed(() => codecMeta.value.tunes);

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onCategoryChange() {
  const encoders = encoderOptions[localPreset.value.video.encoder.category];
  if (encoders && encoders.length > 0) {
    localPreset.value.video.encoder.codec = encoders[0]?.value || '';
  }
  localPreset.value.video.encoder.preset = '';
  localPreset.value.video.encoder.profile = '';
  localPreset.value.video.encoder.tune = '';
  onChange();
}

function onCodecChange() {
  localPreset.value.video.encoder.preset = '';
  localPreset.value.video.encoder.profile = '';
  localPreset.value.video.encoder.tune = '';
  onChange();
}

function onChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.video-encoder-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  padding: 16px;
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

.form-row {
  display: flex;
  gap: 12px;
}

.form-group.half {
  flex: 1;
}
</style>
