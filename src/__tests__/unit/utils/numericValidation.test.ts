import { describe, expect, it } from 'vitest'
import {
  isNonNegativeDecimal,
  isNonNegativeInteger,
  isPositiveDecimal,
  isPositiveInteger,
  isSignedDecimal,
} from '@/utils/numericValidation'

describe('numericValidation', () => {
  it('validates positive integers', () => {
    expect(isPositiveInteger('1')).toBe(true)
    expect(isPositiveInteger('001')).toBe(false)
    expect(isPositiveInteger('0')).toBe(false)
    expect(isPositiveInteger('-1')).toBe(false)
  })

  it('validates non-negative integers', () => {
    expect(isNonNegativeInteger('0')).toBe(true)
    expect(isNonNegativeInteger('12')).toBe(true)
    expect(isNonNegativeInteger('-1')).toBe(false)
    expect(isNonNegativeInteger('1.2')).toBe(false)
  })

  it('validates positive decimals', () => {
    expect(isPositiveDecimal('0.5')).toBe(true)
    expect(isPositiveDecimal('16')).toBe(true)
    expect(isPositiveDecimal('0')).toBe(false)
    expect(isPositiveDecimal('-1.2')).toBe(false)
  })

  it('validates non-negative decimals', () => {
    expect(isNonNegativeDecimal('0')).toBe(true)
    expect(isNonNegativeDecimal('0.25')).toBe(true)
    expect(isNonNegativeDecimal('-0.25')).toBe(false)
  })

  it('validates signed decimals', () => {
    expect(isSignedDecimal('-16')).toBe(true)
    expect(isSignedDecimal('-1.5')).toBe(true)
    expect(isSignedDecimal('2')).toBe(true)
    expect(isSignedDecimal('abc')).toBe(false)
  })
})
