import { createApp } from "vue";
import App from "./App.vue";
import "./assets/styles/global.css"
import "./assets/styles/theme.css"
import { createPinia } from 'pinia'
import { createPlugin } from '@tauri-store/pinia';
import router from '@/router/index'
import i18n from '@/i18n'

const app = createApp(App)
const pinia = createPinia()
pinia.use(createPlugin());
app.use(pinia)
app.use(router)
app.use(i18n)
app.mount("#app");