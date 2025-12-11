# 构建骨架：布局、尺寸与间距

在前面的章节中，我们掌握了 UnoCSS 的核心概念——规则如何将类名映射为 CSS，预设如何组织这些规则，变体如何修饰生成的选择器。那些是"原理"，从本章开始，我们要解决"实战"问题。

首先要问一个问题：**构建一个页面，最先需要解决什么？**

答案是：**骨架**。不管是简单的落地页还是复杂的后台系统，第一步都是把页面的结构搭起来——导航在哪里、内容区怎么划分、侧边栏占多宽、元素之间留多少空隙。这些问题的答案，决定了页面的基本形态。

本章将通过构建一个**后台管理系统的布局**来学习 UnoCSS 的布局、尺寸和间距工具类。不是罗列所有可用的类名，而是在解决实际问题的过程中，自然地引入需要的工具。

---

## 1. 从一个真实的布局需求开始

假设你接到一个任务：搭建一个后台管理系统的基础布局框架。产品经理给出的需求是这样的：

顶部有一个固定的导航栏，高度 64px，始终显示在页面顶部。左侧有一个侧边栏，宽度 240px，可以折叠。右侧是主内容区域，占据剩余空间。整个页面高度填满视口，内容区域超出时可滚动。

**思考一下，如果用传统 CSS 实现这个布局，你会怎么写？**

你可能会写类似这样的代码：

```css
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.header {
  height: 64px;
  flex-shrink: 0;
}
.body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.sidebar {
  width: 240px;
  flex-shrink: 0;
}
.main {
  flex: 1;
  overflow-y: auto;
}
```

这段 CSS 虽然不复杂，但你需要在 CSS 文件和 HTML 文件之间来回切换，还要想一堆类名。

**使用 UnoCSS，同样的布局可以直接在 HTML 中完成：**

```html
<div class="flex flex-col h-screen">
  <!-- 顶部导航栏 -->
  <header class="h-16 shrink-0 bg-white border-b">
    导航栏
  </header>
  
  <!-- 主体区域 -->
  <div class="flex flex-1 overflow-hidden">
    <!-- 侧边栏 -->
    <aside class="w-60 shrink-0 bg-gray-50 border-r overflow-y-auto">
      侧边栏菜单
    </aside>
    
    <!-- 主内容区 -->
    <main class="flex-1 overflow-y-auto p-6">
      主要内容
    </main>
  </div>
</div>
```

**有没有感觉到不同？** 你不需要写任何 CSS 文件，不需要想类名，布局的意图直接体现在 HTML 中。`h-screen` 告诉你这个容器占满视口高度，`flex flex-col` 告诉你它是一个垂直排列的弹性容器，`shrink-0` 告诉你这个元素不会被压缩。

接下来，让我们逐个拆解这个布局用到的工具类，理解它们解决了什么问题。

---

## 2. Flexbox：一维布局的首选方案

### 2.1 什么时候用 Flexbox？

现在要问一个问题：**什么场景下应该选择 Flexbox？**

答案是：**当你需要在一个方向上（水平或垂直）排列和分布元素时**。

比如导航栏中的菜单项水平排列，侧边栏中的菜单项垂直排列，按钮组中的按钮水平排列并均匀分布，卡片内的标题、内容、按钮垂直排列。

**Flexbox 的核心思想是：容器控制子元素的排列方式，子元素可以伸缩以适应可用空间。**

### 2.2 开启 Flex 容器

回到我们的布局代码，第一行就是 `flex flex-col`：

```html
<div class="flex flex-col h-screen">
```

`flex` 将这个 `<div>` 变成一个弹性容器。它的子元素（header 和主体区域）会按照弹性布局的规则排列。

`flex-col` 指定排列方向是垂直的（从上到下）。如果不加这个类，默认是水平排列（从左到右）。

**思考一下：为什么要用垂直排列？** 因为我们的布局是"上面是导航栏，下面是主体"这样的结构。

如果你遇到的是水平排列的场景，比如导航栏中的菜单项：

```html
<nav class="flex">
  <a href="/">首页</a>
  <a href="/products">产品</a>
  <a href="/about">关于我们</a>
</nav>
```

不需要 `flex-row`，因为这是默认行为。只有当你需要**反向**排列时（从右到左或从下到上），才需要明确指定 `flex-row-reverse` 或 `flex-col-reverse`。

### 2.3 控制子元素如何伸缩

在主体区域的代码中，你会看到 `flex-1`：

```html
<div class="flex flex-1 overflow-hidden">
```

**这个 `flex-1` 解决了什么问题？**

我们希望主体区域占据导航栏之外的所有剩余空间。`flex-1` 正是用来做这件事的——它让元素**增长**以填满可用空间。

与之对应的是 `shrink-0`：

```html
<header class="h-16 shrink-0 bg-white border-b">
```

`shrink-0` 告诉导航栏：**不管空间多紧张，都不要压缩我**。这保证了导航栏始终是 64px 高，不会因为内容区域太多而被挤压。

**这里有一个常见的踩坑场景**：你设置了一个元素的固定宽度或高度，但在 Flex 容器中它却被压缩了。原因是 Flex 子元素默认 `flex-shrink: 1`，会在空间不足时收缩。解决方法就是加上 `shrink-0`。

再看侧边栏的代码：

```html
<aside class="w-60 shrink-0 bg-gray-50 border-r overflow-y-auto">
```

同样使用了 `shrink-0`，确保侧边栏始终保持 240px（`w-60` = 15rem = 240px）的宽度。

而主内容区用的是 `flex-1`：

```html
<main class="flex-1 overflow-y-auto p-6">
```

它会自动填满侧边栏之外的所有空间。当你调整浏览器窗口大小时，只有主内容区的宽度会变化。

### 2.4 对齐方式：justify 和 items

现在思考另一个场景：**导航栏内部的布局**。

假设导航栏左边是 Logo，右边是用户头像，中间是空白。这是一个典型的"两端对齐"需求：

```html
<header class="flex justify-between items-center h-16 px-6 bg-white border-b">
  <div class="text-xl font-bold">Logo</div>
  <div class="flex items-center gap-4">
    <button>通知</button>
    <img class="w-8 h-8 rounded-full" src="avatar.jpg" alt="头像" />
  </div>
</header>
```

`justify-between` 将子元素分散到主轴（水平方向）的两端，Logo 靠左，用户区域靠右。

`items-center` 让子元素在交叉轴（垂直方向）上居中对齐。没有这个类，元素会默认拉伸以填满容器高度。

**这里有一个窍门**：`justify-*` 控制主轴（排列方向），`items-*` 控制交叉轴（垂直于排列方向）。如果你分不清哪个是哪个，就记住：justify 控制 content 沿排列方向的分布，items 控制 content 在另一个方向的对齐。

另一个常见需求是**完美居中**：

```html
<div class="flex justify-center items-center h-screen">
  <div class="text-2xl">登录框</div>
</div>
```

`justify-center` + `items-center` + 容器有明确高度 = 水平垂直都居中。这可能是最常用的居中方案。

### 2.5 Flex 布局的常见模式

让我总结几个用 Flexbox 解决的典型场景：

**场景一：导航栏**
```html
<nav class="flex justify-between items-center h-16 px-6">
  <div>Logo</div>
  <div class="flex gap-6">
    <a href="#">菜单1</a>
    <a href="#">菜单2</a>
  </div>
</nav>
```

**场景二：卡片内容垂直排列，按钮固定在底部**
```html
<div class="flex flex-col h-64 p-4 bg-white rounded-lg shadow">
  <h3 class="font-bold">标题</h3>
  <p class="flex-1 text-gray-600">描述内容...</p>
  <button class="mt-auto">操作按钮</button>
</div>
```

`mt-auto` 是一个很巧妙的技巧——它让按钮的上边距自动扩展，从而把按钮推到底部。

**场景三：输入框组**
```html
<div class="flex">
  <span class="px-3 py-2 bg-gray-100 border border-r-0 rounded-l">https://</span>
  <input class="flex-1 px-3 py-2 border rounded-r" placeholder="域名" />
</div>
```

前缀固定宽度，输入框占据剩余空间。

---

## 3. Grid：二维布局的利器

### 3.1 什么时候用 Grid？

Flexbox 解决一维布局，**Grid 解决二维布局**。

什么是二维布局？当你需要**同时控制行和列**的时候。比如：卡片网格（3列x多行），表格型数据展示，复杂的表单布局（标签在左边，输入框在右边），仪表盘的多区块布局。

### 3.2 卡片网格：最常见的 Grid 场景

假设你要实现一个商品列表页，需要在不同屏幕上显示不同数量的卡片列：

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <div class="bg-white rounded-lg shadow p-4">商品卡片 1</div>
  <div class="bg-white rounded-lg shadow p-4">商品卡片 2</div>
  <div class="bg-white rounded-lg shadow p-4">商品卡片 3</div>
  <div class="bg-white rounded-lg shadow p-4">商品卡片 4</div>
  <!-- 更多卡片... -->
</div>
```

**这段代码做了什么？**

`grid` 将容器设为网格布局。`grid-cols-1` 在移动端默认单列显示。`md:grid-cols-2` 在中等屏幕（≥768px）显示两列。`lg:grid-cols-3` 在大屏幕（≥1024px）显示三列。`xl:grid-cols-4` 在超大屏幕（≥1280px）显示四列。`gap-6` 设置网格项之间的间距为 1.5rem。

**思考一下：同样的效果用 Flexbox 能实现吗？**

可以，但会更复杂：

```html
<div class="flex flex-wrap gap-6">
  <div class="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]">
    卡片
  </div>
</div>
```

你需要计算每个卡片的宽度，还要考虑 gap 的影响。**用 Grid，列数的概念更直观，不需要手动计算宽度。**

### 3.3 复杂的网格布局

有时候你需要某些元素跨越多列或多行。比如后台仪表盘的布局：

```html
<div class="grid grid-cols-4 gap-6">
  <!-- 欢迎横幅，跨越所有列 -->
  <div class="col-span-4 p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg">
    欢迎回来，管理员！
  </div>
  
  <!-- 数据统计卡片，各占一列 -->
  <div class="p-4 bg-white rounded-lg shadow">今日订单：128</div>
  <div class="p-4 bg-white rounded-lg shadow">今日收入：¥12,800</div>
  <div class="p-4 bg-white rounded-lg shadow">新增用户：56</div>
  <div class="p-4 bg-white rounded-lg shadow">转化率：3.2%</div>
  
  <!-- 图表区域，跨越3列 -->
  <div class="col-span-3 p-6 bg-white rounded-lg shadow h-80">
    销售趋势图表
  </div>
  
  <!-- 待办事项，跨越1列 -->
  <div class="p-6 bg-white rounded-lg shadow">
    待办事项列表
  </div>
</div>
```

`col-span-4` 让元素跨越4列（即所有列）。`col-span-3` 让元素跨越3列。没有指定 `col-span` 的元素默认占1列。

### 3.4 不等宽列布局

如果需要列宽不等，比如"200px 侧边栏 + 自适应主内容"：

```html
<div class="grid grid-cols-[200px_1fr] gap-6">
  <aside class="p-4 bg-gray-100">固定200px</aside>
  <main class="p-4">自动填充剩余空间</main>
</div>
```

方括号内是任意 CSS 值，`1fr` 表示占据1份可用空间。

更复杂的例子："100px + 自适应 + 自适应 + 200px"：

```html
<div class="grid grid-cols-[100px_1fr_1fr_200px]">
  <!-- 四列布局 -->
</div>
```

---

## 4. 尺寸控制：宽度和高度

### 4.1 固定尺寸 vs 相对尺寸

在我们的布局中出现了 `h-16`、`w-60`、`h-screen` 这些尺寸类。它们分别代表什么？

`h-16` 是固定高度，等于 4rem = 64px。`w-60` 是固定宽度，等于 15rem = 240px。`h-screen` 是相对于视口的高度，等于 100vh。

**什么时候用固定尺寸，什么时候用相对尺寸？**

固定尺寸适用于设计稿明确指定像素值的场景，如导航栏高度 64px，侧边栏宽度 240px，头像大小 32x32px。

相对尺寸适用于需要适应容器或视口的场景，如 `w-full`（100%宽度），`h-screen`（100%视口高度），`w-1/2`（50%宽度）。

### 4.2 UnoCSS 的尺寸刻度

UnoCSS 的尺寸值遵循一个系统：数字乘以 0.25rem（4px）。所以 `h-16` = 16 × 0.25rem = 4rem = 64px。

常用的尺寸值对照：`4` = 1rem = 16px，`8` = 2rem = 32px，`12` = 3rem = 48px，`16` = 4rem = 64px，`20` = 5rem = 80px。

**记住这个规律后，你就能快速换算任何尺寸。**

### 4.3 实用的尺寸技巧

**技巧一：正方形元素用 `size-*`**

```html
<img class="size-12 rounded-full" src="avatar.jpg" />
```

`size-12` 等于 `w-12 h-12`，创建一个 48x48px 的正方形。

**技巧二：限制最大宽度改善阅读体验**

```html
<article class="max-w-prose mx-auto">
  <!-- 文章内容 -->
</article>
```

`max-w-prose` 大约是 65 个字符宽，这是阅读舒适度的黄金宽度。`mx-auto` 让文章居中。

**技巧三：响应式宽度**

```html
<div class="w-full md:w-1/2 lg:w-1/3">
  响应式卡片
</div>
```

移动端占满宽度，中等屏幕占一半，大屏幕占三分之一。

---

## 5. 间距系统：让界面"呼吸"

### 5.1 间距的重要性

**好的间距让界面更易读、更专业。** 间距过密让人感觉拥挤，间距过大让内容显得松散。

在我们的布局代码中，`p-6` 给主内容区添加了内边距：

```html
<main class="flex-1 overflow-y-auto p-6">
```

这确保内容不会紧贴容器边缘。

### 5.2 Margin vs Padding vs Gap

什么时候用 margin（外边距），什么时候用 padding（内边距），什么时候用 gap（间距）？

**Padding 用于元素内部**：卡片的内边距，按钮的内边距，容器与内容的距离。

```html
<div class="p-6 bg-white rounded-lg">
  卡片内容与边框保持距离
</div>
```

**Margin 用于元素之间**：段落之间的距离，标题与正文的距离。

```html
<h1 class="mb-4">标题</h1>
<p class="mb-2">段落1</p>
<p class="mb-2">段落2</p>
```

**Gap 用于布局容器的子元素**：Flex 或 Grid 容器内子元素的间距。

```html
<div class="flex gap-4">
  <button>按钮1</button>
  <button>按钮2</button>
</div>
```

**为什么 Gap 比 Margin 更适合布局？** 因为 Gap 只影响元素之间的距离，不会给第一个和最后一个元素添加多余的边距。

### 5.3 间距的命名规则

UnoCSS 的间距类遵循简单的模式：`{属性}-{方向}-{值}`

属性有 `m`（margin）和 `p`（padding）。方向有 `t`（top）、`r`（right）、`b`（bottom）、`l`（left）、`x`（水平）、`y`（垂直）。省略方向表示所有方向。

值与尺寸系统一致，乘以 0.25rem。

```html
<div class="mt-4">      <!-- margin-top: 1rem -->
<div class="px-6">      <!-- padding-left: 1.5rem; padding-right: 1.5rem -->
<div class="py-2">      <!-- padding-top: 0.5rem; padding-bottom: 0.5rem -->
<div class="m-4">       <!-- margin: 1rem (所有方向) -->
```

### 5.4 一个间距的实战例子

设计一个卡片组件：

```html
<div class="p-6 bg-white rounded-lg shadow">
  <h3 class="text-lg font-bold mb-2">卡片标题</h3>
  <p class="text-gray-600 mb-4">这是卡片的描述内容，可以有多行文字。</p>
  <div class="flex gap-2">
    <button class="px-4 py-2 bg-blue-500 text-white rounded">主要操作</button>
    <button class="px-4 py-2 bg-gray-200 rounded">次要操作</button>
  </div>
</div>
```

`p-6` 给卡片整体留出呼吸空间。`mb-2` 让标题和描述之间有适当距离。`mb-4` 让描述和按钮区之间有更大距离（视觉分组）。`gap-2` 让两个按钮之间有间隙。`px-4 py-2` 给按钮设置水平和垂直的内边距。

---

## 6. 回顾我们的布局

现在让我们回顾一下完整的后台布局代码，你应该能理解每个类的作用了：

```html
<div class="flex flex-col h-screen">
  <!-- 垂直弹性容器，占满视口高度 -->
  
  <header class="flex justify-between items-center h-16 shrink-0 px-6 bg-white border-b">
    <!-- 导航栏：水平弹性布局，两端对齐，垂直居中 -->
    <!-- 高度64px，不收缩，有左右内边距 -->
    <div class="text-xl font-bold">Logo</div>
    <div class="flex items-center gap-4">
      <button>通知</button>
      <img class="size-8 rounded-full" src="avatar.jpg" />
    </div>
  </header>
  
  <div class="flex flex-1 overflow-hidden">
    <!-- 主体区域：水平弹性布局，填满剩余高度，内容溢出隐藏 -->
    
    <aside class="w-60 shrink-0 p-4 bg-gray-50 border-r overflow-y-auto">
      <!-- 侧边栏：固定240px宽，不收缩，有内边距，可滚动 -->
      <nav class="flex flex-col gap-2">
        <a class="px-4 py-2 rounded hover:bg-gray-200">仪表盘</a>
        <a class="px-4 py-2 rounded hover:bg-gray-200">用户管理</a>
        <a class="px-4 py-2 rounded hover:bg-gray-200">订单管理</a>
      </nav>
    </aside>
    
    <main class="flex-1 p-6 overflow-y-auto">
      <!-- 主内容区：填满剩余宽度，有内边距，可滚动 -->
      <h1 class="text-2xl font-bold mb-6">仪表盘</h1>
      
      <!-- 数据统计卡片网格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="p-6 bg-white rounded-lg shadow">
          <div class="text-gray-500 text-sm">今日订单</div>
          <div class="text-3xl font-bold">128</div>
        </div>
        <!-- 更多统计卡片... -->
      </div>
    </main>
  </div>
</div>
```

---

## 7. 小结

本章我们通过构建一个后台管理系统的布局，学习了 UnoCSS 的布局、尺寸和间距工具类。

**Flexbox** 是一维布局的首选。`flex` 开启容器，`flex-col` 垂直排列，`justify-*` 控制主轴对齐，`items-*` 控制交叉轴对齐，`flex-1` 让元素伸展，`shrink-0` 防止元素被压缩。

**Grid** 适合二维布局。`grid-cols-*` 定义列数，`gap-*` 设置间距，`col-span-*` 让元素跨列。响应式网格用 `md:grid-cols-*` 这样的变体实现。

**尺寸**用 `w-*` 和 `h-*` 控制。数字乘以 0.25rem 得到实际值。`size-*` 创建正方形，分数值创建百分比宽度，`max-w-*` 限制最大宽度。

**间距**是界面的呼吸空间。`p-*` 是内边距，`m-*` 是外边距，`gap-*` 是布局间距。方向后缀 `t/r/b/l/x/y` 控制单独方向。

这些工具类组合起来，足以应对绝大多数的布局需求。下一章我们将学习如何为这些骨架填充色彩——背景、边框与渐变。

---

## 8. 动手练习

**练习1**：用本章学到的知识，实现一个"媒体对象"布局：左边是头像（圆形，48x48px），右边是用户名和评论内容，用户名加粗，评论内容灰色。

**练习2**：实现一个响应式的产品卡片网格。要求：移动端1列，平板2列，桌面端3列，超大屏4列。卡片包含图片、标题、价格，有阴影和圆角。

**练习3**：实现一个"粘性页脚"布局。即使内容很少，页脚也始终在页面底部；内容很多时，页脚在内容下方。
