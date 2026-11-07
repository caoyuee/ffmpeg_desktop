<template>
  <!-- R3.8：nav 语义地标 + 可聚焦 button + aria-current；按用户任务流分组，取代 12 个平级 div。 -->
  <nav class="navigation-tabs" aria-label="Primary">
    <div v-for="group in groups" :key="group.id" class="nav-group">
      <p class="nav-group-title">{{ group.label }}</p>
      <button
        v-for="tab in group.tabs"
        :key="tab.id"
        type="button"
        :class="['nav-tab', { active: currentRoute === tab.route }]"
        :aria-current="currentRoute === tab.route ? 'page' : undefined"
        :data-testid="`nav-${tab.id}`"
        :title="tab.label"
        @click="navigateTo(tab.route)"
      >
        <AppIcon :name="tab.icon" class="tab-icon" :size="18" />
        <span class="tab-text">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const currentRoute = computed(() => route.path)

const groups = computed(
  () =>
    [
      {
        id: 'primary',
        label: t('nav.groups.primary'),
        tabs: [
          { id: 'workbench', label: t('nav.workbench'), icon: 'workbench', route: '/workbench' },
          { id: 'history', label: t('nav.history'), icon: 'history', route: '/history' },
        ],
      },
      {
        id: 'tools',
        label: t('nav.groups.tools'),
        tabs: [
          { id: 'prepare', label: t('nav.prepare'), icon: 'folder', route: '/prepare' },
          { id: 'params', label: t('nav.params'), icon: 'params', route: '/params' },
          { id: 'merge', label: t('nav.merge'), icon: 'merge', route: '/merge' },
          { id: 'mux', label: t('nav.mux'), icon: 'mux', route: '/mux' },
          { id: 'quality', label: t('nav.quality'), icon: 'quality', route: '/quality' },
          { id: 'mediainfo', label: t('nav.mediainfo'), icon: 'mediainfo', route: '/mediainfo' },
          { id: 'player', label: t('nav.player'), icon: 'player', route: '/player' },
        ],
      },
      {
        id: 'monitor',
        label: t('nav.groups.monitor'),
        tabs: [
          { id: 'queue', label: t('nav.queue'), icon: 'queue', route: '/queue' },
          { id: 'watch', label: t('nav.watch'), icon: 'watch', route: '/watch' },
          { id: 'abCompare', label: t('nav.abCompare'), icon: 'compare', route: '/ab' },
          {
            id: 'performance',
            label: t('nav.performance'),
            icon: 'performance',
            route: '/performance',
          },
        ],
      },
      {
        id: 'system',
        label: t('nav.groups.system'),
        tabs: [
          { id: 'settings', label: t('nav.settings'), icon: 'settings', route: '/settings' },
          { id: 'home', label: t('nav.home'), icon: 'home', route: '/home' },
        ],
      },
    ] as const,
)

function navigateTo(path: string) {
  router.push(path)
}
</script>

<style scoped>
.navigation-tabs {
  width: 168px;
  min-width: 168px;
  background: var(--color-surface, var(--bg-color2, #181818));
  border-right: 1px solid var(--color-border, var(--border-color1, #333));
  display: flex;
  flex-direction: column;
  padding-top: var(--sp-2, 8px);
  overflow-y: auto;
}

.nav-group {
  display: flex;
  flex-direction: column;
}

.nav-group-title {
  margin: var(--sp-3, 12px) 0 var(--sp-1, 4px);
  padding: 0 var(--sp-4, 16px);
  font-size: var(--fs-2xs, 11px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted, var(--text-color2, #9aa0a6));
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: var(--sp-2, 8px);
  width: 100%;
  padding: var(--sp-2, 8px) var(--sp-4, 16px);
  min-height: 36px;
  border: 0;
  border-left: 3px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background var(--dur-fast, 160ms) var(--ease-out, ease);
}

.nav-tab:hover {
  background: var(--hover-bg, #2a2a2a);
}

.nav-tab.active {
  background: var(--active-bg, #303030);
  color: var(--color-accent, var(--active-color, #9acd32));
  border-left-color: var(--color-accent, var(--active-color, #9acd32));
}

.tab-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  color: var(--color-muted, var(--text-color2, #9aa0a6));
}

.tab-text {
  font-size: var(--fs-s, 13px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-tab.active .tab-icon {
  color: var(--color-accent, var(--active-color, #9acd32));
}
</style>
