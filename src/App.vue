<template>
  <router-view></router-view>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, getLocale } from '@/i18n';
import { getCurrentWindow } from '@tauri-apps/api/window';

const { locale } = useI18n();
let destroyed = false;

function onVisibilityChange() {
  if (document.hidden && !destroyed) {
    try {
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.minimizeToTray) {
          getCurrentWindow().hide().catch(() => {});
        }
      }
    } catch (_) {}
  }
}

onMounted(() => {
  destroyed = false;
  const savedLang = localStorage.getItem('language') || 'zh-CN';
  setLocale(savedLang as any);

  const handleLangChange = () => {
    const currentLang = localStorage.getItem('language') || 'zh-CN';
    if (currentLang !== getLocale()) {
      setLocale(currentLang as any);
    }
  };

  window.addEventListener('storage', handleLangChange);
  document.addEventListener('visibilitychange', onVisibilityChange);

  onUnmounted(() => {
    destroyed = true;
    window.removeEventListener('storage', handleLangChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
});

window.addEventListener('beforeunload', () => {
  destroyed = true;
});
</script>

<style scoped></style>
