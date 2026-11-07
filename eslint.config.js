import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfigWithVueTs(
  // 全局忽略
  {
    ignores: [
      'dist/**',
      'dist-ssr/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-reports/**',
      'test-results/**',
      'src-tauri/**',
      '.Trash-*/**',
      '.agents/**',
      '*.local',
    ],
  },

  // JS/TS 通用检查
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // TypeScript 项目中由编译器保证，ESLint 只提示
      'no-unused-vars': 'off',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',
    },
  },

  // 构建 / 工具脚本：console 输出是脚本的正常交互方式
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '*.{js,mjs,cjs}'],
    rules: {
      'no-console': 'off',
    },
  },

  // Vue SFC + TypeScript
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    files: ['**/*.vue'],
    rules: {
      // 多单词组件名：页面入口 index.vue 与 App.vue 属于约定，关闭
      'vue/multi-word-component-names': 'off',
      // 与项目 PascalCase 组件文件命名规范配合，交给人工/规范约束
      'vue/component-name-in-template-casing': ['warn', 'PascalCase'],
      'vue/define-macros-order': ['error', { order: ['defineProps', 'defineEmits'] }],
    },
  },

  // 必须放在最后：关闭所有与 Prettier 冲突的格式化规则
  eslintConfigPrettier,
)
