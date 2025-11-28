# 填充色彩：背景、边框与渐变

如果说布局、尺寸和间距是页面的骨架，那么颜色、边框和背景就是它的血肉。在这一章，我们将学习如何使用 UnoCSS 为我们的设计注入丰富的视觉表现力，从简单的纯色背景到优雅的圆角边框，再到引人注目的渐变效果。

## 1. 背景 (Backgrounds)

为元素添加背景色是最常见的样式需求之一。

### 背景颜色 (Background Color)

UnoCSS 使用 `bg-{color}-{shade}` 的命名范式。

```html
<div class="bg-blue-500">...</div>
<div class="bg-red-100">...</div>
<div class="bg-gray-900">...</div>
```

- `{color}`: 颜色名称，如 `blue`, `red`, `green`。
- `{shade}`: 颜色的深浅度，通常从 `50` (最浅) 到 `900` (最深)。`500` 通常是该颜色的主色调。

### 背景透明度 (Background Opacity)

UnoCSS 提供了一种极其优雅的方式来控制背景颜色的透明度——在颜色类名后直接加上斜杠 `/` 和百分比。

**语法**: `bg-{color}-{shade}/{opacity}`

```html
<!-- 50% 透明度的蓝色背景 -->
<div class="bg-blue-500/50">...</div>

<!-- 20% 透明度的黑色背景，常用于遮罩层 -->
<div class="bg-black/20">...</div>
```

这种斜杠语法是 UnoCSS（以及现代 Tailwind CSS）的一个标志性特性，它比传统的 `bg-opacity-50` 写法更直观、更简洁。

### 背景渐变 (Background Gradients)

创建漂亮的渐变效果从未如此简单。你需要组合使用三个工具类：

1.  `bg-gradient-to-{direction}`: 定义渐变方向。
2.  `from-{color}`: 定义起始颜色。
3.  `to-{color}`: 定义结束颜色。
4.  (可选) `via-{color}`: 定义中间颜色。

**实战：创建一个渐变按钮**

```html
<button class="
  bg-gradient-to-r from-purple-500 to-pink-500 
  text-white font-bold py-2 px-4 rounded
">
  Gradient Button
</button>
```

这段代码创建了一个从紫色平滑过渡到粉色的水平渐变（`to-r` 代表 to right）。

## 2. 边框 (Borders)

边框用于在视觉上划分和组织内容。

### 边框宽度 (Border Width)

- `border`: 在所有边上应用 1px 边框。
- `border-{width}`: 应用指定宽度的边框，如 `border-2`, `border-4`。
- `border-{direction}-{width}`: 只在特定方向上应用边框，如 `border-t-2` (上边框), `border-r-4` (右边框)。

### 边框颜色 (Border Color)

与背景色类似，使用 `border-{color}-{shade}`。

```html
<input class="border-2 border-gray-300 focus:border-blue-500" />
```

### 边框圆角 (Border Radius)

圆角可以极大地提升设计的亲和力。

- `rounded`: 应用中等大小的圆角。
- `rounded-{size}`: 应用指定大小的圆角，如 `rounded-sm`, `rounded-lg`, `rounded-xl`, `rounded-full` (创建圆形)。
- `rounded-{corner}-{size}`: 只为特定角设置圆角，如 `rounded-tl-lg` (左上角), `rounded-br-full` (右下角)。

**实战：创建一个头像组件**

```html
<img 
  class="w-24 h-24 rounded-full border-4 border-white shadow-lg"
  src="/path/to/avatar.jpg" 
  alt="User Avatar"
/>
```

通过 `rounded-full`，我们轻松地将一张方形图片裁剪成了圆形。

## 3. 分隔线 (Dividers)

当你需要在一组元素之间添加分隔线时（例如，一个菜单列表），`divide` 工具类是比手动为每个元素添加下边框更优雅的解决方案。

- `divide-y` 或 `divide-x`: 在垂直或水平方向的子元素之间添加边框。
- `divide-{color}`: 定义分隔线的颜色。
- `divide-{style}`: 定义分隔线的样式，如 `divide-dashed`。

**实战：创建一个带分隔线的设置菜单**

```html
<div class="w-full max-w-sm bg-white rounded-lg shadow-md divide-y divide-gray-200">
  <a href="#" class="block p-4 hover:bg-gray-50">Profile</a>
  <a href="#" class="block p-4 hover:bg-gray-50">Settings</a>
  <a href="#" class="block p-4 hover:bg-gray-50">Logout</a>
</div>
```

`divide-y divide-gray-200` 会自动在每个 `<a>` 标签之间添加一条 1px 宽的灰色上边框（除了第一个元素），完美地实现了分隔效果，而无需任何额外的 CSS 或复杂的选择器。

## 总结

在本章中，我们学会了如何为页面骨架“上色”和“描边”。你掌握了：

- 使用 `bg-*` 系列工具类来设置纯色背景和优雅的渐变。
- 熟练运用斜杠语法 `/` 来控制颜色的透明度。
- 使用 `border-*` 和 `rounded-*` 来创建各种样式的边框和圆角。
- 使用 `divide-*` 这一高效工具来为列表项添加分隔线。

现在，你的组件不再是单调的线框，而是拥有了丰富的视觉层次。在下一章，我们将继续为它注入灵魂，学习如何控制文本、字体和排版。