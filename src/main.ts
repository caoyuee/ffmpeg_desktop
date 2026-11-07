import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/global.css'
import { createPinia } from 'pinia'
import { createPlugin } from '@tauri-store/pinia'
import router from '@/router/index'
import i18n from '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'
import { useTaskStore } from '@/store/taskStore'
import { usePresetStore } from '@/store/presetStore'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { parseCliArgs, buildCliHelp } from '@/config/cliArgs'
import { createTaskDraft, createTaskDrafts } from '@/config/taskDraft'
import { loadSettings } from '@/config/settings'

const app = createApp(App)
const pinia = createPinia()
pinia.use(createPlugin())
app.use(pinia)
app.use(router)
app.use(i18n)

const settingsStore = useSettingsStore()
settingsStore.initTheme()

const taskStore = useTaskStore()
taskStore.setupEventListeners()

app.mount('#app')

/**
 * R3.4：命令行集成的真实生效链路。
 * Rust 只给原始 argv → parseCliArgs 解析 → 导入预设 / 应用裁剪 →
 * createTaskDrafts 生成任务 → taskStore.addTask 入队 → 路由到对应页面。
 */
async function handleStartupArgs() {
  try {
    const argv = await invoke<string[]>('parse_startup_args')
    if (!Array.isArray(argv)) return
    const plan = parseCliArgs(argv)

    if (plan.help) {
      console.info(buildCliHelp(loadSettings().language))
      return
    }
    if (plan.unknown.length > 0) {
      console.warn('[startup] unknown cli args:', plan.unknown)
    }

    const presetStore = usePresetStore()
    // 预设文件（含旧版裸 JSON）统一经 R3.1 唯一分享层导入。
    if (plan.presetFile) {
      await presetStore.importPreset(plan.presetFile)
      await presetStore.loadPresets()
    }

    if (plan.trimStart || plan.trimEnd) {
      if (plan.trimStart) presetStore.currentPreset.trim.inPoint = plan.trimStart
      if (plan.trimEnd) presetStore.currentPreset.trim.outPoint = plan.trimEnd
    }

    if (plan.inputs.length > 0) {
      await presetStore.loadPresets()
      const preset = presetStore.currentPreset
      // R1-7：CLI 入队同样遵循输出目录设置。
      const drafts = createTaskDrafts(preset, plan.inputs, settingsStore.taskOutputDir)
      if (plan.outputFile && drafts.length === 1) {
        drafts[0] = createTaskDraft(preset, plan.inputs[0]!, plan.outputFile)
      }
      for (const draft of drafts) {
        await taskStore.addTask(draft, false)
      }
      await router.push('/queue')
    }

    if (plan.watch) await router.push('/watch')
    else if (plan.ab) await router.push('/ab')
  } catch (error) {
    // 不静默吞错：command 未注册这类故障必须可见（接力开发手册 §4.2）。
    console.warn('[startup] cli startup args failed:', error)
  }
}

/**
 * R2.5 + R3.4：队列持久化与 CLI 启动参数都只由主窗口负责。
 * 独立参数面板窗口加载同一个 main.ts，会创建第二份 Pinia 实例；
 * 两边同时写 tasks.json 会互相覆盖，也会把 CLI 任务重复入队。
 * 顺序固定：先恢复磁盘队列，再叠加 CLI 任务，避免快照覆盖启动参数。
 */
async function bootstrap() {
  try {
    if (getCurrentWindow().label !== 'main') return
  } catch (error) {
    // 纯浏览器 dev 模式没有 Tauri window API：禁用持久化与 CLI，而不是让启动失败。
    console.warn('[startup] window label unavailable, queue restore and cli disabled:', error)
    return
  }
  await taskStore.restoreQueue()
  await handleStartupArgs()
}

void bootstrap()

window.addEventListener('beforeunload', () => {
  const taskStore = useTaskStore()
  taskStore.cleanupEventListeners()
  // best-effort：把最后一次快照刷出去（invoke 可能被终止，仅作兜底）。
  void taskStore.flushPersist()
})
