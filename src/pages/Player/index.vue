<template>
  <div class="player-page">
    <div class="info-panel">
      <p class="info-line">{{ t('page.player.infoLine1') }}</p>
      <p class="info-line">{{ t('page.player.infoLine2') }}</p>
      <p class="info-line">{{ t('page.player.infoLine3') }}</p>
    </div>

    <div
      class="player-container"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
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

    <div class="control-bar">
      <button class="btn" @click="openFile">{{ t('page.player.open') }}</button>
      <span class="btn-spacer"></span>
      <button class="btn" @click="closeVideo" :disabled="!currentFile">{{ t('page.player.close') }}</button>
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

function onDragEnter() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const firstFile = files[0]
    if (firstFile) {
      playFile(firstFile.path || firstFile.name)
    }
  }
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

.info-panel {
  background: var(--bg-color3, #242424);
  padding: 10px 16px 16px;
  flex-shrink: 0;
}

.info-line {
  margin: 0;
  padding-top: 5px;
  font-size: 13px;
  color: var(--text-color2, #808080);
  line-height: 1.6;
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
  min-height: 0;
}

.player-container.drag-over {
  border-color: #9acd32;
}

.player-hint {
  color: var(--text-color3, #555);
  font-size: 14px;
}

.control-bar {
  display: flex;
  align-items: center;
  height: 50px;
  padding: 0 16px;
  background: var(--bg-color3, #242424);
  flex-shrink: 0;
}

.btn {
  padding: 6px 24px;
  background: var(--bg-color4, #383838);
  border: 1px solid var(--bg-color4, #383838);
  border-radius: 15px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}

.btn:hover:not(:disabled) {
  border-color: var(--text-color1, #c0c0c0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spacer {
  width: 10px;
  flex-shrink: 0;
}
</style>
