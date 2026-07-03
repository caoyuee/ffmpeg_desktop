<template>
  <div class="navigation-tabs">
    <div
      v-for="tab in tabs"
      :key="tab.id"
      :class="['nav-tab', { active: currentRoute === tab.route }]"
      @click="navigateTo(tab.route)"
    >
      <AppIcon :name="tab.icon" class="tab-icon" :size="18" />
      <span class="tab-text">{{ tab.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/AppIcon/AppIcon.vue';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const currentRoute = computed(() => route.path);

const tabs = computed(() => [
  { id: 'home', label: t('nav.home'), icon: 'home', route: '/home' },
  { id: 'queue', label: t('nav.queue'), icon: 'queue', route: '/queue' },
  { id: 'prepare', label: t('nav.prepare'), icon: 'folder', route: '/prepare' },
  { id: 'params', label: t('nav.params'), icon: 'params', route: '/params' },
  { id: 'merge', label: t('nav.merge'), icon: 'merge', route: '/merge' },
  { id: 'mux', label: t('nav.mux'), icon: 'mux', route: '/mux' },
  { id: 'quality', label: t('nav.quality'), icon: 'quality', route: '/quality' },
  { id: 'player', label: t('nav.player'), icon: 'player', route: '/player' },
  { id: 'performance', label: t('nav.performance'), icon: 'performance', route: '/performance' },
  { id: 'mediainfo', label: t('nav.mediainfo'), icon: 'mediainfo', route: '/mediainfo' },
  { id: 'settings', label: t('nav.settings'), icon: 'settings', route: '/settings' },
] as const);

function navigateTo(path: string) {
  router.push(path);
}
</script>

<style scoped>
.navigation-tabs {
  width: 150px;
  min-width: 150px;
  background: var(--bg-color2, #181818);
  border-right: 1px solid var(--border-color1, #333);
  display: flex;
  flex-direction: column;
  padding-top: 8px;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  user-select: none;
}

.nav-tab:hover {
  background: var(--hover-bg, #2a2a2a);
}

.nav-tab.active {
  background: var(--active-bg, #303030);
  color: var(--active-color, #9acd32);
  border-bottom-color: var(--active-color, #9acd32);
}

.tab-icon {
  width: 20px;
  height: 20px;
  color: var(--text-color2, #9aa0a6);
}

.tab-text {
  font-size: 13px;
  color: inherit;
}

.nav-tab.active .tab-text {
  color: var(--active-color, #9acd32);
}

.nav-tab.active .tab-icon {
  color: var(--active-color, #9acd32);
}
</style>
