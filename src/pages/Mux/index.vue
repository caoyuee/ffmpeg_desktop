<template>
  <div class="mux-page">
    <div class="app-page-hint">
      <span class="app-page-hint__text">{{ t('page.mux.hint') }}</span>
    </div>

    <div class="app-toolbar">
      <div class="app-toolbar__group">
        <button class="app-btn app-btn--primary" @click="addFiles">
          <AppIcon name="folder-plus" :size="16" class="icon" /> {{ t('page.mux.addFiles') }}
        </button>
      </div>
      <div class="app-toolbar__divider"></div>
      <div class="app-toolbar__group">
        <button class="app-btn" :disabled="selectedIndices.length === 0" @click="moveUp">
          <AppIcon name="arrow-up" :size="16" class="icon" /> {{ t('page.mux.moveUp') }}
        </button>
        <button class="app-btn" :disabled="selectedIndices.length === 0" @click="moveDown">
          <AppIcon name="arrow-down" :size="16" class="icon" /> {{ t('page.mux.moveDown') }}
        </button>
        <button
          class="app-btn app-btn--danger"
          :disabled="selectedIndices.length === 0"
          @click="removeSelected"
        >
          <AppIcon name="trash" :size="16" class="icon" /> {{ t('page.mux.remove') }}
        </button>
      </div>
      <div class="column-headers">
        <span class="col-header">{{ t('page.mux.video') }}</span>
        <span class="col-header">{{ t('page.mux.audio') }}</span>
        <span class="col-header">{{ t('page.mux.subtitle') }}</span>
        <span class="col-header">{{ t('page.mux.chapters') }}</span>
        <span class="col-header">{{ t('page.mux.metadata') }}</span>
      </div>
    </div>

    <div class="hint-bar">
      <span>{{ t('page.merge.keyboardHint') }}</span>
    </div>

    <div v-if="subtitleCopyWarning" class="subtitle-warning">
      <span>{{ subtitleCopyWarning }}</span>
    </div>

    <div
      class="app-drop-zone file-list-container"
      :class="{ 'app-drop-zone--over': isDragOver }"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div v-if="fileList.length > 0" class="file-list">
        <div
          v-for="(file, index) in fileList"
          :key="index"
          class="file-item"
          :class="{ selected: selectedIndices.includes(index) }"
          @click="toggleSelect(index, $event)"
          @dblclick="openStreamSelector(file)"
        >
          <span class="file-name">{{ file.path }}</span>
          <span class="stream-cell">{{ file.videoStreams || '-' }}</span>
          <span class="stream-cell">{{ file.audioStreams || '-' }}</span>
          <span class="stream-cell">{{ file.subtitleStreams || '-' }}</span>
          <span class="stream-cell">
            <AppIcon v-if="file.useChapters" name="check" :size="12" />
            <span v-else>-</span>
          </span>
          <span class="stream-cell">
            <AppIcon v-if="file.useMetadata" name="check" :size="12" />
            <span v-else>-</span>
          </span>
        </div>
      </div>
      <div v-else class="app-empty-state empty-hint">
        <span>{{ t('page.mux.dragHint') }}</span>
      </div>
    </div>

    <StreamSelectorDialog
      :visible="showStreamSelector"
      :file-path="streamSelectorFile?.path ?? ''"
      :file-index="streamSelectorFile ? fileList.indexOf(streamSelectorFile) : 0"
      :initial-video="streamSelectorFile ? parseStreamIndices(streamSelectorFile.videoStreams) : []"
      :initial-audio="streamSelectorFile ? parseStreamIndices(streamSelectorFile.audioStreams) : []"
      :initial-subtitle="
        streamSelectorFile ? parseStreamIndices(streamSelectorFile.subtitleStreams) : []
      "
      @update:visible="showStreamSelector = $event"
      @confirm="onStreamConfirm"
    />

    <div v-if="selectedFile" class="stream-editor">
      <div class="stream-row">
        <label class="stream-label">{{ t('page.mux.videoStreamIndex') }}</label>
        <input
          v-model="selectedFile.videoStreams"
          type="text"
          class="stream-input"
          :placeholder="t('page.mux.multipleStreamsHint')"
        />
        <label class="stream-label">{{ t('page.mux.audioStreamIndex') }}</label>
        <input
          v-model="selectedFile.audioStreams"
          type="text"
          class="stream-input"
          :placeholder="t('page.mux.multipleStreamsHint')"
        />
        <label class="stream-label">{{ t('page.mux.subtitleStreamIndex') }}</label>
        <input
          v-model="selectedFile.subtitleStreams"
          type="text"
          class="stream-input"
          :placeholder="t('page.mux.multipleStreamsHint')"
        />
      </div>
      <div class="option-row">
        <label class="stream-label">{{ t('page.mux.chaptersAndMetadata') }}</label>
        <label class="checkbox-label">
          <input v-model="selectedFile.useChapters" type="checkbox" @change="onChapterChange" />
          {{ t('page.mux.useChapters') }}
        </label>
        <label class="checkbox-label">
          <input v-model="selectedFile.useMetadata" type="checkbox" @change="onMetadataChange" />
          {{ t('page.mux.useMetadata') }}
        </label>
      </div>
    </div>

    <div class="app-bottom-bar">
      <button class="app-btn" @click="selectOutput">
        <AppIcon name="folder-open" :size="16" class="icon" /> {{ t('page.mux.selectOutput') }}
      </button>
      <input
        v-model="outputPath"
        type="text"
        class="app-input--compact app-output-input"
        :placeholder="t('page.mux.outputTo')"
      />
      <button
        class="app-btn app-btn--primary"
        :disabled="fileList.length < 1 || !outputPath"
        @click="startMux"
      >
        <AppIcon name="play" :size="16" class="icon" /> {{ t('page.mux.startMux') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { open, save } from '@tauri-apps/plugin-dialog'
import { useTaskStore } from '@/store/taskStore'
import { getFFmpegPath } from '@/utils/ffmpegPath'
import { buildMuxCommand, needsSubtitleCopyWarning, type MuxInputSpec } from '@/config/muxCommand'
import StreamSelectorDialog from '@/components/Dialogs/StreamSelectorDialog.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const { t } = useI18n()

interface MuxFile extends MuxInputSpec {
  path: string
  videoStreams: string
  audioStreams: string
  subtitleStreams: string
  useChapters: boolean
  useMetadata: boolean
}

const taskStore = useTaskStore()

const fileList = ref<MuxFile[]>([])
// P2-2：对齐 Merge 页的多选模型，Ctrl+A 全选真正可用。
const selectedIndices = ref<number[]>([])
const outputPath = ref('')
const isDragOver = ref(false)
const showStreamSelector = ref(false)
const streamSelectorFile = ref<MuxFile | null>(null)

const selectedFile = computed<MuxFile | null>(() => {
  const last = selectedIndices.value[selectedIndices.value.length - 1]
  return last === undefined ? null : (fileList.value[last] ?? null)
})

// P2-2：字幕流 copy 进 MP4/MOV 容器的兼容性提示（不阻断，由用户决定）。
const subtitleCopyWarning = computed(() => {
  const hasSubtitleSelection = fileList.value.some((f) => (f.subtitleStreams ?? '').trim() !== '')
  return needsSubtitleCopyWarning(outputPath.value, hasSubtitleSelection)
    ? t('page.mux.subtitleCopyWarning')
    : ''
})

function parseStreamIndices(streams: string): number[] {
  return streams
    .split(',')
    .filter((s) => s.trim())
    .map(Number)
    .filter((n) => !isNaN(n))
}

async function addFiles() {
  try {
    const files = await open({
      multiple: true,
      filters: [{ name: '所有文件', extensions: ['*'] }],
    })
    if (files) {
      const paths = Array.isArray(files) ? files : [files]
      for (const path of paths) {
        fileList.value.push({
          path,
          videoStreams: '',
          audioStreams: '',
          subtitleStreams: '',
          useChapters: false,
          useMetadata: false,
        })
      }
    }
  } catch (error) {
    console.error('添加文件失败:', error)
  }
}

function toggleSelect(index: number, event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    const pos = selectedIndices.value.indexOf(index)
    if (pos >= 0) {
      selectedIndices.value.splice(pos, 1)
    } else {
      selectedIndices.value.push(index)
    }
  } else if (event.shiftKey && selectedIndices.value.length > 0) {
    const last = selectedIndices.value[selectedIndices.value.length - 1] ?? 0
    const start = Math.min(last, index)
    const end = Math.max(last, index)
    for (let i = start; i <= end; i++) {
      if (!selectedIndices.value.includes(i)) {
        selectedIndices.value.push(i)
      }
    }
  } else {
    if (selectedIndices.value.length === 1 && selectedIndices.value[0] === index) {
      selectedIndices.value = []
    } else {
      selectedIndices.value = [index]
    }
  }
}

function selectAll() {
  selectedIndices.value = fileList.value.map((_, i) => i)
}

function openStreamSelector(file: MuxFile) {
  streamSelectorFile.value = file
  showStreamSelector.value = true
}

function onStreamConfirm(result: { video: number[]; audio: number[]; subtitle: number[] }) {
  if (streamSelectorFile.value) {
    streamSelectorFile.value.videoStreams = result.video.join(',')
    streamSelectorFile.value.audioStreams = result.audio.join(',')
    streamSelectorFile.value.subtitleStreams = result.subtitle.join(',')
  }
}

function moveUp() {
  const sorted = [...selectedIndices.value].sort((a, b) => a - b)
  for (const index of sorted) {
    if (index > 0 && !selectedIndices.value.includes(index - 1)) {
      const temp = fileList.value[index]
      fileList.value[index] = fileList.value[index - 1]!
      fileList.value[index - 1] = temp!
      const idx = selectedIndices.value.indexOf(index)
      selectedIndices.value[idx] = index - 1
    }
  }
}

function moveDown() {
  const sorted = [...selectedIndices.value].sort((a, b) => b - a)
  for (const index of sorted) {
    if (index < fileList.value.length - 1 && !selectedIndices.value.includes(index + 1)) {
      const temp = fileList.value[index]
      fileList.value[index] = fileList.value[index + 1]!
      fileList.value[index + 1] = temp!
      const idx = selectedIndices.value.indexOf(index)
      selectedIndices.value[idx] = index + 1
    }
  }
}

function removeSelected() {
  if (selectedIndices.value.length === 0) return
  const doomed = [...selectedIndices.value].sort((a, b) => b - a)
  for (const index of doomed) {
    fileList.value.splice(index, 1)
  }
  selectedIndices.value = []
}

function onChapterChange() {
  if (!selectedFile.value?.useChapters) return
  for (const file of fileList.value) {
    if (file !== selectedFile.value) {
      file.useChapters = false
    }
  }
}

function onMetadataChange() {
  if (!selectedFile.value?.useMetadata) return
  for (const file of fileList.value) {
    if (file !== selectedFile.value) {
      file.useMetadata = false
    }
  }
}

async function selectOutput() {
  try {
    const path = await save({
      filters: [{ name: '所有文件', extensions: ['*'] }],
    })
    if (path) {
      outputPath.value = path
    }
  } catch (error) {
    console.error('选择输出位置失败:', error)
  }
}

function onDragOver() {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event: DragEvent) {
  isDragOver.value = false
  const files = event.dataTransfer?.getData('text/uri-list')?.split('\n')
  if (files) {
    for (const file of files) {
      if (file.trim()) {
        const path = file.trim().replace('file://', '')
        fileList.value.push({
          path: decodeURIComponent(path),
          videoStreams: '',
          audioStreams: '',
          subtitleStreams: '',
          useChapters: false,
          useMetadata: false,
        })
      }
    }
  }
}

async function startMux() {
  if (fileList.value.length < 1 || !outputPath.value) return

  // P2-2：命令构建收敛到唯一纯函数层 muxCommand.ts，未选流的输入 -map i 不丢流。
  const command = buildMuxCommand(fileList.value, outputPath.value, getFFmpegPath())

  try {
    await taskStore.addTask({
      inputFile: fileList.value[0]?.path ?? '',
      outputFile: outputPath.value,
      commandLine: command,
      presetId: 'mux',
    })
  } catch (error) {
    console.error('启动混流失败:', error)
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'F3') {
    event.preventDefault()
    moveUp()
  } else if (event.key === 'F4') {
    event.preventDefault()
    moveDown()
  } else if (event.key === 'Delete') {
    event.preventDefault()
    removeSelected()
  } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    selectAll()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.mux-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color2, #181818);
  padding: 10px;
  gap: 10px;
}

.column-headers {
  display: flex;
  margin-left: auto;
  gap: 0;
}

.col-header {
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  min-width: 75px;
  text-align: center;
}

.hint-bar {
  color: var(--text-color2, #808080);
  font-size: 12px;
}

.subtitle-warning {
  color: var(--warning-color, #e67e22);
  font-size: 12px;
  padding: 6px 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
}

.file-list {
  padding: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.file-item:hover {
  background: var(--bg-color4, #383838);
}

.file-item.selected {
  background: var(--bg-color5, #404040);
}

.file-name {
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
}

.stream-cell {
  color: var(--text-color2, #808080);
  font-size: 12px;
  min-width: 75px;
  text-align: center;
}

.empty-hint {
  font-size: 14px;
}

.stream-editor {
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  margin-top: 10px;
}

.stream-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.stream-label {
  color: var(--text-color2, #808080);
  font-size: 13px;
  min-width: 100px;
}

.stream-input {
  flex: 1;
  padding: 6px 12px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  outline: none;
  min-width: 150px;
}

.stream-input::placeholder {
  color: var(--text-color2, #808080);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
