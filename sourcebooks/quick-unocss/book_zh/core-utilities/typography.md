# 注入灵魂：文本、字体与排版

你有没有遇到过这样的情况：打开一个网页，内容明明很有价值，但读了两段就想关掉？很可能问题出在排版上——字太小、行太挤、层次不清。

**好的排版是隐形的。** 读者不会注意到它的存在，只会专注于内容本身。而糟糕的排版会不断提醒读者"这里不舒服"，打断阅读节奏。

本章我们将通过构建一个技术博客的文章页面，系统学习 UnoCSS 的排版能力。你会发现，专业级的文字排版并不神秘，只需要理解几个核心原则。

---

## 1. 从一篇文章开始

假设我们要为一个技术博客设计文章页面。先来看看最基础的版本：

```html
<article>
  <h1>深入理解 JavaScript 闭包</h1>
  <p>发布于 2024年1月15日</p>
  <p>闭包是 JavaScript 中最强大也最容易被误解的概念之一。本文将从根本原理出发，帮助你真正理解闭包。</p>
  <h2>什么是闭包？</h2>
  <p>简单来说，闭包是指一个函数能够记住并访问它的词法作用域，即使这个函数在其词法作用域之外执行。</p>
</article>
```

没有任何样式的文章看起来像什么？一堆挤在一起的黑字，标题和正文没有区分，完全没有阅读的欲望。

**问题在哪？** 缺少视觉层次。读者的眼睛需要"锚点"来快速定位信息，需要"呼吸空间"来舒适阅读。

---

## 2. 建立字体系统

第一步是选择合适的字体。不同的字体传达不同的气质。

### 2.1 三种基础字体

UnoCSS 提供三种字体家族，分别对应不同的使用场景。

```html
<p class="font-sans">无衬线字体 —— 现代、清晰、适合屏幕阅读</p>
<p class="font-serif">衬线字体 —— 典雅、正式、适合长文阅读</p>
<code class="font-mono">等宽字体 —— 技术感、对齐性强、适合代码展示</code>
```

**为什么要这样分？** 无衬线字体在屏幕上渲染清晰，是大多数界面的首选。衬线字体在印刷品中阅读舒适，但在屏幕上小字号时可能模糊。等宽字体让每个字符宽度相同，代码对齐才整齐。

对于我们的技术博客，一个合理的选择是：

```html
<article class="font-sans">
  <h1>深入理解 JavaScript 闭包</h1>
  <p>正文使用无衬线字体...</p>
  <pre><code class="font-mono">function example() {}</code></pre>
</article>
```

### 2.2 自定义品牌字体

如果默认字体不能满足品牌需求，可以通过主题配置扩展：

```ts
// uno.config.ts
export default defineConfig({
  theme: {
    fontFamily: {
      heading: ['Lexend', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
      code: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
  },
})
```

现在可以这样使用：

```html
<h1 class="font-heading">标题使用 Lexend 字体</h1>
<p class="font-body">正文使用 Inter 字体</p>
<code class="font-code">代码使用 JetBrains Mono</code>
```

**为什么要分开配置？** 标题和正文的阅读方式不同。标题是"扫视"，需要醒目突出；正文是"逐字阅读"，需要舒适耐看。不同场景选择最合适的字体。

---

## 3. 字号：建立视觉层次

字体大小是建立层次的最直接方式。一眼看去，读者就能分辨出什么是标题、什么是正文、什么是补充信息。

### 3.1 层次设计原则

让我们为博客文章设计一套字号层次：

```html
<article class="max-w-prose mx-auto">
  <!-- 文章大标题：最醒目 -->
  <h1 class="text-4xl">深入理解 JavaScript 闭包</h1>
  
  <!-- 元信息：低调辅助 -->
  <p class="text-sm text-gray-500">发布于 2024年1月15日 · 阅读约 8 分钟</p>
  
  <!-- 导语：比正文略大，吸引阅读 -->
  <p class="text-lg">
    闭包是 JavaScript 中最强大也最容易被误解的概念之一...
  </p>
  
  <!-- 章节标题：比正文大，比主标题小 -->
  <h2 class="text-2xl">什么是闭包？</h2>
  
  <!-- 正文：基准大小 -->
  <p class="text-base">
    简单来说，闘包是指一个函数能够记住并访问它的词法作用域...
  </p>
  
  <!-- 小节标题 -->
  <h3 class="text-xl">词法作用域回顾</h3>
</article>
```

**层次递进的逻辑是什么？** 从 `text-4xl`（标题）→ `text-2xl`（章节）→ `text-xl`（小节）→ `text-base`（正文）→ `text-sm`（辅助），每一级都比上一级小，但差距适中。如果主标题是 `text-4xl`，章节标题直接跳到 `text-base`，对比就太弱了。

### 3.2 响应式字号

在手机上，`text-4xl` 的标题可能太大了。使用响应式变体适配不同屏幕：

```html
<h1 class="text-2xl md:text-3xl lg:text-4xl">
  深入理解 JavaScript 闭包
</h1>
```

**为什么是这个顺序？** UnoCSS 采用移动优先策略。`text-2xl` 是基础（手机），`md:text-3xl` 覆盖平板及以上，`lg:text-4xl` 覆盖桌面。从小屏幕逐步放大。

### 3.3 UnoCSS 字号体系

完整的字号从 `text-xs`（12px）到 `text-9xl`（128px），设计时常用的是中间段：

| 类名 | 大小 | 典型用途 |
|------|------|---------|
| `text-xs` | 12px | 标签、脚注 |
| `text-sm` | 14px | 辅助信息、时间戳 |
| `text-base` | 16px | 正文（基准） |
| `text-lg` | 18px | 导语、强调段落 |
| `text-xl` | 20px | 小节标题 |
| `text-2xl` | 24px | 章节标题 |
| `text-3xl` | 30px | 页面标题 |
| `text-4xl` | 36px | 大标题 |

**如何选择？** 不要想着把所有级别都用上，一篇文章通常只需要 4-5 个级别就足够。太多层次反而让人迷惑。

---

## 4. 字重：强调与区分

字重控制文字的粗细，是区分标题和正文、强调重点的关键手段。

### 4.1 标题与正文的区分

```html
<article>
  <h1 class="text-4xl font-bold">深入理解 JavaScript 闘包</h1>
  <h2 class="text-2xl font-semibold">什么是闭包？</h2>
  <p class="text-base font-normal">
    简单来说，闭包是指一个函数能够记住并访问它的词法作用域...
  </p>
</article>
```

**为什么不都用 `font-bold`？** 如果所有内容都很"重"，就没有东西能突出了。主标题用 `font-bold`（700），章节标题用 `font-semibold`（600），正文用 `font-normal`（400），形成递减的"视觉重量"。

### 4.2 行内强调

正文中需要强调某个词或短语时：

```html
<p class="font-normal">
  闭包的核心在于<span class="font-semibold">词法作用域</span>和
  <span class="font-semibold">函数作为一等公民</span>这两个概念。
</p>
```

为什么用 `font-semibold` 而不是 `font-bold`？在正文中，过于强烈的对比会打断阅读节奏。`font-semibold` 提供了足够的强调，又不会显得突兀。

### 4.3 细体字的使用场景

`font-thin`、`font-light` 这些细字重适合什么时候用？

```html
<!-- 超大展示文字可以用细体 -->
<h1 class="text-7xl font-thin tracking-tight">
  HELLO
</h1>

<!-- 小字号不要用细体，会不清晰 -->
<p class="text-sm font-thin">× 这样很难阅读</p>
```

**规律是什么？** 字号越大，可以用越细的字重；字号越小，需要越粗的字重来保证可读性。

---

## 5. 行高：呼吸的空间

行高决定了行与行之间的间距。这是影响阅读舒适度最重要的因素之一。

### 5.1 正文的行高

```html
<!-- 行高太紧，阅读吃力 -->
<p class="leading-none">
  闭包是 JavaScript 中最强大也最容易被误解的概念之一。
  本文将从根本原理出发，帮助你真正理解闭包。
</p>

<!-- 行高太松，段落像散了架 -->
<p class="leading-loose">
  闭包是 JavaScript 中最强大也最容易被误解的概念之一。
  本文将从根本原理出发，帮助你真正理解闭包。
</p>

<!-- 刚好合适 -->
<p class="leading-relaxed">
  闭包是 JavaScript 中最强大也最容易被误解的概念之一。
  本文将从根本原理出发，帮助你真正理解闭包。
</p>
```

**怎么判断"合适"？** 一般规则是：正文使用 1.5 到 1.75 倍行高（`leading-normal` 到 `leading-relaxed`）。行宽越宽，行高应该越大，帮助眼睛找到下一行的起点。

### 5.2 标题的行高

标题通常是短文本，不需要那么大的行高：

```html
<!-- 多行标题用紧凑行高 -->
<h1 class="text-4xl font-bold leading-tight">
  深入理解 JavaScript 闭包：从原理到实践
</h1>

<!-- 单行标题可以更紧 -->
<h1 class="text-4xl font-bold leading-none">
  闭包详解
</h1>
```

**为什么标题可以用更小的行高？** 大字号本身就有足够的视觉份量，不需要额外的行间距来分隔。而且紧凑的行高让多行标题看起来更像一个整体。

### 5.3 行高的参考值

| 类名 | 倍数 | 适用场景 |
|------|------|---------|
| `leading-none` | 1 | 单行大标题 |
| `leading-tight` | 1.25 | 多行标题 |
| `leading-snug` | 1.375 | 短段落 |
| `leading-normal` | 1.5 | 标准正文 |
| `leading-relaxed` | 1.625 | 长段落、宽行宽 |
| `leading-loose` | 2 | 特殊效果 |

---

## 6. 字间距：精细调节

字间距（letter-spacing）是排版中的"微调"工具，用得好能提升品质感。

### 6.1 大标题的字间距

大号字体的默认字间距往往显得松散，收紧一点更紧凑有力：

```html
<h1 class="text-5xl font-bold tracking-tight">
  JAVASCRIPT
</h1>

<!-- 对比默认效果 -->
<h1 class="text-5xl font-bold tracking-normal">
  JAVASCRIPT
</h1>
```

### 6.2 全大写文本的字间距

全大写字母之间的间距需要加大，否则太拥挤：

```html
<!-- 标签、徽章常用全大写 -->
<span class="text-xs uppercase tracking-widest font-semibold text-gray-500">
  新功能
</span>
```

**为什么全大写需要加宽字间距？** 大写字母比小写字母更"方正"，彼此之间需要更多空间才能清晰分辨。

### 6.3 字间距使用建议

```html
<!-- 大标题：收紧 -->
<h1 class="text-4xl tracking-tight">标题</h1>

<!-- 正文：默认即可 -->
<p class="tracking-normal">正文内容</p>

<!-- 全大写小文字：加宽 -->
<span class="text-xs uppercase tracking-wider">LABEL</span>
```

---

## 7. 文本对齐与排列

### 7.1 长文本始终左对齐

```html
<!-- 正确：左对齐便于阅读 -->
<p class="text-left">
  闭包是 JavaScript 中最强大也最容易被误解的概念之一。
  本文将从根本原理出发，帮助你真正理解闭包。
</p>

<!-- 错误：两端对齐会产生不规则的词间距 -->
<p class="text-justify">
  闭包是 JavaScript 中最强大也最容易被误解的概念之一。
  本文将从根本原理出发，帮助你真正理解闭包。
</p>
```

**为什么不用两端对齐？** 中英文混排时，`text-justify` 会产生奇怪的空白。英文长单词也会被拉伸。左对齐是最安全的选择。

### 7.2 居中对齐的使用场景

```html
<!-- 页面标题可以居中 -->
<header class="text-center">
  <h1 class="text-4xl font-bold">深入理解闭包</h1>
  <p class="text-gray-500 mt-2">发布于 2024年1月15日</p>
</header>

<!-- 短引用可以居中 -->
<blockquote class="text-center text-xl italic">
  "程序是写给人读的，顺便让机器执行。"
</blockquote>
```

居中对齐适合短文本和需要强调的独立元素，不适合长段落。

### 7.3 右对齐的使用场景

```html
<!-- 数字、日期、金额通常右对齐 -->
<div class="text-right tabular-nums">
  <div>$1,234.56</div>
  <div>$78.90</div>
  <div>$456.00</div>
</div>
```

注意 `tabular-nums`：它让数字使用等宽字形，这样各位数能对齐。

---

## 8. 文本装饰：链接与强调

### 8.1 链接样式

技术博客中链接很多，需要明确的视觉提示：

```html
<!-- 基础链接 -->
<a href="#" class="text-blue-600 underline hover:text-blue-800">
  阅读更多关于闭包的内容
</a>

<!-- 低调链接 -->
<a href="#" class="text-gray-600 hover:text-blue-600 hover:underline">
  相关文章
</a>

<!-- 自定义下划线 -->
<a href="#" class="text-blue-600 underline decoration-blue-300 decoration-2 underline-offset-4 hover:decoration-blue-600">
  精心设计的下划线
</a>
```

**为什么要 `underline-offset-4`？** 下划线太靠近文字会显得拥挤，增加偏移量让它更优雅。

### 8.2 删除线：表示废弃

```html
<p>
  原价 <span class="line-through text-gray-400">$99.99</span>
  <span class="text-red-600 font-bold">$49.99</span>
</p>

<del class="line-through text-gray-500">这个 API 已废弃</del>
```

### 8.3 波浪线：标记错误

```html
<span class="underline decoration-wavy decoration-red-500">
  teh
</span>
<!-- 拼写错误标记 -->
```

---

## 9. 文本溢出：优雅处理长内容

博客列表页经常需要显示文章摘要，但空间有限。

### 9.1 单行截断

```html
<div class="w-64">
  <h3 class="truncate font-semibold">
    深入理解 JavaScript 闭包：从原理到实践的完整指南
  </h3>
</div>
```

`truncate` 是一个组合类，等同于：

```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 9.2 多行截断

```html
<div class="w-64">
  <p class="line-clamp-3 text-gray-600">
    闭包是 JavaScript 中最强大也最容易被误解的概念之一。
    本文将从根本原理出发，通过大量实例，帮助你真正理解闭包
    是什么、为什么需要它、以及如何在实际项目中正确使用它。
    我们还会讨论闭包的常见陷阱和性能考量。
  </p>
</div>
```

`line-clamp-3` 限制最多显示 3 行，超出部分显示省略号。

### 9.3 文章卡片实战

把截断应用到博客卡片：

```html
<article class="border rounded-lg p-4 w-80">
  <img src="cover.jpg" class="w-full h-40 object-cover rounded" />
  
  <h3 class="mt-4 font-bold text-lg truncate">
    深入理解 JavaScript 闭包：从原理到实践的完整指南
  </h3>
  
  <p class="mt-2 text-gray-600 text-sm line-clamp-2">
    闭包是 JavaScript 中最强大也最容易被误解的概念之一。
    本文将从根本原理出发，帮助你真正理解闭包。
  </p>
  
  <div class="mt-4 flex items-center justify-between text-xs text-gray-500">
    <span>2024年1月15日</span>
    <span>8 分钟阅读</span>
  </div>
</article>
```

---

## 10. 列表样式

技术文章少不了列表。

### 10.1 无序列表

```html
<ul class="list-disc pl-5 space-y-2">
  <li>闭包可以访问外部函数的变量</li>
  <li>闭包在外部函数返回后仍然有效</li>
  <li>每次调用外部函数都创建新的闭包</li>
</ul>
```

### 10.2 有序列表（步骤）

```html
<ol class="list-decimal pl-5 space-y-4">
  <li>
    <span class="font-semibold">定义外部函数</span>
    <p class="text-gray-600 mt-1">外部函数包含要被闭包访问的变量。</p>
  </li>
  <li>
    <span class="font-semibold">返回内部函数</span>
    <p class="text-gray-600 mt-1">内部函数引用外部函数的变量。</p>
  </li>
  <li>
    <span class="font-semibold">调用返回的函数</span>
    <p class="text-gray-600 mt-1">此时闭包就形成了。</p>
  </li>
</ol>
```

### 10.3 自定义列表标记颜色

```html
<ul class="list-disc pl-5 marker:text-blue-500">
  <li>蓝色标记的列表项</li>
  <li>更醒目的视觉效果</li>
</ul>
```

---

## 11. 完整的博客文章模板

现在，让我们把所有学到的排版知识整合起来：

```html
<article class="max-w-prose mx-auto px-4 py-8 font-sans">
  <!-- 文章头部 -->
  <header class="mb-8">
    <div class="text-sm text-gray-500 mb-2">
      <span class="uppercase tracking-wider">技术深度</span>
    </div>
    <h1 class="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
      深入理解 JavaScript 闭包
    </h1>
    <p class="mt-4 text-lg text-gray-600 leading-relaxed">
      闭包是 JavaScript 中最强大也最容易被误解的概念之一。
      本文将从根本原理出发，帮助你真正理解闭包。
    </p>
    <div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
      <span>张三</span>
      <span>·</span>
      <time>2024年1月15日</time>
      <span>·</span>
      <span>8 分钟阅读</span>
    </div>
  </header>
  
  <!-- 文章正文 -->
  <div class="text-gray-800 leading-relaxed space-y-6">
    <h2 class="text-2xl font-semibold mt-12 mb-4">什么是闭包？</h2>
    <p>
      简单来说，闭包是指一个函数能够记住并访问它的
      <span class="font-semibold">词法作用域</span>，
      即使这个函数在其词法作用域之外执行。
    </p>
    
    <blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">
      <p>"闭包就是函数和其周围状态的组合。"</p>
      <cite class="block mt-2 text-sm not-italic">—— MDN Web Docs</cite>
    </blockquote>
    
    <h3 class="text-xl font-semibold mt-8 mb-4">为什么需要闭包？</h3>
    <p>
      闭包在实际开发中有很多用途：
    </p>
    <ul class="list-disc pl-5 space-y-2">
      <li>数据私有化和封装</li>
      <li>创建工厂函数</li>
      <li>实现柯里化和偏函数应用</li>
      <li>在回调和事件处理中保持状态</li>
    </ul>
    
    <h3 class="text-xl font-semibold mt-8 mb-4">代码示例</h3>
    <p>
      让我们看一个简单的例子。使用
      <code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">createCounter</code>
      函数创建计数器：
    </p>
    <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
<code class="font-mono text-sm">function createCounter() {
  let count = 0;
  return function() {
    count += 1;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2</code></pre>
  </div>
  
  <!-- 文章底部 -->
  <footer class="mt-12 pt-8 border-t border-gray-200">
    <div class="flex flex-wrap gap-2">
      <span class="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
        JavaScript
      </span>
      <span class="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
        闭包
      </span>
      <span class="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
        函数式编程
      </span>
    </div>
  </footer>
</article>
```

---

## 12. 小结

本章通过构建一个博客文章页面，系统学习了 UnoCSS 的排版能力。

**字体家族**的选择确立了界面的基本调性。`font-sans` 适合大多数界面，`font-serif` 适合正式文档，`font-mono` 专为代码设计。通过主题配置可以扩展自定义字体。

**字号层次**是信息架构的视觉表达。从 `text-4xl` 的大标题到 `text-sm` 的辅助信息，每一级都有其适用场景。响应式变体让排版能适应不同屏幕尺寸。

**字重**区分了标题和正文，`font-bold` 用于主标题，`font-semibold` 用于小标题和强调，`font-normal` 用于正文。记住：不是所有地方都要加粗。

**行高**对阅读舒适度至关重要。正文使用 `leading-relaxed`，标题可以用 `leading-tight`。行宽越宽，行高应该越大。

**字间距**是精细调节工具。大标题使用 `tracking-tight` 收紧，全大写文本使用 `tracking-wider` 加宽。

**文本截断**解决了有限空间的内容展示问题。`truncate` 用于单行，`line-clamp-*` 用于多行。

**好的排版是隐形的。** 当读者能够沉浸在内容中，完全不会注意到字体、行高、间距这些"技术细节"时，排版就成功了。

下一章我们将学习阴影、滤镜和过渡效果，为界面增添更多质感和动态感。
