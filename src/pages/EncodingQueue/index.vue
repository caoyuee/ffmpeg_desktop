<template>
  <div class="encoding-queue-page">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import TaskQueue from '@/components/TaskQueue/TaskQueue.vue';
import { useTaskStore } from '@/store/taskStore';
import { TaskStatus } from '@/types/task';

const { t } = useI18n();
const taskStore = useTaskStore();

const tasks = computed(() => taskStore.tasks);
const showOutputPanel = ref(false);
const outputType = ref('all');
const autoScroll = ref(true);
const outputRef = ref<HTMLElement | null>(null);

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
  return processing[0].progress?.remainingTime || '--';
});

function startAll() {
  taskStore.processingTasks.forEach(t => taskStore.startTask(t.id));
}

function pauseAll() {
  taskStore.processingTasks.forEach(t => taskStore.pauseTask(t.id));
}

function stopAll() {
  taskStore.processingTasks.forEach(t => taskStore.stopTask(t.id));
}

function removeSelected() {
  console.log('removeSelected');
}

function resetSelected() {
  console.log('resetSelected');
}

function moveUp() {
  console.log('moveUp');
}

function moveDown() {
  console.log('moveDown');
}

function selectAll() {
  console.log('selectAll');
}

function invertSelection() {
  console.log('invertSelection');
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
}

function selectTask(id: string) {
  console.log('selectTask:', id);
}

function copyOutput() {
  navigator.clipboard.writeText(outputLog.value);
}
</script>

<style scoped>
.encoding-queue-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color1, #181818);
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
</style>
