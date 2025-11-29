# 深入规则：静态与动态规则的艺术

规则是 UnoCSS 的核心构建单元。上一章我们从抽象层面理解了规则的定位，本章将深入规则的编写技巧。

关于规则，首先要问一个问题：**如果 presetUno 提供的类名不满足需求，我能自己定义吗？**

答案当然是：能。**而且这正是 UnoCSS "引擎而非框架"定位的核心体现。**

本章将从静态规则的定义与适用场景讲起，然后深入动态规则的正则匹配与参数提取技巧，接着探讨如何在规则中访问主题（theme）配置，并讨论规则的优先级控制与覆盖策略，最后通过实际工程中的规则设计模式来巩固所学知识。

掌握规则编写能力，是从"使用预设"进阶到"定制 UnoCSS"的关键一步。

---

## 1. 静态规则：从最简单的开始

现在我要问第一个问题：**最简单的规则长什么样？**

### 1.1 基本语法

静态规则就是"类名固定、CSS 固定"的一一对应：

```ts
rules: [
  ['flex', { display: 'flex' }],
  ['inline-flex', { display: 'inline-flex' }],
  ['hidden', { display: 'none' }],
  ['block', { display: 'block' }],
]
```

每条规则是一个元组（数组），其中第一个元素是类名字符串，第二个元素是 CSS 声明对象。

当 UnoCSS 扫描到 `flex` 类名时，直接输出：

```css
.flex { display: flex; }
```

**就这么简单。** 没有魔法，没有复杂的配置，就是字符串到 CSS 的映射。

### 1.2 多属性输出

一条规则可以输出多个 CSS 属性：

```ts
['truncate', {
  'overflow': 'hidden',
  'text-overflow': 'ellipsis',
  'white-space': 'nowrap',
}],
```

生成：

```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**思考一下，这其实就是 shortcuts（快捷方式）的低配版**——把一组常用属性封装成一个类名。

### 1.3 什么时候用静态规则？

静态规则适用于类名与 CSS 一一对应且无参数变化的场景，比如常见的"快捷类"（如 `flex`、`grid`、`hidden`），以及团队内部约定的语义化类名。

静态规则的优点是**简单直接、易于理解和维护**。

**但它也有代价**：无法覆盖一类类名。如果你需要 `m-1`、`m-2`、`m-4` 等系列类名，逐个定义静态规则显然不现实。

---

## 2. 动态规则：正则匹配与参数提取

现在要问第二个问题：**如何用一条规则覆盖无限多个类名？**

答案是：**动态规则**。

### 2.1 从问题出发

假设我们想支持 `m-1`、`m-2`、`m-4`、`m-8` 等任意数字的 margin 类名。

用静态规则写：

```ts
rules: [
  ['m-1', { margin: '0.25rem' }],
  ['m-2', { margin: '0.5rem' }],
  ['m-4', { margin: '1rem' }],
  // ... 还要写多少个？
]
```

**这显然不是一个好主意。** 我们需要一种方式，用一条规则描述"所有符合 `m-数字` 模式的类名"。

### 2.2 动态规则的写法

```ts
rules: [
  [/^m-(\d+)$/, ([, d]) => ({ margin: `${Number(d) * 0.25}rem` })],
]
```

让我拆解一下：第一个元素是正则表达式 `/^m-(\d+)$/`，其中 `^m-` 匹配以 `m-` 开头，`(\d+)` 捕获一个或多个数字，`$` 匹配结尾。第二个元素是处理函数，它接收正则匹配结果，`[, d]` 解构出第一个捕获组（数字部分），最后返回 CSS 声明对象。

当类名 `m-4` 被扫描到时，首先正则匹配成功，捕获组 `d = '4'`，然后处理函数计算 `4 * 0.25 = 1`，返回 `{ margin: '1rem' }`，最终输出 CSS：`.m-4 { margin: 1rem; }`。

**有没有感觉到这个设计的优雅？** 一条规则，覆盖所有 `m-数字` 的类名。

### 2.3 多捕获组

正则可以包含多个捕获组：

```ts
[/^p-([xy])-(\d+)$/, ([, axis, d]) => {
  const value = `${Number(d) * 0.25}rem`
  if (axis === 'x') {
    return { 'padding-left': value, 'padding-right': value }
  }
  if (axis === 'y') {
    return { 'padding-top': value, 'padding-bottom': value }
  }
}],
```

这样 `p-x-4` 会生成 `{ padding-left: 1rem, padding-right: 1rem }`，而 `p-y-2` 则生成 `{ padding-top: 0.5rem, padding-bottom: 0.5rem }`。

### 2.4 返回值类型

处理函数可以返回三种类型的值。最常用的是 CSS 对象，就像我们前面展示的那样：

```ts
[/^m-(\d+)$/, ([, d]) => ({ margin: `${Number(d) * 0.25}rem` })],
```

当你需要编写更复杂的 CSS 时，可以返回原始 CSS 字符串：

```ts
[/^custom-grid$/, () => `
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`],
```

还有一种情况是返回 `undefined`，这表示条件跳过：

```ts
[/^m-(\d+)$/, ([, d]) => {
  const num = Number(d)
  if (num > 100) return undefined // 不支持超过 100 的值
  return { margin: `${num * 0.25}rem` }
}],
```

**返回 undefined 意味着"这条规则不处理这个类名"**，UnoCSS 会继续尝试后续规则。

---

## 3. 访问主题配置：规则与设计 token 的联动

现在要问第三个问题：**规则里的值（比如颜色）能不能从配置中读取，而不是硬编码？**

答案是：能，而且**这才是正确的做法**。

### 3.1 为什么需要主题？

假设你的设计系统定义了品牌色 `#3b82f6`。如果在规则里硬编码：

```ts
['text-brand', { color: '#3b82f6' }],
```

**这有什么问题？**

当设计师说"品牌色要改成 `#2563eb`"，你需要找出所有硬编码的地方逐个修改。项目大了之后，这会变成噩梦。

### 3.2 把值放到主题里

正确的做法是把设计 token 集中在 `theme` 中：

```ts
// uno.config.ts
export default defineConfig({
  theme: {
    colors: {
      brand: '#3b82f6',
      secondary: '#64748b',
      danger: '#ef4444',
    },
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
    },
  },
})
```

然后在规则中从 `context.theme` 读取：

```ts
rules: [
  [/^text-(.+)$/, ([, colorName], { theme }) => {
    const color = theme.colors?.[colorName]
    if (!color) return undefined  // 颜色不存在，跳过
    return { color }
  }],
]
```

**这样修改颜色只需要改一处，全项目生效。**

### 3.3 处理嵌套主题值

主题值可以是嵌套对象：

```ts
theme: {
  colors: {
    gray: {
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827',
    },
  },
}
```

访问时需要处理路径：

```ts
[/^bg-(\w+)-(\d+)$/, ([, colorName, shade], { theme }) => {
  const color = theme.colors?.[colorName]?.[shade]
  if (!color) return undefined
  return { 'background-color': color }
}],
```

`bg-gray-500` → `{ background-color: '#6b7280' }`

### 3.4 处理函数的完整签名

处理函数的第二个参数是一个 context 对象，包含很多有用信息：

```ts
[/^bg-(.+)$/, (match, context) => {
  const [fullMatch, colorName] = match
  const { theme, rawSelector, currentSelector, variantHandlers } = context
  // ...
}],
```

其中 `theme` 是最常用的，让你可以访问配置中定义的设计 token。

---

## 4. 规则优先级与覆盖

现在要问第四个问题：**如果我想覆盖预设中的某条规则怎么办？**

### 4.1 优先级规则

UnoCSS 按特定顺序尝试匹配规则：首先检查顶层 `rules` 数组，按索引从前到后遍历；然后检查预设中的 `rules`，按预设数组顺序，每个预设内部按索引从前到后遍历。**一旦某条规则匹配成功，后续规则不再尝试。**

### 4.2 覆盖预设规则

假设 `presetUno` 中的 `hidden` 规则只设置了 `display: none`，但你想同时设置 `visibility: hidden`。

```ts
export default defineConfig({
  presets: [presetUno()],
  rules: [
    // 覆盖预设中的 hidden 规则
    ['hidden', { display: 'none', visibility: 'hidden' }],
  ],
})
```

由于顶层规则优先级高于预设，`hidden` 类名会使用你定义的版本。

**这就是 UnoCSS "顶层配置优先"设计的价值**——你总是可以在不修改预设源码的情况下覆盖行为。

### 4.3 规则命名建议

为了便于维护和调试，动态规则的正则应尽量精确，避免过于宽泛的匹配。同时建议使用有意义的前缀区分不同类型的规则（如 `text-`、`bg-`、`border-`），并在团队内部统一规则命名约定。

---

## 5. 规则设计模式：实战案例

理论讲完了，来看几个实战中常见的规则设计模式。

### 5.1 带单位的数值规则

**场景**：支持 `w-100`、`w-200` 等像素宽度类名。

```ts
// 支持 w-100, w-200 等，单位为 px
[/^w-(\d+)$/, ([, d]) => ({ width: `${d}px` })],
```

**但这里有一个问题**：这个规则太宽泛了，`w-4` 会生成 `width: 4px` 而不是我们习惯的 `width: 1rem`。

**改进版本**：

```ts
// 三位数以上的数字使用 px
[/^w-(\d{3,})$/, ([, d]) => ({ width: `${d}px` })],

// 一两位数字使用 rem
[/^w-(\d{1,2})$/, ([, d]) => ({ width: `${Number(d) * 0.25}rem` })],
```

### 5.2 分数规则

**场景**：支持 `w-1/2`、`w-1/3` 等分数宽度。

```ts
[/^w-(\d+)\/(\d+)$/, ([, n, d]) => ({
  width: `${(Number(n) / Number(d)) * 100}%`
})],
```

`w-1/2` → `{ width: '50%' }`

`w-2/3` → `{ width: '66.666...%' }`

### 5.3 任意值语法

**场景**：支持 `w-[100px]`、`w-[50%]` 等任意值写法。

```ts
[/^w-\[(.+)\]$/, ([, value]) => ({ width: value })],
```

`w-[100px]` → `{ width: '100px' }`

`w-[calc(100%-2rem)]` → `{ width: 'calc(100%-2rem)' }`

**这个模式很强大**，它让用户可以在类名中直接指定任意值，突破预定义 scale 的限制。

### 5.4 负值支持

**场景**：支持 `-m-4` 表示负 margin。

```ts
[/^-m-(\d+)$/, ([, d]) => ({ margin: `-${Number(d) * 0.25}rem` })],
```

`-m-4` → `{ margin: '-1rem' }`

### 5.5 方向性规则

**场景**：支持 `mt-4`（margin-top）、`mr-4`（margin-right）等方向类名。

```ts
const directionMap = {
  t: 'top',
  r: 'right',
  b: 'bottom',
  l: 'left',
}

[/^m([trbl])-(\d+)$/, ([, dir, d]) => {
  const direction = directionMap[dir]
  return { [`margin-${direction}`]: `${Number(d) * 0.25}rem` }
}],
```

`mt-4` → `{ margin-top: '1rem' }`

### 5.6 组合规则

**场景**：支持 `mx-4`（左右 margin）、`my-4`（上下 margin）。

```ts
[/^mx-(\d+)$/, ([, d]) => {
  const value = `${Number(d) * 0.25}rem`
  return {
    'margin-left': value,
    'margin-right': value,
  }
}],

[/^my-(\d+)$/, ([, d]) => {
  const value = `${Number(d) * 0.25}rem`
  return {
    'margin-top': value,
    'margin-bottom': value,
  }
}],
```

---

## 6. 规则调试技巧

当规则行为不符合预期时，怎么调试？

### 6.1 使用 Inspector

UnoCSS 提供了 Inspector 工具，可以查看当前页面中所有被提取的类名、每个类名匹配到了哪条规则，以及生成的 CSS 内容。**这是调试规则最直接的方式**，后续章节会详细介绍。

### 6.2 添加调试日志

在开发阶段，可以在规则处理函数中添加日志：

```ts
[/^debug-(.+)$/, ([fullMatch, value], context) => {
  console.log('Matched:', fullMatch)
  console.log('Value:', value)
  console.log('Theme colors:', context.theme.colors)
  return { '--debug': value }
}],
```

### 6.3 渐进式开发

编写复杂规则时，建议采用渐进式开发的方式。首先写静态版本来验证基本逻辑，然后添加正则捕获来处理可变参数，接着添加主题访问使规则能够从配置读取值，之后添加边界处理让无效值返回 `undefined`，最后添加测试确保各种边界情况都能正确处理。

---

## 7. 规则与其他配置的关系

### 7.1 规则 vs 快捷方式（Shortcuts）

快捷方式是规则的高层抽象，用于组合已有类名：

```ts
shortcuts: {
  'btn': 'px-4 py-2 rounded-md font-medium',
  'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
}
```

规则和快捷方式的区别在于：规则是类名到 CSS 声明的映射，而快捷方式是类名到其他类名组合的映射。

快捷方式最终还是通过规则展开为 CSS。当你使用 `btn` 类名时，UnoCSS 会把它展开成 `px-4 py-2 rounded-md font-medium`，然后分别用规则处理这些类名。

### 7.2 规则 vs 变体

规则负责生成 CSS 声明，变体负责包裹选择器。例如 `text-red-500` 由规则生成 `{ color: #ef4444 }`，而 `hover:text-red-500` 则由变体包裹为 `.hover\:text-red-500:hover { ... }`。

**两者是正交的概念，各司其职。**

### 7.3 规则 vs 主题

规则定义"如何生成"，主题定义"使用什么值"。规则是 `[/^text-(.+)$/, ...]` 这样的匹配和处理逻辑，而主题是 `{ colors: { brand: '#3b82f6' } }` 这样的值定义。

**这种分离让规则可以复用，而主题可以按项目定制。** 同一套规则，换一个主题，就能生成完全不同的样式系统。

---

## 8. 小结

本章我们深入讲解了 UnoCSS 规则系统。

静态规则是固定类名到固定 CSS 的映射，简单直接，适合单一用途的类名。动态规则则通过正则匹配和处理函数，用一条规则覆盖一类类名，这是 UnoCSS 灵活性的核心来源。在规则中访问主题配置，可以实现设计 token 与规则的联动，修改配置即可全局生效。优先级控制方面，顶层规则优先于预设规则，你总是可以覆盖预设的行为。在设计模式层面，数值规则、分数规则、任意值、负值、方向性规则等，都有固定的写法可以参考。

**规则是 UnoCSS 的基石。** 理解规则的工作方式，你就掌握了定制 UnoCSS 的核心能力。

下一章，我们将学习如何选择和组合预设，以及 `preset-wind` 等主流预设的特点与适用场景。
