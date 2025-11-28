# 代码风格：属性化模式与变体组

在上一章，我们学习了如何用 `shortcuts` 来封装重复的类组合。然而，当一个元素需要处理多种状态（如 `hover`, `focus`）和响应式断点（如 `md`, `lg`）时，`class` 字符串依然会变得非常复杂和难以阅读。

```html
<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded md:py-3 md:px-6">
  A Complex Button
</button>
```

这个按钮的 `class` 列表混合了基础样式、悬停样式和中等屏幕下的响应式样式，所有东西都挤在一起。本章将介绍 UnoCSS 提供的两个强大功能——属性化模式（Attributify Mode）和变体组（Variant Groups），它们能从根本上改善你的代码风格。

## 1. 属性化模式 (Attributify Mode)

属性化模式允许你将工具类作为 HTML 属性来编写，而不是将它们全部塞进一个 `class` 字符串里。这让你可以按逻辑对样式进行分组，极大地提升了可读性。

### 启用属性化模式

首先，你需要在 `uno.config.ts` 中引入并使用 `@unocss/preset-attributify`。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import presetAttributify from '@unocss/preset-attributify'

export default defineConfig({
  presets: [
    presetAttributify(),
    // ...其他预设
  ]
})
```

### 重构按钮

启用后，我们就可以像这样重构之前的按钮了：

```html
<button 
  bg="blue-500 hover:blue-700"
  text="white"
  font="bold"
  p="y-2 x-4"
  md:p="y-3 x-6"
  rounded
>
  A Complex Button
</button>
```

发生了什么？

- **逻辑分组**: `bg`、`text`、`font`、`p` (padding) 等相关的工具类被归类到各自的属性中。
- **布尔属性**: 对于没有值的类，如 `rounded`，可以直接作为布尔属性使用。
- **变体前缀**: `hover:` 和 `md:` 这样的变体前缀可以直接应用在属性内部或作为属性本身。

代码的结构瞬间变得清晰无比。你可以一眼看出这个按钮的背景色、文本色、字体粗细和内边距，以及它们在不同状态和屏幕尺寸下的变化。

## 2. 变体组 (Variant Groups)

变体组是另一个清理 `class` 字符串的利器。它允许你将共享相同变体（如 `hover:`）的多个工具类组合在一起，避免重复书写前缀。

变体组是 UnoCSS 的核心功能，**无需额外配置**即可使用。

### 重构按钮

让我们用变体组来重构最初的例子：

```html
<button class="
  bg-blue-500 text-white font-bold py-2 px-4 rounded
  hover:(bg-blue-700 text-lg) 
  md:(py-3 px-6)
">
  A Complex Button
</button>
```

我们用括号 `()` 将具有相同前缀的工具类包裹起来：

- `hover:(bg-blue-700 text-lg)`: 当鼠标悬停时，同时改变背景色和文本大小。
- `md:(py-3 px-6)`: 在中等及以上尺寸的屏幕上，同时改变垂直和水平内边距。

这种写法大大减少了前缀的重复，让 `class` 字符串的逻辑更加紧凑。

## 3. 强强联合：属性化模式 + 变体组

真正的魔法发生在当你将这两种模式结合在一起时。它们可以无缝协作，让你在保持 HTML 结构清晰的同时，也能让属性值保持简洁。

```html
<div 
  p="4"
  rounded-lg
  shadow="md"
  bg="gray-100"
  hover="bg-gray-200 shadow-lg"
  md="p-6"
  dark="bg-gray-800 text-white hover:bg-gray-700"
>
  Content
</div>
```

在这个例子中：
- `hover` 属性本身就是一个变体组，它同时改变了背景色和阴影。
- `dark` 属性也是一个变体组，它不仅定义了暗黑模式下的基础样式，还定义了暗黑模式下的悬停样式 (`hover:bg-gray-700`)。

这种组合提供了一种极其强大且灵活的方式来组织你的样式，使得即使是再复杂的组件，其代码也能保持优雅和可读。

## 总结

属性化模式和变体组是 UnoCSS 在“开发者体验”上远超其他框架的两个核心功能。它们解决了原子化 CSS 最大的痛点之一——冗长且混乱的 `class` 字符串。

通过本章的学习，你掌握了：

- **属性化模式**：将工具类按逻辑分组到不同的 HTML 属性中。
- **变体组**：为共享相同变体前缀的工具类提供分组语法。
- **组合使用**：结合两种模式，实现代码清晰度的最大化。

在你的下一个项目中，大胆地启用属性化模式吧！它会彻底改变你编写和阅读 HTML 样式的方式。在下一章，我们将探讨如何处理那些无法直接用工具类实现的样式——任意值与自定义规则。