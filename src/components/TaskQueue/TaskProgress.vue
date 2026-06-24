<template>
  <div class="task-progress">
    <div class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: `${progress.percentage}%` }"
      ></div>
    </div>
    
    <div class="progress-info">
      <div class="progress-stats">
        <span v-if="progress.frame > 0">
          {{ t('task.progress') }} {{ progress.frame }}
        </span>
        <span v-if="progress.fps > 0">
          FPS: {{ progress.fps }}
        </span>
        <span v-if="progress.speed > 0">
          {{ t('task.speed') }}: {{ progress.speed.toFixed(2) }}x
        </span>
        <span v-if="progress.bitrate > 0">
          {{ t('task.bitrate') }}: {{ formatBitrate(progress.bitrate) }}
        </span>
      </div>
      
      <div class="progress-time" v-if="progress.remainingTime > 0">
        {{ t('task.eta') }}: {{ formatTime(progress.remainingTime) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TaskProgress } from '@/types/task';

const { t } = useI18n();

defineProps<{
  progress: TaskProgress;
}>();

function formatBitrate(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps.toFixed(0)} kbps`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}分${secs}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分`;
  }
}
</script>

<style scoped>
.task-progress {
    margin-top: 0.5rem;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: var(--bg-color3, #3a3a3a);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-color2, #999);
}

.progress-stats {
    display: flex;
    gap: 1rem;
}

.progress-stats span {
    white-space: nowrap;
}

.progress-time {
    white-space: nowrap;
}
</style>
