import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { configDefaults } from 'vitest/config'

export default defineConfig({
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
      lines: 85,
      functions: 80,
      branches: 75,
      statements: 85,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
