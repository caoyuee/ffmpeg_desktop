<template>
  <div class="advanced-settings">
    <div class="form-section">
      <h4>{{ t('page.params.fullCustomMode') }}</h4>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="useFullCustom" @change="onFullCustomToggle" />
          <span>{{ t('page.params.enableFullCustom') }}</span>
        </label>
      </div>
      <div v-if="useFullCustom" class="form-group">
        <label>{{ t('page.params.customCommand') }}</label>
        <textarea v-model="localPreset.custom.fullCustom" @input="onChange" rows="4" placeholder="ffmpeg -i &quot;$INPUT&quot; -c:v libx264 -crf 23 -c:a aac &quot;$OUTPUT.mp4&quot;"></textarea>
        <div class="hint">{{ t('page.params.placeholderHint') }}</div>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.decodeSettings') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.decoder') }}</label>
        <select v-model="localPreset.decode.decoder" @change="onChange">
          <option value="">{{ t('page.params.autoSelect') }}</option>
          <option value="h264">{{ t('page.params.hardwareDecodeH264') }}</option>
          <option value="hevc">{{ t('page.params.hardwareDecodeHevc') }}</option>
          <option value="av1">{{ t('page.params.hardwareDecodeAv1') }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.hwAccelParamName') }}</label>
        <select v-model="localPreset.decode.hwAccelParamName" @change="onChange">
          <option value="">{{ t('page.params.notSpecified') }}</option>
          <option value="-hwaccel_device">-hwaccel_device</option>
          <option value="-init_hw_device">-init_hw_device</option>
          <option value="-qsv_device">-qsv_device</option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.hwAccelParam') }}</label>
        <input type="text" v-model="localPreset.decode.hwAccelParam" @input="onChange" :placeholder="t('page.params.hwAccelParamPlaceholder')" />
      </div>

      <div class="form-group">
        <label>{{ t('page.params.cpuThreads') }}</label>
        <input type="text" v-model="localPreset.decode.cpuThreads" @input="onChange" :placeholder="t('page.params.cpuThreadsPlaceholder')" />
      </div>

      <div class="form-group">
        <label>{{ t('page.params.cpuAffinity') }}</label>
        <input type="text" v-model="localPreset.decode.cpuAffinity" @input="onChange" :placeholder="t('page.params.cpuAffinityPlaceholder')" />
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.customParams') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.videoFilter') }}</label>
        <textarea v-model="localPreset.custom.videoFilter" @input="onChange" rows="2" :placeholder="t('page.params.videoFilterPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.audioFilter') }}</label>
        <textarea v-model="localPreset.custom.audioFilter" @input="onChange" rows="2" :placeholder="t('page.params.audioFilterPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.filterComplex') }}</label>
        <textarea v-model="localPreset.custom.filterComplex" @input="onChange" rows="2" :placeholder="t('page.params.filterComplexPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.videoParams') }}</label>
        <textarea v-model="localPreset.custom.videoParams" @input="onChange" rows="2" :placeholder="t('page.params.videoParamsPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.audioParams') }}</label>
        <textarea v-model="localPreset.custom.audioParams" @input="onChange" rows="2" :placeholder="t('page.params.audioParamsPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.startParams') }}</label>
        <textarea v-model="localPreset.custom.startParams" @input="onChange" rows="2" :placeholder="t('page.params.startParamsPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.beforeOutputParams') }}</label>
        <textarea v-model="localPreset.custom.beforeOutputParams" @input="onChange" rows="2" :placeholder="t('page.params.beforeOutputParamsPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.afterOutputParams') }}</label>
        <textarea v-model="localPreset.custom.afterOutputParams" @input="onChange" rows="2" :placeholder="t('page.params.afterOutputParamsPlaceholder')"></textarea>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.endParams') }}</label>
        <textarea v-model="localPreset.custom.endParams" @input="onChange" rows="2" :placeholder="t('page.params.endParamsPlaceholder')"></textarea>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.streamControl') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.metadataMode') }}</label>
        <select v-model.number="localPreset.streamControl.metadataOption" @change="onChange">
          <option :value="0">{{ t('page.params.keepMetadata') }}</option>
          <option :value="1">{{ t('page.params.removeMetadata') }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.chapterMode') }}</label>
        <select v-model.number="localPreset.streamControl.chapterOption" @change="onChange">
          <option :value="0">{{ t('page.params.keepChapters') }}</option>
          <option :value="1">{{ t('page.params.removeChapters') }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t('page.params.attachmentMode') }}</label>
        <select v-model.number="localPreset.streamControl.attachmentOption" @change="onChange">
          <option :value="0">{{ t('page.params.keepAttachments') }}</option>
          <option :value="1">{{ t('page.params.removeAttachments') }}</option>
        </select>
      </div>
    </div>

    <div class="form-section">
      <h4>{{ t('page.params.imageEncoding') }}</h4>
      <div class="form-group">
        <label>{{ t('page.params.imageEncoder') }}</label>
        <select v-model="localPreset.image.encoder" @change="onChange">
          <option value="">{{ t('page.params.noImageProcessing') }}</option>
          <option value="png">PNG</option>
          <option value="apng">{{ t('page.params.apngAnimated') }}</option>
          <option value="mjpeg">JPEG</option>
          <option value="libwebp">WebP</option>
          <option value="gif">GIF</option>
          <option value="bmp">BMP</option>
          <option value="tiff">TIFF</option>
          <option value="dpx">DPX</option>
          <option value="exr">EXR</option>
          <option value="libopenjpeg">JPEG 2000</option>
          <option value="jpegls">JPEG LS</option>
          <option value="libsvtjpegxs">SVT JPEG XS</option>
          <option value="hdr">HDR (Radiance RGBE)</option>
        </select>
      </div>
      <div v-if="localPreset.image.encoder && localPreset.image.encoder !== 'bmp'" class="form-group">
        <label>{{ t('page.params.imageQuality') }}</label>
        <input type="text" v-model="localPreset.image.quality" @input="onChange" :placeholder="t('page.params.imageQualityPlaceholder')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
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

const useFullCustom = ref(!!localPreset.value.custom.fullCustom);

function onFullCustomToggle() {
  if (!useFullCustom.value) {
    localPreset.value.custom.fullCustom = '';
  }
  onChange();
}

watch(() => props.preset, (newVal) => {
  if (newVal) {
    localPreset.value = { ...newVal };
  }
}, { deep: true });

function onChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.advanced-settings {
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  box-sizing: border-box;
  font-family: 'Consolas', 'Monaco', monospace;
}

.form-group textarea {
  resize: vertical;
  min-height: 50px;
}

.hint {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-color3, #666);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}
</style>
