<template>
  <div class="trim-panel">
    <div class="panel-section">
      <h4>剪辑设置</h4>
      
      <div class="form-group">
        <label>剪辑方式</label>
        <select v-model="localPreset.trim.method" @change="onTrimMethodChange">
          <option :value="0">不剪辑</option>
          <option :value="1">指定时间区间</option>
          <option :value="2">指定时长</option>
        </select>
      </div>

      <div v-if="localPreset.trim.method > 0" class="trim-controls">
        <div class="form-group">
          <label>入点时间</label>
          <TimeInput v-model="localPreset.trim.inPoint" @update:modelValue="onTimeChange" />
        </div>

        <div class="form-group">
          <label>{{ localPreset.trim.method === 1 ? '出点时间' : '持续时长' }}</label>
          <TimeInput v-model="localPreset.trim.outPoint" @update:modelValue="onTimeChange" />
        </div>

        <div class="form-group" v-if="localPreset.trim.method === 1">
          <label>向前搜索</label>
          <input
            type="text"
            v-model="localPreset.trim.seekBackward"
            placeholder="可选，如 5s"
          />
          <small>在某些格式下可以提高精度</small>
        </div>

        <div class="trim-info" v-if="duration > 0">
          <div class="info-item">
            <span class="label">剪辑时长:</span>
            <span class="value">{{ formatDuration(duration) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { PresetData } from '@/types/preset';
import TimeInput from './TimeInput.vue';

const props = defineProps<{
  preset: PresetData;
}>();

const emit = defineEmits<{
  'update:preset': [preset: PresetData];
}>();

const localPreset = ref<PresetData>({ ...props.preset });

watch(() => props.preset, (newVal) => {
  localPreset.value = { ...newVal };
}, { deep: true });

watch(localPreset, (newVal) => {
  emit('update:preset', newVal);
}, { deep: true });

const duration = computed(() => {
  if (localPreset.value.trim.method === 0) return 0;
  
  const inSeconds = parseTimeToSeconds(localPreset.value.trim.inPoint);
  const outSeconds = parseTimeToSeconds(localPreset.value.trim.outPoint);
  
  if (inSeconds === null || outSeconds === null) return 0;
  
  if (localPreset.value.trim.method === 1) {
    return Math.max(0, outSeconds - inSeconds);
  } else {
    return outSeconds;
  }
});

function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  
  const patterns = [
    /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/,
    /^(\d+):(\d{2}(?:\.\d+)?)$/,
    /^(\d+(?:\.\d+)?)$/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = timeStr.match(patterns[i]);
    if (match) {
      if (i === 0) {
        return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
      } else if (i === 1) {
        return parseInt(match[1]) * 60 + parseFloat(match[2]);
      } else {
        return parseFloat(match[1]);
      }
    }
  }
  return null;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
}

function onTrimMethodChange() {
  if (localPreset.value.trim.method === 0) {
    localPreset.value.trim.inPoint = '';
    localPreset.value.trim.outPoint = '';
    localPreset.value.trim.seekBackward = '';
  }
}

function onTimeChange() {
  emit('update:preset', localPreset.value);
}
</script>

<style scoped>
.trim-panel {
  padding: 1rem;
}

.panel-section {
  border: 1px solid var(--border-color1, #333);
  border-radius: 6px;
  padding: 1rem;
  background: var(--bg-color2, #1e1e1e);
}

.panel-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: var(--text-color1, #e0e0e0);
  border-bottom: 1px solid var(--border-color1, #333);
  padding-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-color2, #999);
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.9rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-color2, #999);
}

.trim-controls {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color1, #333);
}

.trim-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg-color3, #3a3a3a);
  border-radius: 4px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item .label {
  font-size: 0.85rem;
  color: var(--text-color2, #999);
}

.info-item .value {
  font-size: 0.9rem;
  color: var(--text-color1, #e0e0e0);
  font-weight: 500;
}
</style>
