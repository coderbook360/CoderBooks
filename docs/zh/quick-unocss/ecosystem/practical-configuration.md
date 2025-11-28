# 实战配置：安全列表、层与提取器

UnoCSS 的强大之处在于其“按需生成”的理念，它通过静态分析你的代码来决定需要生成哪些 CSS。但在某些真实世界的场景中，这种静态分析会遇到一些挑战。比如，当类名是动态拼接的，或者你需要更精细地控制 CSS 的优先级时，该怎么办呢？

本章，我们将深入探讨 UnoCSS 中三个非常重要的实战配置选项：`safelist`、`layers` 和 `extractors`。它们分别解决了开发中常见的三个痛点：

- **动态类名**：如何处理由后端返回或用户输入决定的类名？
- **样式优先级**：如何解决 `shortcuts` 中定义的样式被覆盖的问题？
- **非标准语法**：如何在 Markdown 的 frontmatter 或其他特殊语法中使用 UnoCSS？

掌握这三个配置，将让你在应对复杂需求时更加得心应手。

## 安全列表 (Safelisting)：应对动态类名

让我们从一个常见的场景开始：你正在开发一个颜色选择器，用户选择一个颜色后，你想动态地为元素应用背景色。

```javascript
// 假设 color 的值由用户的选择决定
const color = 'red'; 

// 然后你动态地拼接类名
const className = `bg-${color}-500`;
```

当你把这个 `className` 应用到你的组件上时，你会惊讶地发现，背景色并没有生效。为什么会这样呢？

### 为什么动态拼接会失效？

要理解这个问题，我们必须记住 UnoCSS 的工作原理：它在**构建时**扫描你的源代码文件，通过静态分析匹配所有可能的工具类字符串。它不是一个 JavaScript 解释器，因此它无法在构建时“运行”你的代码来预测 `color` 变量在运行时的所有可能值。

在 UnoCSS 眼里，它只看到了一个模板字符串 `` `bg-${color}-500` ``，它并不知道 `color` 会是 `'red'`, `'blue'` 还是 `'green'`。因此，像 `bg-red-500` 或 `bg-blue-500` 这样的具体类名就从未被生成，样式自然也就不存在了。

### 解决方案：`safelist`

为了解决这个问题，UnoCSS 提供了 `safelist` 配置。这个选项允许你明确地告诉 UnoCSS：“请务必生成这些类名，即使你在源代码中没有直接找到它们。”

你可以将需要强制生成的类名以字符串或正则表达式的形式添加到 `uno.config.ts` 的 `safelist` 数组中。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  safelist: [
    // 直接列出所有可能的类名
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',

    // 或者，使用正则表达式来匹配一个模式
    // 这会生成 bg-red-500, bg-blue-500, 和 bg-green-500
    /bg-(red|blue|green)-500/,
  ],
})
```

通过这种方式，`bg-red-500` 等类名就会被包含在最终生成的 CSS 文件中，即使它们是通过动态拼接的方式使用的。

> **最佳实践**
> `safelist` 是处理动态类名的最后手段。如果可能，应优先考虑使用完整的类名进行条件渲染，而不是动态拼接。例如，使用三元运算符或 `v-if`，这样 UnoCSS 就可以静态地分析出所有可能的类。
> 
> ```html
> <div :class="isRed ? 'bg-red-500' : 'bg-blue-500'"></div>
> ```
> 只有在类名完全不可预测（例如来自数据库或用户输入）时，才应该使用 `safelist`。

## 层 (Layers)：掌控 CSS 优先级

另一个常见的困惑来自于 CSS 的优先级。假设你为了方便，定义了一个通用的按钮快捷方式 `btn`：

```typescript
// uno.config.ts
shortcuts: {
  'btn': 'p-2 m-2 rounded',
}
```

然后，在某个特定的场景下，你想覆盖这个按钮的 `margin`：

```html
<button class="btn m-4">My Button</button>
```

你期望这个按钮的 `margin` 是 `m-4`（`1rem`）所定义的样式，但结果却发现它仍然是 `btn` 中定义的 `m-2`（`0.5rem`）。这是为什么呢？

### 理解 UnoCSS 的层级系统

这个问题的根源在于 UnoCSS 的“层”（Layers）系统。为了保证样式应用的可预测性，UnoCSS 将生成的 CSS 规则放置在不同的层中，并按照特定的顺序注入到最终的样式表中。默认的顺序大致如下：

1.  `defaults`：基础样式和重置。
2.  `shortcuts`：你通过 `shortcuts` 配置定义的规则。
3.  `utilities`：通过类名直接使用的工具类。

在 CSS 中，当两个选择器优先级相同时，后出现的规则会覆盖先出现的规则。由于 `shortcuts` 层在 `utilities` 层之前被引入，`btn` 中的 `m-2` 规则出现在了 `m-4` 规则的前面。虽然它们的选择器优先级相同，但因为 `m-4` 在样式表中定义得更靠后，所以它的优先级更高。然而，在我们的例子中，`btn` 的样式覆盖了 `m-4`，这说明 `btn` 的优先级更高。

这是因为 `shortcuts` 生成的规则是 `.`btn { margin: 0.5rem; ... }`，而 `m-4` 生成的规则是 `.m-4 { margin: 1rem; }`。当它们同时应用到一个元素上时，`btn` 的样式因为是作为一个整体的 `shortcut`，其生成的 CSS 规则的优先级高于单个的 `utility` 类。

### 解决方案：`layers`

为了解决这个问题，我们可以使用 `layers` 配置来调整 `shortcuts` 层的注入顺序。我们可以给 `shortcuts` 层分配一个负值，使其在 `utilities` 层之后注入，从而降低其优先级。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  layers: {
    // 将 shortcuts 层的默认顺序（0）调整为 -1
    // 这会使它在 utilities 层（默认顺序为 1）之后注入
    shortcuts: -1,
  },
  shortcuts: {
    'btn': 'p-2 m-2 rounded',
  },
})
```

进行了这个配置后，`shortcuts` 层中的样式将在 `utilities` 层之后被定义。这样，`m-4` 的规则就会出现在 `btn` 中 `m-2` 规则的后面，从而成功覆盖它。

通过调整 `layers`，你可以精确地控制不同 CSS 块在最终样式表中的出现顺序，从而完全掌控样式的优先级。

## 提取器 (Extractors)：从任意地方提取代码

UnoCSS 的默认提取器已经非常智能，它可以识别 HTML 的 `class` 属性、JavaScript 字符串中的类名等。但如果你在一些非标准的地方定义了类名呢？

例如，你可能在使用一个基于 Markdown 的内容管理系统，并希望在 Markdown 文件的 frontmatter 中定义页面布局相关的类：

```markdown
---
title: My Awesome Post
class: "flex items-center justify-center"
---

# Hello World
```

默认情况下，UnoCSS 不会去解析 YAML frontmatter，因此 `flex items-center justify-center` 这些类名会被忽略。

### 解决方案：`extractors`

`extractors` 配置允许你扩展 UnoCSS 的扫描能力。一个提取器本质上是一个函数，它接收文件内容作为输入，并返回一个包含所有潜在类名的集合。

你可以为特定的文件类型或语法添加自定义的提取器。例如，社区提供了 `@unocss/extractor-mdc` 包，专门用于解析 Markdown 文件中的特定语法。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import extractorMdc from '@unocss/extractor-mdc'

export default defineConfig({
  extractors: [
    // 添加针对 Markdown 内容文件语法的提取器
    extractorMdc(), 
    // 默认提取器会被自动包含，无需手动添加
  ],
})
```

添加了这个提取器后，UnoCSS 就知道如何去解析 Markdown frontmatter 中的 `class` 字段，并成功提取出其中定义的工具类。

> **这是一个高级功能**
> 对于绝大多数使用 Vue、React、Svelte 等主流框架的项目来说，你永远不需要关心 `extractors`。只有当你遇到非常规的语法或文件格式，并且发现 UnoCSS 无法识别其中的类名时，才需要考虑去寻找一个社区提供的提取器，或者自己编写一个。

## 总结

`safelist`、`layers` 和 `extractors` 是 UnoCSS 提供的三个强大的“后门”，它们为处理静态分析无法覆盖的边缘情况提供了优雅的解决方案：

- 当你处理**完全动态的、不可预测的类名**时，使用 `safelist` 来保证它们被生成。
- 当你需要**调整 `shortcuts` 和 `utilities` 之间的优先级**时，使用 `layers` 来控制 CSS 的注入顺序。
- 当你在**非标准位置（如 frontmatter）定义类名**时，使用 `extractors` 来扩展 UnoCSS 的扫描能力。

理解并善用这三个配置，将帮助你更从容地应对 UnoCSS 在复杂项目中的各种挑战。