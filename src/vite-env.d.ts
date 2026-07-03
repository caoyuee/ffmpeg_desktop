/// <reference types="vite/client" />

// Vue SFC 类型声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
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
