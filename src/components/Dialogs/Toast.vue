<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="modelValue" class="toast-container" :class="type">
        <span class="toast-icon">{{ iconMap[type] }}</span>
        <span class="toast-message">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted, ref } from 'vue';

type ToastType = 'success' | 'error' | 'warning' | 'info';

const props = defineProps<{
  modelValue: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const iconMap: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const timerRef = ref<ReturnType<typeof setTimeout> | null>(null);

watch(() => props.modelValue, (val) => {
  if (val) {
    if (timerRef.value) {
      clearTimeout(timerRef.value);
    }
    timerRef.value = setTimeout(() => {
      emit('update:modelValue', false);
      timerRef.value = null;
    }, props.duration || 2000);
  } else {
    if (timerRef.value) {
      clearTimeout(timerRef.value);
      timerRef.value = null;
    }
  }
});

onUnmounted(() => {
  if (timerRef.value) {
    clearTimeout(timerRef.value);
    timerRef.value = null;
  }
});
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10000;
  border: 1px solid var(--border-color1, #333);
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  font-size: 14px;
  color: var(--text-color1, #c0c0c0);
}

.toast-container.success {
  border-color: var(--success-color, #27ae60);
}

.toast-container.success .toast-icon {
  color: var(--success-color, #27ae60);
}

.toast-container.error {
  border-color: var(--error-color, #e74c3c);
}

.toast-container.error .toast-icon {
  color: var(--error-color, #e74c3c);
}

.toast-container.warning {
  border-color: var(--warning-color, #f39c12);
}

.toast-container.warning .toast-icon {
  color: var(--warning-color, #f39c12);
}

.toast-container.info {
  border-color: var(--info-color, #3498db);
}

.toast-container.info .toast-icon {
  color: var(--info-color, #3498db);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
