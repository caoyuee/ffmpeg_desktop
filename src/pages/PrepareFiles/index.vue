<template>
  <div class="prepare-files-page">
    <div class="toolbar">
      <button class="toolbar-btn" @click="addFiles">
        <span class="icon">📁</span> {{ t('page.prepare.addFiles') }}
      </button>
      <button class="toolbar-btn" @click="addFolder">
        <span class="icon">📂</span> {{ t('page.prepare.addFolder') }}
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="sortFiles">
        <span class="icon">↕️</span> {{ t('common.sort') }}
      </button>
      <button class="toolbar-btn" @click="removeSelected">
        <span class="icon">🗑</span> {{ t('common.remove') }}
      </button>
    </div>

    <div class="file-list-container">
      <div v-if="files.length === 0" class="empty-state">
        <div class="empty-icon">📄</div>
        <p>{{ t('page.prepare.dragHint') }}</p>
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
            <span class="checkbox-mark" :class="{ checked: selectedFiles.includes(index) }"></span>
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
        {{ t('page.prepare.selectedCount', { count: selectedFiles.length, total: files.length }) }}
      </div>
      <button class="add-to-queue-btn" @click="addToQueue" :disabled="selectedFiles.length === 0">
        {{ t('page.prepare.addToQueue') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTaskStore } from '@/store/taskStore';
import { usePresetStore } from '@/store/presetStore';
import { useFileListStore } from '@/store/fileListStore';
import { FFmpegCommandBuilder } from '@/utils/commandBuilder';
import { generateOutputPath } from '@/hooks/useFormatters';

const { t } = useI18n();
const router = useRouter();
const taskStore = useTaskStore();
const presetStore = usePresetStore();
const fileListStore = useFileListStore();

const { files, selectedIndices: selectedFiles } = storeToRefs(fileListStore);

async function addFiles() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: true,
    filters: [
      { name: t('page.prepare.videoFiles'), extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'wmv', 'm4v'] },
      { name: t('common.allFiles'), extensions: ['*'] },
    ],
  });

  if (selected) {
    const newFiles = Array.isArray(selected) ? selected : [selected];
    fileListStore.addFiles(newFiles);
  }
}

async function addFolder() {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({ directory: true });

  if (selected && typeof selected === 'string') {
    fileListStore.addFiles([selected]);
  }
}

function sortFiles() {
  fileListStore.sortByName();
}

function removeSelected() {
  fileListStore.removeSelected();
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
    const last = selectedFiles.value[selectedFiles.value.length - 1] ?? 0;
    const start = Math.min(last ?? 0, index);
    const end = Math.max(last ?? 0, index);
    for (let i = start; i <= end; i++) {
      if (!selectedFiles.value.includes(i)) {
        selectedFiles.value.push(i);
      }
    }
  } else {
    if (selectedFiles.value.length === 1 && selectedFiles.value[0] === index) {
      selectedFiles.value = [];
    } else {
      selectedFiles.value = [index];
    }
  }
}

function removeFile(index: number) {
  fileListStore.removeFile(index);
}

function previewFile(file: string) {
  console.log('Preview:', file);
}

function getFileName(path: string) {
  return path.split('/').pop() || path;
}

function addToQueue() {
  const selectedPaths = selectedFiles.value.map(i => files.value[i]);
  const preset = presetStore.currentPreset;

  selectedPaths.forEach(path => {
    const outputFile = generateOutputPath(path!, preset.output);
    const commandLine = FFmpegCommandBuilder.build(
      { ...preset },
      path!,
      outputFile,
    );

    taskStore.addTask({
      inputFile: path!,
      outputFile,
      commandLine,
      presetId: preset?.id,
      cpuAffinity: preset?.decode.cpuAffinity || undefined,
      preserveFileTimes: {
        creation: preset.output.naming.preserveCreationTime,
        modification: preset.output.naming.preserveModifyTime,
        access: preset.output.naming.preserveAccessTime,
      },
    }, false);
  });

  fileListStore.clear();
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
  display: flex;
  align-items: center;
}

.checkbox-mark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color1, #555);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.checkbox-mark.checked {
  background: var(--active-color, #9acd32);
  border-color: var(--active-color, #9acd32);
}

.checkbox-mark.checked::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0;
  width: 6px;
  height: 10px;
  border: solid #181818;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
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
