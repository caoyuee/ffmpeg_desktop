import { describe, expect, it } from 'vitest'
import { calculateContainSize } from '@/utils/cropPreview'

describe('calculateContainSize', () => {
  it('keeps content size when it already fits in the container', () => {
    expect(calculateContainSize(1200, 900, 800, 450)).toEqual({
      width: 800,
      height: 450,
    })
  })

  it('scales content down to fit the container while keeping aspect ratio', () => {
    expect(calculateContainSize(900, 650, 1920, 1080)).toEqual({
      width: 900,
      height: 506,
    })
  })
})
