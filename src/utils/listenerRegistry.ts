/**
 * R1-13：Tauri 事件监听器统一登记 / 统一释放。
 * 《接力开发手册》§2 要求每个 listen 都有对应 unlisten；QualityAssess 的成功路径
 * 曾漏掉 error 监听器，每次评测累积一个全局 listener（审计 P1-10）。
 */
export interface ListenerRegistry {
  add(unlisten: () => void): void
  cleanup(): void
  readonly isCleaned: boolean
}

export function createListenerRegistry(): ListenerRegistry {
  const unlisteners: Array<() => void> = []
  let cleaned = false

  return {
    add(unlisten: () => void) {
      // 竞态保护：若在注册过程中已触发 finish/error，晚到的监听器立即释放。
      if (cleaned) {
        unlisten()
        return
      }
      unlisteners.push(unlisten)
    },
    cleanup() {
      if (cleaned) return
      cleaned = true
      unlisteners.forEach((unlisten) => unlisten())
      unlisteners.length = 0
    },
    get isCleaned() {
      return cleaned
    },
  }
}
