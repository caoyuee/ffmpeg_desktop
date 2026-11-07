<template>
  <div class="task-progress">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${clampedPercentage}%` }"></div>
    </div>

    <div class="progress-info">
      <div class="progress-stats">
        <span v-if="frame !== null"> {{ t('task.progress') }} {{ frame }} </span>
        <span v-if="fps !== null"> FPS: {{ fps }} </span>
        <span v-if="speedValue !== null">
          {{ t('task.speed') }}: {{ speedValue.toFixed(2) }}x
        </span>
        <span v-if="bitrateValue !== null">
          {{ t('task.bitrate') }}: {{ formatBitrate(bitrateValue) }}
        </span>
        <span v-if="size !== null"> {{ t('task.size') }}: {{ size }} </span>
      </div>

      <div v-if="remainingTime > 0" class="progress-time">
        {{ t('task.eta') }}: {{ formattedEta }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskProgress as TaskProgressData } from '@/types/task'
import { parseNumeric, formatDuration } from '@/utils/progressFormat'

const props = defineProps<{
  progress: TaskProgressData
}>()

const { t } = useI18n()

// R1-8：后端下发的是 string | null，展示层先解析再参与数值运算，避免 NaN / toFixed 报错。
const frame = computed(() => props.progress.frame)
const fps = computed(() => props.progress.fps)
const speedValue = computed(() => parseNumeric(props.progress.speed))
const bitrateValue = computed(() => parseNumeric(props.progress.bitrate))
const size = computed(() => props.progress.size)
const remainingTime = computed(() => props.progress.remainingTime)
const clampedPercentage = computed(() => Math.min(Math.max(props.progress.percentage || 0, 0), 100))
// P2-8：时间单位走 i18n，不再硬编码中文。
const formattedEta = computed(() => formatDuration(remainingTime.value, (key: string) => t(key)))

function formatBitrate(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`
  }
  return `${kbps.toFixed(0)} kbps`
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
  background: linear-gradient(90deg, var(--success-color, #27ae60), var(--active-color, #9acd32));
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
