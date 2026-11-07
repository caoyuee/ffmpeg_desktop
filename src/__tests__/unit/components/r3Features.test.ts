import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '@/store/taskStore'
import { TaskStatus, type Task } from '@/types/task'
import { emptyTaskProgress, serializeTaskQueue } from '@/config/taskQueueSchema'
import TaskItem from '@/components/TaskQueue/TaskItem.vue'
import NavigationTabs from '@/components/NavigationTabs/NavigationTabs.vue'
import WorkbenchPage from '@/pages/Workbench/index.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ path: '/workbench' }),
}))

function i18n(locale: 'zh-CN' | 'en-US' = 'en-US') {
  return createI18n({
    legacy: false,
    locale,
    messages: { 'zh-CN': zhCN, 'en-US': enUS },
  })
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    inputFile: '/media/in.mp4',
    outputFile: '/media/in_output.mp4',
    commandLine: 'ffmpeg -i "/media/in.mp4" "/media/in_output.mp4"',
    presetId: 'p1',
    status: TaskStatus.Error,
    progress: emptyTaskProgress(),
    logs: { all: [], errors: [] },
    createdAt: new Date('2026-11-07T10:00:00.000Z'),
    elapsedTime: 0,
    ...overrides,
  }
}

describe('R3.6 retryTask（任务重试用一入口）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockReset()
    localStorage.clear()
  })

  it('对失败任务生成指向新输出的新任务，原任务保留为历史', async () => {
    const store = useTaskStore()
    store.tasks = [makeTask()]
    const newId = await store.retryTask('task-1')
    await flushPromises()

    expect(newId).toBeTruthy()
    expect(store.tasks).toHaveLength(2)
    const retry = store.tasks.find((t) => t.id === newId)!
    expect(retry.status).toBe(TaskStatus.Pending)
    expect(retry.outputFile).toContain('__retry1')
    expect(retry.commandLine).toContain('__retry1')
    expect(retry.retryOf).toBe('task-1')
    expect(retry.retryAttempt).toBe(1)
    expect(store.tasks.find((t) => t.id === 'task-1')!.status).toBe(TaskStatus.Error)
  })

  it('连续重试按 retryOf 递增次数', async () => {
    const store = useTaskStore()
    store.tasks = [makeTask()]
    const first = await store.retryTask('task-1')
    const second = await store.retryTask('task-1')
    await flushPromises()
    expect(store.tasks.find((t) => t.id === first)!.retryAttempt).toBe(1)
    expect(store.tasks.find((t) => t.id === second)!.retryAttempt).toBe(2)
  })

  it('超过最大重试次数 / 非终态 / 不存在 id 都返回 null', async () => {
    const store = useTaskStore()
    store.tasks = [
      makeTask(),
      makeTask({ id: 'r1', retryOf: 'task-1', retryAttempt: 1 }),
      makeTask({ id: 'r2', retryOf: 'task-1', retryAttempt: 2 }),
      makeTask({ id: 'r3', retryOf: 'task-1', retryAttempt: 3 }),
      makeTask({ id: 'running', status: TaskStatus.Processing }),
    ]
    expect(await store.retryTask('task-1')).toBeNull()
    expect(await store.retryTask('running')).toBeNull()
    expect(await store.retryTask('missing')).toBeNull()
    expect(store.tasks).toHaveLength(5)
  })

  it('重试任务与其他元数据一起进入队列快照（生效链路）', async () => {
    const store = useTaskStore()
    store.tasks = [makeTask()]
    await store.retryTask('task-1')
    const { restoreTasks } = await import('@/config/taskQueueSchema')
    const restored = restoreTasks(serializeTaskQueue(store.tasks), 'interrupted')
    expect(restored.find((t) => t.retryOf === 'task-1')).toBeTruthy()
  })
})

describe('R3.8 任务卡监视墙与重试入口', () => {
  it('Processing 状态显示等宽监视行', () => {
    const task = makeTask({
      status: TaskStatus.Processing,
      progress: {
        ...emptyTaskProgress(),
        fps: 118.4,
        speed: '3.4x',
        size: '812MiB',
        bitrate: '1200kbps',
        remainingTime: 138,
      },
    })
    const wrapper = mount(TaskItem, {
      props: { task },
      global: { plugins: [i18n()] },
    })
    const line = wrapper.get('[data-testid="monitor-line"]')
    expect(line.text()).toContain('118')
    expect(line.text()).toContain('3.4x')
  })

  it('终态失败任务提供可点击的重试按钮并 emit id', async () => {
    const wrapper = mount(TaskItem, {
      props: { task: makeTask({ status: TaskStatus.Error, error: 'boom' }) },
      global: { plugins: [i18n()] },
    })
    await wrapper.get('[data-testid="retry-task"]').trigger('click')
    expect(wrapper.emitted('retry')?.[0]).toEqual(['task-1'])
  })

  it('进行中任务不显示重试按钮', () => {
    const wrapper = mount(TaskItem, {
      props: { task: makeTask({ status: TaskStatus.Processing }) },
      global: { plugins: [i18n()] },
    })
    expect(wrapper.find('[data-testid="retry-task"]').exists()).toBe(false)
  })
})

describe('R3.8 导航与工作台', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockReset()
  })

  it('导航是语义 nav + 可聚焦按钮，含工作台分组与 aria-current', () => {
    const wrapper = mount(NavigationTabs, { global: { plugins: [i18n()] } })
    expect(wrapper.find('nav').exists()).toBe(true)
    expect(wrapper.findAll('button').length).toBeGreaterThanOrEqual(3)
    expect(wrapper.find('[data-testid="nav-workbench"]').exists()).toBe(true)
    expect(wrapper.html()).toContain('aria-current')
  })

  it('点击工作台导航触发路由跳转', async () => {
    const wrapper = mount(NavigationTabs, { global: { plugins: [i18n()] } })
    await wrapper.get('[data-testid="nav-workbench"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/workbench')
  })

  it('工作台空态与三区结构渲染', () => {
    const wrapper = shallowMount(WorkbenchPage, { global: { plugins: [i18n()] } })
    expect(wrapper.find('[data-testid="workbench-files"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-params"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-queue"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="workbench-empty"]').exists()).toBe(true)
  })
})
