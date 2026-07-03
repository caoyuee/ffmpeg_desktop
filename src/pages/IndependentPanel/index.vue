<template>
  <div class="independent-panel">
    <div class="panel-header">
      <span class="header-title">{{ titleText }}</span>
      <button class="app-btn app-btn--icon" @click="closeWindow">
        <AppIcon name="close" :size="16" />
      </button>
    </div>

    <div class="panel-body">
      <div class="file-list-section">
        <div class="section-title">{{ t('page.independentPanel.fileListTitle', { count: fileList.length }) }}</div>
        <div class="file-list">
          <div v-for="(file, index) in fileList" :key="index" class="file-item">
            <span class="file-index">{{ index + 1 }}</span>
            <span class="file-name">{{ getFileName(file) }}</span>
          </div>
        </div>
      </div>

      <div class="params-section">
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
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <span class="file-count">{{ t('page.independentPanel.fileCount', { count: fileList.length }) }}</span>
      <button class="app-btn app-btn--primary" @click="confirmAndAdd" :disabled="fileList.length === 0">
        {{ t('page.independentPanel.confirmAndAdd') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { emit } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { PresetData } from '@/types/preset'
import { DEFAULT_PRESET } from '@/types/preset'
import { FFmpegCommandBuilder } from '@/utils/commandBuilder'
import { generateOutputPath } from '@/hooks/useFormatters'
import { usePresetStore } from '@/store/presetStore'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import ColorPanel from '@/components/ColorPanel/ColorPanel.vue'
import FilterPanel from '@/components/FilterPanel/FilterPanel.vue'
import TrimPanel from '@/components/TrimPanel/TrimPanel.vue'
import SubtitlePanel from '@/components/SubtitlePanel/SubtitlePanel.vue'
import StreamPanel from '@/components/StreamPanel/StreamPanel.vue'
import AudioSettings from '@/pages/ParameterPanel/components/AudioSettings.vue'
import OutputSettings from '@/pages/ParameterPanel/components/OutputSettings.vue'
import VideoEncoderSettings from '@/pages/ParameterPanel/components/VideoEncoderSettings.vue'
import VideoFrameSettings from '@/pages/ParameterPanel/components/VideoFrameSettings.vue'
import QualitySettings from '@/pages/ParameterPanel/components/QualitySettings.vue'

const { t } = useI18n()
const presetStore = usePresetStore()

const activeTab = ref('output')
const localPreset = ref<PresetData>({ ...presetStore.currentPreset } as PresetData)
const fileList = ref<string[]>([])

const titleText = computed(() => t('page.independentPanel.title', { count: fileList.value.length }))

const tabs = computed(() => [
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
])

function getFileName(path: string) {
  return path.split('/').pop() || path.split('\\').pop() || path
}

function onPresetUpdate(preset: PresetData) {
  localPreset.value = { ...preset }
}

async function confirmAndAdd() {
  const preset = localPreset.value
  const tasks = fileList.value.map(path => {
    const outputFile = generateOutputPath(path, preset.output)
    return {
      inputFile: path,
      outputFile,
      commandLine: FFmpegCommandBuilder.build({ ...preset }, path, outputFile),
      presetId: preset.id || 'independent',
      cpuAffinity: preset.decode.cpuAffinity || undefined,
      preserveFileTimes: {
        creation: preset.output.naming.preserveCreationTime,
        modification: preset.output.naming.preserveModifyTime,
        access: preset.output.naming.preserveAccessTime,
      },
    }
  })

  await emit('add-independent-tasks', { tasks })
  await closeWindow()
}

async function closeWindow() {
  try {
    const window = getCurrentWebviewWindow()
    await window.close()
  } catch {
    // window may already be closed
  }
}

onMounted(async () => {
  presetStore.loadPresets()
  try {
    const files = await invoke<string[]>('get_independent_panel_files')
    if (Array.isArray(files)) {
      fileList.value = files
    }
  } catch {
    fileList.value = []
  }
})
</script>

<style scoped>
.independent-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color1, #181818);
  color: var(--text-color1, #c0c0c0);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-color2, #242424);
  border-bottom: 1px solid var(--border-color1, #333);
  flex-shrink: 0;
}

.header-title {
  font-size: 13px;
  color: var(--text-color1, #c0c0c0);
}

.panel-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.file-list-section {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-color1, #333);
  display: flex;
  flex-direction: column;
}

.section-title {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--text-color2, #808080);
  border-bottom: 1px solid var(--border-color1, #333);
  flex-shrink: 0;
}

.file-list {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-color1, #c0c0c0);
}

.file-index {
  color: var(--text-color2, #808080);
  min-width: 20px;
  text-align: right;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.params-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-tabs {
  display: flex;
  flex-wrap: wrap;
  background: var(--bg-color2, #242424);
  border-bottom: 1px solid var(--border-color1, #333);
  padding: 4px;
  gap: 2px;
  flex-shrink: 0;
}

.panel-tab {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-color2, #808080);
  cursor: pointer;
  border-radius: 3px;
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
  padding: 12px;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-color2, #242424);
  border-top: 1px solid var(--border-color1, #333);
  flex-shrink: 0;
}

.file-count {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

</style>
