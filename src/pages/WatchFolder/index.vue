<template>
  <div class="watch-page">
    <header class="watch-header">
      <h2>{{ t('page.watch.title') }}</h2>
      <p>{{ t('page.watch.subtitle') }}</p>
    </header>

    <div class="watch-toolbar">
      <button class="app-btn app-btn--primary" @click="addRule">
        <AppIcon name="add" :size="16" /> {{ t('page.watch.addRule') }}
      </button>
      <button class="app-btn" @click="scanAll">
        <AppIcon name="refresh" :size="16" /> {{ t('page.watch.scanNow') }}
      </button>
      <span v-if="message" class="watch-message">{{ message }}</span>
    </div>

    <p class="watch-note">{{ t('page.watch.seedHint') }}</p>

    <div v-if="rules.length === 0" class="watch-empty" data-testid="watch-empty">
      <AppIcon name="watch" :size="48" />
      <p>{{ t('page.watch.empty') }}</p>
      <button class="app-btn app-btn--primary" @click="addRule">
        {{ t('page.watch.addRule') }}
      </button>
    </div>

    <div v-else class="watch-rule-list">
      <article
        v-for="rule in rules"
        :key="rule.id"
        class="watch-rule"
        :data-testid="`watch-rule-${rule.id}`"
      >
        <div class="rule-main">
          <strong class="rule-dir">{{ rule.directory }}</strong>
          <span class="rule-meta">
            {{ t('page.watch.preset') }}: {{ presetLabel(rule.presetId) }} ·
            {{ t('page.watch.interval') }}: {{ rule.intervalSec }}s ·
            {{ rule.extensions.join(', ') }}
          </span>
          <span v-if="lastScanAt" class="rule-meta">{{
            t('page.watch.lastScan', { time: lastScanAt })
          }}</span>
        </div>
        <div class="rule-actions">
          <span :class="['rule-status', runningIds.has(rule.id) ? 'on' : '']">
            {{
              runningIds.has(rule.id)
                ? t('page.watch.statusRunning')
                : t('page.watch.statusStopped')
            }}
          </span>
          <button class="app-btn" @click="toggleRunning(rule)">
            <AppIcon :name="runningIds.has(rule.id) ? 'stop' : 'play'" :size="14" />
            {{ runningIds.has(rule.id) ? t('page.watch.stop') : t('page.watch.start') }}
          </button>
          <button class="app-btn app-btn--danger" @click="removeRule(rule.id)">
            <AppIcon name="trash" :size="14" /> {{ t('page.watch.removeRule') }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { useSettingsStore } from '@/store/settingsStore'
import { usePresetStore } from '@/store/presetStore'
import { useTaskStore } from '@/store/taskStore'
import {
  MAX_WATCH_RULES,
  WATCH_MEDIA_EXTENSIONS,
  normalizeWatchRules,
  planWatchBatch,
  type WatchRule,
} from '@/config/watchFolder'
import { createTaskDraft } from '@/config/taskDraft'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const presetStore = usePresetStore()
const taskStore = useTaskStore()

const rules = computed(() => settingsStore.settings.watchRules)
const runningIds = ref<Set<string>>(new Set())
const timers = new Map<string, number>()
const message = ref('')
const lastScanAt = ref('')

function presetLabel(presetId: string): string {
  if (!presetId) return t('page.watch.currentPreset')
  return (
    presetStore.presets.find((preset) => preset.id === presetId)?.name ||
    t('page.watch.currentPreset')
  )
}

function persist(next: WatchRule[]) {
  settingsStore.update({ watchRules: normalizeWatchRules(next) })
}

async function addRule() {
  if (rules.value.length >= MAX_WATCH_RULES) {
    message.value = t('page.watch.ruleLimit', { max: MAX_WATCH_RULES })
    return
  }
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true })
  if (!selected || typeof selected !== 'string') {
    message.value = t('page.watch.invalidDirectory')
    return
  }
  const rule: WatchRule = {
    id: `watch_${Date.now().toString(36)}`,
    directory: selected,
    presetId: presetStore.currentPreset.id || '',
    intervalSec: 15,
    extensions: [...WATCH_MEDIA_EXTENSIONS],
    enabled: false,
    seenPaths: [],
  }
  persist([...rules.value, rule])
  message.value = ''
}

function removeRule(id: string) {
  stopRule(id)
  persist(rules.value.filter((rule) => rule.id !== id))
}

/** R3.3：唯一批量计划入口；Rust 只提供目录递归枚举，不认识预设与任务。 */
async function scanRule(rule: WatchRule): Promise<number> {
  let scanned: string[] = []
  try {
    const result = await invoke<string[]>('list_media_files', { dir: rule.directory })
    if (Array.isArray(result)) scanned = result
  } catch (error) {
    console.warn('[watch] scan failed:', error)
    message.value = t('page.watch.scanFailed')
    return 0
  }

  const { newPaths, nextSeen } = planWatchBatch(rule.seenPaths, scanned, rule.extensions)
  const preset =
    presetStore.presets.find((item) => item.id === rule.presetId) || presetStore.currentPreset
  for (const path of newPaths) {
    await taskStore.addTask(
      createTaskDraft(preset, path, undefined, settingsStore.taskOutputDir),
      false,
    )
  }
  persist(
    rules.value.map((item) => (item.id === rule.id ? { ...item, seenPaths: nextSeen } : item)),
  )
  lastScanAt.value = new Date().toLocaleTimeString()
  return newPaths.length
}

async function scanAll() {
  let added = 0
  for (const rule of rules.value) added += await scanRule(rule)
  message.value = t('page.watch.addedToQueue', { count: added })
}

function startRule(rule: WatchRule) {
  if (timers.has(rule.id)) return
  const timer = window.setInterval(
    () => {
      void scanRule(rule)
    },
    Math.max(1, rule.intervalSec) * 1000,
  )
  timers.set(rule.id, timer)
  runningIds.value = new Set([...runningIds.value, rule.id])
}

function stopRule(id: string) {
  const timer = timers.get(id)
  if (timer !== undefined) window.clearInterval(timer)
  timers.delete(id)
  const next = new Set(runningIds.value)
  next.delete(id)
  runningIds.value = next
}

function toggleRunning(rule: WatchRule) {
  if (timers.has(rule.id)) stopRule(rule.id)
  else startRule(rule)
}

onMounted(async () => {
  try {
    await presetStore.loadPresets()
  } catch {
    // 预设加载失败时退化为当前预设，监控流程仍可用。
  }
  for (const rule of rules.value) {
    if (rule.enabled) startRule(rule)
  }
})

onUnmounted(() => {
  for (const id of Array.from(timers.keys())) stopRule(id)
})
</script>

<style scoped>
.watch-page {
  height: 100%;
  overflow: auto;
  padding: var(--sp-5, 24px);
  background: var(--color-bg, var(--bg-color1, #181818));
  color: var(--color-text, var(--text-color1, #e0e0e0));
}

.watch-header h2 {
  margin: 0 0 4px;
  font-size: var(--fs-xl, 25px);
}
.watch-header p {
  margin: 0 0 var(--sp-4, 16px);
  color: var(--color-muted, #999);
  font-size: var(--fs-s, 13px);
}
.watch-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2, 8px);
  flex-wrap: wrap;
}
.watch-message {
  font-size: var(--fs-xs, 12px);
  color: var(--color-ok, #3fb96a);
}
.watch-note {
  margin: var(--sp-3, 12px) 0;
  font-size: var(--fs-xs, 12px);
  color: var(--color-muted, #999);
}
.watch-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
  border: 1px dashed var(--color-border, #444);
  border-radius: 8px;
  color: var(--color-muted, #999);
}
.watch-rule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.watch-rule {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--color-border, #333);
  border-radius: 8px;
  background: var(--color-surface, #242424);
}
.rule-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.rule-dir {
  font-size: var(--fs-s, 13px);
  word-break: break-all;
}
.rule-meta {
  font-size: var(--fs-2xs, 11px);
  color: var(--color-muted, #999);
  font-variant-numeric: tabular-nums;
}
.rule-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.rule-status {
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-border, #444);
  font-size: var(--fs-2xs, 11px);
}
.rule-status.on {
  color: var(--color-ok, #3fb96a);
  border-color: var(--color-ok, #3fb96a);
}
</style>
