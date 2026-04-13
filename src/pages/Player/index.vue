<template>
  <div class="player-page">
    <div class="toolbar">
      <button class="btn btn-open" @click="openFile">
        <span class="icon">📁</span> {{ t('page.player.open') }}
      </button>
      <button class="btn btn-stop" @click="stopPlayback">
        <span class="icon">⏹️</span> {{ t('page.player.close') }}
      </button>
      <div class="file-name" v-if="currentFile">
        {{ currentFile }}
      </div>
    </div>
    
    <div 
      class="player-container"
      ref="playerContainer"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      :class="{ 'drag-over': isDragOver }"
    >
      <div class="player-hint" v-if="!isPlaying">
        <span>{{ t('page.player.dragHint') }}</span>
      </div>
    </div>
    
    <div class="controls-bar">
      <button class="btn btn-control" @click="togglePause" :disabled="!isPlaying">
        <span class="icon">{{ isPaused ? '▶️' : '⏸️' }}</span>
      </button>
      <div class="progress-bar" @click="seek">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      <div class="volume-control">
        <span class="icon">🔊</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          v-model="volume" 
          @change="setVolume"
          class="volume-slider"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const { t } = useI18n();

const playerContainer = ref<HTMLDivElement | null>(null);
const currentFile = ref('');
const isPlaying = ref(false);
const isPaused = ref(false);
const isDragOver = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(80);
const progressPercent = ref(0);

let ffplayProcess: string | null = null;
let progressInterval: number | null = null;

async function openFile() {
  try {
    const file = await open({
      multiple: false,
      filters: [{ name: t('page.player.videoFiles'), extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', '*'] }],
    });
    if (file) {
      await playFile(file as string);
    }
  } catch (error) {
    console.error('打开文件失败:', error);
  }
}

async function playFile(filePath: string) {
  await stopPlayback();
  
  currentFile.value = filePath;
  isPlaying.value = true;
  isPaused.value = false;
  
  try {
    const containerWidth = playerContainer.value?.clientWidth || 800;
    const containerHeight = playerContainer.value?.clientHeight || 450;
    
    await invoke('start_ffplay', {
      filePath,
      width: containerWidth,
      height: containerHeight,
      volume: volume.value,
    });
    
    startProgressTracking();
  } catch (error) {
    console.error('播放失败:', error);
    isPlaying.value = false;
  }
}

async function stopPlayback() {
  if (ffplayProcess) {
    try {
      await invoke('stop_ffplay');
    } catch (error) {
      console.error('停止播放失败:', error);
    }
    ffplayProcess = null;
  }
  
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  
  isPlaying.value = false;
  isPaused.value = false;
  currentFile.value = '';
  currentTime.value = 0;
  duration.value = 0;
  progressPercent.value = 0;
}

function togglePause() {
  if (!isPlaying.value) return;
  isPaused.value = !isPaused.value;
  invoke('toggle_ffplay_pause', { pause: isPaused.value });
}

function setVolume() {
  invoke('set_ffplay_volume', { volume: volume.value });
}

function seek(event: MouseEvent) {
  if (!playerContainer.value || !isPlaying.value) return;
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  const seekTime = duration.value * percent;
  
  invoke('seek_ffplay', { time: seekTime });
}

function startProgressTracking() {
  progressInterval = window.setInterval(async () => {
    try {
      const info = await invoke<{ currentTime: number; duration: number }>('get_ffplay_progress');
      currentTime.value = info.currentTime;
      duration.value = info.duration;
      progressPercent.value = duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
    } catch (error) {
      console.error('获取进度失败:', error);
    }
  }, 500);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function onDragOver() {
  isDragOver.value = true;
}

function onDragLeave() {
  isDragOver.value = false;
}

async function onDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = event.dataTransfer?.getData('text/uri-list')?.split('\n');
  if (files && files[0]) {
    const path = files[0].trim().replace('file://', '');
    await playFile(decodeURIComponent(path));
  }
}

onMounted(async () => {
  await listen('ffplay-exited', () => {
    isPlaying.value = false;
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  });
});

onUnmounted(() => {
  stopPlayback();
});
</script>

<style scoped>
.player-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color2, #181818);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-color3, #242424);
}

.btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-open {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn-stop {
  background: var(--bg-color4, #383838);
  color: #cd5c5c;
}

.btn-control {
  background: var(--bg-color4, #383838);
  color: #c0c0c0;
  padding: 6px 12px;
}

.file-name {
  flex: 1;
  color: #888;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-container {
  flex: 1;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed transparent;
  transition: border-color 0.2s;
}

.player-container.drag-over {
  border-color: #9acd32;
}

.player-hint {
  color: #555;
  font-size: 14px;
}

.controls-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-color3, #242424);
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-color1, #181818);
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #9acd32;
  border-radius: 3px;
  transition: width 0.1s;
}

.time-display {
  color: #888;
  font-size: 12px;
  min-width: 100px;
  text-align: center;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.volume-slider {
  width: 80px;
  height: 4px;
  -webkit-appearance: none;
  background: var(--bg-color1, #181818);
  border-radius: 2px;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #9acd32;
  border-radius: 50%;
  cursor: pointer;
}
</style>
