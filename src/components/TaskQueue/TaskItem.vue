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
        class="app-btn app-btn--icon task-action"
        :title="t('page.home.pauseTask')"
      >
        <AppIcon name="pause" :size="14" />
      </button>
      <button 
        v-if="task.status === TaskStatus.Paused"
        @click="$emit('resume', task.id)"
        class="app-btn app-btn--icon task-action"
        :title="t('common.resume')"
      >
        <AppIcon name="play" :size="14" />
      </button>
      <button 
        v-if="task.status === TaskStatus.Processing || task.status === TaskStatus.Paused"
        @click="$emit('stop', task.id)"
        class="app-btn app-btn--icon task-action task-action--danger"
        :title="t('common.stop')"
      >
        <AppIcon name="stop" :size="14" />
      </button>
      <button 
        v-if="canRemove"
        @click="$emit('remove', task.id)"
        class="app-btn app-btn--icon task-action task-action--danger"
        :title="t('common.remove')"
      >
        <AppIcon name="close" :size="14" />
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
import AppIcon from '@/components/AppIcon/AppIcon.vue';

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
    padding: 0.85rem 0.95rem;
    margin-bottom: 0.5rem;
    border-radius: 6px;
    background: var(--bg-color2, #242424);
    border: 1px solid var(--border-color1, #333);
    transition: border-color 0.2s, background 0.2s;
}

.task-item:hover {
    background: var(--hover-bg, #2a2a2a);
    border-color: var(--active-color, #9acd32);
}

.task-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.task-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color1, #e0e0e0);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-right: 1rem;
}

.task-status {
    font-size: 0.75rem;
    color: var(--text-color2, #999);
    border: 1px solid var(--border-color1, #333);
    border-radius: 999px;
    padding: 2px 8px;
    background: var(--bg-color1, #181818);
    white-space: nowrap;
}

.task-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.task-action {
    width: 30px;
    height: 28px;
    padding: 0;
    font-size: 0.85rem;
}

.task-action--danger:hover {
    background: var(--error-color, #e74c3c);
    border-color: var(--error-color, #e74c3c);
}

.status-pending {
    border-left: 3px solid var(--warning-color, #f39c12);
}

.status-processing {
    border-left: 3px solid var(--success-color, #27ae60);
}

.status-paused {
    border-left: 3px solid var(--info-color, #3498db);
}

.status-completed {
    border-left: 3px solid var(--success-color, #27ae60);
    opacity: 0.7;
}

.status-stopped {
    border-left: 3px solid var(--text-color2, #808080);
    opacity: 0.7;
}

.status-error {
    border-left: 3px solid var(--error-color, #e74c3c);
}
</style>
