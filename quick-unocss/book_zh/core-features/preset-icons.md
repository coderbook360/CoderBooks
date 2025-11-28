# 图标系统：开箱即用的图标方案

在现代 UI 开发中，图标是不可或缺的视觉元素。然而，传统图标方案往往伴随着诸多痛点：手动管理成百上千的 SVG 文件、处理复杂的雪碧图、或是忍受字体图标在对齐、缩放和多色支持上的种种限制。

UnoCSS 通过 `@unocss/preset-icons` 提供了一个极其优雅的解决方案。它将拥有超过 200,000 个图标的庞大 [Iconify](https://iconify.design/) 生态系统无缝集成到你的工作流中，让你能像使用普通工具类一样，轻松、高效地使用任何你想要的图标。

## 1. 它是如何工作的？

`@unocss/preset-icons` 的工作方式非常巧妙：

1.  你在代码中使用一个特殊的类名，如 `i-mdi-home`。
2.  在构建时，UnoCSS 识别这个类名，并从你本地安装的 Iconify JSON 数据包中查找对应的图标数据（SVG 代码）。
3.  它将这个 SVG 数据通过 URL-encoding 转换为 CSS 的 `mask-image` 属性。
4.  最终生成一个 CSS 类，将这个图标作为蒙版应用到元素上。

这种方法的优势是巨大的：

-   **按需加载**：只有你用到的图标会被打包进最终的 CSS，完全没有冗余。
-   **零运行时开销**：图标在构建时处理，浏览器无需在运行时额外请求任何图标文件。
-   **完全可定制**：由于图标是 CSS 的一部分，你可以用所有其他的 UnoCSS 工具类（如颜色、字号）来轻松地调整它的大小和颜色。
-   **海量选择**：你可以访问 Material Design Icons, Font Awesome, Remix Icon 等几乎所有流行的图标集。

## 2. 安装与配置

### 第一步：安装预设和图标集

首先，安装图标预设。然后，你需要为你想要使用的图标集安装对应的 JSON 数据包。这些包通常以 `@iconify-json/{collection-name}` 的形式存在。

```bash
npm install -D @unocss/preset-icons @iconify-json/mdi @iconify-json/logos
```

这里我们安装了预设本身，以及 [Material Design Icons](https://icones.js.org/collection/mdi) 和 [Logos](https://icones.js.org/collection/logos) 两个图标集。

### 第二步：配置 `uno.config.ts`

将 `presetIcons` 添加到你的预设列表中。

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import presetUno from '@unocss/preset-uno'
import presetIcons from '@unocss/preset-icons'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      // 预设选项
      scale: 1.2, // 缩放所有图标
      warn: true, // 如果请求的图标不存在，发出警告
    }),
  ],
})
```

## 3. 使用图标

使用图标的语法非常简单：`i-{collection}-{name}`。

-   `i-`: 这是固定的前缀。
-   `{collection}`: 图标集的名称（例如 `mdi`, `logos`）。
-   `{name}`: 图标的名称。

```html
<!-- 一个 Material Design Icons 的 home 图标 -->
<div class="i-mdi-home"></div>

<!-- 一个 Vue 的 logo -->
<div class="i-logos-vue"></div>
```

就这么简单！这两个 `div` 就会显示对应的图标。

## 4. 为图标添加样式

这才是 `preset-icons` 最强大的地方。由于图标是通过 CSS 的 `mask` 实现的，它的颜色取决于 `background-color`。而 UnoCSS 默认会将 `background-color` 设置为 `currentColor`，这意味着你可以直接使用**文本颜色工具类**来给图标上色！

同时，图标的大小会随**字号**的变化而变化。

**实战：创建一个带图标的按钮**

```html
<button class="
  flex items-center gap-2 
  px-4 py-2 
  bg-blue-500 text-white rounded-lg 
  hover:bg-blue-700
">
  <div class="i-mdi-content-save text-2xl"></div>
  <span>Save</span>
</button>
```

在这个例子中：

-   `i-mdi-content-save` 负责显示“保存”图标。
-   `text-2xl` 将图标的大小设置为 `1.5rem`。
-   由于父元素 `<button>` 的 `text-white`，图标默认就是白色的。

你可以像修改文字一样，随意修改图标的颜色和大小，甚至可以添加过渡效果：

```html
<div class="i-mdi-heart text-gray-400 text-4xl hover:text-red-500 transition-colors"></div>
```

这个心形图标默认为灰色，当鼠标悬停时，会平滑地变为红色。

## 5. 在哪里寻找图标？

[Icônes](https://icones.js.org/) 是一个由 UnoCSS 作者 Anthony Fu 开发的网站，它聚合了 Iconify 的所有图标集。你可以在这里搜索、浏览和筛选超过 200,000 个图标，并直接复制你需要的类名。

## 总结

`@unocss/preset-icons` 为前端开发中的图标使用带来了革命性的体验。它不是一个“高级”功能，而是一个能融入日常开发的核心工具。通过本章的学习，你掌握了：

-   如何安装和配置图标预设及图标集。
-   使用 `i-{collection}-{name}` 语法在项目中插入任何图标。
-   如何像处理文本一样，使用 `text-{color}` 和 `text-{size}` 工具类来自由地控制图标的颜色和大小。

告别繁琐的图标管理吧！从现在起，整个 Iconify 图标库都成为了你的囊中之物。