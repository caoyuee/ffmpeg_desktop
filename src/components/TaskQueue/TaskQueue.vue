<template>
  <div class="task-queue">
    <div class="queue-header">
      <h3>{{ t('page.queue.title') }} ({{ taskStore.tasks.length }})</h3>
      <div class="queue-actions">
        <button 
          @click="clearCompleted" 
          :disabled="!hasCompletedTasks"
          class="app-btn"
        >
          <AppIcon name="trash" :size="15" />
          {{ t('page.queue.clearCompleted') }}
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
        <AppIcon name="queue" :size="48" class="empty-icon" />
        <p>{{ t('page.queue.empty') }}</p>
        <small>{{ t('page.prepare.dragHint') }}</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTaskStore } from '@/store/taskStore';
import TaskItem from './TaskItem.vue';
import { TaskStatus } from '@/types/task';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

const { t } = useI18n();
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
  background: var(--bg-color1, #181818);
}

.queue-header {
  min-height: 48px;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color1, #333);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-color2, #242424);
}

.queue-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-color1, #e0e0e0);
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color2, #999);
  text-align: center;
}

.empty-icon {
  color: var(--text-color2, #808080);
  margin-bottom: 0.5rem;
}

.empty-tip p {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.empty-tip small {
  font-size: 0.85rem;
}
</style>
