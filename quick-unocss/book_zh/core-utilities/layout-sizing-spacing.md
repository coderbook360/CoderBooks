# 构建骨架：布局、尺寸与间距

欢迎来到“核心工具类实战”的第一章。在这一部分，我们将系统性地学习如何使用 UnoCSS 中最高频的工具类来构建真实世界的界面。我们的起点是“骨架”——也就是页面的布局、尺寸和间距。掌握了它们，你就拥有了搭建任何网页结构的能力。

本章的目标是让你在读完后，能够不再依赖文档，徒手使用 Flexbox、Grid、Padding、Margin 等核心工具类来完成页面布局。

## 1. Display：决定元素如何展示

一切布局的基础始于 `display` 属性。UnoCSS 提供了简单直观的类名：

- `block`: 块级元素，占据一整行。
- `inline-block`: 行内块级元素，像文字一样排列，但拥有宽高。
- `inline`: 行内元素，像文字一样排列，不接受宽高。
- `flex`: 弹性布局，现代布局的绝对核心。
- `grid`: 网格布局，二维布局的强大工具。
- `hidden`: 隐藏元素 (`display: none`)。

在现代 CSS 中，`flex` 和 `grid` 是你最需要关注的两个。 

## 2. Flexbox：一维布局的瑞士军刀

Flexbox 是为了一维布局（无论是行还是列）而设计的。当你想让一组元素在一条线上对齐、分布或排序时，它就是你的首选。

### 开启 Flexbox

要使用 Flexbox，你首先需要在父容器上应用 `flex` 类。

```html
<div class="flex">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### 对齐 (Alignment)

这是 Flexbox 最强大的功能之一。

- **主轴对齐 (Justify Content)**: 控制元素在主轴（默认为水平方向）上的分布。
  - `justify-start` (默认), `justify-center`, `justify-end`, `justify-between`, `justify-around`。
- **交叉轴对齐 (Align Items)**: 控制元素在交叉轴（默认为垂直方向）上的对齐方式。
  - `items-start`, `items-center`, `items-end`, `items-baseline`, `items-stretch` (默认)。

**实战：创建一个居中的导航栏**

```html
<nav class="flex items-center justify-between bg-gray-800 p-4 text-white">
  <div class="font-bold text-lg">Logo</div>
  <div class="flex items-center gap-4">
    <a href="#" class="hover:text-gray-300">Home</a>
    <a href="#" class="hover:text-gray-300">About</a>
    <a href="#" class="hover:text-gray-300">Contact</a>
  </div>
</nav>
```

在这个例子中，`flex items-center` 保证了 Logo 和导航链接在垂直方向上居中对齐。`justify-between` 则将 Logo 推到最左边，导航链接组推到最右边。

### 方向与换行

- **方向**: `flex-row` (默认，水平), `flex-col` (垂直)。
- **换行**: `flex-wrap` (允许换行), `flex-nowrap` (默认，不换行)。

### 间距 (Gap)

`gap` 是现代 Flexbox 和 Grid 的最佳实践，用于在子元素之间创建一致的间距，而不会在容器边缘添加多余的间距。

- `gap-4`: 在所有方向上应用间距。
- `gap-x-4`: 只在水平方向上应用间距。
- `gap-y-2`: 只在垂直方向上应用间距。

在上面的导航栏例子中，我们使用了 `gap-4` 来为链接之间创建漂亮的间距。

## 3. Grid：强大的二维布局

当你的布局需要在两个维度（行和列）上对齐时，Grid 布局是更好的选择。

- `grid`: 开启 Grid 布局。
- `grid-cols-{n}`: 定义网格的列数。例如, `grid-cols-3` 创建一个三列网格。
- `grid-rows-{n}`: 定义网格的行数。

**实战：创建一个三列卡片布局**

```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
  <!-- Card 1 -->
  <div class="bg-white p-4 rounded-lg shadow">...</div>
  <!-- Card 2 -->
  <div class="bg-white p-4 rounded-lg shadow">...</div>
  <!-- Card 3 -->
  <div class="bg-white p-4 rounded-lg shadow">...</div>
</div>
```

这段代码创建了一个在小屏幕上为单列，在 `md` 屏幕及以上变为三列的响应式网格布局，并且卡片之间有 `gap-8` 的间距。

## 4. 尺寸 (Sizing)

控制元素的尺寸是布局的基础。

- **宽度 (Width)**: `w-{size}`
- **高度 (Height)**: `h-{size}`

`{size}` 可以是：
- **数字**: `w-64` (对应 theme 中的 `64 * 0.25rem = 16rem`)。
- **分数**: `w-1/2` (50%), `w-full` (100%)。
- **屏幕单位**: `w-screen` (100vw), `h-screen` (100vh)。

同时，你还可以控制最大和最小尺寸：
- `min-w-{size}`, `max-w-{size}`
- `min-h-{size}`, `max-h-{size}`

**实战：创建一个居中的、有最大宽度的内容区**

```html
<div class="max-w-screen-lg mx-auto p-4">
  <!-- 你的页面主要内容 -->
</div>
```

`max-w-screen-lg` 限制了内容区的最大宽度，确保在大屏幕上不会过宽。`mx-auto` 则让这个具有固定宽度的块级元素水平居中。

## 5. 间距 (Spacing)

间距是设计的呼吸空间。UnoCSS 提供了极其丰富的工具类来控制 `margin` 和 `padding`。

命名范式: `{property}{direction}-{size}`

- **Property**: `m` (margin), `p` (padding)。
- **Direction**:
  - ` ` (无): 四个方向, e.g., `m-4`。
  - `x`: 水平方向 (left & right), e.g., `px-4`。
  - `y`: 垂直方向 (top & bottom), e.g., `py-2`。
  - `t`, `r`, `b`, `l`: 单独方向 (top, right, bottom, left), e.g., `mt-8`。

**水平居中 `mx-auto`**

对于一个有明确宽度的块级元素，`mx-auto` 会自动计算左右 `margin`，从而实现水平居中。这是 Web 开发中最常用的技巧之一。

**元素间距 `space-x` 和 `space-y`**

这是一个非常有用的工具，它会在子元素之间添加间距（除了第一个元素）。

```html
<div class="flex space-x-4">
  <span>Home</span>
  <span>About</span>
  <span>Contact</span>
</div>
```

这会在 “Home” 和 “About” 之间，以及 “About” 和 “Contact” 之间添加水平间距，但不会在 “Home” 的左边添加。它通过 `> * + *` 选择器实现，是 `gap` 的一个很好的替代方案，尤其是在旧浏览器或不支持 `gap` 的场景中。

## 总结

在本章中，我们掌握了构建任何页面布局骨架所需的核心工具类。你学会了：

- 使用 `flex` 和 `grid` 来创建强大的一维和二维布局。
- 使用 `w-` 和 `h-` 来精确控制元素的尺寸。
- 使用 `p-` 和 `m-` 来为你的设计注入呼吸空间。

最重要的是，你开始体会到将这些原子类“组合”起来的威力。在下一章，我们将为这个骨架“填充色彩”，学习如何使用颜色、边框和渐变。