import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import TaskItem from '@/components/TaskQueue/TaskItem.vue'
import enUS from '@/i18n/locales/en-US'
import zhCN from '@/i18n/locales/zh-CN'
import { TaskStatus } from '@/types/task'

describe('TaskItem', () => {
  function mountWithLocale(status: TaskStatus, locale: 'zh-CN' | 'en-US') {
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
        task: {
          id: 'task-1',
          inputFile: '/tmp/input.mp4',
          outputFile: '/tmp/output.mp4',
          commandLine: '',
          presetId: '',
          status,
          progress: {
            frame: 0,
            fps: 0,
            quality: 0,
            size: 0,
            time: 0,
            bitrate: 0,
            speed: 0,
            percentage: 0,
            estimatedSize: 0,
            remainingTime: 0,
          },
          logs: { all: [], errors: [] },
          createdAt: new Date(),
          elapsedTime: 0,
        },
      },
    })
  }

  it('renders English task status and action titles', () => {
    const wrapper = mountWithLocale(TaskStatus.Paused, 'en-US')

    expect(wrapper.text()).toContain('Paused')
    expect(wrapper.find('button[title="Resume"]').exists()).toBe(true)
    expect(wrapper.find('button[title="Stop"]').exists()).toBe(true)
  })
})
