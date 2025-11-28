# 组合的艺术：玩转 Transformers

欢迎来到第四部分“高级技巧与定制”。在前面的章节中，我们所有的工作都聚焦于“生成” CSS 类。而 Transformers 则为我们开辟了一个全新的维度：**代码转换**。

Transformer（转换器）是 UnoCSS 构建过程中的一个特殊钩子。它可以在 UnoCSS 处理你的代码时，对其进行分析和转换，从而实现更高级、更便捷的语法。你可以把它们想象成 UnoCSS 的“Babel 插件”或“Vite 插件”。

本章我们将重点介绍官方提供的几个极其实用的 Transformer。

## 1. `transformer-directives`：拥抱 `@apply`

在复杂的场景下，例如在 CSS 文件中为没有 class 接口的第三方组件定义样式，或者想在伪元素（如 `::before`）上应用工具类时，仅仅使用 HTML class 是不够的。`@unocss/transformer-directives` 就是为此而生。

### 启用 Transformer

在 `uno.config.ts` 中配置 `transformers` 选项：

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  // ...
  transformers: [
    transformerDirectives(),
  ],
})
```

### 使用 `@apply`

启用后，你就可以在 `<style>` 块或 `.css` 文件中使用 `@apply` 指令了。

```html
<template>
  <div class="custom-block">...</div>
</template>

<style>
.custom-block {
  @apply bg-gray-100 p-4 rounded-lg shadow-md;
}

.custom-block::before {
  content: 'Hello';
  @apply text-red-500 font-bold;
}
</style>
```

在构建时，`transformer-directives` 会扫描你的样式代码，找到 `@apply`，将其后面的工具类展开，并替换掉 `@apply` 所在的那一行。最终生成的 CSS 如下：

```css
.custom-block {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: /* ... */;
}

.custom-block::before {
  content: 'Hello';
  color: #ef4444;
  font-weight: 700;
}
```

这与我们在“快捷方式”一章中提到的 `@apply` 机制类似，但它发生在样式表内部，为你提供了在 CSS 作用域内复用原子类的能力。

### `@screen` 指令

该 Transformer 还带来了一个非常有用的 `@screen` 指令，让你可以在 CSS 中轻松应用响应式断点。

```css
.container {
  width: 100%;
}

@screen md {
  .container {
    max-width: 768px;
  }
}
```

这比手写 `@media (min-width: 768px)` 要简洁得多，并且能确保你的断点值与 UnoCSS 配置保持一致。

## 2. `transformer-variant-group`：变体组的幕后功臣

在“核心功能实战”一章中，我们已经领略了变体组的强大：`hover:(bg-blue-700 text-lg)`。

实际上，这个神奇的语法就是由 `@unocss/transformer-variant-group` 实现的。当你启用了 `preset-uno` 或 `preset-wind` 时，这个 Transformer 会被**自动包含**，所以你才能直接使用它。

它的工作原理是在构建时扫描你的代码，找到 `variant:(...)` 这样的模式，然后将其展开为多个带有变体前缀的独立类。例如：

`hover:(bg-blue-700 text-lg)` -> `hover:bg-blue-700 hover:text-lg`

这个过程对用户是完全透明的，但它极大地提升了代码的可读性和编写效率。

## 3. `transformer-compile-class`：预编译你的类

这是一个更高级的 Transformer，主要用于组件库的开发或对性能有极致要求的场景。

它允许你使用一个特殊的 `uno-layer-name` 属性，将一个元素上的所有 UnoCSS 类在构建时**编译**成一个**单独的、带有 hash 的 CSS 类**，并替换掉原来的长串 `class`。

### 启用与使用

```typescript
// uno.config.ts
import transformerCompileClass from '@unocss/transformer-compile-class'

export default defineConfig({
  transformers: [
    transformerCompileClass(),
  ],
})
```

**源码：**

```html
<div 
  uno-base
  class="bg-blue-500 text-white p-4 rounded"
>...</div>
```

**构建后的产物：**

```html
<div class="uno-c4f3t2">...</div>
```

```css
.uno-c4f3t2 {
  background-color: #3b82f6;
  color: #ffffff;
  padding: 1rem;
  border-radius: 0.25rem;
}
```

`uno-base` 中的 `base` 是你定义的“层(layer)”的名称。这有助于对生成的 CSS 进行分组。

### 优势与场景

- **减小 HTML 体积**：将几十个类压缩成一个，对于服务端渲染（SSR）或静态站点生成（SSG）的页面尤其有利。
- **运行时性能**：浏览器处理一个类总是比处理几十个类要快一点点。
- **封装**：非常适合用于构建不希望将内部工具类细节暴露给最终用户的组件库。

## 总结

Transformers 是 UnoCSS 生态系统中极其重要的一环，它们是连接“原子”与“组合”、“源码”与“产物”的桥梁。

- `transformer-directives` 让你能在 CSS 世界里自由地使用 `@apply` 和 `@screen`。
- `transformer-variant-group` 是优雅的变体组语法的基石。
- `transformer-compile-class` 为组件库和性能优化提供了终极解决方案。

理解并善用 Transformers，将使你的 UnoCSS 技能提升到一个新的高度。在下一章，我们将探索另一个令人兴奋的领域：如何在项目中无缝地使用成千上万的图标。