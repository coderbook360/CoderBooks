# 精通变体：响应式、伪类与逻辑组合

`md:dark:hover:bg-blue-600`——这一个类名就能表达"在中等屏幕以上、暗色模式下、鼠标悬停时，背景变为蓝色"这种复杂条件。用传统 CSS 实现同样效果，你需要写一个媒体查询嵌套一个选择器再嵌套一个伪类，至少五六行代码。

这就是变体（Variants）的威力：**把条件样式压缩成类名前缀**。

变体是 UnoCSS 表达能力的核心来源。本章将深入变体系统，涵盖响应式变体的工作原理与自定义断点、伪类和伪元素变体、暗色模式变体、变体的组合与嵌套，以及自定义变体的编写。

---

## 1. 变体的工作机制回顾

在"核心概念"一章中，我们了解了变体的基本作用。这里进一步深入。

### 1.1 变体解析过程

当 UnoCSS 遇到类名 `hover:text-red-500` 时，它会经历一系列处理步骤。首先进行变体识别，识别出 `hover:` 前缀。接着进行前缀剥离，将 `hover:` 去掉后得到 `text-red-500`。然后进行规则匹配，用 `text-red-500` 去匹配规则，生成 `{ color: #ef4444 }`。最后进行选择器包裹，将 CSS 包裹在 `:hover` 伪类选择器中。

最终输出：

```css
.hover\:text-red-500:hover {
  color: #ef4444;
}
```

**关键理解**：变体不改变规则本身，只是在规则输出的基础上"套一层"。

### 1.2 变体的类型

UnoCSS 中的变体可以分为几类。伪类变体包括 `hover:`、`focus:`、`active:` 等，用于响应元素的交互状态。伪元素变体如 `before:`、`after:` 等，用于创建虚拟元素。响应式变体则是 `sm:`、`md:`、`lg:` 等，用于控制不同屏幕尺寸下的样式。暗色模式变体有 `dark:` 和 `light:`，用于主题切换。父/兄弟状态变体如 `group-hover:`、`peer-focus:` 等，可以根据相关元素的状态来应用样式。最后还有逻辑变体，比如 `not:`、`has:` 等，用于更复杂的条件判断。

---

## 2. 响应式变体

响应式设计是现代 Web 开发的基本需求。UnoCSS 通过响应式变体提供简洁的断点控制。

### 2.1 默认断点

`preset-uno` 和 `preset-wind` 提供以下默认断点。`sm:` 对应 640px 表示小屏幕及以上，`md:` 对应 768px 表示中等屏幕及以上，`lg:` 对应 1024px 表示大屏幕及以上，`xl:` 对应 1280px 表示超大屏幕及以上，`2xl:` 对应 1536px 表示特大屏幕及以上。

### 2.2 移动优先策略

现在要问一个问题：**`md:text-lg` 是什么意思？是"只在 md 断点"还是"md 断点及以上"？**

答案是：**md 断点及以上**。

UnoCSS 采用移动优先（Mobile First）策略。不带变体的类名作为默认样式，适用于所有尺寸，而响应式变体则表示"在此断点**及以上**"。

```html
<div class="text-sm md:text-base lg:text-lg">
  移动端小字，平板中字，桌面大字
</div>
```

生成的 CSS：

```css
.text-sm { font-size: 0.875rem; }

@media (min-width: 768px) {
  .md\:text-base { font-size: 1rem; }
}

@media (min-width: 1024px) {
  .lg\:text-lg { font-size: 1.125rem; }
}
```

**这个设计有什么好处？** 你只需要关心"从小到大"逐步覆盖，符合移动优先的开发思维。

### 2.3 自定义断点

通过 `theme.breakpoints` 可以自定义断点：

```ts
export default defineConfig({
  theme: {
    breakpoints: {
      xs: '320px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      xxl: '1600px',
    },
  },
})
```

然后就可以使用 `xs:` 和 `xxl:` 变体。

**什么时候需要自定义？** 当默认断点不符合你的设计稿时。比如设计师说"平板竖屏是 600px"，你就需要调整断点。

---

## 3. 伪类变体

伪类变体用于处理元素的交互状态和结构位置。

### 3.1 交互状态

**场景**：按钮在悬停、点击、禁用时显示不同样式。

```html
<button class="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-400">
  按钮
</button>
```

常用交互状态变体非常丰富。`hover:` 表示鼠标悬停状态，`focus:` 表示元素获得焦点的状态，`active:` 表示激活状态即鼠标按下的瞬间，`disabled:` 表示禁用状态。此外还有 `focus-visible:` 专门用于键盘焦点，这对无障碍访问非常友好，而 `focus-within:` 则在自身或子元素获得焦点时生效。

表单状态变体也同样实用：

```html
<input 
  class="border-gray-300 focus:border-blue-500 invalid:border-red-500"
  type="email"
  required
/>
```

在表单场景中，`checked:` 用于 checkbox 和 radio 的选中状态，`required:` 用于必填字段，`valid:` 和 `invalid:` 分别用于验证通过和验证失败的状态，`placeholder-shown:` 则在显示占位符时生效。

### 3.2 结构伪类

**场景**：列表项中，除了最后一项都显示下边框。

```html
<ul>
  <li class="py-2 border-b last:border-b-0">Item 1</li>
  <li class="py-2 border-b last:border-b-0">Item 2</li>
  <li class="py-2 border-b last:border-b-0">Item 3</li>
</ul>
```

常用结构伪类变体帮助我们处理元素在父容器中的位置。`first:` 用于第一个子元素，`last:` 用于最后一个子元素，`only:` 用于唯一子元素的情况，`odd:` 和 `even:` 分别用于奇数位置和偶数位置的元素。

**思考一下这解决了什么问题**：传统方式你需要在 CSS 中写 `:last-child` 选择器，或者在模板中判断是否是最后一项。用变体，一个类名搞定。

### 3.3 否定伪类

使用 `not-` 前缀表示"非"：

```html
<button class="not-disabled:hover:bg-blue-600">
  非禁用状态时悬停变色
</button>
```

---

## 4. 伪元素变体

伪元素变体用于生成 `::before`、`::after` 等伪元素的样式。

### 4.1 before 和 after

**场景**：在文本前添加装饰性箭头。

```html
<div class="before:content-['→'] before:mr-2">
  带前缀箭头的文本
</div>
```

**场景**：在元素下方添加装饰线。

```html
<div class="relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-blue-500">
  带下划线装饰
</div>
```

**注意**：使用 `before:` 和 `after:` 时，通常需要设置 `content`，否则伪元素不会显示。

### 4.2 其他伪元素

placeholder 样式可以这样设置：

```html
<input 
  class="placeholder:text-gray-400 placeholder:italic"
  placeholder="请输入..."
/>
```

选中文本样式可以这样定制：

```html
<p class="selection:bg-yellow-300 selection:text-black">
  选中这段文字试试
</p>
```

列表标记样式也可以轻松修改：

```html
<ul class="marker:text-blue-500">
  <li>列表项 1</li>
  <li>列表项 2</li>
</ul>
```

---

## 5. 暗色模式变体

`dark:` 变体用于暗色模式样式。

### 5.1 两种暗色模式策略

Class 策略是默认方式，通过在 `html` 或 `body` 上添加 `dark` 类来切换：

```html
<html class="dark">
  ...
</html>
```

```html
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
  ...
</div>
```

生成的 CSS：

```css
.bg-white { background-color: white; }
.dark .dark\:bg-gray-900 { background-color: #111827; }
```

Media 策略根据系统偏好自动切换：

```ts
presetUno({
  dark: 'media',
})
```

生成的 CSS：

```css
.bg-white { background-color: white; }

@media (prefers-color-scheme: dark) {
  .dark\:bg-gray-900 { background-color: #111827; }
}
```

### 5.2 选择哪种策略？

Class 策略的优点在于用户可以手动切换主题，而且可以在页面加载前就应用正确的主题从而避免闪烁问题。Media 策略的优点则是能自动跟随系统设置，用户无需手动操作。

**一般建议**：如果产品需要"主题切换"功能，用 Class 策略；如果只是简单跟随系统，用 Media 策略。

### 5.3 暗色模式最佳实践

**推荐做法**：在主题中定义语义化颜色，而非到处写 `dark:` 变体。

```ts
theme: {
  colors: {
    surface: {
      DEFAULT: '#ffffff',
      dark: '#1f2937',
    },
    text: {
      DEFAULT: '#1f2937',
      dark: '#f9fafb',
    },
  },
}
```

然后通过 CSS 变量或快捷方式统一管理暗色模式。这样做的好处是：减少重复的 `dark:` 变体，更易维护。

---

## 6. 父/兄弟状态变体

这类变体允许根据父元素或兄弟元素的状态来设置样式。

### 6.1 group 变体

**场景**：鼠标悬停在卡片上时，卡片内的标题变色。

```html
<div class="group">
  <h3 class="group-hover:text-blue-500">
    父元素悬停时我会变蓝
  </h3>
  <p>其他内容</p>
</div>
```

`group` 类标记父元素，`group-*` 变体响应父元素状态。

常用组合包括 `group-hover:` 用于响应父元素悬停、`group-focus:` 用于响应父元素获得焦点、`group-active:` 用于响应父元素激活状态。

**嵌套 group**：

当存在多层嵌套时，可以命名 group：

```html
<div class="group/card">
  <div class="group/title">
    <span class="group-hover/card:text-blue-500 group-hover/title:text-red-500">
      响应不同层级的父元素
    </span>
  </div>
</div>
```

### 6.2 peer 变体

**场景**：复选框选中时，相邻的标签变色。

```html
<input type="checkbox" class="peer" />
<label class="peer-checked:text-green-500">
  复选框选中时我会变绿
</label>
```

`peer` 类标记兄弟元素，`peer-*` 变体响应兄弟元素状态。

**常用于表单联动**：

```html
<input type="text" class="peer" placeholder="输入邮箱" />
<p class="hidden peer-focus:block text-sm text-gray-500">
  请输入有效的邮箱地址
</p>
```

输入框获得焦点时，提示文字显示。

---

## 7. 变体组合

变体可以链式组合，表达复杂的条件。

### 7.1 组合规则

变体从左到右依次解析和包裹：

```html
<button class="md:hover:bg-blue-600">
  ...
</button>
```

解析顺序是先处理 `md:`，生成 `@media (min-width: 768px)` 媒体查询，然后处理 `hover:`，添加 `:hover` 伪类选择器。

生成：

```css
@media (min-width: 768px) {
  .md\:hover\:bg-blue-600:hover {
    background-color: #2563eb;
  }
}
```

### 7.2 常见组合模式

响应式加状态的组合：

```html
<button class="bg-blue-500 hover:bg-blue-600 md:bg-green-500 md:hover:bg-green-600">
  移动端蓝色，桌面端绿色
</button>
```

暗色模式加状态的组合：

```html
<button class="bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700">
  支持暗色模式的悬停效果
</button>
```

三重组合：

```html
<div class="md:dark:hover:bg-gray-700">
  中等屏幕 + 暗色模式 + 悬停
</div>
```

### 7.3 变体组语法

为了减少重复，UnoCSS 支持变体组语法：

```html
<!-- 传统写法 -->
<div class="hover:text-red-500 hover:bg-red-100 hover:border-red-500">

<!-- 变体组写法 -->
<div class="hover:(text-red-500 bg-red-100 border-red-500)">
```

需要启用 `transformerVariantGroup`：

```ts
import { transformerVariantGroup } from 'unocss'

export default defineConfig({
  transformers: [transformerVariantGroup()],
})
```

**这个语法能显著减少类名重复**，特别是当一个变体下有很多样式时。

---

## 8. 自定义变体

当内置变体不满足需求时，可以编写自定义变体。

### 8.1 简单示例：打印媒体查询

**场景**：需要一个 `print:` 变体，用于打印样式。

```ts
variants: [
  {
    name: 'print',
    match(matcher) {
      if (!matcher.startsWith('print:')) return matcher
      return {
        matcher: matcher.slice(6),  // 去掉 'print:' 前缀
        parent: '@media print',
      }
    },
  },
],
```

使用：

```html
<div class="text-black print:text-gray-900">
  打印时使用不同颜色
</div>
```

### 8.2 带参数的变体

**场景**：支持任意媒体查询的变体。

```ts
variants: [
  {
    name: 'media',
    match(matcher) {
      const match = matcher.match(/^media-\[(.+?)\]:/)
      if (!match) return matcher
      return {
        matcher: matcher.slice(match[0].length),
        parent: `@media ${match[1].replace(/_/g, ' ')}`,
      }
    },
  },
],
```

使用：

```html
<div class="media-[(min-width:_800px)_and_(max-width:_1200px)]:bg-blue-500">
  特定范围内的样式
</div>
```

### 8.3 选择器变体

**场景**：自定义暗色模式选择器。

```ts
variants: [
  {
    name: 'dark-mode',
    match(matcher) {
      if (!matcher.startsWith('dark-mode:')) return matcher
      return {
        matcher: matcher.slice(10),
        selector: s => `.dark-mode ${s}`,
      }
    },
  },
],
```

---

## 9. 变体优先级与顺序

### 9.1 变体解析顺序

多个变体按照它们在配置中定义的顺序尝试匹配。先定义的变体先尝试，一旦某个变体匹配成功，继续尝试下一个变体以支持链式组合。

### 9.2 CSS 输出顺序

UnoCSS 会按照一定规则排序生成的 CSS。首先输出无变体的规则作为基础样式，然后是伪类变体的样式，接着是响应式变体并按断点大小排序，最后是其他变体的样式。

**这确保了响应式样式能正确覆盖基础样式**。

### 9.3 调试变体

使用 Inspector 可以查看某个类名经过了哪些变体处理，以及最终生成的选择器和 CSS。

---

## 10. 小结

本章深入讲解了 UnoCSS 的变体系统。

关于响应式变体，UnoCSS 采用移动优先策略并支持自定义断点。`sm:`、`md:` 等变体表示"此断点及以上"，这种设计让你只需要关心从小到大逐步覆盖样式。

伪类变体涵盖了交互状态如 hover 和 focus、表单状态如 checked 和 invalid、以及结构位置如 first 和 last，让你能够轻松处理各种元素状态。

伪元素变体提供了 `before:`、`after:`、`placeholder:`、`selection:` 等能力，用于创建和样式化虚拟元素。

暗色模式变体支持 class 和 media 两种策略，还可以自定义选择器，让主题切换变得简单可控。

父/兄弟状态变体中，`group-*` 用于响应父元素状态，`peer-*` 用于响应兄弟元素状态，这为复杂的交互样式提供了简洁的解决方案。

变体组合支持链式使用，配合变体组语法可以大幅减少重复代码，让类名更加简洁。

自定义变体则通过 match 函数让你能够扩展自己的条件样式能力，满足内置变体无法覆盖的特殊需求。

**变体是 UnoCSS 表达能力的重要来源。** 掌握变体系统，你就能用简洁的类名描述复杂的样式条件。

至此，第一部分"基础与核心"完结。我们已经建立了对 UnoCSS 核心概念的完整理解：规则、预设、变体。

下一部分"核心工具类实战"，我们将进入实战环节，学习如何使用 UnoCSS 的工具类构建真实的界面。
