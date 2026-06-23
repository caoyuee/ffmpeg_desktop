<template>
  <div class="video-frame-settings">
    <div class="form-section">
      <h4>{{ t('page.params.resolution') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.resolutionPreset') }}</label>
        <select v-model="localPreset.video.resolution.size" @change="onChange">
          <option value="">{{ t('page.params.keepOriginal') }}</option>
          <option value="1920x1080">1920x1080 (Full HD)</option>
          <option value="1280x720">1280x720 (HD)</option>
          <option value="3840x2160">3840x2160 (4K)</option>
          <option value="2560x1440">2560x1440 (2K)</option>
          <option value="854x480">854x480 (480p)</option>
          <option value="640x360">640x360 (360p)</option>
          <option value="custom">{{ t('page.params.custom') }}</option>
        </select>
      </div>

      <div v-if="localPreset.video.resolution.size === 'custom'" class="form-row">
        <div class="form-group half">
          <label>{{ t('page.params.width') }}</label>
          <input
            type="text"
            v-model="localPreset.video.resolution.autoWidth"
            @input="onChange"
            :placeholder="t('page.params.widthPlaceholder')"
          />
        </div>
        <div class="form-group half">
          <label>{{ t('page.params.height') }}</label>
          <input
            type="text"
            v-model="localPreset.video.resolution.autoHeight"
            @input="onChange"
            :placeholder="t('page.params.heightPlaceholder')"
          />
        </div>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.cropFilter') }}</label>
        <div class="input-row">
          <input
            type="text"
            v-model="localPreset.video.resolution.cropFilter"
            @input="onChange"
            :placeholder="t('page.params.cropFilterPlaceholder')"
          />
          <button @click="showCrop = true">{{ t('page.params.cropWindow') }}</button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.frameRate') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.fps') }}</label>
        <select v-model="localPreset.video.frameRate.fps" @change="onChange">
          <option value="">{{ t('page.params.keepOriginal') }}</option>
          <option value="23.976">23.976 fps</option>
          <option value="24">24 fps</option>
          <option value="25">25 fps</option>
          <option value="29.97">29.97 fps</option>
          <option value="30">30 fps</option>
          <option value="50">50 fps</option>
          <option value="59.94">59.94 fps</option>
          <option value="60">60 fps</option>
          <option value="120">120 fps</option>
        </select>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.advancedFeatures') }}</h4>
      <div class="form-row">
        <button class="advanced-btn" @click="showInterpolation = true">{{ t('page.params.interpolationParams') }}</button>
        <button class="advanced-btn" @click="showSuperResolution = true">{{ t('page.params.superResolutionParams') }}</button>
        <button class="advanced-btn" @click="showFrameBlend = true">{{ t('page.params.frameBlend') }}</button>
      </div>
    </div>

    <CropDialog
      v-model="showCrop"
      :initialCrop="localPreset.video.resolution.cropFilter"
      @confirm="onCropConfirm"
    />
    <InterpolationDialog
      :visible="showInterpolation"
      :modelValue="localPreset.video.filters.interpolation"
      @update:visible="showInterpolation = $event"
      @update:modelValue="onInterpolationUpdate"
    />
    <SuperResolutionDialog
      :visible="showSuperResolution"
      :modelValue="localPreset.video.filters.superResolution"
      @update:visible="showSuperResolution = $event"
      @update:modelValue="onSuperResolutionUpdate"
    />
    <FrameBlendDialog
      :visible="showFrameBlend"
      :modelValue="localPreset.video.filters.frameBlend"
      @update:visible="showFrameBlend = $event"
      @update:modelValue="onFrameBlendUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';
import CropDialog from '@/components/Dialogs/CropDialog.vue';
import InterpolationDialog from '@/components/Dialogs/InterpolationDialog.vue';
import SuperResolutionDialog from '@/components/Dialogs/SuperResolutionDialog.vue';
import FrameBlendDialog from '@/components/Dialogs/FrameBlendDialog.vue';

const { t } = useI18n();

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });
const showCrop = ref(false);
const showInterpolation = ref(false);
const showSuperResolution = ref(false);
const showFrameBlend = ref(false);

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onChange() {
  emit('update:preset', localPreset.value);
}

function onCropConfirm(cropValue: string) {
  localPreset.value.video.resolution.cropFilter = cropValue;
  emit('update:preset', localPreset.value);
}

function onInterpolationUpdate(settings: PresetData['video']['filters']['interpolation']) {
  localPreset.value.video.filters.interpolation = settings;
  emit('update:preset', localPreset.value);
}

function onSuperResolutionUpdate(settings: PresetData['video']['filters']['superResolution']) {
  localPreset.value.video.filters.superResolution = settings;
  emit('update:preset', localPreset.value);
}

function onFrameBlendUpdate(settings: PresetData['video']['filters']['frameBlend']) {
  localPreset.value.video.filters.frameBlend = settings;
  emit('update:preset', localPreset.value);
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
