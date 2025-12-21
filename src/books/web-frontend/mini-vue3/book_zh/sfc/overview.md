# SFC 概述：.vue 文件的编译流程

**首先要问的是**：一个 `.vue` 文件是如何被转换成可执行的 JavaScript 代码的？

浏览器不认识 `.vue` 文件——它只理解 HTML、CSS 和 JavaScript。**那 Vue 是怎么做到的？**

**这个问题的答案会揭示 Vue 工具链的核心工作原理**。理解 SFC 编译流程，你就能明白为什么需要 Vite、vue-loader 这些构建工具，以及它们背后做了什么。

## SFC 是什么

SFC（Single File Component）将模板、逻辑和样式封装在一个文件中：

```html
<template>
  <div class="greeting">
    <h1>{{ message }}</h1>
    <button @click="greet">Greet</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('Hello Vue!')
const greet = () => alert(message.value)
</script>

<style scoped>
.greeting { padding: 20px; }
h1 { color: #42b883; }
</style>
```

这种设计的优势：

1. **语法高亮**：编辑器为每个块提供专门支持
2. **组件封装**：一个文件包含完整定义
3. **预编译优化**：编译时进行静态分析
4. **热更新**：每个块可独立热更新
5. **作用域样式**：CSS 自动作用域化

## 编译流程全景

```
.vue 文件
    │
    ▼
┌─────────────────────────────────┐
│           parse()               │
│  解析为 SFCDescriptor           │
│  分离 template/script/style     │
└───────────────┬─────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
template      script       style
    │           │           │
    ▼           ▼           ▼
compile     compile      compile
Template    Script       Style
    │           │           │
    ▼           ▼           ▼
render函数  组件定义    CSS代码
    │           │           │
    └─────┬─────┘           │
          ▼                 ▼
    最终 JS 模块       CSS 文件/注入
```

## @vue/compiler-sfc

这是 Vue SFC 编译器的入口包：

```javascript
// 核心 API
export {
  parse,              // 解析 .vue 文件
  compileTemplate,    // 编译 template 块
  compileScript,      // 编译 script/script setup
  compileStyle,       // 编译 style 块
}
```

依赖关系：

```
@vue/compiler-sfc
    ├── @vue/compiler-core   // 模板编译核心
    ├── @vue/compiler-dom    // DOM 平台编译
    └── @vue/compiler-ssr    // SSR 编译
```

## SFCDescriptor

解析 `.vue` 文件后的数据结构：

```javascript
interface SFCDescriptor {
  filename: string
  source: string
  
  template: SFCTemplateBlock | null
  script: SFCScriptBlock | null
  scriptSetup: SFCScriptBlock | null
  styles: SFCStyleBlock[]
  customBlocks: SFCBlock[]
  
  // 响应式 CSS 变量
  cssVars: string[]
  // 是否使用了 slotted
  slotted: boolean
}
```

每个块包含内容和位置信息：

```javascript
interface SFCBlock {
  type: string
  content: string
  loc: SourceLocation
  attrs: Record<string, string | true>
  lang?: string
}
```

## 编译产物示例

输入 `.vue` 文件：

```html
<template>
  <div>{{ msg }}</div>
</template>

<script setup>
import { ref } from 'vue'
const msg = ref('Hello')
</script>

<style scoped>
div { color: red; }
</style>
```

编译输出：

```javascript
import { ref } from 'vue'
import { toDisplayString, openBlock, createElementBlock } from 'vue'

const _sfc_main = {
  __name: 'App',
  setup(__props) {
    const msg = ref('Hello')
    return (_ctx, _cache) => {
      return (openBlock(), createElementBlock("div", null, 
        toDisplayString(msg.value)))
    }
  }
}

// scoped 样式注入
import '/App.vue?vue&type=style&index=0&scoped=true'

export default _sfc_main
```

样式编译为：

```css
div[data-v-7ba5bd90] { color: red; }
```

## 构建工具集成

Vue SFC 编译器不直接运行，需要构建工具调用：

- **Vite**：@vitejs/plugin-vue
- **Webpack**：vue-loader
- **Rollup**：rollup-plugin-vue

这些工具负责：

1. 识别 `.vue` 文件
2. 调用 `parse` 解析
3. 调用各 `compile*` 函数编译
4. 处理 Source Map
5. 实现热更新

## 本章小结

本章建立了 SFC 编译的全景认知：

- **SFC 设计**：模板、逻辑、样式封装
- **编译流程**：parse → compileScript/Template/Style
- **核心包**：@vue/compiler-sfc
- **数据结构**：SFCDescriptor

下一章将深入分析 SFC 的解析过程。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

- **parse**：`packages/compiler-sfc/src/parse.ts`
- **compileTemplate**：`packages/compiler-sfc/src/compileTemplate.ts`
- **compileScript**：`packages/compiler-sfc/src/compileScript.ts`
- **compileStyle**：`packages/compiler-sfc/src/compileStyle.ts`
- **SFCDescriptor**：`packages/compiler-sfc/src/parse.ts`

---

## 踩坑经验

**1. 文件名大小写问题**

```javascript
// ❌ Windows 下可能正常，Linux 部署时报错
import MyComponent from './myComponent.vue'

// ✅ 文件名与导入保持一致
import MyComponent from './MyComponent.vue'
```

**2. 热更新不生效**

```javascript
// 如果组件没有 name 或 __name，热更新可能失效
// <script setup> 会自动推断 __name
// 普通 <script> 需要显式声明

export default {
  name: 'MyComponent'  // 显式声明有助于调试和热更新
}
```

**3. Source Map 配置**

```javascript
// vite.config.js
export default {
  build: {
    sourcemap: true  // 生产环境默认关闭，调试时开启
  }
}
```

---

## 练习与思考

1. **动手练习**：创建一个 `.vue` 文件，使用 `@vue/compiler-sfc` 的 `parse` 函数解析它，打印 `SFCDescriptor` 结构。

2. **思考题**：为什么 Vue 选择自定义文件格式（.vue）而不是纯 JavaScript？这种设计带来了哪些优势和挑战？

3. **进阶探索**：查看 Vite 的 @vitejs/plugin-vue 源码，了解它如何调用 compiler-sfc 的各个函数。
