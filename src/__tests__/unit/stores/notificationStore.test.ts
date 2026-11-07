import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '@/store/notificationStore'

describe('notificationStore（P1-2：showNotification 消费层）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('push 追加通知并自动在 duration 后消失', () => {
    const store = useNotificationStore()
    store.push('notification.taskCompleted', { file: 'a.mkv' }, 'success', 1000)
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]?.messageKey).toBe('notification.taskCompleted')
    expect(store.notifications[0]?.params).toEqual({ file: 'a.mkv' })

    vi.advanceTimersByTime(1000)
    expect(store.notifications).toHaveLength(0)
  })

  it('多条通知独立倒计时，先到先消失', () => {
    const store = useNotificationStore()
    store.push('notification.taskCompleted', {}, 'success', 1000)
    store.push('notification.taskFailed', {}, 'error', 3000)

    vi.advanceTimersByTime(1000)
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]?.type).toBe('error')

    vi.advanceTimersByTime(2000)
    expect(store.notifications).toHaveLength(0)
  })

  it('超过上限时丢弃最旧通知', () => {
    const store = useNotificationStore()
    for (let i = 0; i < 7; i++) {
      store.push('notification.taskCompleted', { file: String(i) }, 'success', 10_000)
    }
    expect(store.notifications).toHaveLength(5)
    expect(store.notifications[0]?.params).toEqual({ file: '2' })
  })

  it('dismiss 立即移除指定通知且不触发定时器泄漏', () => {
    const store = useNotificationStore()
    const id = store.push('notification.taskCompleted', {}, 'success', 10_000)
    store.dismiss(id)
    expect(store.notifications).toHaveLength(0)

    vi.advanceTimersByTime(20_000)
    expect(store.notifications).toHaveLength(0)
  })

  it('非法 messageKey / type 回退为 info，不抛错', () => {
    const store = useNotificationStore()
    store.push('', {}, 'weird' as 'info')
    expect(store.notifications[0]?.type).toBe('info')
  })
})
