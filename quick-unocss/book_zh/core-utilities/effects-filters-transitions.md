# 增添质感：阴影、滤镜与过渡

欢迎来到“核心工具类实战”的最后一章。至此，你已经掌握了构建页面结构、填充颜色和排版文字的能力。现在，我们将学习如何为设计增添最后的“质感”，让你的界面从“能用”变得“好用”和“好看”。

本章将聚焦于那些能提升界面品质的工具类，包括阴影、透明度、滤镜以及让交互变得生动的过渡和动画。

## 1. 阴影 (Box Shadow)

阴影是创造深度和层次感最有效的方式之一。UnoCSS 提供了一系列预设的 `shadow-{size}` 工具类。

- `shadow-sm`: 小阴影
- `shadow`: 普通阴影
- `shadow-md`: 中等阴影
- `shadow-lg`: 大阴影
- `shadow-xl`: 超大阴影
- `shadow-2xl`: 超超大阴影
- `shadow-inner`: 内阴影
- `shadow-none`: 移除阴影

**实战：创建一个悬停时放大的卡片**

```html
<div class="
  p-6 bg-white rounded-lg shadow-md 
  hover:shadow-xl hover:scale-105 
  transition-all duration-300 ease-in-out
">
  <h3 class="text-lg font-semibold">Hover me</h3>
  <p class="mt-2 text-gray-600">This card will elevate on hover.</p>
</div>
```

在这个例子中，卡片默认有一个中等阴影 (`shadow-md`)。当鼠标悬停时，阴影会变得更大 (`hover:shadow-xl`)，同时卡片本身也会稍微放大 (`hover:scale-105`)。我们还添加了过渡效果，让这个变化显得平滑自然（稍后会详细讲解）。

## 2. 透明度 (Opacity)

`opacity-{value}` 工具类可以控制整个元素（包括其子元素）的透明度。

`{value}` 的范围是 `0` 到 `100`，步长为 `5`。

```html
<div class="opacity-50">...</div>
```

这在处理禁用状态时非常有用：

```html
<button class="..." disabled>
  <span class="opacity-50">Submit</span>
</button>
```

**注意**：`opacity-50` 与我们之前学的 `bg-blue-500/50` 是不同的。前者作用于整个元素，而后者只作用于背景颜色。

## 3. 过渡与动画 (Transitions & Animations)

平滑的过渡是现代 Web 交互的核心。UnoCSS 让添加过渡变得异常简单。

### 开启过渡

首先，你需要使用 `transition` 或 `transition-{property}` 来告诉浏览器哪些属性的变化需要应用过渡效果。

- `transition`: 为所有可过渡的属性开启过渡。
- `transition-colors`: 只为颜色相关的属性（如 `background-color`, `color`）开启过渡。
- `transition-transform`: 只为 `transform` 相关的属性（如 `scale`, `rotate`）开启过渡。

### 过渡时长 (Duration)

使用 `duration-{ms}` 来控制过渡的持续时间。

- `duration-150`, `duration-300`, `duration-500` 等。

### 过渡缓动函数 (Easing)

使用 `ease-{timing}` 来控制过渡的速度曲线。

- `ease-linear`: 线性
- `ease-in`: 缓入
- `ease-out`: 缓出
- `ease-in-out`: 缓入缓出 (最常用)

回到我们之前的卡片例子，`transition-all duration-300 ease-in-out` 这三个类的组合，就创建了一个“对所有属性应用过渡，持续 300ms，使用缓入缓出曲线”的效果。

### 动画 (Animation)

UnoCSS 也内置了一些常用的动画效果。

- `animate-spin`: 旋转（常用于加载指示器）。
- `animate-ping`: 脉冲（常用于通知）。
- `animate-pulse`: 脉动（常用于骨架屏）。
- `animate-bounce`: 弹跳。

**实战：创建一个加载指示器**

```html
<div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin">
</div>
```

这段代码创建了一个经典的圆形加载动画。

## 4. 滤镜 (Filters)

滤镜可以让你在不改变元素本身的情况下，实时地改变其视觉效果。

- `blur-{size}`: 模糊，如 `blur-sm`。
- `brightness-{value}`: 亮度，如 `brightness-50`。
- `contrast-{value}`: 对比度。
- `grayscale`: 灰度。
- `saturate-{value}`: 饱和度。

滤镜在与 `hover` 等变体组合使用时非常强大。

**实战：创建一个悬停时变亮的图片廊**

```html
<div class="grid grid-cols-3 gap-4">
  <img 
    src="..." 
    class="grayscale hover:grayscale-0 transition duration-300"
  />
  <img 
    src="..." 
    class="grayscale hover:grayscale-0 transition duration-300"
  />
  <img 
    src="..." 
    class="grayscale hover:grayscale-0 transition duration-300"
  />
</div>
```

默认情况下，所有图片都是灰度的 (`grayscale`)。当鼠标悬停在某张图片上时，`hover:grayscale-0` 会移除滤镜，让图片恢复彩色，再配合过渡效果，体验非常棒。

## 总结

至此，我们已经完成了“核心工具类实战”的全部内容。在本章中，你学会了如何：

- 使用 `shadow-*` 为元素添加阴影，创造层次感。
- 使用 `opacity-*` 控制元素的整体透明度。
- 组合 `transition`, `duration`, `ease` 来创建平滑的过渡动画。
- 使用 `animate-*` 来添加预设的 CSS 动画。
- 使用 `filter` 系列工具类（如 `blur`, `grayscale`）来创造丰富的视觉效果。

你现在已经拥有了使用 UnoCSS 构建一个完整、美观且具交互性的界面所需的所有核心知识。从布局骨架，到色彩填充，再到文字排版和最终的质感提升，你已经走完了整个流程。

从下一部分开始，我们将进入“核心功能实战”，学习如何使用快捷方式、属性化模式等工具来进一步提升你的开发效率。