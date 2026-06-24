<template>
  <div class="task-item" :class="statusClass">
    <div class="task-info">
      <div class="task-name">
        {{ fileName }}
      </div>
      <div class="task-status">
        {{ statusText }}
      </div>
    </div>
    
    <TaskProgress 
      v-if="task.status === TaskStatus.Processing"
      :progress="task.progress"
    />
    
    <div class="task-actions">
      <button 
        v-if="task.status === TaskStatus.Processing"
        @click="$emit('pause', task.id)"
        class="btn-action"
        :title="t('page.home.pauseTask')"
      >
        ⏸
      </button>
      <button 
        v-if="task.status === TaskStatus.Paused"
        @click="$emit('resume', task.id)"
        class="btn-action"
        :title="t('common.resume')"
      >
        ▶
      </button>
      <button 
        v-if="task.status === TaskStatus.Processing || task.status === TaskStatus.Paused"
        @click="$emit('stop', task.id)"
        class="btn-action btn-stop"
        :title="t('common.stop')"
      >
        ⏹
      </button>
      <button 
        v-if="canRemove"
        @click="$emit('remove', task.id)"
        class="btn-action btn-remove"
        :title="t('common.remove')"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Task } from '@/types/task';
import { TaskStatus } from '@/types/task';
import TaskProgress from './TaskProgress.vue';

const props = defineProps<{
  task: Task;
}>();

const { t } = useI18n();

defineEmits<{
  pause: [taskId: string];
  resume: [taskId: string];
  stop: [taskId: string];
  remove: [taskId: string];
}>();

const fileName = computed(() => {
  const parts = props.task.inputFile.split(/[/\\]/);
  return parts[parts.length - 1];
});

const statusClass = computed(() => {
  switch (props.task.status) {
    case TaskStatus.Pending:
      return 'status-pending';
    case TaskStatus.Processing:
      return 'status-processing';
    case TaskStatus.Paused:
      return 'status-paused';
    case TaskStatus.Completed:
      return 'status-completed';
    case TaskStatus.Stopped:
      return 'status-stopped';
    case TaskStatus.Error:
      return 'status-error';
    default:
      return '';
  }
});

const statusText = computed(() => {
  switch (props.task.status) {
    case TaskStatus.Pending:
      return t('page.queue.idle');
    case TaskStatus.Processing:
      return t('task.status.running');
    case TaskStatus.Paused:
      return t('task.status.paused');
    case TaskStatus.Completed:
      return t('task.status.completed');
    case TaskStatus.Stopped:
      return t('task.status.cancelled');
    case TaskStatus.Error:
      return `${t('common.error')}: ${props.task.error || t('common.info')}`;
    default:
      return t('common.info');
  }
});

const canRemove = computed(() => {
  return props.task.status !== TaskStatus.Processing;
});
</script>

<style scoped>
.task-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    background: var(--bg-color1, #2a2a2a);
    border: 1px solid var(--border-color1, #333);
    transition: all 0.2s;
}

.task-item:hover {
    border-color: var(--border-color2, #555);
}

.task-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.task-name {
    font-size: 0.9rem;
    color: var(--text-color1, #e0e0e0);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 1rem;
}

.task-status {
    font-size: 0.8rem;
    color: var(--text-color2, #999);
}

.task-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.btn-action {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border-color1, #333);
    background: var(--bg-color2, #1e1e1e);
    color: var(--text-color1, #e0e0e0);
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
}

.btn-action:hover {
    background: var(--bg-color3, #3a3a3a);
}

.btn-stop:hover {
    background: #dc3545;
    border-color: #dc3545;
}

.btn-remove:hover {
    background: #dc3545;
    border-color: #dc3545;
}

.status-pending {
    border-left: 3px solid #ffc107;
}

.status-processing {
    border-left: 3px solid #28a745;
}

.status-paused {
    border-left: 3px solid #17a2b8;
}

.status-completed {
    border-left: 3px solid #28a745;
    opacity: 0.7;
}

.status-stopped {
    border-left: 3px solid #6c757d;
    opacity: 0.7;
}

.status-error {
    border-left: 3px solid #dc3545;
}
</style>
