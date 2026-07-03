const POSITIVE_INTEGER_RE = /^[1-9]\d*$/
const NON_NEGATIVE_INTEGER_RE = /^(?:0|[1-9]\d*)$/
const SIGNED_DECIMAL_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/
const NON_NEGATIVE_DECIMAL_RE = /^(?:\d+(?:\.\d*)?|\.\d+)$/

export function isPositiveInteger(value: string): boolean {
  return value === '' || POSITIVE_INTEGER_RE.test(value)
}

export function isNonNegativeInteger(value: string): boolean {
  return value === '' || NON_NEGATIVE_INTEGER_RE.test(value)
}

export function isSignedDecimal(value: string): boolean {
  return value === '' || SIGNED_DECIMAL_RE.test(value)
}

export function isNonNegativeDecimal(value: string): boolean {
  return value === '' || NON_NEGATIVE_DECIMAL_RE.test(value)
}

export function isPositiveDecimal(value: string): boolean {
  return value === '' || (NON_NEGATIVE_DECIMAL_RE.test(value) && Number(value) > 0)
}
