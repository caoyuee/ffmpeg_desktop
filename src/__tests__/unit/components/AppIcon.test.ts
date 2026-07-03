import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppIcon from '@/components/AppIcon/AppIcon.vue'

describe('AppIcon', () => {
  it('renders an svg icon by name', () => {
    const wrapper = mount(AppIcon, {
      props: {
        name: 'play',
      },
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('path').exists()).toBe(true)
  })

  it('applies the requested size', () => {
    const wrapper = mount(AppIcon, {
      props: {
        name: 'folder',
        size: 28,
      },
    })

    expect(wrapper.attributes('width')).toBe('28')
    expect(wrapper.attributes('height')).toBe('28')
  })
})
