<template>
  <router-view></router-view>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, getLocale } from '@/i18n';

const { locale } = useI18n();

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

  onUnmounted(() => {
    window.removeEventListener('storage', handleLangChange);
  });
});
</script>

<style scoped></style>
