<template>
  <div class="video-player" ref="playerRef">
    <video
      ref="videoRef"
      class="video-element"
      :src="src"
      :poster="poster"
      :autoplay="autoplay"
      :loop="loop"
      :muted="muted"
      :playsinline="true"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @play="onPlay"
      @pause="onPause"
      @error="onError"
      @waiting="onWaiting"
      @canplay="onCanPlay"
    ></video>

    <div class="video-overlay" v-if="showOverlay" @click="togglePlay">
      <div class="play-button">
        <span v-if="isPlaying">⏸</span>
        <span v-else>▶</span>
      </div>
    </div>

    <div class="loading-overlay" v-if="isLoading">
      <div class="spinner"></div>
    </div>

    <div class="controls" v-show="showControls && hasVideo">
      <div class="progress-container" @click="seek" ref="progressRef">
        <div class="progress-buffered" :style="{ width: bufferedPercent + '%' }"></div>
        <div class="progress-played" :style="{ width: progressPercent + '%' }"></div>
        <div class="progress-handle" :style="{ left: progressPercent + '%' }"></div>
      </div>

      <div class="controls-row">
        <div class="controls-left">
          <button class="control-btn" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
            <span v-if="isPlaying">⏸</span>
            <span v-else>▶</span>
          </button>

          <button class="control-btn" @click="skipBackward" title="后退10秒">
            <span>⏪</span>
          </button>

          <button class="control-btn" @click="skipForward" title="前进10秒">
            <span>⏩</span>
          </button>

          <div class="volume-control">
            <button class="control-btn" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
              <span v-if="isMuted || volume === 0">🔇</span>
              <span v-else-if="volume < 50">🔉</span>
              <span v-else>🔊</span>
            </button>
            <input
              type="range"
              min="0"
              max="100"
              :value="volume"
              @input="setVolume"
              class="volume-slider"
            />
          </div>

          <span class="time-display">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>
        </div>

        <div class="controls-right">
          <div class="speed-control" @mouseenter="showSpeedMenu = true" @mouseleave="showSpeedMenu = false">
            <button class="control-btn" :title="'播放速度: ' + playbackRate + 'x'">
              <span>{{ playbackRate }}x</span>
            </button>
            <div class="speed-menu" v-show="showSpeedMenu">
              <div
                v-for="speed in speedOptions"
                :key="speed"
                class="speed-option"
                :class="{ active: speed === playbackRate }"
                @click="selectSpeed(speed)"
              >
                {{ speed }}x
              </div>
            </div>
          </div>

          <button class="control-btn" @click="toggleFullscreen" title="全屏">
            <span v-if="isFullscreen">⇲</span>
            <span v-else>⛶</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
  src?: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  poster: '',
  autoplay: false,
  loop: false,
  muted: false,
  showControls: true,
});

const emit = defineEmits<{
  'update:currentTime': [time: number];
  'update:duration': [duration: number];
  'update:playing': [playing: boolean];
  'ended': [];
  'error': [error: Event];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const playerRef = ref<HTMLDivElement | null>(null);
const progressRef = ref<HTMLDivElement | null>(null);

const isPlaying = ref(false);
const isPaused = ref(true);
const isLoading = ref(false);
const isMuted = ref(props.muted);
const isFullscreen = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(80);
const bufferedPercent = ref(0);
const playbackRate = ref(1);
const hasVideo = ref(false);
const showSpeedMenu = ref(false);

const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

const progressPercent = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

const showOverlay = computed(() => {
  return !isPlaying.value && !isLoading.value && hasVideo.value;
});

let hideControlsTimer: number | null = null;

watch(() => props.src, (newSrc) => {
  if (newSrc && videoRef.value) {
    loadVideo(newSrc);
  }
});

function onLoadedMetadata() {
  if (videoRef.value) {
    duration.value = videoRef.value.duration;
    emit('update:duration', duration.value);
  }
  isLoading.value = false;
}

function onTimeUpdate() {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
    emit('update:currentTime', currentTime.value);

    if (videoRef.value.buffered.length > 0) {
      const bufferedEnd = videoRef.value.buffered.end(videoRef.value.buffered.length - 1);
      bufferedPercent.value = (bufferedEnd / duration.value) * 100;
    }
  }
}

function onEnded() {
  isPlaying.value = false;
  isPaused.value = true;
  emit('ended');
}

function onPlay() {
  isPlaying.value = true;
  isPaused.value = false;
  emit('update:playing', true);
}

function onPause() {
  isPlaying.value = false;
  isPaused.value = true;
  emit('update:playing', false);
}

function onError(event: Event) {
  isLoading.value = false;
  console.error('Video error:', event);
  emit('error', event);
}

function onWaiting() {
  isLoading.value = true;
}

function onCanPlay() {
  isLoading.value = false;
}

function togglePlay() {
  if (!videoRef.value) return;

  if (videoRef.value.paused) {
    videoRef.value.play();
  } else {
    videoRef.value.pause();
  }
}

function play() {
  if (videoRef.value) {
    videoRef.value.play();
  }
}

function pause() {
  if (videoRef.value) {
    videoRef.value.pause();
  }
}

function stop() {
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.currentTime = 0;
    isPlaying.value = false;
    isPaused.value = true;
  }
}

function seek(event: MouseEvent) {
  if (!videoRef.value || !progressRef.value) return;

  const rect = progressRef.value.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  const seekTime = duration.value * percent;

  videoRef.value.currentTime = Math.max(0, Math.min(seekTime, duration.value));
}

function setCurrentTime(time: number) {
  if (videoRef.value) {
    videoRef.value.currentTime = Math.max(0, Math.min(time, duration.value));
  }
}

function skipForward() {
  if (videoRef.value) {
    videoRef.value.currentTime = Math.min(videoRef.value.currentTime + 10, duration.value);
  }
}

function skipBackward() {
  if (videoRef.value) {
    videoRef.value.currentTime = Math.max(videoRef.value.currentTime - 10, 0);
  }
}

function setVolume(event: Event) {
  const target = event.target as HTMLInputElement;
  const newVolume = parseInt(target.value);
  volume.value = newVolume;

  if (videoRef.value) {
    videoRef.value.volume = newVolume / 100;
    if (newVolume > 0) {
      isMuted.value = false;
      videoRef.value.muted = false;
    }
  }
}

function toggleMute() {
  if (videoRef.value) {
    isMuted.value = !isMuted.value;
    videoRef.value.muted = isMuted.value;
  }
}

function selectSpeed(speed: number) {
  playbackRate.value = speed;
  if (videoRef.value) {
    videoRef.value.playbackRate = speed;
  }
  showSpeedMenu.value = false;
}

async function toggleFullscreen() {
  if (!playerRef.value) return;

  try {
    if (!document.fullscreenElement) {
      await playerRef.value.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (e) {
    console.error('Fullscreen error:', e);
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function handleKeydown(event: KeyboardEvent) {
  if (!hasVideo.value) return;

  switch (event.key) {
    case ' ':
    case 'k':
      event.preventDefault();
      togglePlay();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      skipBackward();
      break;
    case 'ArrowRight':
      event.preventDefault();
      skipForward();
      break;
    case 'ArrowUp':
      event.preventDefault();
      if (videoRef.value) {
        volume.value = Math.min(100, volume.value + 10);
        videoRef.value.volume = volume.value / 100;
      }
      break;
    case 'ArrowDown':
      event.preventDefault();
      if (videoRef.value) {
        volume.value = Math.max(0, volume.value - 10);
        videoRef.value.volume = volume.value / 100;
      }
      break;
    case 'f':
      event.preventDefault();
      toggleFullscreen();
      break;
    case 'm':
      event.preventDefault();
      toggleMute();
      break;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('fullscreenchange', onFullscreenChange);

  if (videoRef.value) {
    videoRef.value.volume = volume.value / 100;

    if (props.src) {
      loadVideo(props.src);
    }
  }
});

function loadVideo(src: string) {
  if (!src || !videoRef.value) return;

  isLoading.value = true;
  hasVideo.value = true;

  let videoSrc = src;
  if (!src.startsWith('http') && !src.startsWith('blob:')) {
    try {
      videoSrc = convertFileSrc(src);
    } catch (e) {
      console.error('Failed to convert file src:', e);
    }
  }

  videoRef.value.src = videoSrc;
  videoRef.value.load();
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('fullscreenchange', onFullscreenChange);

  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer);
  }
});

defineExpose({
  play,
  pause,
  stop,
  setCurrentTime,
  togglePlay,
  toggleFullscreen,
  toggleMute,
  setVolume: (vol: number) => {
    volume.value = vol;
    if (videoRef.value) {
      videoRef.value.volume = vol / 100;
    }
  },
});
</script>

<style scoped>
.video-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.play-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.play-button span {
  font-size: 32px;
  color: white;
  margin-left: 4px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #9acd32;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 20px 12px 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-player:hover .controls {
  opacity: 1;
}

.progress-container {
  position: relative;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
  margin-bottom: 12px;
}

.progress-container:hover {
  height: 6px;
}

.progress-buffered {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.progress-played {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: #9acd32;
  border-radius: 2px;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #9acd32;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-container:hover .progress-handle {
  opacity: 1;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  background: transparent;
  border: none;
  color: white;
  font-size: 16px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume-slider {
  width: 60px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.time-display {
  color: white;
  font-size: 12px;
  font-family: monospace;
  margin-left: 8px;
}

.speed-control {
  position: relative;
}

.speed-menu {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 4px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 64px;
  z-index: 10;
}

.speed-option {
  padding: 6px 16px;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s;
}

.speed-option:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.speed-option.active {
  color: #9acd32;
}

.video-player:fullscreen .controls {
  opacity: 1;
}

.video-player:fullscreen {
  background: #000;
}
</style>
