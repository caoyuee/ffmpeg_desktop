<template>
  <!-- R3.8：管道式单页工作台（准备 → 参数 → 队列），取代「12 个平级页面 + 默认空队列」。 -->
  <div class="workbench-page">
    <header class="workbench-header">
      <h2>{{ t('page.workbench.title') }}</h2>
      <p>{{ t('page.workbench.subtitle') }}</p>
    </header>

    <div class="workbench-flow">
      <section class="workbench-section" data-testid="workbench-files">
        <h3>
          <span class="step-badge">{{ t('page.workbench.stepFiles') }}</span>
          {{ t('page.workbench.filesTitle') }}
        </h3>
        <p class="section-hint">{{ t('page.workbench.filesHint') }}</p>
        <div class="workbench-actions">
          <button class="app-btn app-btn--primary" @click="addFiles">
            <AppIcon name="folder-plus" :size="16" /> {{ t('page.workbench.addFiles') }}
          </button>
          <button class="app-btn" @click="addFolder">
            <AppIcon name="folder-open" :size="16" /> {{ t('page.workbench.addFolder') }}
          </button>
          <button class="app-btn" :disabled="selectedIndices.length === 0" @click="enqueueSelected">
            <AppIcon name="queue" :size="16" /> {{ t('page.workbench.addToQueue') }}
          </button>
        </div>
        <p class="workbench-count">
          {{
            t('page.workbench.selectedCount', {
              count: selectedIndices.length,
              total: files.length,
            })
          }}
        </p>

        <ul v-if="files.length > 0" class="workbench-file-list">
          <li
            v-for="(file, index) in files"
            :key="file"
            :class="{ picked: selectedIndices.includes(index) }"
          >
            <AppIcon name="video" :size="14" /> {{ getFileName(file) }}
          </li>
        </ul>

        <div v-else class="workbench-empty" data-testid="workbench-empty">
          <AppIcon name="drop-files" :size="48" />
          <strong>{{ t('page.workbench.emptyTitle') }}</strong>
          <span>{{ t('page.workbench.emptyHint') }}</span>
          <button class="app-btn app-btn--primary" @click="addFiles">
            {{ t('page.workbench.emptyAction') }}
          </button>
        </div>
      </section>

      <section class="workbench-section" data-testid="workbench-params">
        <h3>
          <span class="step-badge">{{ t('page.workbench.stepParams') }}</span>
          {{ t('page.workbench.paramsTitle') }}
        </h3>
        <p class="section-hint">{{ t('page.workbench.paramsHint', { name: presetName }) }}</p>
        <div class="workbench-actions">
          <button class="app-btn" @click="router.push('/params')">
            <AppIcon name="params" :size="16" /> {{ t('page.workbench.openParams') }}
          </button>
          <button class="app-btn" @click="router.push('/ab')">
            <AppIcon name="compare" :size="16" /> {{ t('nav.abCompare') }}
          </button>
          <button class="app-btn" @click="router.push('/watch')">
            <AppIcon name="watch" :size="16" /> {{ t('nav.watch') }}
          </button>
        </div>
      </section>

      <section class="workbench-section" data-testid="workbench-queue">
        <h3>
          <span class="step-badge">{{ t('page.workbench.stepQueue') }}</span>
          {{ t('page.workbench.queueTitle') }}
        </h3>
        <p class="section-hint">
          {{
            t('page.workbench.queueHint', {
              count: taskStore.tasks.length,
              running: taskStore.runningCount,
            })
          }}
        </p>
        <div class="workbench-actions">
          <button class="app-btn app-btn--primary" @click="router.push('/queue')">
            <AppIcon name="queue" :size="16" /> {{ t('page.workbench.openQueue') }}
          </button>
          <button class="app-btn" @click="router.push('/history')">
            <AppIcon name="history" :size="16" /> {{ t('nav.history') }}
          </button>
        </div>
      </section>
    </div>

    <section class="workbench-cli">
      <h3>{{ t('page.cli.title') }}</h3>
      <p class="section-hint">{{ t('page.workbench.cliHint') }}</p>
      <pre class="cli-help">{{ cliHelp }}</pre>
      <div class="workbench-actions">
        <button class="app-btn" @click="copyHelp">
          <AppIcon name="export" :size="16" /> {{ t('page.cli.copyHelp') }}
        </button>
        <span v-if="toast" class="workbench-toast">{{ toast }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useFileListStore } from '@/store/fileListStore'
import { usePresetStore } from '@/store/presetStore'
import { useTaskStore } from '@/store/taskStore'
import { createTaskDraft } from '@/config/taskDraft'
import { useSettingsStore } from '@/store/settingsStore'
import { buildCliHelp } from '@/config/cliArgs'
import { getFileName } from '@/utils/pathUtils'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const { t, locale } = useI18n()
const router = useRouter()
const fileListStore = useFileListStore()
const presetStore = usePresetStore()
const taskStore = useTaskStore()
// R1-7：输出目录设置唯一决策值，入队时统一注入。
const settingsStore = useSettingsStore()
const { files, selectedIndices } = storeToRefs(fileListStore)

const toast = ref('')
const presetName = computed(() => presetStore.currentPreset.name || t('page.watch.currentPreset'))
const cliHelp = computed(() => buildCliHelp(locale.value === 'en-US' ? 'en-US' : 'zh-CN'))

async function addFiles() {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({
    multiple: true,
    filters: [
      { name: 'Media', extensions: ['mp4', 'mkv', 'avi', 'mov', 'flv', 'webm', 'wmv', 'm4v'] },
    ],
  })
  if (selected) {
    fileListStore.addFiles(Array.isArray(selected) ? selected : [selected])
  }
}

async function addFolder() {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true })
  if (!selected || typeof selected !== 'string') return
  try {
    // R1-9 已有的 Rust 递归枚举，工作台不重复实现扫描逻辑。
    const mediaFiles = await invoke<string[]>('list_media_files', { dir: selected })
    if (Array.isArray(mediaFiles)) fileListStore.addFiles(mediaFiles)
  } catch (error) {
    console.warn('[workbench] folder scan failed:', error)
  }
}

async function enqueueSelected() {
  const paths = selectedIndices.value
    .map((index) => files.value[index])
    .filter((path): path is string => typeof path === 'string')
  const preset = presetStore.currentPreset
  // R3：与队列拖拽 / 监控 / A-B / CLI 共用唯一任务草稿层。
  for (const path of paths) {
    await taskStore.addTask(
      createTaskDraft(preset, path, undefined, settingsStore.taskOutputDir),
      false,
    )
  }
  fileListStore.removeSelected()
  await router.push('/queue')
}

async function copyHelp() {
  try {
    await navigator.clipboard?.writeText(cliHelp.value)
    toast.value = t('page.cli.copied')
  } catch {
    toast.value = t('page.workbench.copied')
  }
}
</script>

<style scoped>
.workbench-page {
  height: 100%;
  overflow: auto;
  padding: var(--sp-5, 24px);
  background: var(--color-bg, var(--bg-color1, #181818));
  color: var(--color-text, var(--text-color1, #e0e0e0));
}

.workbench-header h2 {
  margin: 0 0 var(--sp-1, 4px);
  font-size: var(--fs-xl, 25px);
}

.workbench-header p {
  margin: 0 0 var(--sp-5, 24px);
  color: var(--color-muted, var(--text-color2, #999));
  font-size: var(--fs-s, 13px);
}

.workbench-flow {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--sp-4, 16px);
}

.workbench-section,
.workbench-cli {
  padding: var(--sp-4, 16px);
  border: 1px solid var(--color-border, var(--border-color1, #333));
  border-radius: var(--r-md, 8px);
  background: var(--color-surface, var(--bg-color2, #242424));
  box-shadow: var(--sh-1, none);
}

.workbench-section h3,
.workbench-cli h3 {
  display: flex;
  align-items: center;
  gap: var(--sp-2, 8px);
  margin: 0 0 var(--sp-2, 8px);
  font-size: var(--fs-m, 16px);
}

.step-badge {
  padding: 2px 8px;
  border: 1px solid var(--color-accent, #4da3ff);
  border-radius: 999px;
  color: var(--color-accent, #4da3ff);
  font-size: var(--fs-2xs, 11px);
  white-space: nowrap;
}

.section-hint {
  margin: 0 0 var(--sp-3, 12px);
  color: var(--color-muted, var(--text-color2, #999));
  font-size: var(--fs-xs, 12px);
}

.workbench-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2, 8px);
}

.workbench-count {
  margin: var(--sp-3, 12px) 0;
  font-size: var(--fs-xs, 12px);
  font-variant-numeric: tabular-nums;
  color: var(--color-muted, var(--text-color2, #999));
}

.workbench-file-list {
  list-style: none;
  max-height: 180px;
  overflow: auto;
  font-size: var(--fs-xs, 12px);
}

.workbench-file-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--r-sm, 4px);
}

.workbench-file-list li.picked {
  background: var(--selected-bg, rgba(77, 163, 255, 0.12));
}

.workbench-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2, 8px);
  padding: var(--sp-5, 24px);
  border: 1px dashed var(--color-border, #444);
  border-radius: var(--r-md, 8px);
  color: var(--color-muted, #999);
  text-align: center;
  font-size: var(--fs-s, 13px);
}

.workbench-cli {
  margin-top: var(--sp-4, 16px);
}

.cli-help {
  margin: 0 0 var(--sp-3, 12px);
  padding: var(--sp-3, 12px);
  overflow: auto;
  border-radius: var(--r-sm, 4px);
  background: var(--color-bg, #181818);
  font-family: var(--font-mono, monospace);
  font-size: var(--fs-xs, 12px);
  white-space: pre-wrap;
}

.workbench-toast {
  color: var(--color-ok, #3fb96a);
  font-size: var(--fs-xs, 12px);
}
</style>
