<template>
  <svg
    :width="sizeValue"
    :height="sizeValue"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="app-icon"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(path, index) in icon.paths"
      :key="index"
      :d="path"
      :fill="icon.fill ? 'currentColor' : 'none'"
      :stroke="icon.fill ? 'none' : 'currentColor'"
      :stroke-width="icon.fill ? undefined : icon.strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type IconName =
  | 'home'
  | 'queue'
  | 'folder'
  | 'folder-open'
  | 'folder-plus'
  | 'params'
  | 'settings'
  | 'merge'
  | 'mux'
  | 'quality'
  | 'player'
  | 'performance'
  | 'mediainfo'
  | 'play'
  | 'pause'
  | 'stop'
  | 'rewind'
  | 'forward'
  | 'volume-high'
  | 'volume-low'
  | 'volume-mute'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'trash'
  | 'close'
  | 'check'
  | 'warning'
  | 'info'
  | 'success'
  | 'error'
  | 'edit'
  | 'refresh'
  | 'export'
  | 'reset'
  | 'arrow-up'
  | 'arrow-down'
  | 'sort'
  | 'add'
  | 'chevron-right'
  | 'chevron-down'
  | 'cpu'
  | 'memory'
  | 'gpu'
  | 'disk'
  | 'video'
  | 'audio'
  | 'subtitle'
  | 'drop-files';

interface IconDef {
  paths: string[];
  strokeWidth?: number;
  fill?: boolean;
}

const ICONS: Record<IconName, IconDef> = {
  home: {
    paths: ['M4 11.5L12 4l8 7.5V20H14v-6H10v6H4z'],
  },
  queue: {
    paths: ['M6 7h12M6 12h12M6 17h12M3.5 7h.5M3.5 12h.5M3.5 17h.5'],
  },
  folder: {
    paths: ['M3 7.5A2.5 2.5 0 0 1 5.5 5h5l2 2H19a2 2 0 0 1 2 2v7.5A2.5 2.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5z'],
  },
  'folder-open': {
    paths: ['M3 9.5 5 6h5l2 2h9v3.5L19 18H4.5A1.5 1.5 0 0 1 3 16.5z'],
  },
  'folder-plus': {
    paths: ['M3 7.5A2.5 2.5 0 0 1 5.5 5h5l2 2H19a2 2 0 0 1 2 2v7.5A2.5 2.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5z', 'M12 11v4M10 13h4'],
  },
  params: {
    paths: ['M4 7h4M12 7h8M8 5v4', 'M4 12h10M18 12h2M14 10v4', 'M4 17h2M10 17h10M6 15v4'],
  },
  settings: {
    paths: ['M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z', 'M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M5.8 18.2l1.4-1.4M16.8 7.2l1.4-1.4'],
  },
  merge: {
    paths: ['M4 7h5l4 5h7', 'M4 17h5l4-5h7'],
  },
  mux: {
    paths: ['M4 7h5l4 5h7', 'M4 17h5l4-5h7', 'M16 5l4 2-4 2', 'M16 19l4-2-4-2'],
  },
  quality: {
    paths: ['M12 4v3M12 17v3M4 12h3M17 12h3M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8z'],
  },
  player: {
    paths: ['M4 6h16v12H4z', 'M10 9l6 3-6 3z'],
  },
  performance: {
    paths: ['M4 19V5M4 19h16M8 14l3-3 2 2 4-5'],
  },
  mediainfo: {
    paths: ['M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15z', 'M12 10.5v5', 'M12 7.8h.01'],
  },
  play: {
    paths: ['M8.5 6.8v10.4L17.2 12z'],
    fill: true,
  },
  pause: {
    paths: ['M8 7h3v10H8z', 'M13 7h3v10h-3z'],
  },
  stop: {
    paths: ['M7 7h10v10H7z'],
    fill: true,
  },
  rewind: {
    paths: ['M12 12l7-5v10z', 'M5 12l7-5v10z'],
  },
  forward: {
    paths: ['M12 12l-7-5v10z', 'M19 12l-7-5v10z'],
  },
  'volume-high': {
    paths: ['M5 10h4l5-4v8l-5-4H5z', 'M16 9a4 4 0 0 1 0 6', 'M18.5 6.5a8 8 0 0 1 0 11'],
  },
  'volume-low': {
    paths: ['M5 10h4l5-4v8l-5-4H5z', 'M16 10a2.5 2.5 0 0 1 0 4'],
  },
  'volume-mute': {
    paths: ['M5 10h4l5-4v8l-5-4H5z', 'M16 9l5 5', 'M21 9l-5 5'],
  },
  fullscreen: {
    paths: ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
  },
  'exit-fullscreen': {
    paths: ['M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'],
  },
  trash: {
    paths: ['M5 7h14M10 7V5h4v2M8.5 7l.8 12h5.4l.8-12'],
  },
  close: {
    paths: ['M6 6l12 12M18 6L6 18'],
  },
  check: {
    paths: ['M5 12l4 4 10-10'],
  },
  warning: {
    paths: ['M12 4.5 20 18H4z', 'M12 9v4', 'M12 15.5h.01'],
  },
  info: {
    paths: ['M12 8.5v7', 'M12 5.8h.01'],
  },
  success: {
    paths: ['M5 12l4 4 10-10', 'M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15z'],
  },
  error: {
    paths: ['M6 6l12 12M18 6L6 18', 'M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 0 0 0-15z'],
  },
  edit: {
    paths: ['M4 16.5V20h3.5L18 9.5 14.5 6z', 'M13 7l4 4'],
  },
  refresh: {
    paths: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v5h-5'],
  },
  export: {
    paths: ['M14 5h5v5', 'M10 14l9-9', 'M12 19H5V5h7'],
  },
  reset: {
    paths: ['M20 12a8 8 0 1 1-2.3-5.7', 'M20 4v5h-5'],
  },
  'arrow-up': {
    paths: ['M12 19V5M7 10l5-5 5 5'],
  },
  'arrow-down': {
    paths: ['M12 5v14M7 14l5 5 5-5'],
  },
  sort: {
    paths: ['M8 7l4-4 4 4M12 3v18M8 17l4 4 4-4'],
  },
  add: {
    paths: ['M12 5v14M5 12h14'],
  },
  'chevron-right': {
    paths: ['M9 5l7 7-7 7'],
  },
  'chevron-down': {
    paths: ['M5 9l7 7 7-7'],
  },
  cpu: {
    paths: ['M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 7h10v10H7z'],
  },
  memory: {
    paths: ['M7 8h10v8H7z', 'M5 10h2M5 14h2M17 10h2M17 14h2'],
  },
  gpu: {
    paths: ['M5 8h14v8H5z', 'M8 12h3M13 12h3M8 15h8'],
  },
  disk: {
    paths: ['M6 6h12v12H6z', 'M9 9h6', 'M9 13h2M13 13h2'],
  },
  video: {
    paths: ['M4 6h16v12H4z', 'M8 6v12M16 6v12M4 10h16M4 14h16'],
  },
  audio: {
    paths: ['M5 10h4l5-4v8l-5-4H5z', 'M16 9a3 3 0 0 1 0 6'],
  },
  subtitle: {
    paths: ['M4 7h16v10H4z', 'M7 11h3M12 11h5M7 14h8'],
  },
  'drop-files': {
    paths: [
      'M7 4h7l4 4v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
      'M14 4v4h4',
      'M9 9.5h3M9 12.5h6',
      'M12 14v4M9.5 15.5 12 18l2.5-2.5',
      'M4 8H3a1.5 1.5 0 0 0-1.5 1.5V18A2.5 2.5 0 0 0 4 20h2',
    ],
  },
};

const props = withDefaults(defineProps<{
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
}>(), {
  size: 20,
  strokeWidth: 1.8,
});

const icon = computed(() => ICONS[props.name]);

const sizeValue = computed(() => {
  return typeof props.size === 'number' ? String(props.size) : props.size;
});
</script>

<style scoped>
.app-icon {
  display: inline-block;
  flex: 0 0 auto;
  vertical-align: middle;
  color: currentColor;
}
</style>
