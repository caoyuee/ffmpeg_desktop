<template>
  <div class="video-encoder-settings">
    <div class="form-section">
      <div class="form-group">
        <label>编码类别</label>
        <select v-model="localPreset.video.encoder.category" @change="onCategoryChange">
          <option value="h264">H.264/AVC</option>
          <option value="h265">H.265/HEVC</option>
          <option value="av1">AV1</option>
          <option value="vp9">VP9</option>
          <option value="mpeg4">MPEG-4</option>
        </select>
      </div>

      <div class="form-group">
        <label>具体编码</label>
        <select v-model="localPreset.video.encoder.codec" @change="onChange">
          <option v-for="enc in availableEncoders" :key="enc.value" :value="enc.value">
            {{ enc.label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>编码预设</label>
        <select v-model="localPreset.video.encoder.preset" @change="onChange">
          <option value="">默认</option>
          <option value="ultrafast">超快</option>
          <option value="superfast">极快</option>
          <option value="veryfast">很快</option>
          <option value="faster">较快</option>
          <option value="fast">快</option>
          <option value="medium">中等</option>
          <option value="slow">慢</option>
          <option value="slower">较慢</option>
          <option value="veryslow">很慢</option>
        </select>
      </div>

      <div class="form-group">
        <label>配置文件</label>
        <select v-model="localPreset.video.encoder.profile" @change="onChange">
          <option value="">自动</option>
          <option value="baseline">Baseline</option>
          <option value="main">Main</option>
          <option value="high">High</option>
          <option value="high10">High 10</option>
          <option value="high422">High 4:2:2</option>
          <option value="high444">High 4:4:4</option>
        </select>
      </div>

      <div class="form-group">
        <label>场景优化</label>
        <select v-model="localPreset.video.encoder.tune" @change="onChange">
          <option value="">无</option>
          <option value="film">电影</option>
          <option value="animation">动画</option>
          <option value="grain">胶片颗粒</option>
          <option value="stillimage">静态图像</option>
          <option value="fastdecode">快速解码</option>
          <option value="zerolatency">零延迟</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label>GPU 加速</label>
          <input type="text" v-model="localPreset.video.encoder.gpu" @input="onChange" placeholder="如: 0" />
        </div>
        <div class="form-group half">
          <label>线程数</label>
          <input type="text" v-model="localPreset.video.encoder.threads" @input="onChange" placeholder="留空自动" />
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

const encoderOptions: Record<string, { value: string; label: string }[]> = {
  h264: [
    { value: 'libx264', label: 'libx264 (CPU)' },
    { value: 'h264_nvenc', label: 'h264_nvenc (NVIDIA)' },
    { value: 'h264_qsv', label: 'h264_qsv (Intel QSV)' },
    { value: 'h264_amf', label: 'h264_amf (AMD)' },
    { value: 'h264_videotoolbox', label: 'h264_videotoolbox (macOS)' },
  ],
  h265: [
    { value: 'libx265', label: 'libx265 (CPU)' },
    { value: 'hevc_nvenc', label: 'hevc_nvenc (NVIDIA)' },
    { value: 'hevc_qsv', label: 'hevc_qsv (Intel QSV)' },
    { value: 'hevc_amf', label: 'hevc_amf (AMD)' },
    { value: 'hevc_videotoolbox', label: 'hevc_videotoolbox (macOS)' },
  ],
  av1: [
    { value: 'libaom-av1', label: 'libaom-av1 (CPU)' },
    { value: 'libsvtav1', label: 'libsvtav1 (SVT-AV1)' },
    { value: 'av1_nvenc', label: 'av1_nvenc (NVIDIA)' },
    { value: 'av1_qsv', label: 'av1_qsv (Intel QSV)' },
    { value: 'av1_amf', label: 'av1_amf (AMD)' },
  ],
  vp9: [
    { value: 'libvpx-vp9', label: 'libvpx-vp9 (CPU)' },
  ],
  mpeg4: [
    { value: 'mpeg4', label: 'mpeg4' },
  ],
};

const availableEncoders = computed(() => {
  return encoderOptions[localPreset.value.video.encoder.category] || [];
});

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onCategoryChange() {
  const encoders = encoderOptions[localPreset.value.video.encoder.category];
  if (encoders && encoders.length > 0) {
    localPreset.value.video.encoder.codec = encoders[0].value;
  }
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
