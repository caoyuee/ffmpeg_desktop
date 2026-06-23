<template>
  <div
    class="encoding-queue-page"
    :class="{ 'drag-over': isDragOver }"
    @dragover.prevent="onHtmlDragOver"
  >
    <div class="toolbar">
      <button class="toolbar-btn" @click="startAll" :title="t('page.queue.startAll')">
        <span class="icon">▶</span> {{ t('common.start') }}
      </button>
      <button class="toolbar-btn" @click="pauseAll" :title="t('common.pause')">
        <span class="icon">⏸</span> {{ t('common.pause') }}
      </button>
      <button class="toolbar-btn" @click="stopAll" :title="t('page.queue.stopAll')">
        <span class="icon">⏹</span> {{ t('common.stop') }}
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="removeSelected" :title="t('common.remove')">
        <span class="icon">🗑</span> {{ t('common.remove') }}
      </button>
      <button class="toolbar-btn" @click="resetSelected" :title="t('common.reset')">
        <span class="icon">↺</span> {{ t('common.reset') }}
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="moveUp" title="F3">
        <span class="icon">↑</span>
      </button>
      <button class="toolbar-btn" @click="moveDown" title="F4">
        <span class="icon">↓</span>
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="selectAll" title="Ctrl+A">
        {{ t('stream.selectAll') }}
      </button>
      <button class="toolbar-btn" @click="invertSelection" title="Alt+A">
        {{ t('stream.deselectAll') }}
      </button>
      <div class="toolbar-divider"></div>
      <input
        type="text"
        v-model="stdinInput"
        :placeholder="t('page.queue.stdinPlaceholder')"
        class="stdin-input"
        @keyup.enter="sendStdin"
      />
      <button class="toolbar-btn" @click="sendStdin" :disabled="!stdinInput">
        {{ t('common.send') }}
      </button>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">{{ t('task.status.running') }}:</span>
        <span class="status-value">{{ overallStatus }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">{{ t('task.progress') }}:</span>
        <span class="status-value">{{ overallProgress }}%</span>
      </div>
      <div class="status-item">
        <span class="status-label">{{ t('task.speed') }}:</span>
        <span class="status-value">{{ efficiency }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">{{ t('page.queue.outputSize') }}:</span>
        <span class="status-value">{{ totalOutputSize }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">{{ t('task.eta') }}:</span>
        <span class="status-value">{{ estimatedTime }}</span>
      </div>
    </div>

    <div class="main-content">
      <div class="task-list-container">
        <TaskQueue
          :tasks="tasks"
          @start="startTask"
          @pause="pauseTask"
          @stop="stopTask"
          @remove="removeTask"
          @select="selectTask"
        />
      </div>

      <div v-if="showOutputPanel" class="output-panel">
        <div class="output-header">
          <select v-model="outputType" class="output-type-select">
            <option value="all">{{ t('page.queue.latestOutput') }}</option>
            <option value="error">{{ t('page.queue.errorOnly') }}</option>
          </select>
          <button class="copy-btn" @click="copyOutput">{{ t('page.queue.copy') }}</button>
          <label class="auto-scroll-label">
            <input type="checkbox" v-model="autoScroll" />
            {{ t('page.queue.forceScroll') }}
          </label>
          <button class="close-btn" @click="showOutputPanel = false">✕</button>
        </div>
        <div class="output-content" ref="outputRef">
          <pre>{{ outputLog }}</pre>
        </div>
      </div>
    </div>

    <div class="toggle-output-btn" @click="showOutputPanel = !showOutputPanel">
      {{ showOutputPanel ? t('page.queue.hideOutput') : t('page.queue.showOutput') }}
    </div>

    <div v-if="isDragOver" class="drag-hint">
      <span v-if="isModifierHeld">{{ t('page.queue.dragToIndependentPanel') }}</span>
      <span v-else>{{ t('page.queue.dragToQueueHint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { UnlistenFn } from '@tauri-apps/api/event';
import TaskQueue from '@/components/TaskQueue/TaskQueue.vue';
import { useTaskStore } from '@/store/taskStore';
import { usePresetStore } from '@/store/presetStore';
import { FFmpegCommandBuilder } from '@/utils/commandBuilder';
import { generateOutputPath } from '@/hooks/useFormatters';
import { TaskStatus } from '@/types/task';

const { t } = useI18n();
const taskStore = useTaskStore();

const tasks = computed(() => taskStore.tasks);
const showOutputPanel = ref(false);
const outputType = ref('all');
const autoScroll = ref(true);
const stdinInput = ref('');
const outputRef = ref<HTMLElement | null>(null);
const selectedTaskIds = ref<Set<string>>(new Set());
const isDragOver = ref(false);
const isModifierHeld = ref(false);

let dragDropUnlisten: UnlistenFn | null = null;

const outputLog = computed(() => {
  const currentTask = tasks.value.find(t => t.status === TaskStatus.Processing);
  return currentTask?.logs.all.join('\n') || t('page.queue.noOutput');
});

const overallStatus = computed(() => {
  const processing = tasks.value.filter(t => t.status === TaskStatus.Processing).length;
  const pending = tasks.value.filter(t => t.status === TaskStatus.Pending).length;
  const completed = tasks.value.filter(t => t.status === TaskStatus.Completed).length;
  if (processing > 0) return `${t('task.status.running')} (${processing})`;
  if (pending > 0) return `${t('task.status.pending')} (${pending})`;
  if (completed > 0) return `${t('task.status.completed')} (${completed})`;
  return t('page.queue.idle');
});

const overallProgress = computed(() => {
  if (tasks.value.length === 0) return 0;
  const total = tasks.value.reduce((sum, t) => sum + (t.progress?.percentage || 0), 0);
  return Math.round(total / tasks.value.length);
});

const efficiency = computed(() => {
  const currentTask = tasks.value.find(t => t.status === TaskStatus.Processing);
  return currentTask?.progress?.speed || '--';
});

const totalOutputSize = computed(() => {
  const completed = tasks.value.filter(t => t.status === TaskStatus.Completed && t.progress?.estimatedSize);
  const total = completed.reduce((sum, t) => sum + (t.progress?.estimatedSize || 0), 0);
  if (total > 1024 * 1024 * 1024) {
    return (total / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  } else if (total > 1024 * 1024) {
    return (total / (1024 * 1024)).toFixed(2) + ' MB';
  }
  return (total / 1024).toFixed(2) + ' KB';
});

const estimatedTime = computed(() => {
  const processing = tasks.value.filter(t => t.status === TaskStatus.Processing);
  if (processing.length === 0) return '--';
  return processing[0]?.progress?.remainingTime || '--';
});

function startAll() {
  taskStore.pendingTasks.forEach(t => taskStore.startTask(t.id));
}

function pauseAll() {
  taskStore.processingTasks.forEach(t => taskStore.pauseTask(t.id));
}

function stopAll() {
  taskStore.processingTasks.forEach(t => taskStore.stopTask(t.id));
}

function removeSelected() {
  if (selectedTaskIds.value.size === 0) return;
  selectedTaskIds.value.forEach(id => {
    const task = tasks.value.find(t => t.id === id);
    if (task && task.status !== TaskStatus.Processing) {
      taskStore.removeTask(id);
    }
  });
  selectedTaskIds.value.clear();
}

function resetSelected() {
  selectedTaskIds.value.forEach(id => {
    const task = tasks.value.find(t => t.id === id);
    if (task && (task.status === TaskStatus.Error || task.status === TaskStatus.Stopped)) {
      taskStore.removeTask(id);
    }
  });
  selectedTaskIds.value.clear();
}

function moveUp() {
  const selectedArray = Array.from(selectedTaskIds.value);
  if (selectedArray.length === 0) return;
  
  const taskIds = tasks.value.map(t => t.id);
  for (const selectedId of selectedArray) {
    const index = taskIds.indexOf(selectedId);
    if (index > 0 && taskIds[index] && taskIds[index - 1]) {
      const temp = taskIds[index]!;
      taskIds[index] = taskIds[index - 1]!;
      taskIds[index - 1] = temp;
    }
  }
  taskStore.reorderTasks(taskIds);
}

function moveDown() {
  const selectedArray = Array.from(selectedTaskIds.value);
  if (selectedArray.length === 0) return;
  
  const taskIds = tasks.value.map(t => t.id);
  for (let i = selectedArray.length - 1; i >= 0; i--) {
    const selectedId = selectedArray[i];
    if (!selectedId) continue;
    const index = taskIds.indexOf(selectedId);
    if (index < taskIds.length - 1 && taskIds[index] && taskIds[index + 1]) {
      const temp = taskIds[index]!;
      taskIds[index] = taskIds[index + 1]!;
      taskIds[index + 1] = temp;
    }
  }
  taskStore.reorderTasks(taskIds);
}

function selectAll() {
  tasks.value.forEach(t => selectedTaskIds.value.add(t.id));
}

function invertSelection() {
  tasks.value.forEach(t => {
    if (selectedTaskIds.value.has(t.id)) {
      selectedTaskIds.value.delete(t.id);
    } else {
      selectedTaskIds.value.add(t.id);
    }
  });
}

async function sendStdin() {
  const input = stdinInput.value;
  if (!input) return;
  const processingTask = tasks.value.find(t => t.status === 1);
  if (!processingTask) return;
  try {
    await invoke('send_ffmpeg_stdin', { taskId: processingTask.id, input: input + '\n' });
  } catch (error) {
    console.error(t('page.queue.sendStdinFailed'), error);
  }
  stdinInput.value = '';
}

function startTask(id: string) {
  taskStore.startTask(id);
}

function pauseTask(id: string) {
  taskStore.pauseTask(id);
}

function stopTask(id: string) {
  taskStore.stopTask(id);
}

function removeTask(id: string) {
  taskStore.removeTask(id);
  selectedTaskIds.value.delete(id);
}

function selectTask(id: string) {
  if (selectedTaskIds.value.has(id)) {
    selectedTaskIds.value.delete(id);
  } else {
    selectedTaskIds.value.add(id);
  }
}

function copyOutput() {
  navigator.clipboard.writeText(outputLog.value);
}

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

  if (event.key === 'Enter') {
    event.preventDefault();
    const selectedIds = Array.from(selectedTaskIds.value);
    selectedIds.forEach(id => {
      const task = tasks.value.find(t => t.id === id);
      if (task && (task.status === TaskStatus.Pending || task.status === TaskStatus.Paused || task.status === TaskStatus.Error || task.status === TaskStatus.Stopped)) {
        taskStore.startTask(id);
      }
    });
  } else if (event.key === ' ') {
    event.preventDefault();
    const selectedIds = Array.from(selectedTaskIds.value);
    selectedIds.forEach(id => {
      const task = tasks.value.find(t => t.id === id);
      if (task) {
        if (task.status === TaskStatus.Processing) {
          taskStore.pauseTask(id);
        } else if (task.status === TaskStatus.Paused) {
          taskStore.startTask(id);
        }
      }
    });
  } else if (event.key === 'a' && event.ctrlKey) {
    event.preventDefault();
    selectAll();
  } else if (event.key === 'a' && event.altKey) {
    event.preventDefault();
    invertSelection();
  } else if (event.key === 'Delete') {
    event.preventDefault();
    removeSelected();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    resetSelected();
  } else if (event.key === 'End') {
    event.preventDefault();
    const selectedIds = Array.from(selectedTaskIds.value);
    selectedIds.forEach(id => {
      const task = tasks.value.find(t => t.id === id);
      if (task && task.status === TaskStatus.Processing) {
        taskStore.stopTask(id);
      }
    });
  } else if (event.key === 'F3') {
    event.preventDefault();
    moveUp();
  } else if (event.key === 'F4') {
    event.preventDefault();
    moveDown();
  }
}

function onHtmlDragOver(event: DragEvent) {
  isModifierHeld.value = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeyDown);

  const presetStore = usePresetStore();

  dragDropUnlisten = await getCurrentWebviewWindow().onDragDropEvent((event) => {
    if (event.payload.type === 'over') {
      isDragOver.value = true;
    } else if (event.payload.type === 'leave') {
      isDragOver.value = false;
    } else if (event.payload.type === 'drop') {
      isDragOver.value = false;
      const files = event.payload.paths;
      if (files.length > 0) {
        if (isModifierHeld.value) {
          invoke('open_independent_panel', { files });
        } else {
          const preset = presetStore.currentPreset;
          files.forEach((path: string) => {
            const outputFile = generateOutputPath(path, preset.output);
            const commandLine = FFmpegCommandBuilder.build({ ...preset }, path, outputFile);
            taskStore.addTask({
              inputFile: path,
              outputFile,
              commandLine,
              presetId: preset.id || '',
              cpuAffinity: preset.decode.cpuAffinity || undefined,
              preserveFileTimes: {
                creation: preset.output.naming.preserveCreationTime,
                modification: preset.output.naming.preserveModifyTime,
                access: preset.output.naming.preserveAccessTime,
              },
            }, false);
          });
        }
      }
    }
  });
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  dragDropUnlisten?.();
});
</script>

<style scoped>
.encoding-queue-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color1, #181818);
  outline: 2px dashed transparent;
  outline-offset: -2px;
  transition: outline-color 0.2s;
}

.encoding-queue-page.drag-over {
  outline-color: var(--active-color, #9acd32);
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-color2, #242424);
  border-bottom: 1px solid var(--border-color1, #333);
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--bg-color3, #303030);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--hover-bg, #404040);
  border-color: var(--active-color, #9acd32);
}

.toolbar-btn .icon {
  font-size: 14px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color1, #444);
  margin: 0 8px;
}

.status-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-color3);
  border-bottom: 1px solid var(--border-color1, #333);
  gap: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-label {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.status-value {
  font-size: 12px;
  color: var(--text-color1, #c0c0c0);
  font-family: monospace;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.task-list-container {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.output-panel {
  width: 400px;
  background: var(--bg-color2, #242424);
  border-left: 1px solid var(--border-color1, #333);
  display: flex;
  flex-direction: column;
}

.output-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
  border-bottom: 1px solid var(--border-color1, #333);
}

.output-type-select {
  padding: 4px 8px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 12px;
}

.copy-btn {
  padding: 4px 12px;
  background: var(--bg-color3, #404040);
  border: 1px solid var(--border-color1, #555);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 12px;
  cursor: pointer;
}

.auto-scroll-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-color2, #808080);
  cursor: pointer;
}

.close-btn {
  margin-left: auto;
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: var(--text-color2, #808080);
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  color: var(--text-color1, #c0c0c0);
}

.output-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.output-content pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: var(--text-color2, #909090);
  white-space: pre-wrap;
  word-break: break-all;
}

.toggle-output-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 8px 16px;
  background: var(--bg-color3, #404040);
  border: 1px solid var(--border-color1, #555);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 12px;
  cursor: pointer;
}

.toggle-output-btn:hover {
  background: var(--hover-bg, #505050);
}

.stdin-input {
  width: 180px;
  padding: 4px 8px;
  background: var(--bg-color1, #181818);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #c0c0c0);
  font-size: 12px;
}

.drag-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-color2, #242424);
  color: var(--text-color1, #c0c0c0);
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 100;
  border: 1px solid var(--active-color, #9acd32);
  pointer-events: none;
}
</style>
