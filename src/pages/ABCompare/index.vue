<template>
  <div class="ab-page">
    <header class="ab-header">
      <h2>{{ t('page.abCompare.title') }}</h2>
      <p>{{ t('page.abCompare.subtitle') }}</p>
    </header>

    <section class="ab-setup">
      <div class="ab-field">
        <label>{{ t('page.abCompare.selectFile') }}</label>
        <div class="ab-field-row">
          <input
            v-model="inputFile"
            class="app-input--compact"
            :placeholder="t('page.abCompare.chooseFile')"
          />
          <button class="app-btn" @click="chooseFile">
            <AppIcon name="folder-open" :size="16" />
          </button>
        </div>
      </div>
      <div class="ab-field">
        <label>{{ t('page.abCompare.presetA') }}</label>
        <select v-model="presetAId" class="app-select">
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
      </div>
      <div class="ab-field">
        <label>{{ t('page.abCompare.presetB') }}</label>
        <select v-model="presetBId" class="app-select">
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
      </div>
      <button class="app-btn app-btn--primary" :disabled="!inputFile" @click="enqueueBoth">
        <AppIcon name="compare" :size="16" /> {{ t('page.abCompare.enqueueBoth') }}
      </button>
    </section>

    <p v-if="toast" class="ab-toast">{{ toast }}</p>
    <p v-if="!inputFile" class="ab-empty-hint" data-testid="ab-empty">
      {{ t('page.abCompare.emptyHint') }}
    </p>

    <section class="ab-section">
      <h3>{{ t('page.abCompare.diffs') }} ({{ diffs.length }})</h3>
      <table v-if="diffs.length > 0" class="ab-table">
        <thead>
          <tr>
            <th>{{ t('page.abCompare.columnPath') }}</th>
            <th>{{ t('page.abCompare.columnA') }}</th>
            <th>{{ t('page.abCompare.columnB') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="diff in diffs" :key="diff.path">
            <td>{{ diff.path }}</td>
            <td>{{ display(diff.left) }}</td>
            <td>{{ display(diff.right) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="ab-muted">{{ t('page.abCompare.noDiffs') }}</p>
    </section>

    <section class="ab-section">
      <h3>{{ t('page.abCompare.results') }}</h3>
      <button class="app-btn" :disabled="!outputA || !outputB" @click="refreshResults">
        <AppIcon name="refresh" :size="16" /> {{ t('page.abCompare.refreshResults') }}
      </button>
      <p v-if="!outputA || !outputB" class="ab-muted">{{ t('page.abCompare.unavailable') }}</p>
      <div v-else class="ab-results">
        <div class="ab-result">
          <strong>{{ t('page.abCompare.resultA') }}</strong>
          <span>{{ formatBytes(sizeA) }} · {{ durationA }} ms</span>
          <span v-if="verdict.smaller === 'a'" class="ab-badge">{{
            t('page.abCompare.smaller')
          }}</span>
          <span v-if="verdict.faster === 'a'" class="ab-badge">{{
            t('page.abCompare.faster')
          }}</span>
        </div>
        <div class="ab-result">
          <strong>{{ t('page.abCompare.resultB') }}</strong>
          <span>{{ formatBytes(sizeB) }} · {{ durationB }} ms</span>
          <span v-if="verdict.smaller === 'b'" class="ab-badge">{{
            t('page.abCompare.smaller')
          }}</span>
          <span v-if="verdict.faster === 'b'" class="ab-badge">{{
            t('page.abCompare.faster')
          }}</span>
        </div>
        <span v-if="verdict.smaller === 'tie'" class="ab-muted">{{ t('page.abCompare.tie') }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { usePresetStore } from '@/store/presetStore'
import { useTaskStore } from '@/store/taskStore'
import { buildABPlan, compareABResults, diffPresets, type ABVerdict } from '@/config/abCompare'
import { useSettingsStore } from '@/store/settingsStore'
import { formatBytes } from '@/utils/progressFormat'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const { t } = useI18n()
const presetStore = usePresetStore()
const taskStore = useTaskStore()
// R1-7：输出目录设置唯一决策值，A/B 入队时统一注入。
const settingsStore = useSettingsStore()

const inputFile = ref('')
const presetAId = ref('')
const presetBId = ref('')
const outputA = ref('')
const outputB = ref('')
const sizeA = ref<number | null>(null)
const sizeB = ref<number | null>(null)
const durationA = ref<number | null>(null)
const durationB = ref<number | null>(null)
const toast = ref('')
const verdict = ref<ABVerdict>({ smaller: null, faster: null })

const presets = computed(() => presetStore.presets)
const presetA = computed(
  () => presets.value.find((p) => p.id === presetAId.value) || presetStore.currentPreset,
)
const presetB = computed(
  () => presets.value.find((p) => p.id === presetBId.value) || presetStore.currentPreset,
)
const diffs = computed(() => diffPresets(presetA.value, presetB.value))

function display(value: unknown): string {
  if (value === null || value === undefined) return '--'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function chooseFile() {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ multiple: false })
  if (selected && typeof selected === 'string') inputFile.value = selected
}

async function enqueueBoth() {
  if (!inputFile.value) return
  // R3.5：两套草稿由唯一 A/B 计划层生成，页面不自行拼命令。
  const plan = buildABPlan(
    inputFile.value,
    presetA.value,
    presetB.value,
    settingsStore.taskOutputDir,
  )
  await taskStore.addTask(plan.a, false)
  await taskStore.addTask(plan.b, false)
  outputA.value = plan.a.outputFile
  outputB.value = plan.b.outputFile
  toast.value = t('page.abCompare.enqueueSuccess')
}

function durationOf(outputFile: string): number | null {
  const task = taskStore.tasks.find((item) => item.outputFile === outputFile)
  if (!task?.startedAt || !task?.completedAt) return null
  const ms = task.completedAt.getTime() - task.startedAt.getTime()
  return Number.isFinite(ms) && ms >= 0 ? ms : null
}

async function refreshResults() {
  try {
    const sizes = await invoke<Array<number | null>>('get_file_sizes', {
      paths: [outputA.value, outputB.value],
    })
    sizeA.value = Array.isArray(sizes) && typeof sizes[0] === 'number' ? sizes[0] : null
    sizeB.value = Array.isArray(sizes) && typeof sizes[1] === 'number' ? sizes[1] : null
  } catch {
    sizeA.value = null
    sizeB.value = null
  }
  durationA.value = durationOf(outputA.value)
  durationB.value = durationOf(outputB.value)
  verdict.value = compareABResults(
    { sizeBytes: sizeA.value, durationMs: durationA.value },
    { sizeBytes: sizeB.value, durationMs: durationB.value },
  )
}

onMounted(async () => {
  try {
    await presetStore.loadPresets()
    const first = presets.value[0]
    if (first) {
      presetAId.value = first.id
      presetBId.value = presets.value[1]?.id || first.id
    }
  } catch {
    // 预设不可用时退化为当前预设，页面仍可展示差异表。
  }
})
</script>

<style scoped>
.ab-page {
  height: 100%;
  overflow: auto;
  padding: var(--sp-5, 24px);
  background: var(--color-bg, #181818);
  color: var(--color-text, #e0e0e0);
}
.ab-header h2 {
  margin: 0 0 4px;
  font-size: var(--fs-xl, 25px);
}
.ab-header p {
  margin: 0 0 var(--sp-4, 16px);
  color: var(--color-muted, #999);
  font-size: var(--fs-s, 13px);
}
.ab-setup {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  background: var(--color-surface, #242424);
}
.ab-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}
.ab-field label {
  font-size: var(--fs-2xs, 11px);
  color: var(--color-muted, #999);
}
.ab-field-row {
  display: flex;
  gap: 6px;
}
.ab-toast {
  color: var(--color-ok, #3fb96a);
  font-size: var(--fs-xs, 12px);
}
.ab-empty-hint,
.ab-muted {
  color: var(--color-muted, #999);
  font-size: var(--fs-xs, 12px);
}
.ab-section {
  margin-top: var(--sp-4, 16px);
  padding: 16px;
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  background: var(--color-surface, #242424);
}
.ab-section h3 {
  margin: 0 0 12px;
  font-size: var(--fs-m, 16px);
}
.ab-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-xs, 12px);
}
.ab-table th,
.ab-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border, #333);
  text-align: left;
  word-break: break-all;
}
.ab-results {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.ab-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  min-width: 180px;
  border: 1px solid var(--color-border, #333);
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}
.ab-badge {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--color-ok, #3fb96a);
  border: 1px solid var(--color-ok, #3fb96a);
  font-size: var(--fs-2xs, 11px);
}
</style>
