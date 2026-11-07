import { defineStore } from 'pinia'

/**
 * P1-2 收尾：showNotification 设置的消费层——应用内通知中心。
 *
 * 设置页「任务完成后显示通知」此前无消费方（not-effective 标注），现在
 * taskStore 在任务终态时按该设置推送通知，本 store 是唯一聚合点。
 * 纯前端实现（应用内 toast），不依赖系统通知权限；挂载点是 MainLayout 的
 * AppToastHost。messageKey 经 i18n 在展示层解析，store 不认识文案。
 */

export type NotificationType = 'success' | 'error' | 'info'

export interface AppNotification {
  id: number
  messageKey: string
  params?: Record<string, unknown>
  type: NotificationType
}

/** 同屏通知上限，超出丢弃最旧，防止长时间无人值守运行把 UI 撑爆。 */
const MAX_NOTIFICATIONS = 5

let nextId = 1

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as AppNotification[],
  }),
  actions: {
    /**
     * 推送一条通知，duration 毫秒后自动消失（默认 4s）。
     * @returns 通知 id，可用于提前 dismiss。
     */
    push(
      messageKey: string,
      params?: Record<string, unknown>,
      type: NotificationType = 'info',
      duration = 4000,
    ): number {
      const id = nextId++
      const notification: AppNotification = {
        id,
        messageKey: typeof messageKey === 'string' ? messageKey : '',
        type: type === 'success' || type === 'error' ? type : 'info',
      }
      if (params && typeof params === 'object') {
        notification.params = params
      }

      this.notifications.push(notification)
      if (this.notifications.length > MAX_NOTIFICATIONS) {
        this.notifications.splice(0, this.notifications.length - MAX_NOTIFICATIONS)
      }

      setTimeout(() => this.dismiss(id), duration)
      return id
    },

    dismiss(id: number) {
      const index = this.notifications.findIndex((n) => n.id === id)
      if (index >= 0) {
        this.notifications.splice(index, 1)
      }
    },
  },
})
