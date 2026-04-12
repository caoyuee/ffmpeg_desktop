<template>
  <div class="merge-page">
    <div class="page-header">
      <span class="header-text">仅提供最基础的合并，仅复制流，要求多个参数一致；高级需求请直接用剪辑软件</span>
    </div>
    
    <div class="toolbar">
      <button class="btn btn-add" @click="addFiles">
        <span class="icon">📁</span> 添加文件
      </button>
      <button class="btn btn-move" @click="moveUp" :disabled="selectedIndices.length === 0">
        <span class="icon">⬆️</span> 上移
      </button>
      <button class="btn btn-move" @click="moveDown" :disabled="selectedIndices.length === 0">
        <span class="icon">⬇️</span> 下移
      </button>
      <button class="btn btn-remove" @click="removeSelected" :disabled="selectedIndices.length === 0">
        <span class="icon">🗑️</span> 移除
      </button>
      <span class="hint">使用键盘 F3 和 F4 来排序，Delete 来移除</span>
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
          :class="{ selected: selectedIndices.includes(index) }"
          @click="toggleSelect(index, $event)"
          @dblclick="previewFile(file)"
        >
          <span class="file-index">{{ index + 1 }}</span>
          <span class="file-name">{{ file }}</span>
        </div>
      </div>
      <div class="empty-hint" v-else>
        <span>拖拽文件到此处或点击"添加文件"按钮</span>
      </div>
    </div>
    
    <div class="bottom-bar">
      <button class="btn btn-browse" @click="selectOutput">
        <span class="icon">📂</span> 选择位置
      </button>
      <input 
        type="text" 
        class="output-input" 
        v-model="outputPath" 
        placeholder="输出到目标位置"
      />
      <button class="btn btn-start" @click="startMerge" :disabled="fileList.length < 2 || !outputPath">
        <span class="icon">▶️</span> 启动合并
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTaskStore } from '@/store/taskStore';

const taskStore = useTaskStore();

const fileList = ref<string[]>([]);
const selectedIndices = ref<number[]>([]);
const outputPath = ref('');
const isDragOver = ref(false);

async function addFiles() {
  try {
    const files = await open({
      multiple: true,
      filters: [{ name: '所有文件', extensions: ['*'] }],
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
    const start = Math.min(lastSelected, index);
    const end = Math.max(lastSelected, index);
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
      fileList.value[index] = fileList.value[index - 1];
      fileList.value[index - 1] = temp;
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
      fileList.value[index] = fileList.value[index + 1];
      fileList.value[index + 1] = temp;
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

    const command = `-hide_banner -nostdin -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath.value}" -y`;

    await taskStore.addTask({
      inputFile: fileList.value[0],
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

document.addEventListener('keydown', handleKeyDown);
</script>

<style scoped>
.merge-page {
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
  margin-bottom: 10px;
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

.btn-add:hover:not(:disabled) {
  border-color: #9acd32;
}

.btn-move {
  background: var(--bg-color4, #383838);
  color: #6495ed;
}

.btn-move:hover:not(:disabled) {
  border-color: #6495ed;
}

.btn-remove {
  background: var(--bg-color4, #383838);
  color: #cd5c5c;
}

.btn-remove:hover:not(:disabled) {
  border-color: #cd5c5c;
}

.hint {
  color: #666;
  font-size: 12px;
  margin-left: auto;
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

.file-index {
  color: #666;
  font-size: 12px;
  min-width: 30px;
}

.file-name {
  color: #c0c0c0;
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #555;
  font-size: 14px;
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
