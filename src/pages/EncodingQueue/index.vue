<template>
  <div
    class="encoding-queue-page"
    :class="{ 'drag-over': isDragOver }"
    @dragover.prevent="onHtmlDragOver"
  >
    <div class="app-toolbar queue-toolbar">
      <div class="app-toolbar__group">
        <button
          class="app-btn app-btn--primary"
          :title="t('page.queue.startAll')"
          @click="startAll"
        >
          <AppIcon name="play" :size="16" class="icon" /> {{ t('page.queue.startQueue') }}
        </button>
        <button class="app-btn" :title="t('common.pause')" @click="pauseAll">
          <AppIcon name="pause" :size="16" class="icon" /> {{ t('common.pause') }}
        </button>
        <button class="app-btn app-btn--danger" :title="t('page.queue.stopAll')" @click="stopAll">
          <AppIcon name="stop" :size="16" class="icon" /> {{ t('common.stop') }}
        </button>
      </div>
      <div class="app-toolbar__divider"></div>
      <div class="app-toolbar__group">
        <button class="app-btn" :title="t('common.remove')" @click="removeSelected">
          <AppIcon name="trash" :size="16" class="icon" /> {{ t('common.remove') }}
        </button>
        <button class="app-btn" :title="t('common.reset')" @click="removeFailedAndStopped">
          <AppIcon name="reset" :size="16" class="icon" /> {{ t('common.reset') }}
        </button>
      </div>
      <div class="app-toolbar__divider"></div>
      <div class="app-toolbar__group">
        <button class="app-btn app-btn--icon" title="F3" @click="moveUp">
          <AppIcon name="arrow-up" :size="16" class="icon" />
        </button>
        <button class="app-btn app-btn--icon" title="F4" @click="moveDown">
          <AppIcon name="arrow-down" :size="16" class="icon" />
        </button>
      </div>
      <div class="app-toolbar__divider"></div>
      <div class="app-toolbar__group">
        <button class="app-btn" title="Ctrl+A" @click="selectAll">
          {{ t('stream.selectAll') }}
        </button>
        <button class="app-btn" title="Alt+A" @click="invertSelection">
          {{ t('stream.deselectAll') }}
        </button>
      </div>
      <div class="app-toolbar__spacer"></div>
      <span class="concurrency-badge">
        {{
          t('page.queue.concurrency', {
            running: taskStore.runningCount,
            max: taskStore.maxConcurrent,
          })
        }}
      </span>
      <div class="stdin-group">
        <input
          v-model="stdinInput"
          type="text"
          :placeholder="t('page.queue.stdinPlaceholder')"
          class="app-input--compact stdin-input"
          @keyup.enter="sendStdin"
        />
        <button class="app-btn" :disabled="!stdinInput" @click="sendStdin">
          {{ t('common.send') }}
        </button>
      </div>
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
        <TaskQueue :tasks="tasks" :selected-ids="selectedTaskIds" @select="selectTask" />
        <!-- R3.8 空态：一句话 + 一个主动作，回到管道起点。 -->
        <div v-if="tasks.length === 0" class="queue-empty" data-testid="queue-empty">
          <AppIcon name="queue" :size="48" />
          <p>{{ t('page.queue.emptyHint') }}</p>
          <button class="app-btn app-btn--primary" @click="goToWorkbench">
            {{ t('page.queue.goToWorkbench') }}
          </button>
        </div>
      </div>

      <div v-if="showOutputPanel" class="output-panel">
        <div class="output-header">
          <select v-model="outputType" class="output-type-select">
            <option value="all">{{ t('page.queue.latestOutput') }}</option>
            <option value="error">{{ t('page.queue.errorOnly') }}</option>
          </select>
          <button class="app-btn copy-btn" @click="copyOutput">{{ t('page.queue.copy') }}</button>
          <label class="auto-scroll-label">
            <input v-model="autoScroll" type="checkbox" />
            {{ t('page.queue.forceScroll') }}
          </label>
          <button class="app-btn app-btn--icon close-btn" @click="showOutputPanel = false">
            <AppIcon name="close" :size="14" />
          </button>
        </div>
        <div ref="outputRef" class="output-content">
          <pre>{{ outputLog }}</pre>
        </div>
      </div>
    </div>

    <div class="app-btn toggle-output-btn" @click="showOutputPanel = !showOutputPanel">
      {{ showOutputPanel ? t('page.queue.hideOutput') : t('page.queue.showOutput') }}
    </div>

    <div v-if="isDragOver" class="drag-hint">
      <span v-if="isModifierHeld">{{ t('page.queue.dragToIndependentPanel') }}</span>
      <span v-else>{{ t('page.queue.dragToQueueHint') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import type { UnlistenFn } from '@tauri-apps/api/event'
import TaskQueue from '@/components/TaskQueue/TaskQueue.vue'
import { useTaskStore } from '@/store/taskStore'
import { usePresetStore } from '@/store/presetStore'
import { createTaskDraft } from '@/config/taskDraft'
import { useSettingsStore } from '@/store/settingsStore'
import { selectTaskLogs } from '@/utils/taskLogs'
import { TaskStatus } from '@/types/task'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const { t } = useI18n()
const router = useRouter()
const taskStore = useTaskStore()
// R1-7：输出目录设置唯一决策值，拖拽入队时统一注入。
const settingsStore = useSettingsStore()

const tasks = computed(() => taskStore.tasks)
const showOutputPanel = ref(false)
const outputType = ref('all')
const autoScroll = ref(true)
const stdinInput = ref('')
const outputRef = ref<HTMLElement | null>(null)
const selectedTaskIds = ref<Set<string>>(new Set())
const isDragOver = ref(false)
const isModifierHeld = ref(false)

let dragDropUnlisten: UnlistenFn | null = null

// R1-6：按 outputType 过滤，后端 ffmpeg-log 已转发全量 stderr 行。
const outputLog = computed(() => {
  const currentTask = tasks.value.find(
    (t) => t.status === TaskStatus.Processing || t.status === TaskStatus.Paused,
  )
  const lines = selectTaskLogs(currentTask?.logs, outputType.value)
  return lines.length > 0 ? lines.join('\n') : t('page.queue.noOutput')
})

// P2-4：autoScroll 真正生效——日志更新且开关打开时滚动到底部。
watch(outputLog, async () => {
  if (!autoScroll.value) return
  await nextTick()
  const el = outputRef.value
  if (el) el.scrollTop = el.scrollHeight
})

const overallStatus = computed(() => {
  const processing = tasks.value.filter((t) => t.status === TaskStatus.Processing).length
  const pending = tasks.value.filter((t) => t.status === TaskStatus.Pending).length
  const completed = tasks.value.filter((t) => t.status === TaskStatus.Completed).length
  if (processing > 0) return `${t('task.status.running')} (${processing})`
  if (pending > 0) return `${t('task.status.pending')} (${pending})`
  if (completed > 0) return `${t('task.status.completed')} (${completed})`
  return t('page.queue.idle')
})

const overallProgress = computed(() => {
  if (tasks.value.length === 0) return 0
  const total = tasks.value.reduce((sum, t) => sum + (t.progress?.percentage || 0), 0)
  return Math.round(total / tasks.value.length)
})

const efficiency = computed(() => {
  const currentTask = tasks.value.find((t) => t.status === TaskStatus.Processing)
  return currentTask?.progress?.speed || '--'
})

const totalOutputSize = computed(() => {
  const completed = tasks.value.filter(
    (t) => t.status === TaskStatus.Completed && t.progress?.estimatedSize,
  )
  const total = completed.reduce((sum, t) => sum + (t.progress?.estimatedSize || 0), 0)
  if (total > 1024 * 1024 * 1024) {
    return (total / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  } else if (total > 1024 * 1024) {
    return (total / (1024 * 1024)).toFixed(2) + ' MB'
  }
  return (total / 1024).toFixed(2) + ' KB'
})

const estimatedTime = computed(() => {
  const processing = tasks.value.filter((t) => t.status === TaskStatus.Processing)
  if (processing.length === 0) return '--'
  return processing[0]?.progress?.remainingTime || '--'
})

function goToWorkbench() {
  void router.push('/workbench')
}

async function startAll() {
  // R1-3：统一走 store 的并发闸门，不再逐个 startTask 绕过 maxConcurrent。
  await taskStore.tryStartNext()
}

function pauseAll() {
  taskStore.processingTasks.forEach((t) => taskStore.pauseTask(t.id))
}

function stopAll() {
  taskStore.processingTasks.forEach((t) => taskStore.stopTask(t.id))
}

function removeSelected() {
  if (selectedTaskIds.value.size === 0) return
  selectedTaskIds.value.forEach((id) => {
    const task = tasks.value.find((t) => t.id === id)
    if (task && task.status !== TaskStatus.Processing) {
      taskStore.removeTask(id)
    }
  })
  selectedTaskIds.value.clear()
}

// P2-4：命名治理——本函数移除失败/停止任务，不重置选中态；Esc 键清空选中请用 clearSelection。
function removeFailedAndStopped() {
  selectedTaskIds.value.forEach((id) => {
    const task = tasks.value.find((t) => t.id === id)
    if (task && (task.status === TaskStatus.Error || task.status === TaskStatus.Stopped)) {
      taskStore.removeTask(id)
    }
  })
  selectedTaskIds.value.clear()
}

function moveUp() {
  const selectedArray = Array.from(selectedTaskIds.value)
  if (selectedArray.length === 0) return

  const taskIds = tasks.value.map((t) => t.id)
  for (const selectedId of selectedArray) {
    const index = taskIds.indexOf(selectedId)
    if (index > 0 && taskIds[index] && taskIds[index - 1]) {
      const temp = taskIds[index]!
      taskIds[index] = taskIds[index - 1]!
      taskIds[index - 1] = temp
    }
  }
  taskStore.reorderTasks(taskIds)
}

function moveDown() {
  const selectedArray = Array.from(selectedTaskIds.value)
  if (selectedArray.length === 0) return

  const taskIds = tasks.value.map((t) => t.id)
  for (let i = selectedArray.length - 1; i >= 0; i--) {
    const selectedId = selectedArray[i]
    if (!selectedId) continue
    const index = taskIds.indexOf(selectedId)
    if (index < taskIds.length - 1 && taskIds[index] && taskIds[index + 1]) {
      const temp = taskIds[index]!
      taskIds[index] = taskIds[index + 1]!
      taskIds[index + 1] = temp
    }
  }
  taskStore.reorderTasks(taskIds)
}

function selectAll() {
  tasks.value.forEach((t) => selectedTaskIds.value.add(t.id))
}

function invertSelection() {
  tasks.value.forEach((t) => {
    if (selectedTaskIds.value.has(t.id)) {
      selectedTaskIds.value.delete(t.id)
    } else {
      selectedTaskIds.value.add(t.id)
    }
  })
}

async function sendStdin() {
  const input = stdinInput.value
  if (!input) return
  const processingTask = tasks.value.find((t) => t.status === TaskStatus.Processing)
  if (!processingTask) return
  try {
    await invoke('send_ffmpeg_stdin', { taskId: processingTask.id, input: input + '\n' })
  } catch (error) {
    console.error(t('page.queue.sendStdinFailed'), error)
  }
  stdinInput.value = ''
}

function selectTask(id: string) {
  if (selectedTaskIds.value.has(id)) {
    selectedTaskIds.value.delete(id)
  } else {
    selectedTaskIds.value.add(id)
  }
}

function copyOutput() {
  navigator.clipboard.writeText(outputLog.value)
}

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
    return

  if (event.key === 'Enter') {
    event.preventDefault()
    const selectedIds = Array.from(selectedTaskIds.value)
    selectedIds.forEach((id) => {
      const task = tasks.value.find((t) => t.id === id)
      if (
        task &&
        (task.status === TaskStatus.Pending ||
          task.status === TaskStatus.Paused ||
          task.status === TaskStatus.Error ||
          task.status === TaskStatus.Stopped)
      ) {
        taskStore.startTask(id)
      }
    })
  } else if (event.key === ' ') {
    event.preventDefault()
    const selectedIds = Array.from(selectedTaskIds.value)
    selectedIds.forEach((id) => {
      const task = tasks.value.find((t) => t.id === id)
      if (task) {
        if (task.status === TaskStatus.Processing) {
          taskStore.pauseTask(id)
        } else if (task.status === TaskStatus.Paused) {
          taskStore.startTask(id)
        }
      }
    })
  } else if (event.key === 'a' && event.ctrlKey) {
    event.preventDefault()
    selectAll()
  } else if (event.key === 'a' && event.altKey) {
    event.preventDefault()
    invertSelection()
  } else if (event.key === 'Delete') {
    event.preventDefault()
    removeSelected()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    selectedTaskIds.value.clear()
  } else if (event.key === 'End') {
    event.preventDefault()
    const selectedIds = Array.from(selectedTaskIds.value)
    selectedIds.forEach((id) => {
      const task = tasks.value.find((t) => t.id === id)
      if (task && task.status === TaskStatus.Processing) {
        taskStore.stopTask(id)
      }
    })
  } else if (event.key === 'F3') {
    event.preventDefault()
    moveUp()
  } else if (event.key === 'F4') {
    event.preventDefault()
    moveDown()
  }
}

function onHtmlDragOver(event: DragEvent) {
  isModifierHeld.value = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeyDown)

  const presetStore = usePresetStore()

  dragDropUnlisten = await getCurrentWebviewWindow().onDragDropEvent((event) => {
    if (event.payload.type === 'over') {
      isDragOver.value = true
    } else if (event.payload.type === 'leave') {
      isDragOver.value = false
    } else if (event.payload.type === 'drop') {
      isDragOver.value = false
      const files = event.payload.paths
      if (files.length > 0) {
        if (isModifierHeld.value) {
          invoke('open_independent_panel', { files })
        } else {
          const preset = presetStore.currentPreset
          files.forEach((path: string) => {
            // R3：与 PrepareFiles / 监控 / A-B / CLI 共用唯一任务草稿层。
            taskStore.addTask(
              createTaskDraft(preset, path, undefined, settingsStore.taskOutputDir),
              false,
            )
          })
        }
      }
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  dragDropUnlisten?.()
})
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

.concurrency-badge {
  padding: 4px 10px;
  border: 1px solid var(--color-border, #444);
  border-radius: 999px;
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-xs, 12px);
  color: var(--color-muted, #999);
  white-space: nowrap;
}

.queue-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3, 12px);
  height: 100%;
  color: var(--color-muted, #999);
  text-align: center;
}

.stdin-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-bar {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 1px;
  background: var(--border-color1, #333);
  border-bottom: 1px solid var(--border-color1, #333);
}

.status-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 58px;
  padding: 10px 14px;
  background: var(--bg-color2, #242424);
}

.status-label {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.status-value {
  font-size: 15px;
  color: var(--text-color1, #c0c0c0);
  font-family: monospace;
  font-weight: 600;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.task-list-container {
  flex: 1;
  overflow: auto;
  padding: 14px;
  background: var(--bg-color1, #181818);
}

.output-panel {
  width: min(420px, 36vw);
  background: var(--bg-color2, #242424);
  border-left: 1px solid var(--border-color1, #333);
  display: flex;
  flex-direction: column;
}

.output-header {
  display: flex;
  align-items: center;
  min-height: 48px;
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
  font-size: 12px;
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
  font-size: 12px;
}

.stdin-input {
  width: 220px;
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
