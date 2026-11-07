<template>
  <div
    class="task-item"
    :class="[statusClass, { 'is-selected': selected }]"
    tabindex="0"
    @click="emit('select', task.id)"
    @keydown.enter.prevent="onSelectByKeyboard"
    @keydown.space.prevent="onSelectByKeyboard"
  >
    <div class="task-info">
      <div class="task-name">
        {{ fileName }}
      </div>
      <div class="task-status">
        <AppIcon :name="statusIcon" :size="12" />
        {{ statusText }}
      </div>
    </div>

    <TaskProgress v-if="task.status === TaskStatus.Processing" :progress="task.progress" />

    <!-- R3.8 监视墙：等宽数字，按 MONITOR_THROTTLE_MS 节流采样，不做逐帧动效。 -->
    <div v-if="showMonitor" class="monitor-line" data-testid="monitor-line">
      <span v-for="cell in monitorCells" :key="cell.key" class="monitor-cell">
        <small>{{ monitorLabel(cell.key) }}</small> {{ cell.value }}
      </span>
    </div>

    <div class="task-actions">
      <button
        v-if="canRetryTask"
        class="app-btn app-btn--icon task-action"
        data-testid="retry-task"
        :title="t('page.queue.retry')"
        @click.stop="$emit('retry', task.id)"
      >
        <AppIcon name="refresh" :size="14" />
      </button>
      <button
        v-if="task.status === TaskStatus.Processing"
        class="app-btn app-btn--icon task-action"
        :title="t('page.home.pauseTask')"
        @click.stop="$emit('pause', task.id)"
      >
        <AppIcon name="pause" :size="14" />
      </button>
      <button
        v-if="task.status === TaskStatus.Paused"
        class="app-btn app-btn--icon task-action"
        :title="t('common.resume')"
        @click.stop="$emit('resume', task.id)"
      >
        <AppIcon name="play" :size="14" />
      </button>
      <button
        v-if="task.status === TaskStatus.Processing || task.status === TaskStatus.Paused"
        class="app-btn app-btn--icon task-action task-action--danger"
        :title="t('common.stop')"
        @click.stop="$emit('stop', task.id)"
      >
        <AppIcon name="stop" :size="14" />
      </button>
      <button
        v-if="canRemove"
        class="app-btn app-btn--icon task-action task-action--danger"
        :title="t('common.remove')"
        @click.stop="$emit('remove', task.id)"
      >
        <AppIcon name="close" :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Task } from '@/types/task'
import { TaskStatus } from '@/types/task'
import { getFileName } from '@/utils/pathUtils'
// R3.8 / R3.6：等宽监视数字与重试策略都取自唯一纯函数层。
import { buildMonitorCells, MONITOR_THROTTLE_MS, type MonitorCell } from '@/config/taskMonitor'
import { canRetry } from '@/config/taskRetry'
import TaskProgress from './TaskProgress.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    task: Task
    selected?: boolean
  }>(),
  {
    selected: false,
  },
)

const emit = defineEmits<{
  select: [taskId: string]
  pause: [taskId: string]
  resume: [taskId: string]
  stop: [taskId: string]
  remove: [taskId: string]
  retry: [taskId: string]
}>()

const { t } = useI18n()

// R1-2：键盘选中时忽略从按钮冒泡上来的 keydown，避免一次操作触发两次。
function onSelectByKeyboard(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  emit('select', props.task.id)
}

const fileName = computed(() => getFileName(props.task.inputFile))

const monitorCells = ref<MonitorCell[]>(buildMonitorCells(props.task.progress))
let monitorTimer: number | undefined
const showMonitor = computed(
  () => props.task.status === TaskStatus.Processing || props.task.status === TaskStatus.Paused,
)
const canRetryTask = computed(() => canRetry(props.task))

function monitorLabel(key: string): string {
  return t(`page.queue.monitor${key.charAt(0).toUpperCase()}${key.slice(1)}`)
}

onMounted(() => {
  monitorTimer = window.setInterval(() => {
    monitorCells.value = buildMonitorCells(props.task.progress)
  }, MONITOR_THROTTLE_MS)
})
onUnmounted(() => {
  if (monitorTimer !== undefined) window.clearInterval(monitorTimer)
})

const statusClass = computed(() => {
  switch (props.task.status) {
    case TaskStatus.Pending:
      return 'status-pending'
    case TaskStatus.Processing:
      return 'status-processing'
    case TaskStatus.Paused:
      return 'status-paused'
    case TaskStatus.Completed:
      return 'status-completed'
    case TaskStatus.Stopped:
      return 'status-stopped'
    case TaskStatus.Error:
      return 'status-error'
    default:
      return ''
  }
})

const statusText = computed(() => {
  switch (props.task.status) {
    case TaskStatus.Pending:
      return t('page.queue.idle')
    case TaskStatus.Processing:
      return t('task.status.running')
    case TaskStatus.Paused:
      return t('task.status.paused')
    case TaskStatus.Completed:
      return t('task.status.completed')
    case TaskStatus.Stopped:
      return t('task.status.cancelled')
    case TaskStatus.Error:
      return `${t('common.error')}: ${props.task.error || t('common.info')}`
    default:
      return t('common.info')
  }
})

const canRemove = computed(() => {
  return props.task.status !== TaskStatus.Processing
})

// 状态表达 = 色条 + 图标 + 文字三重编码（UI/UX 规范 §6，不单靠颜色）。
const statusIcon = computed(() => {
  switch (props.task.status) {
    case TaskStatus.Processing:
      return 'play'
    case TaskStatus.Paused:
      return 'pause'
    case TaskStatus.Completed:
      return 'check'
    case TaskStatus.Stopped:
      return 'stop'
    case TaskStatus.Error:
      return 'error'
    default:
      return 'info'
  }
})
</script>

<style scoped>
.task-item {
  padding: 0.85rem 0.95rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #333);
  transition:
    border-color 0.2s,
    background 0.2s;
  cursor: pointer;
}

.task-item:hover {
  background: var(--hover-bg, #2a2a2a);
  border-color: var(--active-color, #9acd32);
}

/* R1-2：选中态是键盘/工具栏操作的前提，必须与悬停态可区分。 */
.task-item.is-selected {
  background: var(--hover-bg, #2a2a2a);
  border-color: var(--active-color, #9acd32);
  box-shadow: inset 3px 0 0 var(--active-color, #9acd32);
}

.task-item:focus-visible {
  outline: 2px solid var(--active-color, #9acd32);
  outline-offset: 1px;
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

.monitor-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.25rem 0 0.5rem;
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
  font-size: 0.75rem;
  color: var(--color-muted, var(--text-color2, #999));
}

.monitor-cell small {
  color: var(--color-muted, var(--text-color2, #808080));
  margin-right: 0.25rem;
}

.task-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-error {
  border-left: 3px solid var(--error-color, #e74c3c);
}
</style>
