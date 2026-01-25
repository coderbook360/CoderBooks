# 水合不匹配问题

上一章我们介绍了水合的基本概念。水合过程的核心假设是：服务端渲染的 DOM 结构与客户端虚拟 DOM 是一致的。当这个假设被打破时，就会出现水合不匹配（Hydration Mismatch）问题。

水合不匹配是 SSR 开发中最常遇到的问题之一。理解它的成因、表现和解决方案，是掌握 SSR 技术的必经之路。

## 什么是水合不匹配

水合不匹配发生在客户端尝试水合时，发现已存在的 DOM 结构与预期的虚拟 DOM 结构不一致。这种不一致可能是节点类型不同、属性值不同、子节点数量不同，或者文本内容不同。

当 Vue 检测到不匹配时，在开发模式下会在控制台输出警告信息。这些警告通常包含不匹配的具体位置和期望值与实际值的对比。

```
[Vue warn]: Hydration node mismatch:
- Client vnode: div
- Server rendered DOM: span
```

在生产模式下，Vue 的处理策略取决于不匹配的严重程度。对于轻微的文本差异，Vue 可能选择忽略或自动修复。对于结构性的差异，Vue 可能需要放弃水合，在客户端重新渲染受影响的部分。

## 常见的不匹配原因

让我们来看看导致水合不匹配的几种常见情况。

第一种是时间相关的渲染。如果组件中使用了当前时间、日期等动态数据，服务端渲染和客户端渲染必然会得到不同的值。

```javascript
// 错误：时间在两端不同
export default {
  data() {
    return {
      now: new Date().toLocaleTimeString()
    }
  },
  template: `<span>{{ now }}</span>`
}
```

服务端渲染时可能是 `10:30:00`，但客户端水合时已经是 `10:30:05` 了。五秒钟的差异足以导致不匹配。解决方案是将这类数据的计算放到 `mounted` 钩子中，或者使用 `<ClientOnly>` 组件包裹。

第二种是随机数相关的渲染。有些场景需要生成随机 ID 或随机样式，这在两端会产生不同的值。

```javascript
// 错误：每次调用 Math.random() 结果不同
export default {
  data() {
    return {
      id: `item-${Math.random().toString(36).slice(2)}`
    }
  },
  template: `<div :id="id">...</div>`
}
```

解决这个问题需要使用确定性的 ID 生成策略，比如基于内容的 hash，或者使用全局递增的计数器。Vue 3.5 提供了 `useId()` 组合式函数，可以生成同构的唯一 ID。

第三种是浏览器特定行为。有些 HTML 会被浏览器自动"修正"，导致服务端输出和客户端 DOM 不一致。

```javascript
// 服务端输出
<table>
  <tr><td>Cell</td></tr>
</table>

// 浏览器自动添加 tbody
<table>
  <tbody>
    <tr><td>Cell</td></tr>
  </tbody>
</table>
```

浏览器会在 `<table>` 中自动插入 `<tbody>` 元素。如果服务端没有生成 `<tbody>`，就会出现结构不匹配。类似的情况还有 `<p>` 标签内不能包含块级元素等 HTML 规范限制。

第四种是条件渲染的差异。如果 `v-if` 的条件在两端不同，渲染出的 DOM 结构自然不同。

```javascript
// 可能导致不匹配
export default {
  data() {
    return {
      // 服务端没有 window 对象
      isMobile: typeof window !== 'undefined' && window.innerWidth < 768
    }
  },
  template: `
    <div v-if="isMobile">Mobile View</div>
    <div v-else>Desktop View</div>
  `
}
```

服务端渲染时 `isMobile` 为 `false`（因为没有 window），但客户端如果是手机访问，`isMobile` 为 `true`。两端渲染不同的分支，必然不匹配。

## 诊断水合不匹配

当你看到水合不匹配的警告时，如何定位问题的根源？

首先，仔细阅读警告信息。Vue 的警告通常会指出不匹配发生的位置和类型。对比期望值（客户端虚拟 DOM）和实际值（服务端渲染的 DOM），往往能看出问题所在。

其次，使用浏览器的"查看源代码"功能。这能看到服务端返回的原始 HTML，而不是经过 JavaScript 修改后的 DOM。对比源代码和开发者工具中的 DOM 结构，可以发现差异。

第三，在服务端和客户端分别打印关键状态。如果怀疑是某个数据导致的不匹配，可以在 `created` 钩子（两端都会执行）中打印这个数据，看看两端的值是否一致。

```javascript
export default {
  created() {
    // 在服务端和客户端分别打印
    console.log('Environment:', typeof window === 'undefined' ? 'server' : 'client')
    console.log('Some data:', this.someData)
  }
}
```

第四，使用 Vue DevTools。虽然 DevTools 主要用于客户端调试，但它可以帮助你理解组件树的结构和状态，与源代码中的服务端输出对比。

## 修复水合不匹配

根据不同的原因，修复策略也不同。

对于时间、随机数等动态数据，最简单的方法是将计算推迟到客户端。使用 `mounted` 钩子或者 `<ClientOnly>` 组件。

```javascript
// 方案一：使用 mounted
export default {
  data() {
    return {
      now: '' // 服务端返回空字符串
    }
  },
  mounted() {
    // 只在客户端更新
    this.now = new Date().toLocaleTimeString()
  }
}
```

Nuxt 提供了 `<ClientOnly>` 组件，包裹在其中的内容只会在客户端渲染。

```html
<template>
  <div>
    <p>这部分在两端都渲染</p>
    <ClientOnly>
      <p>这部分只在客户端渲染</p>
      <template #fallback>
        <p>服务端显示这个占位符</p>
      </template>
    </ClientOnly>
  </div>
</template>
```

对于浏览器自动修正的 HTML 问题，解决方案是确保服务端输出符合 HTML 规范。在 `<table>` 中使用 `<tbody>`，避免在 `<p>` 中嵌套块级元素，等等。

```html
<!-- 正确：显式包含 tbody -->
<template>
  <table>
    <tbody>
      <tr v-for="row in rows" :key="row.id">
        <td>{{ row.value }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

对于条件渲染差异，需要确保条件在两端一致。一种方法是在服务端也能正确判断条件，比如通过 User-Agent 判断设备类型。另一种方法是使用 CSS 媒体查询代替 JavaScript 条件渲染。

```html
<!-- 使用 CSS 代替条件渲染 -->
<template>
  <div>
    <div class="mobile-only">Mobile View</div>
    <div class="desktop-only">Desktop View</div>
  </div>
</template>

<style>
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 767px) {
  .mobile-only { display: block; }
  .desktop-only { display: none; }
}
</style>
```

这种方法的好处是两端渲染相同的 DOM 结构，只是通过 CSS 控制显示。不会有水合不匹配问题，而且在页面加载过程中也不会出现闪烁。

## 何时可以忽略警告

有些水合不匹配是可以接受的。比如，如果你确定某个不匹配只影响文本内容，不影响 DOM 结构和功能，而且用户不会注意到这个差异，那么可以选择忽略。

Vue 3.4 引入了 `data-allow-mismatch` 属性，允许你明确标记预期会有不匹配的元素。

```html
<template>
  <span data-allow-mismatch>{{ currentTime }}</span>
</template>
```

使用这个属性后，Vue 不会对这个元素的不匹配发出警告。但要谨慎使用——它只应该用于你完全理解并接受的不匹配场景。

## 预防胜于修复

与其在出问题后修复，不如从一开始就避免水合不匹配。以下是一些预防性的最佳实践：

始终假设代码会在两个环境中运行。在使用任何可能产生不同结果的 API 之前，问问自己：这在服务端和客户端会产生相同的值吗？

将环境特定的逻辑隔离到适当的生命周期钩子中。只在客户端执行的代码放到 `mounted` 及之后的钩子中。需要在两端执行但结果可能不同的代码，考虑使用 `<ClientOnly>` 或条件渲染。

使用框架提供的同构工具函数。比如 Nuxt 的 `useFetch`、`useAsyncData` 等，它们已经处理好了状态同步问题。Vue 3.5 的 `useId` 可以生成同构的唯一 ID。

编写测试来捕获潜在的不匹配。可以同时运行服务端渲染和客户端渲染，对比两者的输出，发现不一致的地方。

理解水合不匹配的原因和解决方案，是成为 SSR 专家的必经之路。在接下来的章节中，我们会介绍一些更高级的水合策略，它们从不同角度优化了水合过程的性能。
