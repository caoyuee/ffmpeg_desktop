<template>
  <div class="time-input">
    <input
      type="text"
      v-model="localValue"
      @blur="validateAndEmit"
      @keyup.enter="validateAndEmit"
      placeholder="00:00:00"
      class="time-field"
    />
    <span class="time-hint">格式: HH:MM:SS 或 MM:SS</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const localValue = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal;
});

function validateAndEmit() {
  const time = parseTime(localValue.value);
  if (time !== null) {
    const formatted = formatTime(time);
    localValue.value = formatted;
    emit('update:modelValue', formatted);
  } else {
    localValue.value = props.modelValue;
  }
}

function parseTime(input: string): number | null {
  const patterns = [
    /^(\d{1,3}):([0-5]\d):([0-5]\d(?:\.\d{1,2})?)$/,
    /^(\d{1,4}):([0-5]\d(?:\.\d{1,2})?)$/,
    /^(\d+(?:\.\d{1,2})?)$/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (!pattern) continue;
    const match = input.match(pattern);
    if (match) {
      if (i === 0) {
        const hours = parseInt(match[1] ?? '0');
        const minutes = parseInt(match[2] ?? '0');
        const seconds = parseFloat(match[3] ?? '0');
        if (minutes > 59 || seconds >= 60) return null;
        return hours * 3600 + minutes * 60 + seconds;
      } else if (i === 1) {
        const minutes = parseInt(match[1] ?? '0');
        const seconds = parseFloat(match[2] ?? '0');
        if (seconds >= 60) return null;
        return minutes * 60 + seconds;
      } else {
        const seconds = parseFloat(match[1] ?? '0');
        if (seconds < 0) return null;
        return seconds;
      }
    }
  }
  return null;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(2);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  } else {
    return `${minutes}:${secs.padStart(5, '0')}`;
  }
}
</script>

<style scoped>
.time-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-field {
  padding: 0.5rem;
  border: 1px solid var(--border-color1, #333);
  border-radius: 4px;
  background: var(--bg-color1, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  font-size: 0.9rem;
  font-family: monospace;
}

.time-hint {
  font-size: 0.75rem;
  color: var(--text-color2, #999);
}
</style>
