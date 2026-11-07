/// <reference types="vite/client" />

// R0-1：由 Vite/Vitest 构建期从 package.json 注入（见 scripts/bump-version.mjs）
declare const __APP_VERSION__: string

// Vue SFC 类型声明（通用占位：vue-tsc 会用真实 SFC 类型覆盖它）
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// 其他 Vite 环境变量类型声明
declare module '*.css' {
  const css: string
  export default css
}

declare module '*.scss' {
  const scss: string
  export default scss
}

declare module '*.sass' {
  const sass: string
  export default sass
}

declare module '*.less' {
  const less: string
  export default less
}
