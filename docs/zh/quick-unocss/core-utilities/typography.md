# 注入灵魂：文本、字体与排版

如果说布局和颜色是页面的骨架和血肉，那么排版就是它的灵魂。优雅的文本样式能够极大地提升内容的可读性和用户体验。在这一章，我们将全面掌握 UnoCSS 中用于塑造文本外观的所有核心工具类。

## 1. 字体 (Font)

### 字体族 (Font Family)

UnoCSS 预设了常见的字体族，让你可以轻松切换。

- `font-sans`: 无衬线字体 (默认)。
- `font-serif`: 衬线字体。
- `font-mono`: 等宽字体，常用于代码展示。

```html
<p class="font-serif">这是一段衬线字体文本。</p>
<code class="font-mono">const a = 1;</code>
```

### 字体大小 (Font Size)

使用 `text-{size}` 来控制字体大小。

- `text-xs`, `text-sm`, `text-base` (默认), `text-lg`, `text-xl`
- `text-2xl` 到 `text-9xl` 用于标题。

```html
<h1 class="text-4xl">主标题</h1>
<p class="text-base">这是一段正文。</p>
```

### 字体粗细 (Font Weight)

使用 `font-{weight}` 来改变字重。

- `font-thin`, `font-extralight`, `font-light`, `font-normal` (默认), `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`, `font-black`。

```html
<p class="font-bold">重要提示！</p>
<p class="font-light">这是一段细体文本。</p>
```

## 2. 文本 (Text)

### 文本颜色 (Text Color)

与背景色和边框色一样，文本颜色使用 `text-{color}-{shade}` 的范式，并且同样支持斜杠 `/` 透明度语法。

```html
<p class="text-gray-800">深灰色正文</p>
<p class="text-blue-500">蓝色链接</p>
<p class="text-red-500/80">80% 透明度的红色警告</p>
```

### 文本对齐 (Text Alignment)

- `text-left`: 左对齐
- `text-center`: 居中对齐
- `text-right`: 右对齐
- `text-justify`: 两端对齐

### 文本装饰 (Text Decoration)

- `underline`: 下划线
- `line-through`: 删除线
- `no-underline`: 移除下划线（常用于重置链接的默认样式）

```html
<a href="#" class="text-blue-500 hover:underline">一个悬停时出现下划线的链接</a>
```

## 3. 行高与间距 (Leading & Spacing)

### 行高 (Line Height)

使用 `leading-{size}` 来控制文本的行高，这对于大段文本的可读性至关重要。

- `leading-none`: 1
- `leading-tight`: 1.25
- `leading-snug`: 1.375
- `leading-normal`: 1.5 (默认)
- `leading-relaxed`: 1.625
- `leading-loose`: 2

```html
<p class="leading-relaxed">这段很长的文字拥有一个比较宽松的行高，让读者的眼睛在换行时更加舒适。</p>
```

### 字母间距 (Letter Spacing)

使用 `tracking-{size}` 来调整字母之间的间距。

```html
<h1 class="tracking-wider">一个字母间距更宽的标题</h1>
```

## 4. 处理长文本

在真实项目中，我们经常需要处理长度不定的文本。

- `truncate`: 当文本超出容器宽度时，用省略号（`...`）截断。
- `text-ellipsis`: `truncate` 的核心，但需要配合 `overflow-hidden` 和 `whitespace-nowrap` 使用。
- `whitespace-nowrap`: 强制文本不换行。

**实战：创建一个带截断功能的卡片标题**

```html
<div class="w-64 p-4 bg-white rounded-lg shadow">
  <h3 class="text-lg font-semibold truncate">
    这是一个可能会非常非常非常长的标题
  </h3>
  <p class="text-gray-600 mt-2">卡片内容...</p>
</div>
```

`truncate` 是一个复合工具类，它实际上是 `overflow-hidden text-ellipsis whitespace-nowrap` 的快捷方式。它能确保标题永远保持在一行，并在末尾优雅地显示省略号。

## 5. 实战演练：排版一篇博客文章

现在，让我们把所学的知识组合起来，排版一个典型的文章片段。

```html
<article class="prose max-w-screen-md mx-auto p-4">
  <h1 class="text-4xl font-bold text-gray-900 tracking-tight">
    UnoCSS 排版指南
  </h1>
  <p class="mt-4 text-lg text-gray-600 leading-relaxed">
    欢迎来到 UnoCSS 的世界。在本章中，我们将学习如何利用其强大的工具类来创建美观且可读的文本内容。从字体到间距，每一步都至关重要。
  </p>
  <p class="mt-4 text-gray-700 leading-relaxed">
    排版不仅仅是选择一个漂亮的字体。它关乎层次、节奏和清晰度。一个好的排版系统能够引导用户的视线，让他们轻松地消化信息。你可以访问 <a href="#" class="text-blue-600 underline hover:text-blue-800">官方文档</a> 了解更多详情。
  </p>
  <blockquote class="mt-6 border-l-4 border-gray-300 pl-4 italic text-gray-800">
    “设计是带有目的的艺术。” - 这句话强调了我们所有样式决策背后的意图。
  </blockquote>
</article>
```

在这个例子中，我们：
- 为标题设置了**大字号**、**粗体**和**紧凑的字母间距**。
- 为正文设置了**舒适的行高**和**柔和的文本颜色**。
- 为链接添加了**下划线**和**悬停效果**。
- 使用 `<blockquote>` 创建了一个带有**左边框**和**斜体**的引言块。
- 使用了 `prose` 类，这是一个来自 `@unocss/preset-typography` 的特殊类，可以为 Markdown 生成的内容提供漂亮的默认样式（我们将在后续章节讲解）。

## 总结

通过本章的学习，你已经掌握了塑造文本外观所需的所有核心工具。你现在可以自信地控制：

- **字体**：切换字体族，调整字号和字重。
- **文本**：设置颜色、对齐和装饰。
- **间距**：控制行高和字母间距。
- **溢出**：优雅地处理过长的文本。

有了这些知识，你就拥有了将枯燥的文字转化为引人入胜的内容的能力。在下一章，也是“核心工具类实战”的最后一章，我们将学习如何为设计“增添质感”，探索阴影、滤镜和过渡的奥秘。