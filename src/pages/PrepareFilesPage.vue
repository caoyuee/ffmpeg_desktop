<template>
  <div class="prepare-files-page">
    <div class="toolbar">
      <button class="toolbar-btn" @click="addFiles">
        <span class="icon">📁</span> 添加文件
      </button>
      <button class="toolbar-btn" @click="addFolder">
        <span class="icon">📂</span> 添加文件夹
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="sortFiles">
        <span class="icon">↕️</span> 排序
      </button>
      <button class="toolbar-btn" @click="removeSelected">
        <span class="icon">🗑</span> 快速移除
      </button>
    </div>

    <div class="file-list-container">
      <div v-if="files.length === 0" class="empty-state">
        <div class="empty-icon">📄</div>
        <p>拖拽文件到此处或点击上方按钮添加</p>
      </div>
      <div v-else class="file-list">
        <div
          v-for="(file, index) in files"
          :key="index"
          :class="['file-item', { selected: selectedFiles.includes(index) }]"
          @click="toggleSelect(index, $event)"
          @dblclick="previewFile(file)"
        >
          <div class="file-checkbox">
            <input type="checkbox" :checked="selectedFiles.includes(index)" @click.stop />
          </div>
          <div class="file-icon">🎬</div>
          <div class="file-info">
            <div class="file-name">{{ getFileName(file) }}</div>
            <div class="file-path">{{ file }}</div>
          </div>
          <div class="file-actions">
            <button @click.stop="removeFile(index)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="file-count">
        已选择 {{ selectedFiles.length }} / {{ files.length }} 个文件
      </div>
      <button class="add-to-queue-btn" @click="addToQueue" :disabled="selectedFiles.length === 0">
        添加到编码队列
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore } from '@/store/taskStore';
import { usePresetStore } from '@/store/presetStore';

const router = useRouter();
const taskStore = useTaskStore();
const presetStore = usePresetStore();

const files = ref<string[]>([]);
const selectedFiles = ref<number[]>([]);

async function addFiles() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: true,
    filters: [
      { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'wmv', 'm4v'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });

  if (selected) {
    const newFiles = Array.isArray(selected) ? selected : [selected];
    files.value = [...files.value, ...newFiles];
  }
}

async function addFolder() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true });

  if (selected && typeof selected === 'string') {
    // TODO: 扫描目录中的视频文件
    files.value = [...files.value, selected];
  }
}

function sortFiles() {
  files.value.sort((a, b) => a.localeCompare(b));
}

function removeSelected() {
  const toRemove = new Set(selectedFiles.value);
  files.value = files.value.filter((_, index) => !toRemove.has(index));
  selectedFiles.value = [];
}

function toggleSelect(index: number, event: MouseEvent) {
  if (event.ctrlKey || event.metaKey) {
    const pos = selectedFiles.value.indexOf(index);
    if (pos === -1) {
      selectedFiles.value.push(index);
    } else {
      selectedFiles.value.splice(pos, 1);
    }
  } else if (event.shiftKey && selectedFiles.value.length > 0) {
    const last = selectedFiles.value[selectedFiles.value.length - 1];
    const start = Math.min(last, index);
    const end = Math.max(last, index);
    for (let i = start; i <= end; i++) {
      if (!selectedFiles.value.includes(i)) {
        selectedFiles.value.push(i);
      }
    }
  } else {
    selectedFiles.value = [index];
  }
}

function removeFile(index: number) {
  files.value.splice(index, 1);
  selectedFiles.value = selectedFiles.value.filter(i => i !== index);
}

function previewFile(file: string) {
  // TODO: 打开预览
  console.log('Preview:', file);
}

function getFileName(path: string) {
  return path.split('/').pop() || path;
}

function addToQueue() {
  const selectedPaths = selectedFiles.value.map(i => files.value[i]);
  selectedPaths.forEach(path => {
    taskStore.addTask({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      inputFile: path,
      outputFile: '',
      preset: presetStore.currentPreset,
      status: 'pending',
      progress: 0,
    });
  });

  // 清空列表并跳转到编码队列
  files.value = [];
  selectedFiles.value = [];
  router.push('/queue');
}
</script>

<style scoped>
.prepare-files-page {
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
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-color3, #303030);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 13px;
  cursor: pointer;
}

.toolbar-btn:hover {
  background: var(--hover-bg, #404040);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color1, #444);
  margin: 0 8px;
}

.file-list-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.empty-state {
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

.empty-state p {
  font-size: 14px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  cursor: pointer;
}

.file-item:hover {
  background: var(--hover-bg, #2a2a2a);
}

.file-item.selected {
  background: var(--selected-bg, #1a3a1a);
  border-color: var(--active-color, #9acd32);
}

.file-checkbox {
  margin-right: 12px;
}

.file-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.file-icon {
  font-size: 24px;
  margin-right: 12px;
}

.file-info {
  flex: 1;
  overflow: hidden;
}

.file-name {
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-path {
  font-size: 11px;
  color: var(--text-color2, #606060);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-actions button {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-color2, #808080);
  cursor: pointer;
  font-size: 14px;
}

.file-actions button:hover {
  color: var(--error-color, #e74c3c);
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-color2, #242424);
  border-top: 1px solid var(--border-color1, #333);
}

.file-count {
  font-size: 13px;
  color: var(--text-color2, #808080);
}

.add-to-queue-btn {
  padding: 10px 24px;
  background: var(--success-color, #27ae60);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.add-to-queue-btn:hover:not(:disabled) {
  background: var(--success-color-hover, #2ecc71);
}

.add-to-queue-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
