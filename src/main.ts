import { createApp } from "vue";
import App from "./App.vue";
import "./assets/styles/global.css"
import { createPinia } from 'pinia'
import { createPlugin } from '@tauri-store/pinia';
import router from '@/router/index'
import i18n from '@/i18n'
import { useSettingStore } from '@/store/settingStore'
import { useTaskStore } from '@/store/taskStore'
import { useFileListStore } from '@/store/fileListStore'
import { usePresetStore } from '@/store/presetStore'
import { invoke } from '@tauri-apps/api/core'

const app = createApp(App)
const pinia = createPinia()
pinia.use(createPlugin());
app.use(pinia)
app.use(router)
app.use(i18n)

const settingStore = useSettingStore()
settingStore.initTheme()

const taskStore = useTaskStore()
taskStore.setupEventListeners()

app.mount("#app");

async function handleStartupArgs() {
  try {
    const args = await invoke<Record<string, unknown>>('parse_startup_args')
    if (!args || Object.keys(args).length === 0) return

    if (typeof args['input_file'] === 'string') {
      const fileListStore = useFileListStore()
      fileListStore.addFiles([args['input_file']])
    }

    if (typeof args['preset_file'] === 'string') {
      const presetStore = usePresetStore()
      await presetStore.importPreset(args['preset_file'])
      await presetStore.loadPresets()
    }

    if (typeof args['trim_start'] === 'string' || typeof args['trim_end'] === 'string') {
      const presetStore = usePresetStore()
      if (typeof args['trim_start'] === 'string') {
        presetStore.currentPreset.trim.inPoint = args['trim_start']
      }
      if (typeof args['trim_end'] === 'string') {
        presetStore.currentPreset.trim.outPoint = args['trim_end']
      }
    }
  } catch {
    // 非命令行启动或无参数时静默忽略
  }
}

handleStartupArgs()

window.addEventListener('beforeunload', () => {
  const taskStore = useTaskStore()
  taskStore.cleanupEventListeners()
})
