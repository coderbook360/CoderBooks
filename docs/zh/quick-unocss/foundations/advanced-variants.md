# 精通变体：响应式、伪类与逻辑组合

在前面的章节中，我们已经初步接触了 UnoCSS 的一些基础概念。现在，是时候深入探讨其最强大的功能之一：**变体 (Variants)**。变体是 UnoCSS 的“条件状语”，它告诉引擎在何种条件下应用某个工具类。无论是响应式布局、元素的交互状态，还是暗黑模式，都由变体来驱动。

掌握了变体，你才能真正释放 UnoCSS 的全部潜力，写出简洁、强大且极易维护的界面。

## 1. 什么是变体？

简单来说，变体就是一个加在工具类前面的“前缀”，并用冒号 `:` 分隔。

```html
<div class="hover:bg-blue-500"></div>
```

在这个例子中，`hover:` 就是一个变体。它告诉 UnoCSS，`bg-blue-500` 这个类只应该在鼠标悬停（hover）在这个 `<div>` 元素上时才生效。

UnoCSS 内置了海量的变体，覆盖了从伪类、伪元素、媒体查询到父子状态的各种场景。让我们从最常用的两类开始：伪类变体和响应式变体。

## 2. 伪类变体：捕捉交互的瞬间

伪类用于描述元素的特定状态。你每天都在使用的 `a:hover` 就是最经典的伪类。在 UnoCSS 中，这一切都变成了信手拈来的变体。

### 常见交互状态

这些变体是你构建交互式组件的基石。

- `hover`: 鼠标悬停
- `focus`: 元素获得焦点
- `active`: 元素被激活（例如，按钮被按下）
- `disabled`: 元素被禁用

让我们看一个按钮的例子：

```html
<button 
  class="
    bg-blue-500 text-white font-bold py-2 px-4 rounded
    hover:bg-blue-700
    focus:outline-none focus:ring-2 focus:ring-blue-300
    active:bg-blue-800
    disabled:bg-gray-400 disabled:cursor-not-allowed
  "
>
  Click me
</button>
```

这个按钮拥有了丰富的交互样式：默认是蓝色背景，悬停时变深，激活时变得更深，获得焦点时有轮廓光圈，而被禁用时则变成灰色。所有这些状态都通过变体清晰地定义在 `class` 属性中。

### 位置与顺序

处理列表时，我们经常需要为第一个或最后一个元素应用特殊样式。

- `first`: 匹配第一个子元素
- `last`: 匹配最后一个子元素
- `odd`: 匹配奇数位置的子元素
- `even`: 匹配偶数位置的子元素

想象一个列表，我们想让奇数行和偶数行有不同的背景色，并且移除最后一个元素的下边框：

```html
<ul>
  <li class="p-2 border-b border-gray-200 even:bg-gray-50 last:border-none">Item 1</li>
  <li class="p-2 border-b border-gray-200 even:bg-gray-50 last:border-none">Item 2</li>
  <li class="p-2 border-b border-gray-200 even:bg-gray-50 last:border-none">Item 3</li>
  <li class="p-2 border-b border-gray-200 even:bg-gray-50 last:border-none">Item 4</li>
</ul>
```

通过 `even:bg-gray-50` 和 `last:border-none`，我们用声明式的方式轻松实现了斑马条纹和移除末尾边框的效果。

## 3. 响应式变体：拥抱移动优先

响应式设计是现代 Web 开发的标配。UnoCSS 默认采用**移动优先**的策略，并提供了与 Tailwind CSS 完全兼容的响应式变体。

默认断点如下：
- `sm`: `640px`
- `md`: `768px`
- `lg`: `1024px`
- `xl`: `1280px`
- `2xl`: `1536px`

**移动优先**意味着，没有前缀的工具类（如 `w-full`）默认应用于所有屏幕尺寸（从最小的开始）。然后，你可以使用 `sm:`, `md:` 等变体来覆盖在**更大屏幕**下的样式。

让我们构建一个简单的响应式卡片布局：

```html
<div class="
  p-4 bg-white rounded-lg shadow-md
  w-full 
  md:w-1/2 
  lg:w-1/3
">
  <!-- Card content -->
</div>
```

这段代码的含义是：
- **默认情况下**（在所有尺寸，特别是小屏幕上），卡片宽度为 `100%` (`w-full`)。
- **当屏幕宽度达到 `768px` (md) 或以上时**，卡片宽度变为 `50%` (`md:w-1/2`)。
- **当屏幕宽度达到 `1024px` (lg) 或以上时**，卡片宽度变为 `33.33%` (`lg:w-1/3`)。

这种从“小”到“大”的覆盖逻辑，是移动优先响应式设计的核心。

## 4. 逻辑组合：变体的终极形态

如果变体的威力仅限于此，那还不足以称之为“终极”。真正让 UnoCSS 脱颖而出的是其对变体进行**逻辑组合**的能力。

### 问题浮现：重复的变体前缀

随着项目变得复杂，你可能会写出这样的代码：

```html
<button class="bg-blue-500 hover:bg-blue-700 hover:scale-110 focus:ring-2 focus:ring-blue-300">
  Click me
</button>
```

注意到了吗？`hover:` 和 `focus:` 被重复写了多次，这让 `class` 列表显得冗长且难以阅读。

### 解决方案：变体组 (Variant Groups)

为了解决这个问题，UnoCSS 引入了**变体组**的语法，它允许你用括号将共享相同变体的工具类组合在一起。

**语法**: `variant:(class1 class2 ...)`

现在，让我们用变体组来重构上面的按钮：

```html
<button class="bg-blue-500 hover:(bg-blue-700 scale-110) focus:(ring-2 ring-blue-300)">
  Click me
</button>
```

代码瞬间变得清晰了！所有 `hover` 状态下的样式被归类到了一起，`focus` 状态也是如此。代码的可读性和可维护性得到了极大的提升。

### 终极简化：组合多个变体

变体组的强大之处不止于此。你甚至可以将多个变体组合在一起，应用到同一组工具类上。

**语法**: `(variant1:variant2:):(class1 class2 ...)`

想象一个在 `hover` 和 `focus` 状态下具有相同样式的输入框：

```html
<!-- 冗长的原始写法 -->
<input class="border-gray-300 hover:border-blue-500 focus:border-blue-500" />

<!-- 使用组合变体组 -->
<input class="border-gray-300 (hover:focus):border-blue-500" />
```

` (hover:focus):border-blue-500` 这段代码清晰地表达了“当悬停或聚焦时，边框变为蓝色”的意图。

我们甚至可以组合响应式变体和伪类变体：

```html
<div class="
  text-black 
  md:hover:text-red-500
">
  Hello
</div>
```

这表示：在 `md` 尺寸及以上的屏幕上，当鼠标悬停时，文本颜色变为红色。

### 最佳实践：结合属性化模式

当变体组合与[属性化模式](./attributify-and-variant-groups.md)结合时，代码的优雅程度会达到顶峰。

```html
<button 
  bg="blue-500"
  text="white"
  font="bold"
  p="y-2 x-4"
  rounded
  hover="bg-blue-700 scale-110"
  focus="ring-2 ring-blue-300"
>
  Click me
</button>
```

通过将变体作为属性前缀，我们得到了几乎与 CSS 声明块一样清晰的结构，同时享受着原子化 CSS 带来的所有好处。

## 5. 总结

变体是 UnoCSS 的核心与灵魂。通过将伪类、响应式断点等条件转化为可组合的前缀，UnoCSS 赋予了我们用一种极其声明式和直观的方式来描述复杂 UI 的能力。

- **伪类变体**让元素“活”起来，响应用户的交互。
- **响应式变体**让布局“动”起来，适应不同的设备。
- **变体组和逻辑组合**则将代码的“可读性”和“可维护性”提升到了新的高度。

熟练掌握变体的各种组合技巧，是成为 UnoCSS 高手的必经之路。从现在开始，在你的项目中大胆地使用它们吧！