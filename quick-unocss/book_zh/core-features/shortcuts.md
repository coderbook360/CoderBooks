# 效率提升：快捷方式 (Shortcuts)

欢迎来到第三部分“核心功能实战”。在上一部分，你已经掌握了海量的原子化工具类，并能够用它们组合出任何你想要的界面。但随着项目的深入，你可能会发现一个新问题：

```html
<button class="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-700">
  Button A
</button>
<button class="px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-700">
  Button B
</button>
```

`class` 列表变得越来越长，并且在多个地方重复出现。如果要修改按钮样式，你需要找到所有使用它的地方进行修改，这显然违反了“不要重复自己”（DRY）的原则。

为了解决这个问题，UnoCSS 提供了 `shortcuts`（快捷方式）功能。它允许你为一组常用的工具类组合命名，从而实现更高层次的抽象和复用。

## 1. 定义你的第一个快捷方式

快捷方式在你的 `uno.config.ts` 文件中定义。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  shortcuts: {
    'btn': 'px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-md hover:bg-blue-700',
  }
})
```

现在，你可以用这个简洁的 `btn` 来重构你的 HTML：

```html
<button class="btn">Button A</button>
<button class="btn">Button B</button>
```

代码瞬间变得干净、易读，且易于维护。如果你想修改按钮样式，只需要在配置文件中修改 `btn` 的定义即可。

## 2. 快捷方式的工作原理：与 `@apply` 的本质区别

如果你用过 Tailwind CSS，你可能会觉得这和 `@apply` 很像。但实际上，它们的底层机制完全不同，这也是 UnoCSS 性能优势的关键来源之一。

- **`@apply` (在 Tailwind 中)**: 是一个**运行时**的概念。它会在最终生成的 CSS 文件中创建一个**新的 CSS 类**（例如 `.btn`），然后将所有 `@apply` 的工具类规则**复制**到这个新类中。这会实实在在地增加最终 CSS 文件的大小。

  ```css
  /* 使用 @apply 后生成的 CSS */
  .btn {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 0.5rem;
    /* ... 其他所有规则 ... */
  }
  ```

- **`shortcuts` (在 UnoCSS 中)**: 是一个**构建时**的“宏” (Macro)。当 UnoCSS 在你的代码中扫描到 `btn` 时，它并不会生成一个叫 `.btn` 的类。相反，它会在构建过程中，将 `btn` **原地展开**为其所代表的那一长串工具类字符串 (`px-4 py-2 ...`)，然后再去处理这一长串字符串。最终生成的 CSS 中**只包含**那些被用到的原子类（如 `.px-4`, `.py-2` 等），而**不存在**一个名为 `.btn` 的聚合类。

**结论：UnoCSS 的快捷方式是零开销的。** 它只在开发时为你提供便利，而不会给最终产物增加任何额外的体积。

## 3. 动态快捷方式

快捷方式的强大之处还在于它可以是动态的。你可以定义一个快捷方式来接受参数。

```typescript
// uno.config.ts
shortcuts: [
  // 静态快捷方式
  ['btn', 'px-4 py-2 rounded'],
  
  // 动态快捷方式
  [/^btn-(.*)$/, ([, c]) => `bg-${c}-500 text-${c}-100 py-2 px-4 rounded-lg`],
]
```

在这个例子中，我们定义了一个匹配 `btn-` 前缀的正则表达式。当你这样使用时：

```html
<button class="btn-blue">Blue Button</button>
<button class="btn-red">Red Button</button>
```

UnoCSS 会动态地生成对应的类：
- `btn-blue` 会被展开为 `bg-blue-500 text-blue-100 py-2 px-4 rounded-lg`。
- `btn-red` 会被展开为 `bg-red-500 text-red-100 py-2 px-4 rounded-lg`。

你甚至可以在一个快捷方式中引用另一个快捷方式：

```typescript
// uno.config.ts
shortcuts: {
  'btn': 'px-4 py-2 font-semibold rounded-lg shadow-md',
  'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-700',
  'btn-danger': 'btn bg-red-500 text-white hover:bg-red-700',
}
```

这让你可以构建一个层次分明、可组合的组件样式系统。

## 总结

快捷方式是 UnoCSS 中提升开发效率和代码可维护性的核心功能。通过本章的学习，你掌握了：

- 如何定义静态快捷方式来封装重复的工具类组合。
- UnoCSS 快捷方式作为“构建时宏”的零开销工作原理，及其与 `@apply` 的关键区别。
- 如何使用正则表达式创建强大的动态快捷方式。

从现在开始，当你发现自己在重复编写相同的类组合时，就应该立刻想到——是时候创建一个 `shortcut` 了。在下一章，我们将学习另一种提升代码风格的利器：属性化模式与变体组。