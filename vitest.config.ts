import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-reports/frontend/coverage',
      exclude: [
        'node_modules/',
        'src-tauri/',
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
