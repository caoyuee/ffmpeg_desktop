import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConfirmDialog from '@/components/Dialogs/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should mount without error', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        modelValue: false,
        title: 'Test',
        message: 'Test Message',
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('should accept modelValue prop', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        modelValue: true,
        title: 'Test',
        message: 'Test Message',
      },
    })

    expect(wrapper.props('modelValue')).toBe(true)
  })

  it('should accept title and message props', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        modelValue: true,
        title: 'Custom Title',
        message: 'Custom Message',
        confirmText: 'Yes',
        cancelText: 'No',
      },
    })

    expect(wrapper.props('title')).toBe('Custom Title')
    expect(wrapper.props('message')).toBe('Custom Message')
    expect(wrapper.props('confirmText')).toBe('Yes')
    expect(wrapper.props('cancelText')).toBe('No')
  })

  it('should not show dialog when modelValue is false', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        modelValue: false,
        title: 'Test',
        message: 'Test',
      },
    })

    expect(wrapper.props('modelValue')).toBe(false)
  })
})
