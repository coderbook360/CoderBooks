# 实战配置：安全列表、层与提取器

随着你对 UnoCSS 的使用越来越深入，你会遇到一些边缘但重要的情况，默认配置可能无法完全满足你的需求。例如，如何处理动态生成的类名？如何控制 CSS 规则的优先级？如何让 UnoCSS 从非标准的文件格式中提取类？

本章将深入探讨三个高级配置选项：`safelist`、`layers` 和 `extractors`。它们是 UnoCSS 强大灵活性和可扩展性的体现，掌握它们能让你在面对复杂场景时游刃有余。

## 1. 安全列表 (Safelisting)：确保动态类名不被遗忘

UnoCSS 的工作原理是在构建时扫描你的源代码，查找所有使用到的工具类，然后只为你用到的类生成 CSS。这种按需生成的方式保证了最终产物的体积最小化。

但如果你的类名是动态生成的，这个机制就会遇到问题。

### 问题：动态类名的挑战

想象一个场景，你正在开发一个组件，它的颜色由一个 prop 决定：

```vue
<template>
  <div :class="`bg-${color}-500`">...</div>
</template>

<script setup>
const props = defineProps({
  color: String, // 可能的值是 'red', 'blue', 'green'
})
</script>
```

在构建时，UnoCSS 只能看到一个模板字符串 `bg-${color}-500`，它无法知道 `color` 的具体值是什么。因此，它不会为 `bg-red-500`、`bg-blue-500` 或 `bg-green-500` 生成任何 CSS。当组件在运行时接收到 `color` prop 后，对应的样式就会丢失。

### 解决方案：`safelist`

`safelist` 配置就是为了解决这个问题而生的。它允许你明确地告诉 UnoCSS：“无论你在源代码中是否找到这些类，请务必将它们生成到最终的 CSS 文件中。”

你可以通过多种方式提供安全列表：

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  safelist: [
    // 1. 明确的字符串
    'bg-red-500',
    'bg-blue-500',
    'text-green-500',

    // 2. 使用正则表达式匹配一类模式
    // 匹配所有 m-1 到 m-10 的类
    /^m-[1-9]$/,
    /^m-10$/,

    // 3. 匹配所有主色调的背景色
    /bg-(red|blue|green)-500/,
  ],
})
```

**最佳实践**：
- **精确控制**：尽可能使用精确的字符串或紧凑的正则表达式，避免泛化过度的模式（如 `/bg-.*/`），这可能会生成大量不必要的 CSS。
- **最后的手段**：`safelist` 是一个强大的工具，但也应该作为最后的选择。在可能的情况下，优先考虑在代码中写入完整的、静态的类名。例如，使用一个映射对象来代替动态拼接：

  ```javascript
  const colorMap = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  }
  // <div :class="colorMap[color]">...</div>
  ```
  这样 UnoCSS 就能检测到这些类了。

## 2. 层 (Layers)：精细化控制 CSS 优先级

浏览器根据 CSS 规则在样式表中的出现顺序来解决优先级冲突。默认情况下，UnoCSS 生成的 CSS 遵循一个特定的顺序，大致是：`defaults` -> `shortcuts` -> `utilities`。

但在某些情况下，你可能需要调整这个顺序，或者在其中插入你自己的样式。

### 问题：与第三方 CSS 的冲突

假设你引入了一个第三方的组件库 CSS，它定义了一个 `.btn` 类。同时，你在 UnoCSS 的 `shortcuts` 中也定义了一个 `btn`。你希望你的 `shortcuts` 能够覆盖第三方库的样式，这就需要控制它们的加载顺序。

### 解决方案：`layers`

`layers` 配置允许你重新定义 CSS 规则的生成顺序。你可以覆盖默认的层级，或者在其中添加新的层。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  // ...
  layers: {
    // 定义层的顺序
    components: -1, // 将 components 层的权重提前
    defaults: 0,
    utilities: 1,
  },
})
```

在这个例子中，我们通过设置权重，将 `components` 层的优先级提到了最高。这意味着在 `components` 层中定义的样式将比 `defaults` 和 `utilities` 中的样式更先出现，因此优先级更低。

你也可以使用 `@layer` 指令在你的 CSS 文件中指定层：

```css
/* my-components.css */
@layer components {
  .btn-special {
    background-color: purple;
  }
}
```

然后，在你的主入口文件中引入它：

```javascript
// main.js
import './my-components.css'
import 'uno.css'
```

通过这种方式，`.btn-special` 就会被放入 `components` 层，你可以精确地控制它与 UnoCSS 生成的工具类之间的优先级关系。

## 3. 提取器 (Extractors)：让 UnoCSS 看懂你的代码

UnoCSS 需要从你的文件中“提取”出所有用到的类名。默认情况下，它使用一个非常高效的正则表达式来扫描文件内容。这个默认提取器适用于绝大多数标准的 `html`, `js`, `ts`, `vue`, `jsx`, `tsx` 文件。

### 问题：非标准的语法

然而，在某些特殊情况下，默认提取器可能无法识别你的类名。例如：
- 你在使用一种特殊的模板语言，它用非标准的括号包裹类名。
- 你将类名存储在注释或者 YAML Front Matter 中，并希望 UnoCSS 能够处理它们。

### 解决方案：`extractors`

`extractors` 配置允许你提供自定义的提取逻辑，或者使用由社区提供的预设提取器。

例如，如果你在使用 Svelte，官方推荐使用 `@unocss/extractor-svelte` 来获得最完美的集成体验，它可以处理 Svelte 文件中特殊的 `class:` 指令。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import extractorSvelte from '@unocss/extractor-svelte'

export default defineConfig({
  // ...
  extractors: [
    extractorSvelte(), // 添加 Svelte 提取器
    // 默认提取器会被保留，这里是添加
  ],
})
```

**重点**：
- **这是一个高级功能**：对于绝大多数使用主流框架的用户来说，你永远不需要关心 `extractors`。UnoCSS 的默认行为已经足够智能。
- **性能考虑**：自定义提取器可能会影响构建性能，因为它们可能需要更复杂的解析逻辑。只在确实需要时才使用它。

## 总结

`safelist`、`layers` 和 `extractors` 是 UnoCSS 工具箱中的三把“瑞士军刀”，它们为处理边缘情况提供了强大的能力：

- **`safelist`**：保证动态生成的类在生产环境中可用。
- **`layers`**：精细控制 CSS 规则的优先级，解决样式冲突。
- **`extractors`**：让 UnoCSS 能够理解任何特殊语法或文件格式。

虽然你可能不会每天都用到它们，但理解它们的存在和用途，将让你在面对更复杂的项目和集成挑战时，拥有更多的信心和解决方案。
