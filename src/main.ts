import { createApp } from "vue";
import App from "./App.vue";
import "./assets/styles/global.css"
import { createPinia } from 'pinia'
import { createPlugin } from '@tauri-store/pinia';
import router from '@/router/index'
import i18n from '@/i18n'
import { useSettingStore } from '@/store/settingStore'
import { useTaskStore } from '@/store/taskStore'

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

window.addEventListener('beforeunload', () => {
  const taskStore = useTaskStore()
  taskStore.cleanupEventListeners()
})
