<template>
  <div class="player-page">
    <div class="toolbar">
      <button class="btn btn-open" @click="openFile">
        <span class="icon">📁</span> {{ t('page.player.open') }}
      </button>
      <button class="btn btn-stop" @click="closeVideo" :disabled="!currentFile">
        <span class="icon">⏹️</span> {{ t('page.player.close') }}
      </button>
      <div class="file-name" v-if="currentFile">
        {{ currentFile }}
      </div>
    </div>

    <div
      class="player-container"
      @dragover.prevent
      @dragleave="isDragOver = false"
      @drop.prevent
      :class="{ 'drag-over': isDragOver }"
    >
      <VideoPlayer
        v-if="videoSrc"
        ref="videoPlayerRef"
        :src="videoSrc"
        :autoplay="true"
        @ended="onVideoEnded"
        @error="onVideoError"
      />
      <div v-else class="player-hint">
        <span>{{ t('page.player.dragHint') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { UnlistenFn } from '@tauri-apps/api/event'
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer.vue'

const { t } = useI18n()

const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null)
const currentFile = ref('')
const videoSrc = ref('')
const isDragOver = ref(false)

let dragDropUnlisten: UnlistenFn | null = null
let currentBlobUrl: string | null = null

async function openFile() {
  try {
    const file = await open({
      multiple: false,
      filters: [{ name: t('page.player.videoFiles'), extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', '*'] }],
    })
    if (file) {
      await playFile(file as string)
    }
  } catch (error) {
    console.error('打开文件失败:', error)
  }
}

async function playFile(filePath: string) {
  closeVideo()
  currentFile.value = filePath

  try {
    const base64 = await invoke<string>('read_video_file', { path: filePath })
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const ext = filePath.split('.').pop()?.toLowerCase() || 'mp4'
    const mimeType =
      { mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg', mkv: 'video/x-matroska', avi: 'video/x-msvideo', mov: 'video/quicktime', flv: 'video/x-flv', wmv: 'video/x-ms-wmv' }[ext] || 'video/mp4'

    const blob = new Blob([bytes], { type: mimeType })
    currentBlobUrl = URL.createObjectURL(blob)
    videoSrc.value = currentBlobUrl
  } catch (error) {
    console.error('加载视频文件失败:', error)
  }
}

function closeVideo() {
  videoPlayerRef.value?.stop()
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }
  videoSrc.value = ''
  currentFile.value = ''
}

function onVideoEnded() {
}

function onVideoError(event: Event) {
  console.error('视频播放错误:', event)
}

onMounted(async () => {
  dragDropUnlisten = await getCurrentWebviewWindow().onDragDropEvent((event) => {
    if (event.payload.type === 'over') {
      isDragOver.value = true
    } else if (event.payload.type === 'leave') {
      isDragOver.value = false
    } else if (event.payload.type === 'drop') {
      isDragOver.value = false
      const firstPath = event.payload.paths[0]
      if (firstPath) {
        playFile(firstPath)
      }
    }
  })
})

onUnmounted(() => {
  closeVideo()
  dragDropUnlisten?.()
})
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
  overflow: hidden;
}

.player-container.drag-over {
  border-color: #9acd32;
}

.player-hint {
  color: #555;
  font-size: 14px;
}
</style>
