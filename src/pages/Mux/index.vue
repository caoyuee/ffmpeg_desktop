<template>
  <div class="mux-page">
    <div class="page-header">
      <span class="header-text">{{ t('page.mux.hint') }}</span>
    </div>
    
    <div class="toolbar">
      <button class="btn btn-add" @click="addFiles">
        <span class="icon">📁</span> {{ t('page.mux.addFiles') }}
      </button>
      <button class="btn btn-move" @click="moveUp" :disabled="selectedIndex === null">
        <span class="icon">⬆️</span> {{ t('page.mux.moveUp') }}
      </button>
      <button class="btn btn-move" @click="moveDown" :disabled="selectedIndex === null">
        <span class="icon">⬇️</span> {{ t('page.mux.moveDown') }}
      </button>
      <button class="btn btn-remove" @click="removeSelected" :disabled="selectedIndex === null">
        <span class="icon">🗑️</span> {{ t('page.mux.remove') }}
      </button>
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
    
    <div 
      class="file-list-container"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      :class="{ 'drag-over': isDragOver }"
    >
      <div class="file-list" v-if="fileList.length > 0">
        <div 
          v-for="(file, index) in fileList" 
          :key="index"
          class="file-item"
          :class="{ selected: selectedIndex === index }"
          @click="selectFile(index)"
          @dblclick="openStreamSelector(file)"
        >
          <span class="file-name">{{ file.path }}</span>
          <span class="stream-cell">{{ file.videoStreams || '-' }}</span>
          <span class="stream-cell">{{ file.audioStreams || '-' }}</span>
          <span class="stream-cell">{{ file.subtitleStreams || '-' }}</span>
          <span class="stream-cell">{{ file.useChapters ? '✓' : '-' }}</span>
          <span class="stream-cell">{{ file.useMetadata ? '✓' : '-' }}</span>
        </div>
      </div>
      <div class="empty-hint" v-else>
        <span>{{ t('page.mux.dragHint') }}</span>
      </div>
    </div>
    
    <div class="stream-editor" v-if="selectedFile">
      <div class="stream-row">
        <label class="stream-label">{{ t('page.mux.videoStreamIndex') }}</label>
        <input 
          type="text" 
          class="stream-input" 
          v-model="selectedFile.videoStreams" 
          :placeholder="t('page.mux.multipleStreamsHint')"
        />
        <label class="stream-label">{{ t('page.mux.audioStreamIndex') }}</label>
        <input 
          type="text" 
          class="stream-input" 
          v-model="selectedFile.audioStreams" 
          :placeholder="t('page.mux.multipleStreamsHint')"
        />
        <label class="stream-label">{{ t('page.mux.subtitleStreamIndex') }}</label>
        <input 
          type="text" 
          class="stream-input" 
          v-model="selectedFile.subtitleStreams" 
          :placeholder="t('page.mux.multipleStreamsHint')"
        />
      </div>
      <div class="option-row">
        <label class="stream-label">{{ t('page.mux.chaptersAndMetadata') }}</label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="selectedFile.useChapters" @change="onChapterChange" />
          {{ t('page.mux.useChapters') }}
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="selectedFile.useMetadata" @change="onMetadataChange" />
          {{ t('page.mux.useMetadata') }}
        </label>
      </div>
    </div>
    
    <div class="bottom-bar">
      <button class="btn btn-browse" @click="selectOutput">
        <span class="icon">📂</span> {{ t('page.mux.selectOutput') }}
      </button>
      <input 
        type="text" 
        class="output-input" 
        v-model="outputPath" 
        :placeholder="t('page.mux.outputTo')"
      />
      <button class="btn btn-start" @click="startMux" :disabled="fileList.length < 1 || !outputPath">
        <span class="icon">▶️</span> {{ t('page.mux.startMux') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useTaskStore } from '@/store/taskStore';
import { getFFmpegPath } from '@/utils/ffmpegPath';

const { t } = useI18n();

interface MuxFile {
  path: string;
  videoStreams: string;
  audioStreams: string;
  subtitleStreams: string;
  useChapters: boolean;
  useMetadata: boolean;
}

const taskStore = useTaskStore();

const fileList = ref<MuxFile[]>([]);
const selectedIndex = ref<number | null>(null);
const outputPath = ref('');
const isDragOver = ref(false);

const selectedFile = computed(() => {
  if (selectedIndex.value !== null) {
    return fileList.value[selectedIndex.value];
  }
  return null;
});

async function addFiles() {
  try {
    const files = await open({
      multiple: true,
      filters: [{ name: '所有文件', extensions: ['*'] }],
    });
    if (files) {
      const paths = Array.isArray(files) ? files : [files];
      for (const path of paths) {
        fileList.value.push({
          path,
          videoStreams: '',
          audioStreams: '',
          subtitleStreams: '',
          useChapters: false,
          useMetadata: false,
        });
      }
    }
  } catch (error) {
    console.error('添加文件失败:', error);
  }
}

function selectFile(index: number) {
  selectedIndex.value = index;
}

function openStreamSelector(file: MuxFile) {
  console.log('打开流选择器:', file.path);
}

function moveUp() {
  if (selectedIndex.value === null || selectedIndex.value === 0) return;
  const index = selectedIndex.value;
  const temp = fileList.value[index];
  fileList.value[index] = fileList.value[index - 1]!;
  fileList.value[index - 1] = temp!;
  selectedIndex.value = index - 1;
}

function moveDown() {
  if (selectedIndex.value === null || selectedIndex.value === fileList.value.length - 1) return;
  const index = selectedIndex.value;
  const temp = fileList.value[index];
  fileList.value[index] = fileList.value[index + 1]!;
  fileList.value[index + 1] = temp!;
  selectedIndex.value = index + 1;
}

function removeSelected() {
  if (selectedIndex.value === null) return;
  fileList.value.splice(selectedIndex.value, 1);
  selectedIndex.value = null;
}

function onChapterChange() {
  if (!selectedFile.value?.useChapters) return;
  for (const file of fileList.value) {
    if (file !== selectedFile.value) {
      file.useChapters = false;
    }
  }
}

function onMetadataChange() {
  if (!selectedFile.value?.useMetadata) return;
  for (const file of fileList.value) {
    if (file !== selectedFile.value) {
      file.useMetadata = false;
    }
  }
}

async function selectOutput() {
  try {
    const path = await save({
      filters: [{ name: '所有文件', extensions: ['*'] }],
    });
    if (path) {
      outputPath.value = path;
    }
  } catch (error) {
    console.error('选择输出位置失败:', error);
  }
}

function onDragOver() {
  isDragOver.value = true;
}

function onDragLeave() {
  isDragOver.value = false;
}

function onDrop(event: DragEvent) {
  isDragOver.value = false;
  const files = event.dataTransfer?.getData('text/uri-list')?.split('\n');
  if (files) {
    for (const file of files) {
      if (file.trim()) {
        const path = file.trim().replace('file://', '');
        fileList.value.push({
          path: decodeURIComponent(path),
          videoStreams: '',
          audioStreams: '',
          subtitleStreams: '',
          useChapters: false,
          useMetadata: false,
        });
      }
    }
  }
}

async function startMux() {
  if (fileList.value.length < 1 || !outputPath.value) return;

  let command = getFFmpegPath() + ' -hide_banner -nostdin ';
  
  for (const file of fileList.value) {
    command += `-i "${file.path}" `;
  }

  for (let i = 0; i < fileList.value.length; i++) {
    const file = fileList.value[i];
    
    const videoStreams = file?.videoStreams?.split(',').filter(s => s.trim()) || [];
    for (const stream of videoStreams) {
      command += `-map ${i}:v:${stream.trim()} -c:v copy `;
    }

    const audioStreams = file?.audioStreams?.split(',').filter(s => s.trim()) || [];
    for (const stream of audioStreams) {
      command += `-map ${i}:a:${stream.trim()} -c:a copy `;
    }

    const subtitleStreams = file?.subtitleStreams?.split(',').filter(s => s.trim()) || [];
    for (const stream of subtitleStreams) {
      command += `-map ${i}:s:${stream.trim()} -c:s copy `;
    }

    if (file?.useChapters) {
      command += `-map_chapters ${i} `;
    }
    if (file?.useMetadata) {
      command += `-map_metadata ${i} `;
    }
  }

  command += `"${outputPath.value}" -y`;

  try {
    await taskStore.addTask({
        inputFile: fileList.value[0]?.path ?? '',
      outputFile: outputPath.value,
      commandLine: command,
      presetId: 'mux',
    });
  } catch (error) {
    console.error('启动混流失败:', error);
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'F3') {
    event.preventDefault();
    moveUp();
  } else if (event.key === 'F4') {
    event.preventDefault();
    moveDown();
  } else if (event.key === 'Delete') {
    event.preventDefault();
    removeSelected();
  } else if (event.key === 'a' && event.ctrlKey) {
    event.preventDefault();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
})
</script>

<style scoped>
.mux-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color2, #181818);
  padding: 10px;
}

.page-header {
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  margin-bottom: 10px;
}

.header-text {
  color: #888;
  font-size: 13px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
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

.btn-add {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn-move {
  background: var(--bg-color4, #383838);
  color: #6495ed;
}

.btn-remove {
  background: var(--bg-color4, #383838);
  color: #cd5c5c;
}

.column-headers {
  display: flex;
  margin-left: auto;
  gap: 0;
}

.col-header {
  color: #c0c0c0;
  font-size: 13px;
  min-width: 75px;
  text-align: center;
}

.hint-bar {
  padding: 10px;
  color: #666;
  font-size: 12px;
}

.file-list-container {
  flex: 1;
  background: var(--bg-color1, #181818);
  border-radius: 4px;
  overflow: auto;
  border: 2px dashed transparent;
  transition: border-color 0.2s;
}

.file-list-container.drag-over {
  border-color: #9acd32;
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
  color: #c0c0c0;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 10px;
}

.stream-cell {
  color: #888;
  font-size: 12px;
  min-width: 75px;
  text-align: center;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #555;
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
  color: #888;
  font-size: 13px;
  min-width: 100px;
}

.stream-input {
  flex: 1;
  padding: 6px 12px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: #c0c0c0;
  font-size: 13px;
  outline: none;
  min-width: 150px;
}

.stream-input::placeholder {
  color: #555;
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
  color: #c0c0c0;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.bottom-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--bg-color3, #242424);
  border-radius: 4px;
  margin-top: 10px;
}

.btn-browse {
  background: var(--bg-color4, #383838);
  color: #9acd32;
}

.btn-start {
  background: var(--bg-color4, #383838);
  color: #9acd32;
  min-width: 100px;
}

.output-input {
  flex: 1;
  padding: 8px 16px;
  background: var(--bg-color1, #181818);
  border: none;
  border-radius: 15px;
  color: #c0c0c0;
  font-size: 13px;
  outline: none;
}

.output-input::placeholder {
  color: #555;
}
</style>
