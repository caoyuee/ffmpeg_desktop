<template>
  <Teleport to="body">
    <div class="app-toast-host" aria-live="polite">
      <TransitionGroup name="app-toast">
        <div
          v-for="notification in notificationStore.notifications"
          :key="notification.id"
          class="app-toast-host__item"
          :class="notification.type"
          role="status"
        >
          <AppIcon :name="iconMap[notification.type]" :size="16" class="icon" />
          <span class="message">{{ t(notification.messageKey, notification.params ?? {}) }}</span>
          <button
            class="close"
            :aria-label="t('common.close')"
            @click="notificationStore.dismiss(notification.id)"
          >
            <AppIcon name="close" :size="12" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { useNotificationStore, type NotificationType } from '@/store/notificationStore'

// P1-2：showNotification 的展示端。store 只存 messageKey，文案统一在这里经 i18n 解析。
const { t } = useI18n()
const notificationStore = useNotificationStore()

const iconMap: Record<NotificationType, 'success' | 'error' | 'info'> = {
  success: 'success',
  error: 'error',
  info: 'info',
}
</script>

<style scoped>
.app-toast-host {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.app-toast-host__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 220px;
  max-width: 360px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--bg-color3, #2a2a2a);
  color: var(--text-color1, #e0e0e0);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  font-size: 13px;
  pointer-events: auto;
}

.app-toast-host__item.success .icon {
  color: var(--success-color, #27ae60);
}

.app-toast-host__item.error .icon {
  color: var(--error-color, #e74c3c);
}

.app-toast-host__item.info .icon {
  color: var(--active-color, #9acd32);
}

.message {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close {
  display: flex;
  align-items: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--text-color2, #999);
  cursor: pointer;
}

.close:hover {
  color: var(--text-color1, #e0e0e0);
}

.app-toast-enter-active,
.app-toast-leave-active {
  transition: all 0.25s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
