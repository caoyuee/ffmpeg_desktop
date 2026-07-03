<template>
  <div class="media-info-page">
    <div class="app-toolbar">
      <div class="app-toolbar__group file-selector">
        <label class="app-field-label">{{ t('page.mediainfo.selectFile') }}</label>
        <select class="app-input--compact file-select" v-model="selectedFile" @change="loadMediaInfo">
          <option value="">{{ t('page.mediainfo.pleaseSelect') }}</option>
          <option v-for="file in recentFiles" :key="file" :value="file">
            {{ getFileName(file) }}
          </option>
        </select>
        <button class="app-btn" @click="browseFile">
          <AppIcon name="folder-open" :size="16" class="icon" />
          {{ t('common.browse') }}...
        </button>
      </div>
      <div class="app-toolbar__spacer"></div>
      <button class="app-btn app-btn--primary" @click="loadMediaInfo" :disabled="!selectedFile">
        <AppIcon name="refresh" :size="16" class="icon" />
        {{ t('page.mediainfo.refresh') }}
      </button>
    </div>

    <div class="info-container">
      <div v-if="!selectedFile" class="app-empty-state empty-state">
        <div class="empty-icon">
          <AppIcon name="mediainfo" :size="64" />
        </div>
        <p>{{ t('page.mediainfo.pleaseSelectFile') }}</p>
      </div>

      <div v-else-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ t('page.mediainfo.loading') }}</p>
      </div>

      <div v-else-if="mediaInfo" class="media-info-content">
        <div class="app-card info-section">
          <h4 class="app-section-title">{{ t('page.mediainfo.basicInfo') }}</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">{{ t('page.mediainfo.filename') }}</span>
              <span class="value">{{ mediaInfo.filename }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t('page.mediainfo.containerFormat') }}</span>
              <span class="value">{{ mediaInfo.format }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t('page.mediainfo.duration') }}</span>
              <span class="value">{{ formatDuration(mediaInfo.duration) }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t('page.mediainfo.fileSize') }}</span>
              <span class="value">{{ formatSize(mediaInfo.size) }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t('page.mediainfo.totalBitrate') }}</span>
              <span class="value">{{ formatBitrate(mediaInfo.bitRate) }}</span>
            </div>
          </div>
        </div>

        <div v-for="(stream, index) in mediaInfo.streams" :key="index" class="app-card info-section stream-section">
          <h4 class="app-section-title">{{ getStreamType(stream.codec_type) }} {{ t('page.mediainfo.stream') }} #{{ stream.index }}</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">{{ t('page.mediainfo.codec') }}</span>
              <span class="value">{{ stream.codec_name }}</span>
            </div>
            <div v-if="stream.codec_type === 'video'" class="info-item">
              <span class="label">{{ t('page.mediainfo.resolution') }}</span>
              <span class="value">{{ stream.width }}x{{ stream.height }}</span>
            </div>
            <div v-if="stream.codec_type === 'video'" class="info-item">
              <span class="label">{{ t('page.mediainfo.frameRate') }}</span>
              <span class="value">{{ stream.frameRate }} fps</span>
            </div>
            <div v-if="stream.codec_type === 'video'" class="info-item">
              <span class="label">{{ t('page.mediainfo.aspectRatio') }}</span>
              <span class="value">{{ stream.displayAspectRatio || 'N/A' }}</span>
            </div>
            <div v-if="stream.codec_type === 'audio'" class="info-item">
              <span class="label">{{ t('page.mediainfo.sampleRate') }}</span>
              <span class="value">{{ stream.sampleRate }} Hz</span>
            </div>
            <div v-if="stream.codec_type === 'audio'" class="info-item">
              <span class="label">{{ t('page.mediainfo.channels') }}</span>
              <span class="value">{{ stream.channels ? getChannelLayout(stream.channels) : 'N/A' }}</span>
            </div>
            <div v-if="stream.bit_rate" class="info-item">
              <span class="label">{{ t('page.mediainfo.bitrate') }}</span>
              <span class="value">{{ formatBitrate(stream.bit_rate) }}</span>
            </div>
            <div v-if="stream.language" class="info-item">
              <span class="label">{{ t('page.mediainfo.language') }}</span>
              <span class="value">{{ stream.language }}</span>
            </div>
          </div>
        </div>

        <div class="app-card info-section">
          <h4 class="app-section-title">{{ t('page.mediainfo.metadata') }}</h4>
          <div class="metadata-list">
            <div v-for="(value, key) in mediaInfo.metadata" :key="key" class="metadata-item">
              <span class="key">{{ key }}:</span>
              <span class="value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

const { t } = useI18n();

interface MediaStream {
  index: number;
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  frameRate?: string;
  displayAspectRatio?: string;
  sampleRate?: number;
  channels?: number;
  bit_rate?: string;
  language?: string;
}

interface MediaInfo {
  filename: string;
  format: string;
  duration: number;
  size: number;
  bitRate: number;
  streams: MediaStream[];
  metadata: Record<string, string>;
}

const selectedFile = ref('');
const recentFiles = ref<string[]>([]);
const loading = ref(false);
const mediaInfo = ref<MediaInfo | null>(null);

async function browseFile() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [
      { name: t('page.mediainfo.mediaFiles'), extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'mp3', 'wav', 'flac'] },
    ],
  });

  if (selected && typeof selected === 'string') {
    selectedFile.value = selected;
    if (!recentFiles.value.includes(selected)) {
      recentFiles.value.unshift(selected);
      if (recentFiles.value.length > 10) {
        recentFiles.value.pop();
      }
    }
    loadMediaInfo();
  }
}

async function loadMediaInfo() {
  if (!selectedFile.value) return;

  loading.value = true;
  try {
    const raw = await invoke<any>('probe_media_info', { path: selectedFile.value });
    mediaInfo.value = mapFfprobeToMediaInfo(raw);
  } catch (error) {
    console.error('Failed to load media info:', error);
    mediaInfo.value = null;
  } finally {
    loading.value = false;
  }
}

function mapFfprobeToMediaInfo(raw: any): MediaInfo {
  const fmt = raw.format || {};
  const streams: MediaStream[] = (raw.streams || []).map((s: any) => {
    const lang = s.tags?.language || s.language;
    return {
      index: s.index,
      codec_type: s.codec_type,
      codec_name: s.codec_name || s.codec_long_name || 'Unknown',
      width: s.width,
      height: s.height,
      frameRate: s.r_frame_rate,
      displayAspectRatio: s.display_aspect_ratio || computeAspectRatio(s.width, s.height),
      sampleRate: s.sample_rate,
      channels: s.channels,
      bit_rate: s.bit_rate,
      language: lang && lang !== 'und' ? lang : undefined,
    };
  });

  return {
    filename: fmt.filename || selectedFile.value,
    format: fmt.format_long_name || fmt.format_name || '',
    duration: parseFloat(fmt.duration) || 0,
    size: parseInt(fmt.size) || 0,
    bitRate: parseInt(fmt.bit_rate) || 0,
    streams,
    metadata: fmt.tags || {},
  };
}

function getFileName(path: string) {
  return path.split('/').pop() || path;
}

function computeAspectRatio(width: number, height: number): string {
  if (!width || !height) return '';
  const ratios: [number, number, string][] = [
    [16, 9, '16:9'],
    [4, 3, '4:3'],
    [21, 9, '21:9'],
    [2.35, 1, '2.35:1'],
    [2.39, 1, '2.39:1'],
    [1, 1, '1:1'],
    [3, 2, '3:2'],
    [5, 4, '5:4'],
  ];
  const ratio = width / height;
  for (const [w, h, label] of ratios) {
    const expected = w / h;
    if (Math.abs(ratio - expected) < 0.02) {
      return label;
    }
  }
  return `${width}:${height}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  } else if (bytes > 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else if (bytes > 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return bytes + ' B';
}

function formatBitrate(bitrate: number | string): string {
  const bps = typeof bitrate === 'string' ? parseInt(bitrate) : bitrate;
  if (bps > 1000000) {
    return (bps / 1000000).toFixed(2) + ' Mbps';
  } else if (bps > 1000) {
    return (bps / 1000).toFixed(2) + ' kbps';
  }
  return bps + ' bps';
}

function getStreamType(type: string): string {
  const types: Record<string, string> = {
    video: t('page.mediainfo.video'),
    audio: t('page.mediainfo.audio'),
    subtitle: t('page.mediainfo.subtitle'),
    data: t('page.mediainfo.data'),
    attachment: t('page.mediainfo.attachment'),
  };
  return types[type] || type;
}

function getChannelLayout(channels: number): string {
  const layouts: Record<number, string> = {
    1: t('page.mediainfo.mono'),
    2: t('page.mediainfo.stereo'),
    6: t('page.mediainfo.channel51'),
    8: t('page.mediainfo.channel71'),
  };
  return layouts[channels] || `${channels} ${t('page.mediainfo.channel')}`;
}
</script>

<style scoped>
.media-info-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color1, #181818);
}

.file-selector {
  flex: 1;
  min-width: 360px;
}

.file-select {
  flex: 1;
  max-width: 400px;
}

.info-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color2, #606060);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color1, #444);
  border-top-color: var(--active-color, #9acd32);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.media-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section {
  padding: 16px;
}

.stream-section h4 {
  color: var(--active-color, #9acd32);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 8px;
}

.info-item {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
}

.info-item .label {
  font-size: 12px;
  color: var(--text-color2, #808080);
  min-width: 80px;
}

.info-item .value {
  font-size: 12px;
  color: var(--text-color1, #c0c0c0);
  font-family: monospace;
}

.metadata-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metadata-item {
  display: flex;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
  font-size: 12px;
}

.metadata-item .key {
  color: var(--text-color2, #808080);
}

.metadata-item .value {
  color: var(--text-color1, #c0c0c0);
}
</style>
