<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="dialog-overlay" @click.self="onCancel">
        <div class="dialog-container">
          <div class="dialog-header">
            <span class="dialog-title">{{ title }}</span>
          </div>
          <div class="dialog-content">
            <p>{{ message }}</p>
          </div>
          <div class="dialog-footer">
            <button class="app-btn" @click="onCancel">
              {{ cancelText }}
            </button>
            <button class="app-btn app-btn--primary" @click="onConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [];
  'cancel': [];
}>();

function onConfirm() {
  emit('update:modelValue', false);
  emit('confirm');
}

function onCancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-container {
  background: var(--bg-color2, #242424);
  border-radius: 8px;
  min-width: 320px;
  max-width: 480px;
  box-shadow: var(--shadow-lg, 0 4px 20px rgba(0, 0, 0, 0.4));
  border: 1px solid var(--border-color1, #333);
}

.dialog-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color1, #333);
}

.dialog-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color1, #c0c0c0);
}

.dialog-content {
  padding: 20px;
}

.dialog-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-color2, #909090);
  line-height: 1.5;
}

.dialog-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-color1, #333);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-container,
.dialog-leave-active .dialog-container {
  transition: transform 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-container,
.dialog-leave-to .dialog-container {
  transform: scale(0.95);
}
</style>
