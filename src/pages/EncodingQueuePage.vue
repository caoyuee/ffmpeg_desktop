<template>
  <div class="encoding-queue-page">
    <div class="toolbar">
      <button class="toolbar-btn" @click="startAll" title="开始全部">
        <span class="icon">▶</span> 开始
      </button>
      <button class="toolbar-btn" @click="pauseAll" title="暂停全部">
        <span class="icon">⏸</span> 暂停
      </button>
      <button class="toolbar-btn" @click="stopAll" title="停止全部">
        <span class="icon">⏹</span> 停止
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="removeSelected" title="移除选中">
        <span class="icon">🗑</span> 移除
      </button>
      <button class="toolbar-btn" @click="resetSelected" title="重置选中">
        <span class="icon">↺</span> 重置
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="moveUp" title="上移 (F3)">
        <span class="icon">↑</span>
      </button>
      <button class="toolbar-btn" @click="moveDown" title="下移 (F4)">
        <span class="icon">↓</span>
      </button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-btn" @click="selectAll" title="全选 (Ctrl+A)">
        全选
      </button>
      <button class="toolbar-btn" @click="invertSelection" title="反选 (Alt+A)">
        反选
      </button>
    </div>

    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">状态:</span>
        <span class="status-value">{{ overallStatus }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">进度:</span>
        <span class="status-value">{{ overallProgress }}%</span>
      </div>
      <div class="status-item">
        <span class="status-label">效率:</span>
        <span class="status-value">{{ efficiency }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">输出大小:</span>
        <span class="status-value">{{ totalOutputSize }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">预计剩余:</span>
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
            <option value="all">最新输出 (不含进度)</option>
            <option value="error">仅错误信息</option>
          </select>
          <button class="copy-btn" @click="copyOutput">复制</button>
          <label class="auto-scroll-label">
            <input type="checkbox" v-model="autoScroll" />
            强制滚动到最后
          </label>
          <button class="close-btn" @click="showOutputPanel = false">✕</button>
        </div>
        <div class="output-content" ref="outputRef">
          <pre>{{ outputLog }}</pre>
        </div>
      </div>
    </div>

    <div class="toggle-output-btn" @click="showOutputPanel = !showOutputPanel">
      {{ showOutputPanel ? '隐藏输出' : '显示输出' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TaskQueue from '@/components/TaskQueue/TaskQueue.vue';
import { useTaskStore } from '@/store/taskStore';

const taskStore = useTaskStore();

const tasks = computed(() => taskStore.tasks);
const showOutputPanel = ref(false);
const outputType = ref('all');
const autoScroll = ref(true);
const outputRef = ref<HTMLElement | null>(null);

const outputLog = computed(() => {
  const currentTask = tasks.value.find(t => t.status === 'processing');
  return currentTask?.output || '暂无输出';
});

const overallStatus = computed(() => {
  const processing = tasks.value.filter(t => t.status === 'processing').length;
  const pending = tasks.value.filter(t => t.status === 'pending').length;
  const completed = tasks.value.filter(t => t.status === 'completed').length;
  if (processing > 0) return `处理中 (${processing})`;
  if (pending > 0) return `等待中 (${pending})`;
  if (completed > 0) return `已完成 (${completed})`;
  return '空闲';
});

const overallProgress = computed(() => {
  if (tasks.value.length === 0) return 0;
  const total = tasks.value.reduce((sum, t) => sum + (t.progress || 0), 0);
  return Math.round(total / tasks.value.length);
});

const efficiency = computed(() => {
  const currentTask = tasks.value.find(t => t.status === 'processing');
  return currentTask?.speed || '--';
});

const totalOutputSize = computed(() => {
  const completed = tasks.value.filter(t => t.status === 'completed' && t.outputSize);
  const total = completed.reduce((sum, t) => sum + (t.outputSize || 0), 0);
  if (total > 1024 * 1024 * 1024) {
    return (total / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  } else if (total > 1024 * 1024) {
    return (total / (1024 * 1024)).toFixed(2) + ' MB';
  }
  return (total / 1024).toFixed(2) + ' KB';
});

const estimatedTime = computed(() => {
  const processing = tasks.value.filter(t => t.status === 'processing');
  if (processing.length === 0) return '--';
  return processing[0].estimatedTime || '--';
});

function startAll() {
  taskStore.startAll();
}

function pauseAll() {
  taskStore.pauseAll();
}

function stopAll() {
  taskStore.stopAll();
}

function removeSelected() {
  taskStore.removeSelected();
}

function resetSelected() {
  taskStore.resetSelected();
}

function moveUp() {
  taskStore.moveSelectedUp();
}

function moveDown() {
  taskStore.moveSelectedDown();
}

function selectAll() {
  taskStore.selectAll();
}

function invertSelection() {
  taskStore.invertSelection();
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
  taskStore.toggleSelection(id);
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
  background: var(--bg-color3, #303030);
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
