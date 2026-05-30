<template>
  <label class="switch-toggle">
    <span :class="{ active: !modelValue }">{{ offLabel }}</span>
    <div class="switch-track" @click="toggle">
      <div class="switch-thumb" :class="{ on: modelValue }"></div>
    </div>
    <span :class="{ active: modelValue }">{{ onLabel }}</span>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean;
  offLabel?: string;
  onLabel?: string;
}>(), {
  offLabel: '关闭',
  onLabel: '开启',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function toggle() {
  emit('update:modelValue', !props.modelValue);
}
</script>

<style scoped>
.switch-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-color2, #808080);
  cursor: default;
  user-select: none;
}

.switch-toggle span.active {
  color: var(--info-color, #3498db);
}

.switch-track {
  width: 44px;
  height: 24px;
  background: var(--bg-color3, #404040);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.switch-thumb {
  width: 20px;
  height: 20px;
  background: var(--text-color2, #808080);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: left 0.2s, background 0.2s;
}

.switch-thumb.on {
  left: 22px;
  background: var(--info-color, #3498db);
}
</style>
