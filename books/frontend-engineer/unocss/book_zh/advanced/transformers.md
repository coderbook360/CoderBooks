# 功能扩展：深入理解 `Transformers`

在前面的章节中，我们已经接触过转换器（Transformers）：变体组通过 `transformerVariantGroup` 实现，属性化模式的某些特性也依赖转换器。

转换器是 UnoCSS 处理流程中的重要环节，它可以在类名被规则处理之前对源代码进行预处理。这为实现各种语法增强提供了可能。

本章将深入讲解转换器的工作原理和使用方法，并介绍几个常用的内置转换器。

---

## 1. 转换器的概念

### 1.1 处理流程中的位置

UnoCSS 的处理流程大致如下：首先从源文件中提取可能的类名，然后转换器对这些类名进行预处理，接着规则尝试匹配处理后的类名，最后生成 CSS 输出。

转换器在提取之后、规则匹配之前执行，它可以修改源代码中的类名，将特殊语法转换为标准语法。

### 1.2 与规则的区别

规则（Rules）负责将类名转换为 CSS，而转换器负责将非标准语法转换为标准类名。转换器不直接生成 CSS，它只是预处理源代码。

比如变体组语法 `hover:(text-red bg-blue)` 不是有效的类名，规则无法直接处理。转换器会将它展开为 `hover:text-red hover:bg-blue`，然后规则就能正常处理了。

### 1.3 配置方式

转换器通过 `transformers` 选项配置：

```ts
import { transformerVariantGroup, transformerDirectives } from 'unocss'

export default defineConfig({
  transformers: [
    transformerVariantGroup(),
    transformerDirectives(),
  ],
})
```

---

## 2. 内置转换器

UnoCSS 提供了几个常用的内置转换器。

### 2.1 变体组转换器

`transformerVariantGroup` 我们在之前已经介绍过，它支持变体组语法：

```ts
import { transformerVariantGroup } from 'unocss'

export default defineConfig({
  transformers: [transformerVariantGroup()],
})
```

使用效果：

```html
<!-- 输入 -->
<div class="hover:(bg-blue-500 text-white)">

<!-- 转换后 -->
<div class="hover:bg-blue-500 hover:text-white">
```

### 2.2 指令转换器

`transformerDirectives` 支持在 CSS 中使用 `@apply` 和 `@screen` 等指令：

```ts
import { transformerDirectives } from 'unocss'

export default defineConfig({
  transformers: [transformerDirectives()],
})
```

然后可以在 CSS 文件中使用：

```css
.btn {
  @apply px-4 py-2 rounded bg-blue-500 text-white;
}

.btn:hover {
  @apply bg-blue-600;
}

@screen md {
  .container {
    @apply max-w-3xl;
  }
}
```

`@apply` 将工具类应用到选择器上。`@screen` 包裹响应式断点的媒体查询。`theme()` 函数可以访问主题值。

```css
.custom {
  color: theme('colors.blue.500');
  padding: theme('spacing.4');
}
```

### 2.3 编译类转换器

`transformerCompileClass` 可以将一组类编译为单个类名：

```ts
import { transformerCompileClass } from 'unocss'

export default defineConfig({
  transformers: [transformerCompileClass()],
})
```

使用方式是在类名列表前加上 `:uno:` 标记：

```html
<!-- 输入 -->
<div class=":uno: bg-blue-500 text-white px-4 py-2 rounded">

<!-- 转换后 -->
<div class="uno-abcdef">
```

所有标记的类会被编译为一个哈希类名，对应的 CSS 会包含所有原始样式。这在需要减少 HTML 体积或避免类名冲突时很有用。

### 2.4 属性化模式转换器

除了 `presetAttributify` 预设，还有对应的转换器版本，用于处理某些特殊场景：

```ts
import { transformerAttributifyJsx } from 'unocss'

export default defineConfig({
  transformers: [transformerAttributifyJsx()],
})
```

这个转换器专门处理 JSX 中的属性化语法，解决 React 等框架中属性名冲突的问题。

---

## 3. 转换器配置选项

每个转换器都有自己的配置选项。

### 3.1 变体组配置

```ts
transformerVariantGroup({
  separators: [':', '-'],  // 支持的分隔符
})
```

### 3.2 指令配置

```ts
transformerDirectives({
  applyVariable: ['--at-apply', '--uno-apply', '--uno'],  // @apply 使用的 CSS 变量名
  enforce: 'pre',  // 执行顺序
})
```

### 3.3 编译类配置

```ts
transformerCompileClass({
  trigger: ':uno:',  // 触发标记
  classPrefix: 'uno-',  // 生成的类名前缀
  hashFn: (str) => hash(str),  // 自定义哈希函数
  keepUnknown: true,  // 保留无法识别的类名
})
```

---

## 4. 自定义转换器

当内置转换器无法满足需求时，可以编写自定义转换器。

### 4.1 转换器结构

转换器是一个对象，包含 `name`、`enforce`、`transform` 等属性：

```ts
const myTransformer = {
  name: 'my-transformer',
  enforce: 'pre',  // 'pre' | 'post' | undefined
  transform(code, id) {
    // code 是源代码字符串
    // id 是文件路径
    // 返回转换后的代码，或 undefined 表示不处理
    return code.replace(/something/g, 'something-else')
  },
}

export default defineConfig({
  transformers: [myTransformer],
})
```

### 4.2 MagicString

对于复杂的代码转换，推荐使用 `magic-string` 库，它提供了高效的字符串操作和 source map 支持：

```ts
import MagicString from 'magic-string'

const myTransformer = {
  name: 'my-transformer',
  transform(code, id) {
    const s = new MagicString(code)
    
    // 使用正则找到所有匹配
    const regex = /pattern/g
    let match
    while ((match = regex.exec(code)) !== null) {
      const start = match.index
      const end = start + match[0].length
      s.overwrite(start, end, 'replacement')
    }
    
    return s.toString()
  },
}
```

### 4.3 实战：简单的自定义语法

假设我们想支持 `@size-{n}` 语法同时设置宽高：

```ts
const sizeTransformer = {
  name: 'size-transformer',
  transform(code) {
    return code.replace(
      /@size-(\w+)/g,
      (_, size) => `w-${size} h-${size}`
    )
  },
}
```

使用：

```html
<!-- 输入 -->
<div class="@size-10 rounded-full">

<!-- 转换后 -->
<div class="w-10 h-10 rounded-full">
```

### 4.4 实战：条件类语法

假设我们想支持类似三元表达式的语法：

```ts
const conditionalTransformer = {
  name: 'conditional-transformer',
  transform(code) {
    // 匹配 [condition?class1:class2] 语法
    return code.replace(
      /\[(\w+)\?([^:]+):([^\]]+)\]/g,
      (_, condition, trueClass, falseClass) => {
        // 这里只是示例，实际需要运行时逻辑
        return trueClass.trim()
      }
    )
  },
}
```

---

## 5. 转换器执行顺序

当配置了多个转换器时，它们的执行顺序很重要。

### 5.1 enforce 属性

`enforce` 属性控制转换器的执行阶段。`'pre'` 表示在其他转换器之前执行，`'post'` 表示在其他转换器之后执行，不设置则按配置顺序执行。

```ts
const transformer1 = {
  name: 'transformer-1',
  enforce: 'pre',  // 最先执行
  transform(code) { /* ... */ },
}

const transformer2 = {
  name: 'transformer-2',
  // 无 enforce，按顺序执行
  transform(code) { /* ... */ },
}

const transformer3 = {
  name: 'transformer-3',
  enforce: 'post',  // 最后执行
  transform(code) { /* ... */ },
}
```

### 5.2 执行顺序示例

```ts
transformers: [
  transformerVariantGroup(),  // 无 enforce
  transformerDirectives(),    // 无 enforce
  transformerCompileClass({ enforce: 'post' }),  // 后执行
]
```

在这个配置中，变体组和指令转换器按配置顺序执行，编译类转换器最后执行。这很重要，因为编译类需要在其他语法展开后才能正确处理。

---

## 6. 转换器与框架集成

不同框架可能需要特定的转换器配置。

### 6.1 Vue

Vue 单文件组件中，类名可能出现在模板、script 和 style 中。转换器会处理整个文件：

```ts
// Vue 项目通常这样配置
transformers: [
  transformerVariantGroup(),
  transformerDirectives(),
]
```

### 6.2 React/JSX

JSX 中需要特别注意属性化模式。如果使用属性化模式，应该添加 JSX 转换器：

```ts
transformers: [
  transformerVariantGroup(),
  transformerAttributifyJsx(),  // 处理 JSX 属性
]
```

### 6.3 Svelte

Svelte 的处理与 Vue 类似，但可能需要配置正确的文件提取范围：

```ts
transformers: [
  transformerVariantGroup(),
  transformerDirectives(),
]
```

---

## 7. @apply 深入使用

`@apply` 指令是转换器最常用的功能之一，值得深入了解。

### 7.1 基础用法

```css
.btn {
  @apply px-4 py-2 rounded font-semibold;
}

.btn-primary {
  @apply btn bg-blue-500 text-white hover:bg-blue-600;
}
```

注意 `@apply` 可以引用其他包含 `@apply` 的类，但要注意避免循环引用。

### 7.2 与预处理器结合

`@apply` 可以与 Sass、Less 等预处理器结合使用。但需要注意处理顺序，确保 UnoCSS 在预处理器之后处理。

```scss
.card {
  @apply bg-white rounded-lg shadow;
  
  &__header {
    @apply px-6 py-4 border-b;
  }
  
  &__body {
    @apply px-6 py-4;
  }
}
```

### 7.3 @apply 的局限性

`@apply` 有一些局限性需要注意。它只能在构建时处理，无法处理动态类名。它会增加 CSS 体积，因为相同的样式可能被重复生成。在某些复杂选择器中可能表现不佳。

一般建议是：优先使用工具类和快捷方式，只在确实需要时才使用 `@apply`。

### 7.4 @screen 使用

`@screen` 提供了更简洁的响应式断点写法：

```css
.container {
  @apply px-4;
}

@screen sm {
  .container {
    @apply px-6;
  }
}

@screen md {
  .container {
    @apply px-8 max-w-3xl mx-auto;
  }
}

@screen lg {
  .container {
    @apply max-w-5xl;
  }
}
```

---

## 8. 转换器调试

当转换器不按预期工作时，需要进行调试。

### 8.1 查看转换结果

可以添加一个调试转换器来打印转换过程：

```ts
const debugTransformer = {
  name: 'debug-transformer',
  enforce: 'post',
  transform(code, id) {
    if (id.includes('.vue') || id.includes('.jsx')) {
      console.log('--- Transformed:', id)
      console.log(code)
    }
    return code
  },
}
```

### 8.2 Inspector 工具

UnoCSS Inspector 可以查看最终生成的 CSS，帮助定位转换问题。如果某个类名没有生成预期的样式，可能是转换器没有正确处理。

### 8.3 常见问题

转换器不生效通常有几个原因：配置顺序不对，`enforce` 设置有误；正则表达式没有正确匹配；文件类型没有被处理（需要检查提取器配置）。

---

## 9. 小结

本章深入讲解了 UnoCSS 的转换器系统。

转换器在处理流程中位于提取之后、规则匹配之前，负责将非标准语法转换为标准类名。它与规则分工明确：规则生成 CSS，转换器预处理源代码。

内置转换器包括变体组转换器（transformerVariantGroup）支持括号语法，指令转换器（transformerDirectives）支持 `@apply` 和 `@screen`，编译类转换器（transformerCompileClass）将多个类合并为单个哈希类，属性化 JSX 转换器（transformerAttributifyJsx）处理 JSX 中的属性化语法。

自定义转换器通过实现 `transform` 函数创建，推荐使用 `magic-string` 库进行复杂的字符串操作。`enforce` 属性控制执行顺序。

`@apply` 指令让你可以在 CSS 中使用工具类，但应该谨慎使用，避免滥用导致体积膨胀。`@screen` 提供了简洁的响应式断点语法。

转换器的执行顺序很重要，编译类等转换器通常需要在其他转换器之后执行。调试时可以添加日志输出或使用 Inspector 工具。

下一章我们将学习安全列表、层和提取器等实战配置技巧。
