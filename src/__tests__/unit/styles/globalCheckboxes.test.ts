import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('global checkbox styles', () => {
  it('keeps checkbox inputs on the native checkbox appearance', () => {
    const globalCss = readFileSync(resolve(process.cwd(), 'src/assets/styles/global.css'), 'utf-8')

    // CSS 引号风格由 Prettier（singleQuote）统一，这里只断言语义不锁定引号
    expect(globalCss).toMatch(/\[type=['"]checkbox['"]\],/)
    expect(globalCss).toContain('-webkit-appearance: checkbox;')
    expect(globalCss).toContain('appearance: checkbox;')
  })
})
