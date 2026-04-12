<template>
  <div class="media-info-page">
    <div class="toolbar">
      <div class="file-selector">
        <label>选择文件:</label>
        <select v-model="selectedFile" @change="loadMediaInfo">
          <option value="">请选择文件...</option>
          <option v-for="file in recentFiles" :key="file" :value="file">
            {{ getFileName(file) }}
          </option>
        </select>
        <button @click="browseFile">浏览...</button>
      </div>
      <button class="refresh-btn" @click="loadMediaInfo" :disabled="!selectedFile">
        刷新
      </button>
    </div>

    <div class="info-container">
      <div v-if="!selectedFile" class="empty-state">
        <div class="empty-icon">ℹ️</div>
        <p>请选择一个文件查看媒体信息</p>
      </div>

      <div v-else-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载媒体信息...</p>
      </div>

      <div v-else-if="mediaInfo" class="media-info-content">
        <div class="info-section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">文件名:</span>
              <span class="value">{{ mediaInfo.filename }}</span>
            </div>
            <div class="info-item">
              <span class="label">容器格式:</span>
              <span class="value">{{ mediaInfo.format }}</span>
            </div>
            <div class="info-item">
              <span class="label">时长:</span>
              <span class="value">{{ formatDuration(mediaInfo.duration) }}</span>
            </div>
            <div class="info-item">
              <span class="label">文件大小:</span>
              <span class="value">{{ formatSize(mediaInfo.size) }}</span>
            </div>
            <div class="info-item">
              <span class="label">总比特率:</span>
              <span class="value">{{ formatBitrate(mediaInfo.bitRate) }}</span>
            </div>
          </div>
        </div>

        <div v-for="(stream, index) in mediaInfo.streams" :key="index" class="info-section stream-section">
          <h4>{{ getStreamType(stream.codec_type) }}流 #{{ stream.index }}</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">编码:</span>
              <span class="value">{{ stream.codec_name }}</span>
            </div>
            <div v-if="stream.codec_type === 'video'" class="info-item">
              <span class="label">分辨率:</span>
              <span class="value">{{ stream.width }}x{{ stream.height }}</span>
            </div>
            <div v-if="stream.codec_type === 'video'" class="info-item">
              <span class="label">帧率:</span>
              <span class="value">{{ stream.frameRate }} fps</span>
            </div>
            <div v-if="stream.codec_type === 'video'" class="info-item">
              <span class="label">宽高比:</span>
              <span class="value">{{ stream.displayAspectRatio || 'N/A' }}</span>
            </div>
            <div v-if="stream.codec_type === 'audio'" class="info-item">
              <span class="label">采样率:</span>
              <span class="value">{{ stream.sampleRate }} Hz</span>
            </div>
            <div v-if="stream.codec_type === 'audio'" class="info-item">
              <span class="label">声道:</span>
              <span class="value">{{ getChannelLayout(stream.channels) }}</span>
            </div>
            <div v-if="stream.bit_rate" class="info-item">
              <span class="label">比特率:</span>
              <span class="value">{{ formatBitrate(stream.bit_rate) }}</span>
            </div>
            <div v-if="stream.language" class="info-item">
              <span class="label">语言:</span>
              <span class="value">{{ stream.language }}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>元数据</h4>
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
import { invoke } from '@tauri-apps/api/core';

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
      { name: '媒体文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'mp3', 'wav', 'flac'] },
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
    const info = await invoke<MediaInfo>('get_media_info', { path: selectedFile.value });
    mediaInfo.value = info;
  } catch (error) {
    console.error('Failed to load media info:', error);
    mediaInfo.value = null;
  } finally {
    loading.value = false;
  }
}

function getFileName(path: string) {
  return path.split('/').pop() || path;
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
    video: '视频',
    audio: '音频',
    subtitle: '字幕',
    data: '数据',
    attachment: '附件',
  };
  return types[type] || type;
}

function getChannelLayout(channels: number): string {
  const layouts: Record<number, string> = {
    1: '单声道',
    2: '立体声',
    6: '5.1 声道',
    8: '7.1 声道',
  };
  return layouts[channels] || `${channels} 声道`;
}
</script>

<style scoped>
.media-info-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color1, #181818);
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-color2, #242424);
  border-bottom: 1px solid var(--border-color1, #333);
  gap: 12px;
}

.file-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-selector label {
  font-size: 13px;
  color: var(--text-color2, #808080);
}

.file-selector select {
  flex: 1;
  max-width: 400px;
  padding: 8px 12px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
}

.file-selector button {
  padding: 8px 16px;
  background: var(--bg-color3, #303030);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  cursor: pointer;
}

.refresh-btn {
  padding: 8px 16px;
  background: var(--info-color, #3498db);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.empty-state,
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
  to { transform: rotate(360deg); }
}

.media-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-section {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  padding: 16px;
}

.info-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 8px;
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
