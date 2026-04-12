<template>
  <div class="task-queue">
    <div class="queue-header">
      <h3>编码队列 ({{ taskStore.tasks.length }})</h3>
      <div class="queue-actions">
        <button 
          @click="clearCompleted" 
          :disabled="!hasCompletedTasks"
          class="btn-clear"
        >
          清空已完成
        </button>
      </div>
    </div>
    
    <div class="task-list">
      <TaskItem
        v-for="task in taskStore.tasks"
        :key="task.id"
        :task="task"
        @pause="handlePause"
        @resume="handleResume"
        @stop="handleStop"
        @remove="handleRemove"
      />
      
      <div v-if="taskStore.tasks.length === 0" class="empty-tip">
        <p>暂无任务</p>
        <small>拖拽文件到此处添加任务</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTaskStore } from '@/store/taskStore';
import TaskItem from './TaskItem.vue';
import { TaskStatus } from '@/types/task';

const taskStore = useTaskStore();

const hasCompletedTasks = computed(() => 
  taskStore.tasks.some(t => t.status === TaskStatus.Completed || t.status === TaskStatus.Stopped)
);

function handlePause(taskId: string) {
  taskStore.pauseTask(taskId);
}

function handleResume(taskId: string) {
  taskStore.resumeTask(taskId);
}

function handleStop(taskId: string) {
  taskStore.stopTask(taskId);
}

function handleRemove(taskId: string) {
  taskStore.removeTask(taskId);
}

function clearCompleted() {
  taskStore.clearCompletedTasks();
}
</script>

<style scoped>
.task-queue {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color2, #1e1e1e);
  border-left: 1px solid var(--border-color1, #333);
}

.queue-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color1, #333);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.queue-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-color1, #e0e0e0);
}

.queue-actions button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color1, #333);
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.queue-actions button:hover:not(:disabled) {
  background: var(--bg-color3, #3a3a3a);
}

.queue-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color2, #999);
}

.empty-tip p {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.empty-tip small {
  font-size: 0.85rem;
}
</style>
