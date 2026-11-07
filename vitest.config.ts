import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { readFileSync } from 'node:fs'
import { configDefaults } from 'vitest/config'

// 与 vite.config.ts 保持同一版本源，保证单测环境也能读到 __APP_VERSION__。
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-reports/frontend/coverage',
      exclude: [
        'node_modules/',
        'src-tauri/',
        'e2e/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
      // R0-4：阈值必须放在 thresholds 内才会生效。旧配置把数值平铺在 coverage 下，
      // Vitest 会直接忽略，导致 53% 覆盖率也能"通过"门禁。
      // 2026-11-07 初始实测基线：statements 53.68 / branches 49.43 / functions 38.30 / lines 53.87。
      // 约定「只升不降」：每轮补测试后上调到上一轮已稳定验证的实测地板值，不顶到当轮峰值。
      // R0/R1 后实测 56.39 / 51.37 / 42.55 / 56.32 → 阈值上调为 56 / 51 / 42 / 56。
      // R2.1 后实测 58.48 / 52.32 / 44.12 / 58.53（当前余量充足）。
      // R2.2 后实测 58.03 / 51.88 / 44.50 / 58.08（删死代码导致分母变化，保持阈值不变）。
      // R2.3 后实测 59.48 / 52.66 / 47.36 / 59.45（四项均回升，按不顶峰值原则仍保持 56/42/51/56）。
      // R2.4 后实测 61.33 / 54.07 / 49.86 / 61.27（四项继续提升，仍保持 56/42/51/56）。
      // R2.5 后实测 62.73 / 55.77 / 51.06 / 62.53（四项继续提升，仍保持 56/42/51/56）。
      // R3.1 后实测 64.36 / 57.14 / 52.83 / 64.24（四项继续提升，仍保持 56/42/51/56）。
      // R3.2 后实测 66.48 / 59.86 / 55.67 / 66.34（四项继续提升，仍保持 56/42/51/56）。
      // R3.8 后实测 68.50 / 62.89 / 58.59 / 68.38（四项继续提升，仍保持 56/42/51/56）。
      // R1-7 收官后实测 68.60 / 63.12 / 58.85 / 68.40（四项继续提升，仍保持 56/42/51/56）。
      // 禁止删除或下调阈值。
      thresholds: {
        lines: 56,
        functions: 42,
        branches: 51,
        statements: 56,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
