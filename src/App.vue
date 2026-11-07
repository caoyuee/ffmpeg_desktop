<template>
  <router-view></router-view>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { setLocale, getLocale } from '@/i18n'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useSettingsStore } from '@/store/settingsStore'
import { SETTINGS_STORAGE_KEY } from '@/config/settings'

const settingsStore = useSettingsStore()
let destroyed = false

function onVisibilityChange() {
  // R2.3：托盘行为直接读唯一设置 store，不再自行解析 localStorage。
  if (document.hidden && !destroyed && settingsStore.settings.minimizeToTray) {
    getCurrentWindow()
      .hide()
      .catch(() => {})
  }
}

onMounted(() => {
  destroyed = false
  setLocale(settingsStore.language)

  const handleSettingsChange = (event: StorageEvent) => {
    if (event.key !== SETTINGS_STORAGE_KEY) return
    settingsStore.reload()
    if (settingsStore.language !== getLocale()) {
      setLocale(settingsStore.language)
    }
  }

  window.addEventListener('storage', handleSettingsChange)
  document.addEventListener('visibilitychange', onVisibilityChange)

  onUnmounted(() => {
    destroyed = true
    window.removeEventListener('storage', handleSettingsChange)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })
})

window.addEventListener('beforeunload', () => {
  destroyed = true
})
</script>

<style scoped></style>
