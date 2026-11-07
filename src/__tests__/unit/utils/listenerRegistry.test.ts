import { describe, it, expect, vi } from 'vitest'
import { createListenerRegistry } from '@/utils/listenerRegistry'

describe('R1-13 监听器统一释放', () => {
  it('cleanup 释放全部登记的监听器（含成功路径容易漏掉的 error）', () => {
    const registry = createListenerRegistry()
    const progress = vi.fn()
    const finish = vi.fn()
    const error = vi.fn()

    registry.add(progress)
    registry.add(finish)
    registry.add(error)
    registry.cleanup()

    expect(progress).toHaveBeenCalledTimes(1)
    expect(finish).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
    expect(registry.isCleaned).toBe(true)
  })

  it('cleanup 幂等，不会重复 unlisten', () => {
    const registry = createListenerRegistry()
    const unlisten = vi.fn()

    registry.add(unlisten)
    registry.cleanup()
    registry.cleanup()

    expect(unlisten).toHaveBeenCalledTimes(1)
  })

  it('cleanup 之后才登记的监听器会被立即释放', () => {
    const registry = createListenerRegistry()
    const late = vi.fn()

    registry.cleanup()
    registry.add(late)

    expect(late).toHaveBeenCalledTimes(1)
  })
})
