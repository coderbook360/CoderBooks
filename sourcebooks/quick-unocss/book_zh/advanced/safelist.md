# 安全着陆：理解与配置 Safelist

UnoCSS 的核心优势在于其“按需”特性——它通过静态分析你的代码，只为你明确使用的工具类生成样式。然而，这种机制在某些动态场景下会遇到问题。

## 1. 问题所在：当类名是动态的时

想象一下，你正在开发一个组件，它接受一个 `color` 属性，并根据这个属性在运行时动态地构造类名：

```javascript
// MyComponent.vue
const props = defineProps({
  color: String, // e.g., 'blue', 'red'
})

const buttonClass = `bg-${props.color}-500 text-white`;
```

```html
<button :class="buttonClass">Click me</button>
```

在构建时，UnoCSS 扫描你的文件，它只能看到一个模板字符串 `` `bg-${props.color}-500` ``，它无法预知 `props.color` 在运行时会变成 `'blue'` 还是 `'red'`。因此，`bg-blue-500` 和 `bg-red-500` 这两个类都不会被生成，导致你的按钮在浏览器中没有背景色。

这就是 `safelist`（安全列表）的用武之地。

## 2. 解决方案：配置 `safelist`

`safelist` 是 `uno.config.ts` 中的一个选项，它允许你明确地告诉 UnoCSS：“无论你是否在源码中找到这些类，都请务必将它们生成出来。”

### 字符串匹配

最简单的方式是直接列出你需要的确切类名。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  safelist: [
    'bg-blue-500',
    'bg-red-500',
    'text-white',
  ],
})
```

这样，即使 `bg-blue-500` 和 `bg-red-500` 没有在任何地方被静态地使用，它们也一定会被包含在最终的 CSS 文件中。

### 正则表达式匹配

当需要安全列出的类遵循某种模式时，使用正则表达式会更加高效。

```typescript
// uno.config.ts
export default defineConfig({
  safelist: [
    // 匹配所有 bg- 开头，-500 结尾的颜色工具类
    /^bg-(blue|red|green|yellow)-500$/,

    // 匹配所有 mdi 图标
    /^i-mdi-.*$/,
  ],
})
```

-   第一个正则表达式确保了所有主题色（`blue`, `red`, `green`, `yellow`）的 `500` 色阶背景色都会被生成。
-   第二个正则表达式确保了所有 Material Design Icons 图标都会被生成，这在图标名称来自后端数据时非常有用。

## 3. 何时使用 `safelist`？

你应该在以下场景中考虑使用 `safelist`：

1.  **类名来自后端或 CMS**：当元素的类名完全由 API 返回的数据决定时。
2.  **运行时动态拼接**：如我们开头的例子所示，类名由 JavaScript 变量拼接而成。
3.  **使用第三方组件**：如果一个你无法控制其源码的第三方组件内部使用了 UnoCSS 的类，你可能需要将这些类加入安全列表。

## 4. 一个重要的警告：保持精确

`safelist` 是一把双刃剑。虽然它很强大，但如果使用不当，可能会破坏 UnoCSS 的“按需”优势。

**绝对不要**使用过于宽泛的正则表达式，例如：

```typescript
// 千万不要这样做！
safelist: [
  /.*/, // 匹配所有可能的类
]
```

这会告诉 UnoCSS 生成**所有**可能的工具类，最终产出一个体积高达数 MB 的 CSS 文件，完全违背了使用 UnoCSS 的初衷。

**原则是：你的 `safelist` 规则应该尽可能地精确，只包含你确实需要的类。**

## 总结

`safelist` 是处理动态类名场景的“保险丝”，它确保了 UnoCSS 的静态分析引擎不会意外地丢弃那些在运行时才出现的关键样式。

通过本章的学习，你掌握了：

-   为什么动态类名需要 `safelist`。
-   如何使用字符串和正则表达式来配置 `safelist`。
-   在哪些场景下应该使用 `safelist`，以及如何避免滥用它。

在下一章，我们将学习如何将你所有的配置（规则、快捷方式、预设）打包成一个可复用、可分享的自定义预设。