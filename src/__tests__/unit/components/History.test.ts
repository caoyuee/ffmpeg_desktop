import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useTaskStore } from '@/store/taskStore'
import { TaskStatus, type Task } from '@/types/task'
import HistoryPage from '@/pages/History/index.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

const mockInvoke = vi.mocked(invoke)
const writeText = vi.fn()

// ConfirmDialog 用 Teleport + Transition，单测里换成最小可交互替身。
vi.mock('@/components/Dialogs/ConfirmDialog.vue', () => ({
  default: {
    props: ['modelValue', 'title', 'message', 'confirmText', 'cancelText'],
    emits: ['confirm', 'cancel', 'update:modelValue'],
    template: `<button v-if="modelValue" data-testid="confirm-clear" @click="$emit('confirm')">confirm</button>`,
  },
}))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't-default',
    inputFile: '/media/in.mp4',
    outputFile: '/media/out.mp4',
    commandLine: 'ffmpeg -i in.mp4 out.mp4',
    presetId: 'p1',
    status: TaskStatus.Completed,
    progress: {
      frame: null,
      fps: null,
      time: null,
      bitrate: null,
      speed: null,
      size: null,
      quality: 0,
      percentage: 0,
      estimatedSize: 0,
      remainingTime: 0,
    },
    logs: { all: [], errors: [] },
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    startedAt: new Date('2026-11-01T10:00:05.000Z'),
    completedAt: new Date('2026-11-01T10:01:05.000Z'),
    elapsedTime: 0,
    ...overrides,
  }
}

function seed(tasks: Task[]) {
  const store = useTaskStore()
  store.tasks = tasks
  return store
}

function mountPage(locale = 'en-US') {
  const i18n = createI18n({
    legacy: false,
    locale,
    messages: { 'zh-CN': zhCN, 'en-US': enUS },
  })
  return mount(HistoryPage, { global: { plugins: [i18n] } })
}

const seedTasks = [
  makeTask({
    id: 'a',
    inputFile: 'Holiday.mp4',
    outputFile: 'Holiday_out.mp4',
    completedAt: new Date('2026-11-01T10:01:05.000Z'),
  }),
  makeTask({
    id: 'b',
    inputFile: 'clip.mkv',
    outputFile: 'clip_out.mkv',
    status: TaskStatus.Error,
    error: 'disk full',
    errorType: 'process',
    startedAt: new Date('2026-11-02T10:00:00.000Z'),
    completedAt: new Date('2026-11-02T10:00:10.000Z'),
  }),
  makeTask({
    id: 'c',
    inputFile: 'demo.mp4',
    outputFile: 'demo_out.mp4',
    status: TaskStatus.Stopped,
    completedAt: new Date('2026-11-03T10:00:00.000Z'),
    startedAt: undefined,
  }),
  makeTask({
    id: 'd',
    inputFile: 'pending.mp4',
    outputFile: 'pending_out.mp4',
    status: TaskStatus.Pending,
  }),
]

describe('R3.2 History 页面', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockInvoke.mockReset()
    writeText.mockReset()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
  })

  it('只统计终态：总数、成功率、各状态计数与行数', () => {
    seed(seedTasks)
    const wrapper = mountPage()

    expect(wrapper.get('[data-testid="stat-total"]').text()).toContain('3')
    expect(wrapper.get('[data-testid="stat-success-rate"]').text()).toContain('33.3%')
    expect(wrapper.get('[data-testid="stat-completed"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="stat-failed"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="stat-stopped"]').text()).toContain('1')
    expect(wrapper.findAll('[data-testid="history-row"]')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('pending.mp4')
  })

  it('空历史显示空态，不显示伪造的统计值', () => {
    seed([])
    const wrapper = mountPage()
    expect(wrapper.get('[data-testid="history-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="history-row"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="stat-success-rate"]').text()).toContain('0.0%')
  })

  it('状态筛选与关键字搜索可组合', async () => {
    seed(seedTasks)
    const wrapper = mountPage()

    await wrapper.get('[data-testid="history-filter-outcome"]').setValue('failed')
    expect(wrapper.findAll('[data-testid="history-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="history-row"]').text()).toContain('clip.mkv')

    await wrapper.get('[data-testid="history-filter-outcome"]').setValue('all')
    await wrapper.get('[data-testid="history-search"]').setValue('HOLIDAY')
    expect(wrapper.findAll('[data-testid="history-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="history-row"]').text()).toContain('Holiday.mp4')
  })

  it('按耗时排序改变行顺序', async () => {
    seed(seedTasks)
    const wrapper = mountPage()
    await wrapper.get('[data-testid="history-sort"]').setValue('durationMs')
    const ids = wrapper
      .findAll('[data-testid="history-row"]')
      .map((row) => row.attributes('data-task-id'))
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('刷新体积后展示压缩比，体积查询失败不崩溃', async () => {
    mockInvoke.mockImplementation(async (command, args: unknown) => {
      if (command === 'get_file_sizes') {
        const paths = (args as { paths: string[] }).paths
        return paths.map((p) => (p.includes('_out') ? 250 : 1000))
      }
      return null
    })
    seed(seedTasks)
    const wrapper = mountPage()

    await wrapper.get('[data-testid="history-refresh-sizes"]').trigger('click')
    await flushPromises()

    expect(mockInvoke).toHaveBeenCalledWith(
      'get_file_sizes',
      expect.objectContaining({ paths: expect.any(Array) }),
    )
    expect(wrapper.text()).toContain('75.0%')

    mockInvoke.mockRejectedValueOnce(new Error('disk gone'))
    await wrapper.get('[data-testid="history-refresh-sizes"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="history-page"]').exists()).toBe(true)
  })

  it('复制 CSV / JSON 使用唯一导出层', async () => {
    seed(seedTasks)
    const wrapper = mountPage()

    await wrapper.get('[data-testid="history-copy-csv"]').trigger('click')
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0]![0]).toContain('inputFile')

    await wrapper.get('[data-testid="history-copy-json"]').trigger('click')
    const payload = JSON.parse(writeText.mock.calls[1]![0] as string)
    expect(payload.format).toBe('ffmpeg-desktop/history')
    expect(payload.entries).toHaveLength(3)
  })

  it('清空历史需确认，且只删终态任务', async () => {
    const store = seed(seedTasks)
    const wrapper = mountPage()

    await wrapper.get('[data-testid="history-clear"]').trigger('click')
    expect(wrapper.get('[data-testid="confirm-clear"]').exists()).toBe(true)
    await wrapper.get('[data-testid="confirm-clear"]').trigger('click')

    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0]!.status).toBe(TaskStatus.Pending)
  })

  it('中文界面显示本地化统计标签', () => {
    seed(seedTasks)
    const wrapper = mountPage('zh-CN')
    expect(wrapper.text()).toContain('成功率')
    expect(wrapper.text()).toContain('平均耗时')
  })
})
