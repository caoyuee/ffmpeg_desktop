import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLogsStore } from '@/store/logsStore'

describe('logsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start with empty logs', () => {
    const store = useLogsStore()
    expect(store.logsList).toEqual([])
  })

  it('should push a log', () => {
    const store = useLogsStore()
    store.PushLog('test message')
    expect(store.logsList).toHaveLength(1)
    expect(store.logsList[0]).toBe('test message')
  })

  it('should clear logs', () => {
    const store = useLogsStore()
    store.PushLog('msg1')
    store.PushLog('msg2')
    store.clearLogs()
    expect(store.logsList).toHaveLength(0)
  })

  it('should init logs (clear)', () => {
    const store = useLogsStore()
    store.PushLog('a')
    store.PushLog('b')
    store.InitLogs()
    expect(store.logsList).toEqual([])
  })

  it('should edit a log by index', () => {
    const store = useLogsStore()
    store.PushLog('a')
    store.PushLog('b')
    store.PushLog('c')
    store.EditLog(1, 'updated')
    expect(store.logsList[1]).toBe('updated')
  })
})
