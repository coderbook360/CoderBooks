# 突破限制：任意值与自定义规则

到目前为止，我们使用的所有工具类都来自于预设（Preset）。预设为我们提供了丰富且设计精良的原子类，但它们无法覆盖所有可能的需求。当你需要一个预设中不存在的特定样式时，该怎么办？

本章将介绍 UnoCSS 提供的两个强大机制来突破预设的限制：**任意值 (Arbitrary Values)** 和 **自定义规则 (Custom Rules)**。

## 1. 任意值：即时的样式注入

任意值允许你直接在 HTML 中使用方括号 `[]` 来生成一个具有任意值的工具类。这是一种用于处理“一次性”或非标准样式的完美方案。

### 语法

语法非常直观：`属性-[任意值]`。

```html
<!-- 我需要一个 13px 的上边距 -->
<div class="top-[13px]">...</div>

<!-- 我需要一个特定的十六进制颜色 -->
<div class="bg-[#bada55]">...</div>

<!-- 我需要一个基于视口高度的尺寸 -->
<div class="h-[80vh]">...</div>

<!-- 甚至可以使用 CSS 变量 -->
<div class="text-[var(--my-custom-color)]">...</div>
```

UnoCSS 会在构建时智能地解析这些类，并为它们生成对应的 CSS：

```css
.top-\[13px\] { top: 13px; }
.bg-\[\#bada55\] { background-color: #bada55; }
.h-\[80vh\] { height: 80vh; }
```

**注意**：在方括号内，空格需要用下划线 `_` 代替。例如，`grid-cols-[repeat(3,_1fr)]`。

### 何时使用任意值？

当你需要一个非常特定、且在项目中几乎不会复用的样式时，任意值是最佳选择。它避免了为了一个微小的样式而去修改配置文件或编写自定义 CSS 的麻烦。

## 2. 自定义规则：打造你的专属工具集

如果某个特定的样式模式在你的项目中被反复使用，那么为它创建一个自定义规则会是更好的选择。规则定义在 `uno.config.ts` 的 `rules` 选项中，它们是 UnoCSS 引擎的核心，也是所有预设的基础。

### 静态规则

最简单的规则是一个元组 `[string, object]`，将一个类名映射到一个 CSS 属性对象。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  rules: [
    ['m-1', { margin: '0.25rem' }],
    ['p-safe', { padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }]
  ]
})
```

现在你可以在 HTML 中直接使用 `m-1` 和 `p-safe` 了。

### 动态规则

规则的真正威力在于其动态性。你可以使用正则表达式来创建能匹配多种模式的规则。

动态规则是一个元组 `[RegExp, (match: string[]) => CSSObject]`。

**实战：创建一个自定义的 `size` 工具类**

假设你的项目需要一种以 `rem` 为单位、步长为 `0.25rem` 的尺寸系统。

```typescript
// uno.config.ts
export default defineConfig({
  rules: [
    [/^size-(\d+)$/, ([, d]) => ({
      width: `${Number(d) * 0.25}rem`,
      height: `${Number(d) * 0.25}rem`,
    })],
  ]
})
```

现在，你可以这样使用它：

```html
<div class="size-4"></div> <!-- 生成 width: 1rem; height: 1rem; -->
<div class="size-10"></div> <!-- 生成 width: 2.5rem; height: 2.5rem; -->
```

`(/^size-(\d+)$/)` 这个正则表达式捕获了 `size-` 后面的数字，并将其作为参数 `d` 传递给回调函数，然后函数动态地计算出 `width` 和 `height` 的值。

这就是 UnoCSS 所有预设（如 `p-4`, `text-lg`）的工作原理！你现在已经掌握了与 UnoCSS 核心开发者相同的工具。

## 3. 场景选择：任意值 vs. 规则 vs. 快捷方式

现在你有了三个强大的工具，应该如何选择？

- **任意值 (Arbitrary Values)**
  - **场景**：一次性的、非标准的、与设计系统无关的微调。
  - **例子**：`top-[13px]`
  - **心智模型**：“我只需要在这里快速解决这个小问题。”

- **自定义规则 (Custom Rules)**
  - **场景**：定义项目专属的、可复用的、符合设计规范的**新原子类**。
  - **例子**：`size-4`
  - **心智模型**：“我正在为我的项目构建一个设计系统。”

- **快捷方式 (Shortcuts)**
  - **场景**：为**已存在的多个工具类**的组合创建一个别名，以提高复用性和可读性。
  - **例子**：`btn-primary`
  - **心-智模型**：“我正在将这些原子类组合成一个‘组件’。”

## 总结

任意值和自定义规则是 UnoCSS 灵活性的终极体现。它们确保了你永远不会被预设所限制。

- **任意值**是你处理特殊情况的“瑞士军刀”，快速、即时。
- **自定义规则**是你构建自己设计系统的“工厂”，强大、可复用。

掌握了它们，你就拥有了驾驭 UnoCSS 的全部力量。从下一部分开始，我们将探索如何将 UnoCSS 与现代前端框架（如 Vue、React）以及各种构建工具进行集成，让你的开发流程如虎添翼。