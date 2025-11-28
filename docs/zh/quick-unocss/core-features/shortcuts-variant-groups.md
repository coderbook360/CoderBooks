# 效率提升：快捷方式与变体组

随着你越来越熟练地使用 UnoCSS，你会发现自己在不断地重复某些工具类的组合。例如，一个设计系统中的按钮、卡片或输入框，它们的样式在整个应用中应该是统一的。

当你写下这样的代码时，是否感到了一丝不安？

```html
<button class="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-700">
  确认
</button>

<button class="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-700">
  取消
</button>
```

这段代码暴露了两个问题：

1.  **重复**：相同的样式字符串被复制粘贴了多遍。
2.  **维护困难**：如果需要修改按钮样式，比如改变圆角大小，你必须找到所有使用这段代码的地方进行修改，这违反了软件工程的“不要重复自己”（Don't Repeat Yourself, DRY）原则。

为了解决这类问题，UnoCSS 提供了两个强大的工具：**快捷方式 (Shortcuts)** 和 **变体组 (Variant Groups)**。

## 快捷方式 (Shortcuts)：为你的常用组合命名

快捷方式允许你为一长串工具类定义一个简短、易记的名称。这就像是为你的常用样式创建了一个别名。

### 定义快捷方式

你可以在 `uno.config.ts` 文件中通过 `shortcuts` 选项来定义它们。

```typescript
// uno.config.ts
import { defineConfig, presetWind } from 'unocss'

export default defineConfig({
  presets: [presetWind()],
  shortcuts: {
    // 定义一个名为 'btn' 的快捷方式
    'btn': 'px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-700',
    
    // 你甚至可以创建基于其他快捷方式的动态快捷方式
    'btn-red': 'btn bg-red-500 hover:bg-red-700',
    'btn-green': 'btn bg-green-500 hover:bg-green-700',
  },
})
```

### 使用快捷方式

定义好之后，你就可以在 HTML 中像使用普通工具类一样使用它们了。

```html
<!-- 使用我们定义的快捷方式 -->
<button class="btn">确认</button>

<!-- 覆盖并扩展基础样式 -->
<button class="btn-red">删除</button>

<button class="btn-green">保存</button>
```

现在，代码变得干净、可读，并且易于维护。如果需要修改所有按钮的通用样式，你只需在 `uno.config.ts` 中修改 `btn` 的定义即可。

### 工作原理：构建时的宏，零开销

这里必须强调 UnoCSS 快捷方式与传统 CSS 预处理器（如 Sass）的 `@mixin` 或 Tailwind CSS 的 `@apply` 的本质区别，这也是 UnoCSS 的核心优势之一。

-   **`@apply` (Tailwind)**: 它在**运行时**工作。当你使用 `@apply` 时，Tailwind 会在最终生成的 CSS 文件中创建一个全新的 CSS 类（例如 `.btn`），然后将所有工具类的样式规则**复制**到这个新类中。这不可避免地会增加最终 CSS 文件的大小。

-   **`shortcuts` (UnoCSS)**: 它在**构建时**作为“宏” (Macro) 工作。当 UnoCSS 在你的代码中扫描到 `btn` 这个 class 时，它并不会生成一个叫 `.btn` 的类。相反，它会在构建过程中，将 `btn` **原地替换**成它所代表的那一长串工具类字符串 (`px-4 py-2 ...`)，然后再由引擎继续处理这些被展开的工具类。最终生成的 CSS 文件里，只包含 `px-4`, `py-2` 等原子类的规则，**完全没有** `.btn` 这个类，因此是**零性能开销**的。

这种机制保证了无论你定义多少快捷方式，都不会增加最终产物的体积，让你既能享受抽象带来的便利，又不必担心性能损耗。

## 变体组 (Variant Groups)：一次应用多个变体

当我们需要为同一个元素应用多种状态（如 `hover`, `focus`）或响应式断点（如 `md`, `lg`）时，代码会变得非常冗长。

```html
<div class="bg-white hover:bg-gray-100 focus:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:bg-gray-700">
  一些内容
</div>
```

可以看到，`hover:`, `focus:`, `dark:` 这些变体被重复写了很多次，让 class 属性变得难以阅读。

变体组就是为了解决这个问题而生的。它使用括号语法，让你能将一个或多个变体一次性地应用到一组工具类上。

### 使用变体组

让我们用变体组来重构上面的例子。基本语法是 `variant:(class1 class2 ...)`。

```html
<div class="bg-white dark:bg-gray-800 hover:(bg-gray-100 dark:bg-gray-700) focus:(bg-gray-100 dark:bg-gray-700)">
  一些内容
</div>
```

代码已经清晰了很多。但我们可以做得更好。如果多个变体要应用相同的规则，你可以将它们组合在一起，语法是 `(variant1:variant2:):(class1 class2 ...)`。

```html
<div class="bg-white dark:bg-gray-800 (hover:focus:):(bg-gray-100 dark:bg-gray-700)">
  一些内容
</div>
```

现在，代码的意图一目了然：基础样式是 `bg-white dark:bg-gray-800`，而在 `hover` 或 `focus` 状态下，应用 `bg-gray-100 dark:bg-gray-700`。

### 结合属性化模式：终极优雅

变体组的威力在与**属性化模式**结合时能得到最大程度的发挥。这通常是编写复杂状态样式时的最佳实践。

```html
<div 
  bg="white dark:gray-800"
  hover:focus="bg-gray-100 dark:bg-gray-700"
>
  一些内容
</div>
```

这种写法几乎就像是在用一种声明式的方式描述元素的样式和状态，可读性和维护性都达到了顶峰。

## 总结

快捷方式和变体组是提升你 UnoCSS 使用效率和代码质量的利器。

-   **使用快捷方式**，将重复的工具类组合抽象成可复用的、有语义的名称，同时享受其零开销的性能优势。
-   **使用变体组**，告别冗长的重复变体，让复杂的状态和响应式样式变得简洁、直观。

当你下次在代码中发现重复的模式时，请立刻想一想，是否可以用快捷方式或变体组来重构它。这是你从 UnoCSS 的使用者进阶为“高手”的关键一步。