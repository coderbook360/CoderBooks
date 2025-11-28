# 玩转预设：`preset-wind` 与其他预设

在上一章，我们亲手打造了属于自己的动态规则，实现了 `m-1`、`p-5.5` 这样的自定义工具类。这固然强大，但如果让我们从零开始，为项目中可能用到的成百上千种样式（颜色、字体、边框、阴影……）都编写规则，那将是一项无比浩大的工程。

这显然不是我们期望的工作方式。我们真正需要的，是一个内容丰富、设计精良、开箱即用的“规则库”。在 UnoCSS 的世界里，这个“规则库”就是 **预设（Preset）**。

预设是 UnoCSS 的基石，它将一系列相关的规则、变体、快捷方式等配置打包在一起，构成了我们日常开发所需的功能载体。可以说，UnoCSS 的强大，很大程度上就体现在其丰富且灵活的预设生态上。

那么，UnoCSS 官方为我们提供了哪些强大的“弹药库”呢？本章，我们将聚焦于最核心、最常用的三套官方预设：`preset-wind`、`preset-mini` 和 `preset-uno`。

## `preset-wind`：事实上的标准预设

如果你只能选择一个预设，那么 `preset-wind` 无疑是你的首选。你可以将它视为 UnoCSS 官方提供的“全家桶”，是功能最全面、最推荐的预设。

它的核心价值在于，它提供了与最新版 Tailwind CSS 和 Windi CSS 高度兼容的工具类集合。这意味着：

- **无缝迁移**：对于有 Tailwind/Windi CSS 使用经验的开发者来说，学习成本几乎为零，可以立即上手。
- **功能完备**：你所熟悉的 `flex`、`grid`、`transform`、`ring`、`shadow` 等绝大部分工具类，`preset-wind` 都已为你准备好。

在你的 `uno.config.ts` 中启用它非常简单：

```typescript
// uno.config.ts
import { defineConfig, presetWind } from 'unocss'

export default defineConfig({
  presets: [
    presetWind(), // 启用 preset-wind
  ],
})
```

一旦启用了 `preset-wind`，你就拥有了强大的样式表达能力。让我们来看一个经典的卡片组件示例，感受一下它的魅力：

```html
<div class="max-w-sm rounded overflow-hidden shadow-lg bg-white">
  <img class="w-full" src="/card-top.jpg" alt="Sunset in the mountains">
  <div class="px-6 py-4">
    <div class="font-bold text-xl mb-2">The Coldest Sunset</div>
    <p class="text-gray-700 text-base">
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Voluptatibus quia, nulla! Maiores et perferendis eaque, exercitationem praesentium nihil.
    </p>
  </div>
  <div class="px-6 pt-4 pb-2">
    <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#photography</span>
    <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#travel</span>
    <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#winter</span>
  </div>
</div>
```

无需编写一行 CSS，仅通过组合 `preset-wind` 提供的工具类，我们就构建出了一个结构清晰、样式丰富的组件。想要探索 `preset-wind` 到底提供了哪些工具类？最好的方式是访问 UnoCSS 官方的 **交互式文档**，你可以在那里实时搜索和预览每个工具类的效果。

## `preset-mini`：最小化的核心集

与 `preset-wind` 的“大而全”相对，`preset-mini` 走的是另一条路——“小而美”。

它的定位是一个更基础、更精简的预设。你可以将它理解为 `preset-wind` 的**子集**。它被设计出来的目的，是为那些不希望默认包含所有 Tailwind 功能，而是想从一个最小化的核心集合开始，逐步按需添加或自定义自己设计系统的用户，提供一个轻量级的起点。

`preset-wind` 与 `preset-mini` 的关系可以这样描述：

**`preset-wind` = `preset-mini` + 更多功能（如 `ring`, `shadow`, `blur` 等高级特效）**

在大多数情况下，我们直接使用 `preset-wind` 就好。但了解 `preset-mini` 的存在，有助于我们更深刻地理解 UnoCSS 的可组合性与分层设计理念。

## `preset-uno`：一个需要澄清的“别名”

在探索 UnoCSS 的过程中，你很可能会遇到 `preset-uno`。这是一个非常容易让初学者混淆的概念，因此我们必须在这里彻底讲清楚。

`preset-uno` 的含义在 UnoCSS 的发展历史中有过演变。但在目前的最新版本中，它的身份非常明确：

**`preset-uno` 是 `preset-wind` 的一个别名（Alias）。**

这意味着，在配置文件中写 `presetUno()` 和 `presetWind()` 的效果是**完全一样**的。

```typescript
import { defineConfig, presetUno, presetWind } from 'unocss'

export default defineConfig({
  presets: [
    // 这两种写法在当前版本中效果完全相同
    // presetUno(),
    presetWind(), // 推荐使用这个，因为名字更具描述性
  ],
})
```

**最佳实践**：为了代码的清晰性和可读性，我们强烈推荐你**始终显式地使用 `presetWind()`**。因为它的名字能更清晰地向其他开发者（以及未来的你）传达一个信息：“我正在使用与 Tailwind CSS 兼容的全功能预设”。

## 总结

本章我们认识了 UnoCSS 官方提供的核心预设“三剑客”：

- **`preset-wind`**：功能最全面的 Tailwind 兼容预设，是绝大多数项目的首选和事实标准。
- **`preset-mini`**：`preset-wind` 的子集，提供一个更小的核心工具集，代表了 UnoCSS 的最小化内核。
- **`preset-uno`**：`preset-wind` 的别名，为了代码清晰，推荐使用 `presetWind()`。

理解了预设，你就掌握了 UnoCSS 的“军火库”。在接下来的章节中，我们将继续探索如何利用变体来为这些工具类赋予更丰富的交互能力。