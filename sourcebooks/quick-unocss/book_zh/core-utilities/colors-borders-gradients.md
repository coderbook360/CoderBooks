# 填充色彩：背景、边框与渐变

上一章我们搭建了后台管理系统的布局骨架。现在想象一下：一个只有灰色方块的界面，所有元素都是同一个颜色，没有边框区分，没有视觉层次——这样的界面谁也看不下去。

**色彩让界面"活"起来。**

本章我们将继续完善后台系统，为骨架填充色彩。通过实际的 UI 组件开发，学习 UnoCSS 的颜色、边框和渐变工具类。

---

## 1. 从一个按钮组件开始

假设设计师给你一个任务：实现一套按钮组件，包括主要按钮（蓝色）、次要按钮（灰色）、危险按钮（红色），每个按钮都要有悬停和点击状态。

### 1.1 主要按钮

先从最基础的蓝色按钮开始：

```html
<button class="bg-blue-500 text-white px-4 py-2 rounded-lg">
  主要按钮
</button>
```

**拆解一下这些颜色类：**

`bg-blue-500` 设置背景色为蓝色。`blue` 是颜色名，`500` 是深浅级别。UnoCSS 的颜色系统使用 50-950 的刻度，50 最浅（接近白色），950 最深（接近黑色），500 是"标准"色值。

`text-white` 设置文字为白色。对于纯黑和纯白，直接用 `text-black` 或 `text-white`，不需要数字后缀。

**现在添加交互状态：**

```html
<button class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 rounded-lg">
  主要按钮
</button>
```

`hover:bg-blue-600` 让悬停时背景变深一个色阶。`active:bg-blue-700` 让点击时再深一个色阶。

**这里有一个设计技巧**：悬停和点击状态应该比默认状态更深，给用户"按下去"的感觉。每次递增一个色阶（500→600→700）是常见做法。

### 1.2 次要按钮

次要按钮通常用灰色，视觉上不那么突出：

```html
<button class="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">
  次要按钮
</button>
```

注意文字颜色用了 `text-gray-800` 而不是 `text-black`。纯黑文字在浅色背景上有时显得太"硬"，深灰色更柔和。

### 1.3 危险按钮

危险操作（如删除）用红色警示：

```html
<button class="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 py-2 rounded-lg">
  删除
</button>
```

### 1.4 幽灵按钮（只有边框）

有时候你需要一种更轻量的按钮，只有边框没有背景填充：

```html
<button class="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg transition-colors">
  幽灵按钮
</button>
```

`border` 添加 1px 边框。`border-blue-500` 指定边框颜色。悬停时背景填充颜色（`hover:bg-blue-500`），同时文字变白（`hover:text-white`）。`transition-colors` 让颜色变化有过渡动画。

### 1.5 按钮组件小结

回顾一下我们用到的颜色相关类：

背景色用 `bg-{颜色}-{深浅}`，如 `bg-blue-500`。文字色用 `text-{颜色}-{深浅}`，如 `text-gray-800`。边框色用 `border-{颜色}-{深浅}`，如 `border-blue-500`。交互状态用变体前缀，如 `hover:bg-blue-600`。

---

## 2. 颜色系统深入理解

### 2.1 为什么是 50-950？

UnoCSS 的颜色刻度（50, 100, 200, ..., 900, 950）来自 Tailwind CSS，已成为行业标准。

这个系统的好处是：**足够的层次感**。从极浅到极深有 11 个级别，足以处理各种场景。**内在的和谐**。同一色相的不同深浅天然协调，比如 `blue-100` 背景配 `blue-700` 文字一定好看。**跨颜色一致性**。`red-500` 和 `blue-500` 视觉"重量"相近，便于建立设计系统。

### 2.2 预设颜色都有哪些？

UnoCSS 预设提供了完整的色谱：

**灰色系**：`slate`（蓝灰）、`gray`（标准灰）、`zinc`（锌灰）、`neutral`（纯中性灰）、`stone`（暖灰）。选择哪种灰取决于你的设计风格——科技感的产品常用 `slate`，温暖感的产品常用 `stone`。

**彩色系**：`red`、`orange`、`amber`、`yellow`、`lime`、`green`、`emerald`、`teal`、`cyan`、`sky`、`blue`、`indigo`、`violet`、`purple`、`fuchsia`、`pink`、`rose`。

**特殊值**：`black`、`white`、`transparent`（透明）、`current`（继承当前文字颜色）。

### 2.3 当预设颜色不够用

设计师给的品牌色是 `#1da1f2`（Twitter 蓝），预设里没有怎么办？

**方案一：使用任意值语法**

```html
<div class="bg-[#1da1f2] text-white p-4">
  Twitter 蓝背景
</div>
```

方括号内可以是十六进制 `#1da1f2`、RGB `rgb(29,161,242)`、HSL `hsl(203,89%,53%)`，或 CSS 变量 `var(--brand-color)`。

**方案二：扩展主题（推荐）**

如果品牌色会反复使用，应该加入主题配置：

```ts
// uno.config.ts
export default defineConfig({
  theme: {
    colors: {
      brand: {
        light: '#4db5f9',
        DEFAULT: '#1da1f2',
        dark: '#0d8bd9',
      },
    },
  },
})
```

然后就可以用 `bg-brand`、`bg-brand-light`、`bg-brand-dark` 了。

---

## 3. 实战：状态标签组件

后台系统常见的场景：显示订单状态、用户状态、审核状态等。不同状态用不同颜色区分。

### 3.1 基础状态标签

```html
<span class="inline-block px-2 py-1 text-sm rounded-full bg-green-100 text-green-800">
  已完成
</span>

<span class="inline-block px-2 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800">
  处理中
</span>

<span class="inline-block px-2 py-1 text-sm rounded-full bg-red-100 text-red-800">
  已取消
</span>

<span class="inline-block px-2 py-1 text-sm rounded-full bg-gray-100 text-gray-800">
  待处理
</span>
```

**颜色搭配技巧**：浅色背景（100级）配深色文字（800级），既有颜色标识又保证可读性。这种搭配是状态标签的标准做法。

### 3.2 加上透明度

如果觉得颜色太"跳"，可以用透明度柔化：

```html
<span class="inline-block px-2 py-1 text-sm rounded-full bg-green-500/20 text-green-700">
  已完成
</span>
```

`bg-green-500/20` 表示 20% 不透明度的 `green-500`。斜杠后的数字是透明度百分比（0-100）。

### 3.3 深色背景变体

有时候需要更醒目的标签：

```html
<span class="inline-block px-2 py-1 text-sm rounded-full bg-green-500 text-white">
  已完成
</span>
```

直接用 500 级作为背景，配白色文字。

---

## 4. 边框的艺术

### 4.1 卡片边框

回到我们的后台系统，数据卡片通常需要边框区分：

```html
<div class="border border-gray-200 rounded-lg p-6 bg-white">
  <h3 class="text-lg font-semibold">今日订单</h3>
  <p class="text-3xl font-bold text-gray-900">128</p>
</div>
```

`border` 添加 1px 边框。`border-gray-200` 是浅灰色，不会太突兀。`rounded-lg` 添加圆角（0.5rem）。

### 4.2 边框宽度变化

需要更粗的边框？用数字后缀：

```html
<div class="border-2 border-blue-500 p-4">2px 边框</div>
<div class="border-4 border-blue-500 p-4">4px 边框</div>
```

### 4.3 单边边框

有时候只需要底部边框（比如列表分隔）：

```html
<div class="border-b border-gray-200 pb-4 mb-4">
  <h2 class="text-xl font-bold">订单详情</h2>
</div>
```

`border-b` 只添加下边框。类似的有 `border-t`（上）、`border-l`（左）、`border-r`（右）。

### 4.4 列表分隔线

用 `divide-*` 类可以在子元素之间自动添加分隔线：

```html
<ul class="divide-y divide-gray-200">
  <li class="py-4">订单 #001 - ¥128.00</li>
  <li class="py-4">订单 #002 - ¥256.00</li>
  <li class="py-4">订单 #003 - ¥64.00</li>
</ul>
```

`divide-y` 在垂直排列的子元素之间添加水平分隔线。`divide-x` 用于水平排列的元素。

**对比 `border-b` 和 `divide-y`**：如果用 `border-b`，最后一个元素也会有下边框；用 `divide-y`，只有元素之间有线，首尾不会有多余的边框。

### 4.5 圆角进阶

`rounded-lg` 是常用的圆角大小，但你可能需要更多控制：

```html
<!-- 圆形（头像） -->
<img class="size-12 rounded-full" src="avatar.jpg" />

<!-- 药丸形状（标签） -->
<span class="px-3 py-1 rounded-full bg-blue-100 text-blue-800">标签</span>

<!-- 只有顶部圆角（卡片头部） -->
<div class="rounded-t-lg bg-blue-500 p-4 text-white">卡片头部</div>
<div class="p-4 bg-white">卡片内容</div>
```

圆角大小刻度：`rounded-sm`（0.125rem）→ `rounded`（0.25rem）→ `rounded-md`（0.375rem）→ `rounded-lg`（0.5rem）→ `rounded-xl`（0.75rem）→ `rounded-2xl`（1rem）→ `rounded-full`（9999px）。

---

## 5. 实战：表单输入框

表单是后台系统的核心，输入框的视觉反馈至关重要。

### 5.1 基础输入框

```html
<input 
  type="text" 
  placeholder="请输入用户名"
  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
/>
```

**状态变化说明**：

默认状态：灰色边框 `border-gray-300`。

获取焦点时：边框变蓝 `focus:border-blue-500`，加上蓝色光圈 `focus:ring-2 focus:ring-blue-500/20`。

`outline-none` 移除默认的浏览器轮廓，因为我们用 `ring` 替代了它。

### 5.2 错误状态

```html
<input 
  type="text" 
  value="invalid-email"
  class="w-full px-4 py-2 border-2 border-red-500 rounded-lg bg-red-50 focus:ring-2 focus:ring-red-500/20 outline-none"
/>
<p class="mt-1 text-sm text-red-500">请输入有效的邮箱地址</p>
```

错误时边框变红 `border-red-500`，背景变浅红 `bg-red-50`，加上红色提示文字。

### 5.3 禁用状态

```html
<input 
  type="text" 
  disabled
  value="不可编辑"
  class="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
/>
```

禁用时背景灰 `bg-gray-100`，文字浅 `text-gray-500`，鼠标变为禁止符号 `cursor-not-allowed`。

---

## 6. 渐变色

### 6.1 什么时候用渐变？

渐变适合用于：页面头部/Banner、按钮的高级感、数据可视化背景、装饰性元素。

**不适合用于**：大面积文字背景（影响可读性）、所有按钮都渐变（失去特殊感）。

### 6.2 基础渐变

```html
<div class="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-8 rounded-lg">
  <h1 class="text-2xl font-bold">欢迎回来，管理员</h1>
  <p>今天是个好日子</p>
</div>
```

`bg-gradient-to-r` 从左到右渐变。方向可以是 `to-t`（向上）、`to-b`（向下）、`to-l`（向左）、`to-r`（向右）、`to-tr`（向右上）等。

`from-blue-500` 起始颜色是蓝色。`to-purple-500` 结束颜色是紫色。

### 6.3 三色渐变

可以加一个中间色：

```html
<div class="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-2 rounded-full">
</div>
```

`via-blue-500` 是中间色。

### 6.4 渐变按钮

```html
<button class="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg">
  立即升级
</button>
```

悬停时用 `hover:from-*` 和 `hover:to-*` 调整渐变色。

---

## 7. 深色模式

### 7.1 实现深色模式

UnoCSS 的 `dark:` 变体让深色模式实现变得简单：

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
  <h1 class="text-2xl font-bold">标题</h1>
  <p class="text-gray-600 dark:text-gray-400">正文内容</p>
</div>
```

每个颜色类都可以加 `dark:` 前缀指定深色模式下的值。

### 7.2 深色模式配置

默认使用 `class` 策略，需要在 `<html>` 上添加 `dark` 类：

```html
<html class="dark">
  <!-- 深色模式激活 -->
</html>
```

也可以用系统偏好：

```ts
// uno.config.ts
export default defineConfig({
  presets: [
    presetUno({
      dark: 'media', // 跟随系统偏好
    }),
  ],
})
```

### 7.3 深色模式最佳实践

亮色模式用白色/浅灰背景，深灰/黑色文字。深色模式用深灰/黑色背景，白色/浅灰文字。**不要用纯黑背景**，`bg-gray-900` 比 `bg-black` 更柔和。注意对比度，确保文字在两种模式下都清晰可读。

---

## 8. 完整示例：后台仪表盘头部

让我们把学到的颜色知识整合，实现一个完整的仪表盘头部：

```html
<div class="min-h-screen bg-gray-100 dark:bg-gray-900">
  <!-- 渐变头部 -->
  <header class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <h1 class="text-3xl font-bold">仪表盘</h1>
      <p class="text-blue-100 mt-2">欢迎回来，这是今天的概览</p>
    </div>
  </header>
  
  <!-- 统计卡片 -->
  <div class="max-w-7xl mx-auto px-6 -mt-8">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- 订单卡片 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
        <p class="text-gray-500 dark:text-gray-400 text-sm">今日订单</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">128</p>
        <p class="text-green-500 text-sm mt-2">↑ 12% 比昨日</p>
      </div>
      
      <!-- 收入卡片 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
        <p class="text-gray-500 dark:text-gray-400 text-sm">今日收入</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">¥12,800</p>
        <p class="text-green-500 text-sm mt-2">↑ 8% 比昨日</p>
      </div>
      
      <!-- 用户卡片 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-yellow-500">
        <p class="text-gray-500 dark:text-gray-400 text-sm">新增用户</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">56</p>
        <p class="text-red-500 text-sm mt-2">↓ 3% 比昨日</p>
      </div>
      
      <!-- 转化率卡片 -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-purple-500">
        <p class="text-gray-500 dark:text-gray-400 text-sm">转化率</p>
        <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">3.2%</p>
        <p class="text-gray-400 text-sm mt-2">持平</p>
      </div>
    </div>
  </div>
</div>
```

**亮点解析**：

渐变头部用 `bg-gradient-to-r from-blue-600 to-indigo-600` 创造品牌感。`-mt-8` 让卡片向上偏移，与头部产生视觉层叠。`border-l-4 border-{color}-500` 用彩色左边框区分不同类型的卡片。所有颜色都有 `dark:` 变体，支持深色模式。

---

## 9. 小结

本章我们通过实际组件开发，学习了 UnoCSS 的颜色系统。

**颜色命名**遵循 `{属性}-{颜色}-{深浅}` 格式，如 `bg-blue-500`、`text-gray-800`、`border-red-300`。深浅刻度从 50（最浅）到 950（最深），500 是标准色值。

**背景和文字**是最基础的颜色应用。交互状态用 `hover:`、`active:`、`focus:` 等变体控制。

**边框**用 `border` 添加，颜色用 `border-{color}`，圆角用 `rounded-*`，分隔线用 `divide-*`。

**渐变**用 `bg-gradient-to-{方向}` + `from-{color}` + `to-{color}`，适合用于头部、Banner 等装饰性场景。

**深色模式**用 `dark:` 前缀，为每个颜色类指定深色模式下的值。

颜色是界面的情感语言。合理运用颜色层次，可以创建既美观又易用的界面。下一章我们将学习文本和排版——让内容也能"说话"。

---

## 10. 动手练习

**练习1**：实现一个状态标签组件，支持 success、warning、error、info 四种状态，每种状态有实心和空心两种样式。

**练习2**：实现一个表单，包含文本输入框、密码输入框、下拉选择框，每个控件都要有默认、聚焦、错误三种状态。

**练习3**：实现一个深色模式切换按钮，点击时在亮色/深色模式间切换，并且按钮本身的样式也要随之变化。
