# 实用工具类：布局、颜色与响应式设计

掌握了 UnoCSS 的核心概念后，我们就拥有了理解其工作原理的“内功心法”。现在，是时候学习具体的“招式”了。本章将聚焦于日常开发中最常用、最重要的工具类，帮助你将理论知识转化为实实在在的生产力。

我们将以 `preset-wind` 提供的工具类为基础，因为它拥有最广泛的社区认知和最丰富的生态。

## 布局 (Layout)

布局是 CSS 的基石。UnoCSS 提供了强大而直观的工具类来驾驭 Flexbox 和 Grid，以及处理所有与盒模型相关的样式。

### Flexbox：无处不在的弹性盒子

Flexbox 是现代 Web 布局的瑞士军刀。让我们通过构建一个常见的“垂直水平居中”容器来掌握它的核心用法。

```html
<div class="h-screen bg-gray-100 flex items-center justify-center">
  <div class="p-8 bg-white rounded-lg shadow-md">
    我是一个居中的盒子
  </div>
</div>
```

- `flex`: 将容器的 `display` 设置为 `flex`。
- `items-center`: 设置 `align-items: center;`，实现交叉轴（默认是垂直方向）居中。
- `justify-center`: 设置 `justify-content: center;`，实现主轴（默认是水平方向）居中。

仅仅三个类，我们就完成了这个经典布局。其他常用 Flexbox 工具类包括：

- **方向**: `flex-row` (默认), `flex-col` (垂直排列), 以及它们的逆序 `flex-row-reverse`, `flex-col-reverse`。
- **换行**: `flex-wrap` (允许换行), `flex-nowrap` (禁止换行)。
- **间距**: `gap-4` (在 flex 子项之间创建 1rem 的间距), `gap-x-2` (只在水平方向), `gap-y-8` (只在垂直方向)。

### Grid：强大的网格布局

当需要更规整的二维布局时，Grid 是最佳选择。让我们用它来构建一个简单的三列卡片布局。

```html
<div class="grid grid-cols-3 gap-4 p-4">
  <div class="bg-white p-4 rounded-lg shadow">卡片 1</div>
  <div class="bg-white p-4 rounded-lg shadow">卡片 2</div>
  <div class="bg-white p-4 rounded-lg shadow">卡片 3</div>
</div>
```

- `grid`: 将容器的 `display` 设置为 `grid`。
- `grid-cols-3`: 定义网格有三列，`grid-template-columns: repeat(3, minmax(0, 1fr));`。
- `gap-4`: 同样适用于 Grid 布局，定义网格项之间的间距。

### 盒模型：空间与尺寸

控制元素的大小和间距是布局的基础。

- **间距**: `m-4` (margin: 1rem), `p-4` (padding: 1rem)。你还可以针对特定方向设置，如 `mt-2` (margin-top), `px-6` (padding-left 和 padding-right)。`mx-auto` 是一个非常有用的类，用于 `margin-left: auto; margin-right: auto;`，可以方便地使一个定宽块级元素水平居中。
- **尺寸**: `w-full` (width: 100%), `h-screen` (height: 100vh), `w-1/2` (width: 50%)。你也可以使用 `max-w-screen-lg` (max-width: 1024px) 来限制内容的最大宽度，或 `min-h-screen` 来确保容器至少和屏幕一样高。

## 颜色与排版 (Color & Typography)

为布局填充上色彩和内容，是让设计变得生动的关键。

### 颜色

UnoCSS 提供了丰富的默认调色板。

- **文本颜色**: `text-red-500`, `text-gray-800`。
- **背景颜色**: `bg-blue-500`, `bg-transparent`。
- **边框颜色**: `border-green-500`。

一个非常酷的特性是**斜杠语法**来控制透明度。你不再需要 `bg-opacity-50` 这样的类，可以直接在颜色类后面追加 `/` 和透明度值（0-100）。

```html
<button class="bg-blue-500/75 text-white">75% 透明度的蓝色按钮</button>
<button class="bg-blue-500/50 text-white">50% 透明度的蓝色按钮</button>
<button class="bg-blue-500/25 text-white">25% 透明度的蓝色按钮</button>
```

这会生成类似 `background-color: rgba(59, 130, 246, 0.75);` 的样式，非常直观和方便。

### 排版

控制文本样式同样简单直观。

- **字号**: `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-3xl` (30px)。
- **字重**: `font-light` (300), `font-normal` (400), `font-bold` (700)。
- **行高**: `leading-tight` (1.25), `leading-normal` (1.5), `leading-loose` (2)。
- **对齐**: `text-left`, `text-center`, `text-right`。
- **装饰**: `underline`, `line-through`, `no-underline` (移除下划线)。

让我们来排版一段包含标题、正文和链接的文本：

```html
<article class="p-4">
  <h2 class="text-2xl font-bold text-gray-900">UnoCSS 核心概念</h2>
  <p class="mt-2 text-gray-700 leading-relaxed">
    理解规则、预设和变体是掌握 UnoCSS 的关键。它们共同构成了 UnoCSS 强大而灵活的系统。
  </p>
  <a href="#" class="mt-4 inline-block text-blue-600 hover:underline">深入学习 &rarr;</a>
</article>
```

## 响应式设计 (Responsive Design)

现在，让我们来学习 UnoCSS 中最强大的功能之一：响应式设计。

UnoCSS 遵循**移动优先 (Mobile-First)** 的设计理念。这意味着我们编写的默认样式是针对小屏幕（移动设备）的，然后通过添加“断点变体”来为更大的屏幕（平板、PC）添加样式。

这些断点变体就是我们之前提到的 `sm:`, `md:`, `lg:`, `xl:` 等。

- `sm:`: 应用于 `640px` 及以上的屏幕宽度。
- `md:`: 应用于 `768px` 及以上的屏幕宽度。
- `lg:`: 应用于 `1024px` 及以上的屏幕宽度。
- `xl:`: 应用于 `1280px` 及以上的屏幕宽度。

`md:flex` 的含义是：“在 `md` 断点（768px）及以上的屏幕宽度，应用 `display: flex`”。在小于 `md` 的屏幕上，这个类无效。

### 实战演练：构建一个响应式卡片

让我们构建一个在移动端垂直堆叠，在平板及以上设备水平排列的响应式卡片组件。

```html
<div class="m-4 bg-white rounded-lg shadow-lg overflow-hidden md:flex">
  <!-- 图片部分 -->
  <div class="md:w-1/3">
    <img class="w-full h-48 object-cover md:h-full" src="https://source.unsplash.com/random/800x600" alt="Random image">
  </div>

  <!-- 内容部分 -->
  <div class="p-6 md:w-2/3">
    <h3 class="text-xl font-bold text-gray-900">学习 UnoCSS</h3>
    <p class="mt-2 text-gray-700">
      一个即时、按需的原子化 CSS 引擎，拥有极致的性能和灵活性。
    </p>
    <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      立即开始
    </button>
  </div>
</div>
```

让我们来分析这段代码的响应式行为：

1.  **外层容器**: 默认情况下，它只是一个普通的块级元素。但在 `md` 断点，`md:flex` 生效，它变成了一个 flex 容器，使其内部的图片和内容部分水平排列。
2.  **图片部分**: 默认宽度由内容决定。在 `md` 断点，`md:w-1/3` 生效，使其占据容器宽度的三分之一。`md:h-full` 确保在水平布局时，图片高度能撑满整个卡片。
3.  **内容部分**: 默认宽度由内容决定。在 `md` 断点，`md:w-2/3` 生效，占据容器宽度的三分之二。

现在，你可以尝试在浏览器中缩放窗口。你会看到，当窗口宽度小于 768px 时，卡片是图片在上、内容在下的垂直布局；当窗口宽度大于 768px 时，它会自动变为图片在左、内容在右的水平布局。

通过组合这些基础的工具类和强大的响应式变体，你已经拥有了构建任何复杂网页布局的能力。不断练习，将这些“招式”融入你的肌肉记忆，你将能真正体验到原子化 CSS 带来的开发乐趣和效率飞跃。