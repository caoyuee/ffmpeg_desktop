<template>
  <div class="parameter-panel">
    <div class="panel-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        :class="['panel-tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </div>
    </div>

    <div class="panel-content">
      <div v-show="activeTab === 'overview'" class="tab-page">
        <div class="overview-layout">
          <div class="command-preview">
            <h4>{{ t('page.params.commandPreview') }}</h4>
            <div class="command-box">
              <pre>{{ commandPreview }}</pre>
            </div>
            <button class="copy-btn" @click="copyCommand">{{ t('page.params.copyCommand') }}</button>
          </div>
          <div class="params-summary">
            <h4>{{ t('page.params.paramsSummary') }}</h4>
            <div class="summary-list">
              <div class="summary-item">
                <span class="label">{{ t('page.params.videoEncoderLabel') }}</span>
                <span class="value">{{ preset.video.encoder.codec || t('page.params.notSet') }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t('page.params.resolutionLabel') }}</span>
                <span class="value">{{ resolutionSummary }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t('page.params.qualityControlLabel') }}</span>
                <span class="value">{{ qualitySummary }}</span>
              </div>
              <div class="summary-item">
                <span class="label">{{ t('page.params.outputFormatLabel') }}</span>
                <span class="value">{{ preset.output.container || 'mp4' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'output'" class="tab-page">
        <OutputSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'video-encoder'" class="tab-page">
        <VideoEncoderSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'video-frame'" class="tab-page">
        <VideoFrameSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'quality'" class="tab-page">
        <QualitySettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'audio'" class="tab-page">
        <AudioSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'color'" class="tab-page">
        <ColorPanel v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'filters'" class="tab-page">
        <FilterPanel v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'trim'" class="tab-page">
        <TrimPanel v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'subtitle'" class="tab-page">
        <SubtitlePanel v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'stream'" class="tab-page">
        <StreamPanel v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'preset'" class="tab-page">
        <PresetManager v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>

      <div v-show="activeTab === 'advanced'" class="tab-page">
        <AdvancedSettings v-model:preset="localPreset" @update:preset="onPresetUpdate" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PresetData } from '@/types/preset';
import { DEFAULT_PRESET } from '@/types/preset';
import { FFmpegCommandBuilder } from '@/utils/commandBuilder';
import { usePresetStore } from '@/store/presetStore';
import ColorPanel from '@/components/ColorPanel/ColorPanel.vue';
import FilterPanel from '@/components/FilterPanel/FilterPanel.vue';
import TrimPanel from '@/components/TrimPanel/TrimPanel.vue';
import SubtitlePanel from '@/components/SubtitlePanel/SubtitlePanel.vue';
import StreamPanel from '@/components/StreamPanel/StreamPanel.vue';
import PresetManager from '@/components/PresetManager/PresetManager.vue';
import AudioSettings from './components/AudioSettings.vue';
import AdvancedSettings from './components/AdvancedSettings.vue';
import OutputSettings from './components/OutputSettings.vue';
import VideoEncoderSettings from './components/VideoEncoderSettings.vue';
import VideoFrameSettings from './components/VideoFrameSettings.vue';
import QualitySettings from './components/QualitySettings.vue';

const { t } = useI18n();
const presetStore = usePresetStore();

const props = defineProps<{
  preset?: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...(props.preset || presetStore.currentPreset || DEFAULT_PRESET) } as PresetData);
const activeTab = ref('overview');

const tabs = computed(() => [
  { id: 'overview', label: t('page.params.overview') },
  { id: 'output', label: t('page.params.output') },
  { id: 'video-encoder', label: t('page.params.videoEncoder') },
  { id: 'video-frame', label: t('page.params.videoFrame') },
  { id: 'quality', label: t('page.params.quality') },
  { id: 'audio', label: t('page.params.audio') },
  { id: 'color', label: t('page.params.color') },
  { id: 'filters', label: t('page.params.filters') },
  { id: 'trim', label: t('page.params.trim') },
  { id: 'subtitle', label: t('page.params.subtitle') },
  { id: 'stream', label: t('page.params.stream') },
  { id: 'preset', label: t('page.params.preset') },
  { id: 'advanced', label: t('page.params.advanced') },
]);

let isInternalUpdate = false;

watch(() => presetStore.currentPreset.id, (newId, oldId) => {
  if (newId && newId !== oldId && !isInternalUpdate) {
    isInternalUpdate = true;
    localPreset.value = { ...presetStore.currentPreset };
    isInternalUpdate = false;
  }
});

const preset = computed(() => localPreset.value);

const commandPreview = computed(() => {
  try {
    return FFmpegCommandBuilder.build(localPreset.value, 'input.mp4', 'output.mp4');
  } catch {
    return 'ffmpeg -i input.mp4 output.mp4';
  }
});

const resolutionSummary = computed(() => {
  const size = localPreset.value.video.resolution.size;
  const autoWidth = localPreset.value.video.resolution.autoWidth;
  const autoHeight = localPreset.value.video.resolution.autoHeight;
  if (size) return size;
  if (autoWidth && autoHeight) return `${autoWidth}x${autoHeight}`;
  if (autoWidth) return `${autoWidth}x${t('page.params.auto')}`;
  if (autoHeight) return `${t('page.params.auto')}x${autoHeight}`;
  return t('page.params.keepOriginal');
});

const qualitySummary = computed(() => {
  const mode = localPreset.value.video.bitrateControl.mode;
  const qualityValue = localPreset.value.video.bitrateControl.qualityValue;
  if (mode === 'CRF') {
    return `CRF ${qualityValue || 23}`;
  } else if (mode === 'VBR' || mode === 'VBR_HQ' || mode === 'CBR') {
    return `${localPreset.value.video.bitrateControl.baseBitrate || '5000'}kbps`;
  } else if (mode === 'CQP') {
    return `QP ${qualityValue}`;
  }
  return t('page.params.notSet');
});

function onPresetUpdate(preset: PresetData) {
  presetStore.currentPreset = { ...preset };
}

function copyCommand() {
  navigator.clipboard.writeText(commandPreview.value);
}
</script>

<style scoped>
.parameter-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color1, #181818);
}

.panel-tabs {
  display: flex;
  flex-wrap: wrap;
  background: var(--bg-color2, #242424);
  border-bottom: 1px solid var(--border-color1, #333);
  padding: 4px;
  gap: 2px;
}

.panel-tab {
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-color2, #808080);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  white-space: nowrap;
}

.panel-tab:hover {
  background: var(--hover-bg, #303030);
  color: var(--text-color1, #c0c0c0);
}

.panel-tab.active {
  background: var(--active-bg, #404040);
  color: var(--active-color, #9acd32);
}

.panel-content {
  flex: 1;
  overflow: auto;
}

.tab-page {
  padding: 16px;
}

.overview-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 100%;
}

.command-preview,
.params-summary {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  padding: 16px;
}

.command-preview h4,
.params-summary h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
}

.command-box {
  background: var(--bg-color1, #181818);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  min-height: 200px;
  max-height: 400px;
  overflow: auto;
}

.command-box pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-color2, #909090);
  white-space: pre-wrap;
  word-break: break-all;
}

.copy-btn {
  padding: 8px 16px;
  background: var(--info-color, #3498db);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.copy-btn:hover {
  background: var(--info-color-hover, #2980b9);
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
}

.summary-item .label {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.summary-item .value {
  font-size: 12px;
  color: var(--text-color1, #c0c0c0);
  font-family: monospace;
}
</style>
