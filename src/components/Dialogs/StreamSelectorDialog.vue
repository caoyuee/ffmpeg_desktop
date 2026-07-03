<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="close">
      <div class="dialog-container">
        <div class="dialog-header">
          <span class="dialog-title">{{ t('dialog.streamSelector.title') }}</span>
        </div>
        
        <div class="app-toolbar dialog-toolbar">
          <button class="app-btn app-btn--primary" @click="openFile">
            <AppIcon name="folder-open" :size="16" class="icon" /> {{ t('dialog.streamSelector.open') }}
          </button>
          <button class="app-btn app-btn--danger" @click="resetSelection">
            <AppIcon name="reset" :size="16" class="icon" /> {{ t('dialog.streamSelector.reset') }}
          </button>
          <span class="file-name" v-if="currentFile">{{ getFileName(currentFile) }}</span>
        </div>
        
        <div 
          class="stream-list"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
          :class="{ 'app-drop-zone--over': isDragOver }"
        >
          <div v-if="isLoading" class="loading-hint">
            <span>{{ t('dialog.streamSelector.loading') }}</span>
          </div>
          
          <div v-else-if="streams.length === 0" class="app-empty-state empty-hint">
            <span>{{ t('dialog.streamSelector.emptyHint') }}</span>
          </div>
          
          <div v-else class="streams-container">
            <div class="stream-section" v-if="videoStreams.length > 0">
              <div class="section-header video-header">
                <AppIcon name="video" :size="16" class="section-icon" />
                <span class="section-title">{{ t('dialog.streamSelector.videoStream') }}</span>
              </div>
              <div 
                v-for="(stream, index) in videoStreams" 
                :key="'v' + index"
                class="stream-item"
                :class="{ selected: selectedStreams.video.includes(index) }"
                @click="toggleStream('video', index)"
              >
                <span class="stream-checkbox" :class="{ checked: selectedStreams.video.includes(index) }">
                  <AppIcon v-if="selectedStreams.video.includes(index)" name="check" :size="12" />
                </span>
                <div class="stream-info">
                  <span class="stream-name">{{ t('dialog.streamSelector.videoStreamName', { index }) }}</span>
                  <span class="stream-details">
                    <span v-if="stream.language">[{{ stream.language }}]</span>
                    <span>{{ stream.codec }}</span>
                    <span v-if="stream.resolution">| {{ stream.resolution }}</span>
                    <span v-if="stream.fps">| {{ stream.fps }}</span>
                    <span v-if="stream.bitrate">| {{ stream.bitrate }}</span>
                  </span>
                  <span v-if="stream.pixelFormat" class="stream-extra">{{ stream.pixelFormat }}</span>
                  <span v-if="stream.title" class="stream-extra">{{ stream.title }}</span>
                </div>
              </div>
            </div>
            
            <div class="stream-section" v-if="audioStreams.length > 0">
              <div class="section-header audio-header">
                <AppIcon name="audio" :size="16" class="section-icon" />
                <span class="section-title">{{ t('dialog.streamSelector.audioStream') }}</span>
              </div>
              <div 
                v-for="(stream, index) in audioStreams" 
                :key="'a' + index"
                class="stream-item"
                :class="{ selected: selectedStreams.audio.includes(index) }"
                @click="toggleStream('audio', index)"
              >
                <span class="stream-checkbox audio" :class="{ checked: selectedStreams.audio.includes(index) }">
                  <AppIcon v-if="selectedStreams.audio.includes(index)" name="check" :size="12" />
                </span>
                <div class="stream-info">
                  <span class="stream-name">{{ t('dialog.streamSelector.audioStreamName', { index }) }}</span>
                  <span class="stream-details">
                    <span v-if="stream.language">[{{ stream.language }}]</span>
                    <span>{{ stream.codec }}</span>
                    <span v-if="stream.channels">| {{ stream.channels }}</span>
                    <span v-if="stream.sampleRate">| {{ stream.sampleRate }}</span>
                    <span v-if="stream.bitrate">| {{ stream.bitrate }}</span>
                  </span>
                  <span v-if="stream.title" class="stream-extra">{{ stream.title }}</span>
                </div>
              </div>
            </div>
            
            <div class="stream-section" v-if="subtitleStreams.length > 0">
              <div class="section-header subtitle-header">
                <AppIcon name="subtitle" :size="16" class="section-icon" />
                <span class="section-title">{{ t('dialog.streamSelector.subtitleStream') }}</span>
              </div>
              <div 
                v-for="(stream, index) in subtitleStreams" 
                :key="'s' + index"
                class="stream-item"
                :class="{ selected: selectedStreams.subtitle.includes(index) }"
                @click="toggleStream('subtitle', index)"
              >
                <span class="stream-checkbox subtitle" :class="{ checked: selectedStreams.subtitle.includes(index) }">
                  <AppIcon v-if="selectedStreams.subtitle.includes(index)" name="check" :size="12" />
                </span>
                <div class="stream-info">
                  <span class="stream-name">{{ t('dialog.streamSelector.subtitleStreamName', { index }) }}</span>
                  <span class="stream-details">
                    <span v-if="stream.language">[{{ stream.language }}]</span>
                    <span>{{ stream.codec }}</span>
                  </span>
                  <span v-if="stream.title" class="stream-extra">{{ stream.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="app-btn" @click="close">{{ t('common.cancel') }}</button>
          <button class="app-btn app-btn--primary" @click="confirm">{{ t('common.confirm') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

interface StreamInfo {
  index: number;
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  language?: string;
  resolution?: string;
  fps?: string;
  bitrate?: string;
  pixelFormat?: string;
  channels?: string;
  sampleRate?: string;
  title?: string;
}

const props = defineProps<{
  visible: boolean;
  filePath?: string;
  fileIndex?: string;
  initialVideo?: string;
  initialAudio?: string;
  initialSubtitle?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', streams: { video: number[]; audio: number[]; subtitle: number[] }): void;
}>();

const { t } = useI18n();

const currentFile = ref('');
const isLoading = ref(false);
const isDragOver = ref(false);
const streams = ref<StreamInfo[]>([]);

const selectedStreams = ref<{
  video: number[];
  audio: number[];
  subtitle: number[];
}>({
  video: [],
  audio: [],
  subtitle: [],
});

const videoStreams = computed(() => 
  streams.value.filter(s => s.type === 'video')
);

const audioStreams = computed(() => 
  streams.value.filter(s => s.type === 'audio')
);

const subtitleStreams = computed(() => 
  streams.value.filter(s => s.type === 'subtitle')
);

watch(() => props.visible, (visible) => {
  if (visible && props.filePath) {
    loadMediaInfo(props.filePath);
    parseInitialSelection();
  }
});

watch(() => props.filePath, (path) => {
  if (path && props.visible) {
    loadMediaInfo(path);
    parseInitialSelection();
  }
});

function parseInitialSelection() {
  selectedStreams.value = { video: [], audio: [], subtitle: [] };
  
  if (props.initialVideo) {
    const indices = props.initialVideo.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    selectedStreams.value.video = indices;
  }
  
  if (props.initialAudio) {
    const indices = props.initialAudio.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    selectedStreams.value.audio = indices;
  }
  
  if (props.initialSubtitle) {
    const indices = props.initialSubtitle.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    selectedStreams.value.subtitle = indices;
  }
}

async function openFile() {
  try {
    const file = await open({
      multiple: false,
      filters: [{ name: t('dialog.streamSelector.mediaFiles'), extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', '*'] }],
    });
    if (file) {
      await loadMediaInfo(file as string);
    }
  } catch (error) {
    console.error(t('dialog.streamSelector.openFileFailed'), error);
  }
}

async function loadMediaInfo(filePath: string) {
  currentFile.value = filePath;
  isLoading.value = true;
  streams.value = [];
  
  try {
    const info = await invoke<{
      streams: StreamInfo[];
    }>('probe_media_streams', { filePath });
    
    streams.value = info.streams || [];
  } catch (error) {
    console.error(t('dialog.streamSelector.readMediaInfoFailed'), error);
  } finally {
    isLoading.value = false;
  }
}

function toggleStream(type: 'video' | 'audio' | 'subtitle', index: number) {
  const list = selectedStreams.value[type];
  const idx = list.indexOf(index);
  
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(index);
  }
}

function resetSelection() {
  selectedStreams.value = { video: [], audio: [], subtitle: [] };
}

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path;
}

async function onDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = event.dataTransfer?.getData('text/uri-list')?.split('\n');
  if (files && files[0]) {
    const path = files[0].trim().replace('file://', '');
    await loadMediaInfo(decodeURIComponent(path));
  }
}

function close() {
  emit('update:visible', false);
}

function confirm() {
  emit('confirm', {
    video: [...selectedStreams.value.video],
    audio: [...selectedStreams.value.audio],
    subtitle: [...selectedStreams.value.subtitle],
  });
  close();
}

function getStreamOutput(type: 'video' | 'audio' | 'subtitle'): string {
  const prefix = props.fileIndex ? `${props.fileIndex}:${type.charAt(0)}:` : '';
  return selectedStreams.value[type].map(i => `${prefix}${i}`).join(',');
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-container {
  background: var(--bg-color2, #181818);
  border-radius: 8px;
  min-width: 500px;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px var(--shadow-color, rgba(0, 0, 0, 0.5));
}

.dialog-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--bg-color3, #242424);
}

.dialog-title {
  color: var(--text-color1, #c0c0c0);
  font-size: 15px;
  font-weight: 500;
}

.dialog-toolbar {
  padding: 10px;
}

.file-name {
  flex: 1;
  color: var(--text-color2, #888);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-list {
  flex: 1;
  overflow: auto;
  min-height: 300px;
  border: 1px dashed transparent;
  transition: border-color 0.2s;
}

.loading-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-color3, #555);
  font-size: 14px;
}

.empty-hint {
  min-height: 300px;
  border-radius: 0;
  border-left: none;
  border-right: none;
}

.streams-container {
  padding: 10px;
}

.stream-section {
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  margin-bottom: 5px;
}

.video-header {
  background: var(--info-bg, rgba(100, 149, 237, 0.2));
}

.audio-header {
  background: var(--success-bg, rgba(107, 142, 35, 0.2));
}

.subtitle-header {
  background: var(--accent-bg, rgba(147, 112, 219, 0.2));
}

.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  font-weight: 500;
}

.stream-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.stream-item:hover {
  background: var(--bg-color4, #383838);
}

.stream-item.selected {
  background: var(--bg-color5, #404040);
}

.stream-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--info-color, #6495ed);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  font-size: 12px;
  flex-shrink: 0;
}

.stream-checkbox.audio {
  border-color: var(--success-color, #6b8e23);
}

.stream-checkbox.subtitle {
  border-color: var(--accent-color, #9370db);
}

.stream-checkbox.checked {
  background: var(--info-color, #6495ed);
  color: var(--bg-color1, #fff);
}

.stream-checkbox.audio.checked {
  background: var(--success-color, #6b8e23);
}

.stream-checkbox.subtitle.checked {
  background: var(--accent-color, #9370db);
}

.stream-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stream-name {
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  font-weight: 500;
}

.stream-details {
  color: var(--text-color2, #888);
  font-size: 12px;
}

.stream-details span {
  margin-right: 5px;
}

.stream-extra {
  color: var(--text-color3, #666);
  font-size: 11px;
  padding-left: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid var(--bg-color3, #242424);
}
</style>
