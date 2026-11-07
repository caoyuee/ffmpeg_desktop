import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import TaskItem from '@/components/TaskQueue/TaskItem.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { TaskStatus } from '@/types/task'
import type { Task } from '@/types/task'

function makeTask(status: TaskStatus): Task {
  return {
    id: 'task-1',
    inputFile: '/tmp/input.mp4',
    outputFile: '/tmp/output.mp4',
    commandLine: '',
    presetId: '',
    status,
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
    pid: 1234,
  }
}

describe('TaskItem', () => {
  function mountWithLocale(
    status: TaskStatus,
    locale: 'zh-CN' | 'en-US',
    extraProps: Record<string, unknown> = {},
  ) {
    const i18n = createI18n({
      legacy: false,
      locale,
      messages: {
        'zh-CN': zhCN,
        'en-US': enUS,
      },
    })

    return mount(TaskItem, {
      global: {
        plugins: [i18n],
      },
      props: {
        task: makeTask(status),
        ...extraProps,
      },
    })
  }

  it('renders English task status and action titles', () => {
    const wrapper = mountWithLocale(TaskStatus.Paused, 'en-US')

    expect(wrapper.text()).toContain('Paused')
    expect(wrapper.find('button[title="Resume"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Stop"]').exists()).toBe(true)
  })

  it('R1-2 点击卡片会 emit select 并携带任务 id', async () => {
    const wrapper = mountWithLocale(TaskStatus.Pending, 'en-US')

    await wrapper.find('.task-item').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual(['task-1'])
  })

  it('R1-2 键盘 Enter / Space 也能选中', async () => {
    const wrapper = mountWithLocale(TaskStatus.Pending, 'en-US')

    await wrapper.find('.task-item').trigger('keydown.enter')
    await wrapper.find('.task-item').trigger('keydown.space')

    expect(wrapper.emitted('select')).toHaveLength(2)
  })

  it('R1-2 操作按钮不会误触发 select', async () => {
    const wrapper = mountWithLocale(TaskStatus.Processing, 'en-US')

    await wrapper.find('button[title="Pause Task"]').trigger('click')

    expect(wrapper.emitted('pause')?.[0]).toEqual(['task-1'])
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('R1-2 selected prop 渲染选中态', () => {
    const wrapper = mountWithLocale(TaskStatus.Pending, 'en-US', { selected: true })

    expect(wrapper.find('.task-item.is-selected').exists()).toBe(true)
  })

  it('R1-11 Windows 反斜杠路径也能取到文件名', () => {
    const wrapper = mountWithLocale(TaskStatus.Pending, 'en-US')
    const task = makeTask(TaskStatus.Pending)
    task.inputFile = 'C:\\Videos\\movie.mp4'

    // 通过 props 更新验证文件名解析
    return wrapper.setProps({ task }).then(() => {
      expect(wrapper.find('.task-name').text()).toBe('movie.mp4')
    })
  })
})
