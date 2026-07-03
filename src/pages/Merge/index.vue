<template>
  <div class="merge-page">
    <div class="app-page-hint">
      <span class="app-page-hint__text">{{ t('page.merge.hint') }}</span>
    </div>
    
    <div class="app-toolbar">
      <div class="app-toolbar__group">
        <button class="app-btn app-btn--primary" @click="addFiles">
          <AppIcon name="folder-plus" :size="16" class="icon" /> {{ t('page.merge.addFiles') }}
        </button>
      </div>
      <div class="app-toolbar__divider"></div>
      <div class="app-toolbar__group">
        <button class="app-btn" @click="moveUp" :disabled="selectedIndices.length === 0">
          <AppIcon name="arrow-up" :size="16" class="icon" /> {{ t('page.merge.moveUp') }}
        </button>
        <button class="app-btn" @click="moveDown" :disabled="selectedIndices.length === 0">
          <AppIcon name="arrow-down" :size="16" class="icon" /> {{ t('page.merge.moveDown') }}
        </button>
        <button class="app-btn app-btn--danger" @click="removeSelected" :disabled="selectedIndices.length === 0">
          <AppIcon name="trash" :size="16" class="icon" /> {{ t('page.merge.remove') }}
        </button>
      </div>
      <span class="hint">{{ t('page.merge.keyboardHint') }}</span>
    </div>
    
    <div 
      class="app-drop-zone file-list-container"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
      :class="{ 'app-drop-zone--over': isDragOver }"
    >
      <div class="file-list" v-if="fileList.length > 0">
        <div 
          v-for="(file, index) in fileList" 
          :key="index"
          class="file-item"
          :class="{ selected: selectedIndices.includes(index) }"
          @click="toggleSelect(index, $event)"
          @dblclick="previewFile(file)"
        >
          <span class="file-index">{{ index + 1 }}</span>
          <span class="file-name">{{ file }}</span>
        </div>
      </div>
      <div class="app-empty-state empty-hint" v-else>
        <span>{{ t('page.prepare.dragHint') }}</span>
      </div>
    </div>
    
    <div class="app-bottom-bar">
      <button class="app-btn" @click="selectOutput">
        <AppIcon name="folder-open" :size="16" class="icon" /> {{ t('page.merge.selectOutput') }}
      </button>
      <input
        type="text"
        class="app-input--compact app-output-input"
        v-model="outputPath"
        :placeholder="t('page.merge.selectOutput')"
      />
      <button class="app-btn app-btn--primary" @click="startMerge" :disabled="fileList.length < 2 || !outputPath">
        <AppIcon name="play" :size="16" class="icon" /> {{ t('page.merge.startMerge') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTaskStore } from '@/store/taskStore';
import { getFFmpegPath } from '@/utils/ffmpegPath';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

const { t } = useI18n();
const taskStore = useTaskStore();

const fileList = ref<string[]>([]);
const selectedIndices = ref<number[]>([]);
const outputPath = ref('');
const isDragOver = ref(false);

async function addFiles() {
  try {
    const files = await open({
      multiple: true,
      filters: [{ name: t('common.allFiles'), extensions: ['*'] }],
    });
    if (files) {
      const paths = Array.isArray(files) ? files : [files];
      fileList.value.push(...paths);
    }
  } catch (error) {
    console.error('添加文件失败:', error);
  }
}

function toggleSelect(index: number, event: MouseEvent) {
  if (event.ctrlKey) {
    const idx = selectedIndices.value.indexOf(index);
    if (idx >= 0) {
      selectedIndices.value.splice(idx, 1);
    } else {
      selectedIndices.value.push(index);
    }
  } else if (event.shiftKey && selectedIndices.value.length > 0) {
    const lastSelected = selectedIndices.value[selectedIndices.value.length - 1];
    const start = Math.min(lastSelected!, index);
    const end = Math.max(lastSelected!, index);
    for (let i = start; i <= end; i++) {
      if (!selectedIndices.value.includes(i)) {
        selectedIndices.value.push(i);
      }
    }
  } else {
    selectedIndices.value = [index];
  }
}

function moveUp() {
  const sorted = [...selectedIndices.value].sort((a, b) => a - b);
  for (const index of sorted) {
    if (index > 0 && !selectedIndices.value.includes(index - 1)) {
      const temp = fileList.value[index];
      fileList.value[index] = fileList.value[index - 1]!;
      fileList.value[index - 1] = temp!;
      const idx = selectedIndices.value.indexOf(index);
      selectedIndices.value[idx] = index - 1;
    }
  }
}

function moveDown() {
  const sorted = [...selectedIndices.value].sort((a, b) => b - a);
  for (const index of sorted) {
    if (index < fileList.value.length - 1 && !selectedIndices.value.includes(index + 1)) {
      const temp = fileList.value[index];
      fileList.value[index] = fileList.value[index + 1]!;
      fileList.value[index + 1] = temp!;
      const idx = selectedIndices.value.indexOf(index);
      selectedIndices.value[idx] = index + 1;
    }
  }
}

function removeSelected() {
  const sorted = [...selectedIndices.value].sort((a, b) => b - a);
  for (const index of sorted) {
    fileList.value.splice(index, 1);
  }
  selectedIndices.value = [];
}

async function selectOutput() {
  try {
    const path = await save({
      filters: [{ name: t('common.allFiles'), extensions: ['*'] }],
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
        fileList.value.push(decodeURIComponent(path));
      }
    }
  }
}

function previewFile(file: string) {
  console.log('预览文件:', file);
}

async function startMerge() {
  if (fileList.value.length < 2 || !outputPath.value) return;

  const concatContent = fileList.value
    .map(f => `file '${f.replace(/'/g, "'\\''")}'`)
    .join('\n');

  try {
    const concatFilePath = await invoke<string>('write_concat_file', {
      content: concatContent,
    });

    const command = `${getFFmpegPath()} -hide_banner -nostdin -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath.value}" -y`;

    await taskStore.addTask({
      inputFile: fileList.value[0] || '',
      outputFile: outputPath.value,
      commandLine: command,
      presetId: 'merge',
    });
  } catch (error) {
    console.error('启动合并失败:', error);
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
    selectedIndices.value = fileList.value.map((_, i) => i);
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
.merge-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color2, #181818);
  padding: 10px;
  gap: 10px;
}

.hint {
  color: var(--text-color2, #808080);
  font-size: 12px;
  margin-left: auto;
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

.file-index {
  color: var(--text-color2, #808080);
  font-size: 12px;
  min-width: 30px;
}

.file-name {
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  font-size: 14px;
}
</style>
