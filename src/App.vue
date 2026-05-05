<template>
  <router-view></router-view>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, getLocale } from '@/i18n';
import { getCurrentWindow } from '@tauri-apps/api/window';

const { locale } = useI18n();

function onVisibilityChange() {
  if (document.hidden) {
    try {
      const saved = localStorage.getItem('appSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.minimizeToTray) {
          getCurrentWindow().hide();
        }
      }
    } catch (_) {}
  }
}

onMounted(() => {
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
    window.removeEventListener('storage', handleLangChange);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
});
</script>

<style scoped></style>
