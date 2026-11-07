<template>
  <div class="history-page" data-testid="history-page">
    <div class="history-toolbar">
      <div class="history-heading">
        <h3>{{ t('page.history.title') }}</h3>
        <span>{{ t('page.history.subtitle') }}</span>
      </div>

      <div class="history-actions">
        <select v-model="outcome" class="app-select" data-testid="history-filter-outcome">
          <option value="all">{{ t('page.history.all') }}</option>
          <option value="completed">{{ t('page.history.completed') }}</option>
          <option value="failed">{{ t('page.history.failed') }}</option>
          <option value="stopped">{{ t('page.history.stopped') }}</option>
        </select>
        <input
          v-model="query"
          type="text"
          class="app-input--compact history-search"
          :placeholder="t('page.history.searchPlaceholder')"
          data-testid="history-search"
        />
        <select v-model="sortKey" class="app-select" data-testid="history-sort">
          <option value="completedAt">{{ t('page.history.sortCompletedAt') }}</option>
          <option value="durationMs">{{ t('page.history.sortDuration') }}</option>
          <option value="inputFile">{{ t('page.history.sortInputFile') }}</option>
        </select>
        <button class="app-btn" data-testid="history-refresh-sizes" @click="refreshSizes">
          <AppIcon name="refresh" :size="15" /> {{ t('page.history.refreshSizes') }}
        </button>
        <button class="app-btn" data-testid="history-copy-csv" @click="copy('csv')">
          <AppIcon name="export" :size="15" /> {{ t('page.history.copyCsv') }}
        </button>
        <button class="app-btn" data-testid="history-copy-json" @click="copy('json')">
          <AppIcon name="export" :size="15" /> {{ t('page.history.copyJson') }}
        </button>
        <button
          class="app-btn app-btn--danger"
          data-testid="history-clear"
          @click="showClearConfirm = true"
        >
          <AppIcon name="trash" :size="15" /> {{ t('page.history.clearHistory') }}
        </button>
      </div>
    </div>

    <div class="history-stats">
      <div class="stat-card" data-testid="stat-total">
        <span class="stat-label">{{ t('page.history.totalTasks') }}</span>
        <strong class="stat-value">{{ summary.total }}</strong>
      </div>
      <div class="stat-card" data-testid="stat-success-rate">
        <span class="stat-label">{{ t('page.history.successRate') }}</span>
        <strong class="stat-value">{{ summary.successRate.toFixed(1) }}%</strong>
      </div>
      <div class="stat-card" data-testid="stat-completed">
        <span class="stat-label">{{ t('page.history.completed') }}</span>
        <strong class="stat-value">{{ summary.completed }}</strong>
      </div>
      <div class="stat-card" data-testid="stat-failed">
        <span class="stat-label">{{ t('page.history.failed') }}</span>
        <strong class="stat-value">{{ summary.failed }}</strong>
      </div>
      <div class="stat-card" data-testid="stat-stopped">
        <span class="stat-label">{{ t('page.history.stopped') }}</span>
        <strong class="stat-value">{{ summary.stopped }}</strong>
      </div>
      <div class="stat-card" data-testid="stat-total-duration">
        <span class="stat-label">{{ t('page.history.totalDuration') }}</span>
        <strong class="stat-value">{{ durationText(summary.totalDurationMs) }}</strong>
      </div>
      <div class="stat-card" data-testid="stat-avg-duration">
        <span class="stat-label">{{ t('page.history.avgDuration') }}</span>
        <strong class="stat-value">{{ durationText(summary.averageDurationMs) }}</strong>
      </div>
      <div class="stat-card" data-testid="stat-longest-duration">
        <span class="stat-label">{{ t('page.history.longestDuration') }}</span>
        <strong class="stat-value">{{ durationText(summary.longestDurationMs) }}</strong>
      </div>
    </div>

    <div class="history-table-wrap">
      <table v-if="visible.length > 0" class="history-table">
        <thead>
          <tr>
            <th>{{ t('page.history.columnInput') }}</th>
            <th>{{ t('page.history.columnOutput') }}</th>
            <th>{{ t('page.history.columnStatus') }}</th>
            <th>{{ t('page.history.columnDuration') }}</th>
            <th>{{ t('page.history.columnCompletedAt') }}</th>
            <th>{{ t('page.history.columnCompression') }}</th>
            <th>{{ t('page.history.columnSaved') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visible" :key="row.id" data-testid="history-row" :data-task-id="row.id">
            <td class="file-cell" :title="row.inputFile">{{ row.inputFile }}</td>
            <td class="file-cell" :title="row.outputFile">{{ row.outputFile }}</td>
            <td>
              <span :class="['outcome', `outcome--${row.outcome}`]">{{
                outcomeLabel(row.outcome)
              }}</span>
            </td>
            <td>{{ row.durationMs === null ? '--' : durationText(row.durationMs) }}</td>
            <td>{{ completedText(row.completedAt) }}</td>
            <td>{{ compressionText(row.id) }}</td>
            <td>{{ savedText(row.id) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="history-empty" data-testid="history-empty">
        {{ t('page.history.empty') }}
      </div>
    </div>

    <div v-if="toast" class="history-toast" data-testid="history-toast">{{ toast }}</div>

    <ConfirmDialog
      v-model="showClearConfirm"
      :title="t('page.history.clearConfirmTitle')"
      :message="t('page.history.clearConfirmMessage')"
      @confirm="confirmClear"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { useTaskStore } from '@/store/taskStore'
import { useSettingsStore } from '@/store/settingsStore'
import {
  buildTaskHistory,
  summarizeHistory,
  filterHistory,
  filterHistoryByRetention,
  sortHistory,
  rankByCompression,
  exportHistory,
  type HistoryOutcome,
  type HistorySortKey,
} from '@/config/taskHistory'
import { formatDuration, formatBytes } from '@/utils/progressFormat'

const { t } = useI18n()
const taskStore = useTaskStore()
// P1-2：logRetentionDays 消费点——历史页按保留天数过滤展示（0 = 永久保留）。
const settingsStore = useSettingsStore()
const translate = (key: string): string => String(t(key))

const outcome = ref<HistoryOutcome | 'all'>('all')
const query = ref('')
const sortKey = ref<HistorySortKey>('completedAt')
// 体积是按需查询的磁盘事实，只存在内存里，不写入队列快照 schema。
const sizeTable = ref<Record<string, number | null>>({})
const showClearConfirm = ref(false)
const toast = ref('')

// 唯一数据源是 R2.5 恢复出来的 taskStore.tasks；页面不保存第二份历史状态。
const history = computed(() =>
  filterHistoryByRetention(
    buildTaskHistory(taskStore.tasks),
    settingsStore.settings.logRetentionDays,
  ),
)
const summary = computed(() => summarizeHistory(history.value))
const visible = computed(() =>
  sortHistory(
    filterHistory(history.value, { outcome: outcome.value, query: query.value }),
    sortKey.value,
    sortKey.value === 'inputFile' ? 'asc' : 'desc',
  ),
)
const compressionById = computed(
  () => new Map(rankByCompression(visible.value, sizeTable.value).map((row) => [row.id, row])),
)

function durationText(ms: number): string {
  return formatDuration(ms / 1000, translate)
}

function completedText(iso: string | null): string {
  return iso ? iso.replace('T', ' ').replace(/\.\d{3}Z$/, '') : '--'
}

function outcomeLabel(value: HistoryOutcome): string {
  if (value === 'completed') return t('task.status.completed')
  if (value === 'failed') return t('task.status.failed')
  return t('task.status.cancelled')
}

function compressionText(id: string): string {
  const row = compressionById.value.get(id)
  if (!row || row.inputBytes === null || row.outputBytes === null) {
    return t('page.history.sizeUnavailable')
  }
  return `${formatBytes(row.inputBytes)} → ${formatBytes(row.outputBytes)}`
}

function savedText(id: string): string {
  const row = compressionById.value.get(id)
  return row?.savedPercent === null || row?.savedPercent === undefined
    ? '--'
    : `${row.savedPercent.toFixed(1)}%`
}

async function refreshSizes() {
  const paths = Array.from(
    new Set(
      history.value
        .flatMap((row) => [row.inputFile, row.outputFile])
        .filter((path): path is string => Boolean(path)),
    ),
  ).slice(0, 400)
  if (paths.length === 0) {
    sizeTable.value = {}
    return
  }

  try {
    const sizes = await invoke<Array<number | null>>('get_file_sizes', { paths })
    const table: Record<string, number | null> = {}
    if (Array.isArray(sizes)) {
      paths.forEach((path, index) => {
        table[path] = sizes[index] ?? null
      })
    }
    sizeTable.value = table
  } catch {
    // 文件可能已被删除或移动；体积不可用不影响历史与统计展示。
    sizeTable.value = {}
  }
}

async function copy(format: 'csv' | 'json') {
  const text = exportHistory(visible.value, format)
  try {
    const clipboard = navigator.clipboard
    if (!clipboard || typeof clipboard.writeText !== 'function')
      throw new Error('clipboard unavailable')
    await clipboard.writeText(text)
    toast.value = t('page.history.copySuccess')
  } catch {
    toast.value = t('page.history.copyFailed')
  }
}

function confirmClear() {
  const removed = taskStore.clearHistory()
  showClearConfirm.value = false
  sizeTable.value = {}
  toast.value = `${t('page.history.clearSuccess')} (${removed})`
}
</script>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-color1, #181818);
}

.history-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color1, #333);
}

.history-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: auto;
}

.history-heading h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text-color1, #e0e0e0);
}

.history-heading span {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.history-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.app-select,
.history-search {
  padding: 5px 8px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #444);
  border-radius: 4px;
  color: var(--text-color1, #e0e0e0);
  font-size: 12px;
}

.history-search {
  width: 200px;
}

.history-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1px;
  background: var(--border-color1, #333);
  border-bottom: 1px solid var(--border-color1, #333);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 62px;
  padding: 10px 14px;
  background: var(--bg-color2, #242424);
}

.stat-label {
  font-size: 12px;
  color: var(--text-color2, #808080);
}

.stat-value {
  font-size: 17px;
  font-family: monospace;
  color: var(--text-color1, #d0d0d0);
}

.history-table-wrap {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.history-table th,
.history-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border-color1, #2c2c2c);
  color: var(--text-color2, #a0a0a0);
  white-space: nowrap;
}

.history-table th {
  position: sticky;
  top: 0;
  background: var(--bg-color2, #242424);
  color: var(--text-color1, #d0d0d0);
  font-weight: 600;
}

.file-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.outcome {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.outcome--completed {
  color: #9acd32;
  background: rgba(154, 205, 50, 0.12);
}

.outcome--failed {
  color: #e57373;
  background: rgba(229, 115, 115, 0.12);
}

.outcome--stopped {
  color: #bdbdbd;
  background: rgba(189, 189, 189, 0.12);
}

.history-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-color2, #808080);
  font-size: 13px;
}

.history-toast {
  position: absolute;
  right: 18px;
  bottom: 18px;
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--bg-color2, #242424);
  border: 1px solid var(--border-color1, #444);
  color: var(--text-color1, #e0e0e0);
  font-size: 12px;
}
</style>
