import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import TaskQueue from '@/components/TaskQueue/TaskQueue.vue'
import { useTaskStore } from '@/store/taskStore'
import { TaskStatus } from '@/types/task'
import type { Task } from '@/types/task'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'

function makeTask(id: string): Task {
  return {
    id,
    inputFile: `/tmp/${id}.mp4`,
    outputFile: `/tmp/${id}_out.mp4`,
    commandLine: '',
    presetId: '',
    status: TaskStatus.Pending,
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
    createdAt: new Date(),
    elapsedTime: 0,
  }
}

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
})

function mountQueue(selectedIds: Set<string> = new Set()) {
  const store = useTaskStore()
  store.tasks.push(makeTask('task-1'), makeTask('task-2'))

  return mount(TaskQueue, {
    global: { plugins: [i18n] },
    props: { selectedIds },
  })
}

describe('TaskQueue R1-2 选中链路', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('点击任务卡片时把 select 冒泡给页面', async () => {
    const wrapper = mountQueue()

    await wrapper.find('.task-item').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual(['task-1'])
  })

  it('selectedIds 决定卡片的选中态', () => {
    const wrapper = mountQueue(new Set(['task-2']))

    const items = wrapper.findAll('.task-item')
    expect(items[0]!.classes()).not.toContain('is-selected')
    expect(items[1]!.classes()).toContain('is-selected')
  })

  it('V3 选中态可在运行时随 selectedIds 更新', async () => {
    const selectedIds = new Set<string>()
    const wrapper = mountQueue(selectedIds)

    selectedIds.add('task-1')
    await wrapper.setProps({ selectedIds: new Set(selectedIds) })

    expect(wrapper.find('.task-item.is-selected').exists()).toBe(true)
  })
})
