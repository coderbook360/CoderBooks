# SFC 单文件组件编译

单文件组件（Single File Component，SFC）是 Vue 项目中最常用的组件格式。.vue 文件将模板、脚本和样式封装在一起，提供了优秀的开发体验。SFC 编译是一个复杂的流程，涉及多个编译器的协作。

## SFC 的结构

一个典型的 SFC 文件包含三个部分：

```html
<template>
  <div class="container">
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Hello')
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>
```

template 块包含 Vue 模板语法，script 块包含组件逻辑，style 块包含样式。每个块都有独立的处理流程。

## 编译流程概览

SFC 编译分为几个主要阶段：

首先是解析阶段。@vue/compiler-sfc 的 parse 函数将 .vue 文件解析成描述符（descriptor），提取出各个块的内容和位置信息。

然后是分别编译各个块。template 块用模板编译器编译成渲染函数。script 块用 JavaScript 编译器处理（可能涉及 TypeScript 转换）。style 块用 CSS 编译器处理（可能涉及预处理器）。

最后是组合阶段。将各块的编译结果组合成最终的 JavaScript 模块。

## 解析 SFC

parse 函数将 SFC 文本解析成结构化的描述符：

```typescript
import { parse } from '@vue/compiler-sfc'

const { descriptor, errors } = parse(source, {
  filename: 'Example.vue'
})

// descriptor 结构
{
  template: { content: '...', loc: {...}, attrs: {...} },
  script: { content: '...', loc: {...}, lang: 'ts' },
  scriptSetup: { content: '...', loc: {...} },
  styles: [{ content: '...', scoped: true }],
  customBlocks: []
}
```

descriptor 包含了 SFC 各部分的原始内容、位置信息、属性（如 lang、scoped）等。

## 模板编译

template 块使用 @vue/compiler-dom 编译：

```typescript
import { compileTemplate } from '@vue/compiler-sfc'

const { code, errors, tips } = compileTemplate({
  source: descriptor.template.content,
  filename: 'Example.vue',
  id: scopeId,
  scoped: hasScoped,
  compilerOptions: {
    bindingMetadata  // 来自 script 分析
  }
})
```

生成的 code 是 render 函数的代码字符串。注意传入了 bindingMetadata——这是 script 分析的结果，帮助模板编译器优化绑定。

## 脚本编译

script 块的编译因类型而异。

普通 script 块可能只需要简单处理：

```typescript
import { compileScript } from '@vue/compiler-sfc'

const { content, bindings } = compileScript(descriptor, {
  id: scopeId,
  inlineTemplate: true  // 内联模板
})
```

script setup 块需要更复杂的转换，将其转换为标准的组件导出格式。

## 样式编译

style 块可能需要多种处理：

```typescript
import { compileStyle } from '@vue/compiler-sfc'

const { code, errors } = compileStyle({
  source: descriptor.styles[0].content,
  filename: 'Example.vue',
  id: scopeId,
  scoped: descriptor.styles[0].scoped,
  preprocessLang: 'scss'  // 如果使用预处理器
})
```

scoped 样式需要添加属性选择器。预处理器（Sass、Less）需要先转换为 CSS。CSS Modules 需要生成类名映射。

## ID 和作用域

每个 SFC 有一个唯一的 ID，用于 scoped 样式和其他隔离机制：

```typescript
const scopeId = 'data-v-' + hash(filename + source)
```

这个 ID 会被添加到：
- scoped 样式的选择器中（`.container[data-v-xxx]`）
- 模板中所有元素的属性中

确保样式只影响当前组件的元素。

## 热更新支持

SFC 编译需要支持热更新（HMR）。当文件变化时，需要判断哪些部分变了：

```typescript
// 开发环境生成的代码包含 HMR 钩子
if (import.meta.hot) {
  import.meta.hot.accept(mod => {
    if (mod.render !== __current.render) {
      // 只有 template 变了，热替换 render
      __current.render = mod.render
    }
    // style 变化由 CSS 模块热更新处理
  })
}
```

只变化 template 时可以保持组件状态，只替换渲染函数。script 变化通常需要重新挂载组件。

## Source Map 生成

SFC 编译需要生成精确的 source map，让调试器能够定位到原始 .vue 文件：

```typescript
compileTemplate({
  source,
  filename,
  sourceMap: true  // 开启 source map
})
```

这需要每个编译阶段都正确传递位置信息。最终的 source map 能够将生成的 JavaScript 映射回原始的 template、script、style 块。

## 自定义块

SFC 支持自定义块，用于扩展功能：

```html
<custom-block>
  Custom content here
</custom-block>
```

自定义块由用户提供的加载器处理。parse 函数将其提取到 descriptor.customBlocks，构建工具负责调用相应的处理器。

常见的自定义块有 `<docs>` 用于文档、`<i18n>` 用于国际化。

## 与构建工具的集成

SFC 编译器通常不直接调用，而是通过构建工具插件：

Vite 使用 @vitejs/plugin-vue：

```javascript
// vite.config.js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue()]
}
```

Webpack 使用 vue-loader：

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' }
    ]
  }
}
```

这些插件封装了完整的 SFC 编译流程，开发者无需直接与编译 API 交互。

## 编译结果的结构

最终编译产物是一个标准的 ES 模块：

```javascript
import { defineComponent } from 'vue'

// 模板编译结果
function render(_ctx, _cache) {
  return /* ... */
}

// script 编译结果（setup 会被转换）
export default defineComponent({
  setup() {
    // ...
  },
  render
})

// 样式会被提取为单独的 CSS 或内联
```

对于 CSS，可能被提取为独立文件，或通过 JavaScript 动态注入。

## 小结

SFC 编译是一个多阶段、多编译器协作的过程。parse 阶段提取各个块，然后分别用模板编译器、脚本编译器、样式编译器处理，最后组合成完整的模块。整个过程需要处理作用域隔离、热更新、source map 等关键特性。虽然复杂，但这些细节被构建工具插件良好封装，开发者可以专注于编写 .vue 文件而无需关心编译细节。
