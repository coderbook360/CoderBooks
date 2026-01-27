# 水合机制的设计权衡

水合（Hydration）是 SSR 应用的关键步骤。服务端渲染的静态 HTML 需要在客户端"激活"，成为可交互的 Vue 应用。这个过程涉及多个设计权衡。

## 什么是水合

当浏览器收到服务端渲染的 HTML 时，页面立即可见，但还不能交互。JavaScript 加载完成后，Vue 需要将这些静态 HTML 与虚拟 DOM 关联起来。

```html
<!-- 服务端渲染的 HTML -->
<div id="app">
  <button>点击次数: 0</button>
</div>
```

```javascript
// 客户端水合
const app = createSSRApp(App)
app.mount('#app')  // 水合，不是重新渲染
```

水合过程中，Vue 会遍历现有 DOM 节点，将它们与虚拟 DOM 匹配，绑定事件处理器和响应式系统。

## 水合 vs 重新渲染

Vue 2 早期的 SSR 方案是在客户端完全重新渲染，替换服务端生成的 HTML。这种方式简单但有问题：用户会看到页面闪烁，首屏时间也没有真正优化。

水合的核心优化是复用现有 DOM。Vue 不会销毁再重建 DOM 节点，而是直接在现有节点上附加事件监听和响应式追踪。

```javascript
// 简化的水合逻辑
function hydrate(vnode, container) {
  // 不创建新 DOM，直接使用现有节点
  vnode.el = container.firstChild
  
  // 遍历子节点，递归水合
  hydrateChildren(vnode.children, vnode.el)
  
  // 绑定事件
  if (vnode.props?.onClick) {
    vnode.el.addEventListener('click', vnode.props.onClick)
  }
}
```

## 水合不匹配

水合成功的前提是客户端虚拟 DOM 与服务端 HTML 完全匹配。如果不匹配，Vue 会发出警告：

```
[Vue warn]: Hydration node mismatch
```

常见的不匹配原因：

时间敏感内容：

```vue
<template>
  <span>{{ new Date().toLocaleString() }}</span>
</template>
<!-- 服务端和客户端渲染的时间不同 -->
```

随机内容：

```vue
<template>
  <div :id="`id-${Math.random()}`">...</div>
</template>
<!-- 每次渲染的 ID 不同 -->
```

条件渲染依赖浏览器 API：

```vue
<template>
  <div v-if="typeof window !== 'undefined'">
    仅客户端内容
  </div>
</template>
<!-- 服务端渲染时条件为 false，客户端为 true -->
```

## 处理不匹配

对于无法避免的不匹配，可以使用 `<ClientOnly>` 组件：

```vue
<template>
  <ClientOnly>
    <span>{{ new Date().toLocaleString() }}</span>
    <template #fallback>加载中...</template>
  </ClientOnly>
</template>
```

`<ClientOnly>` 在服务端渲染 fallback 内容，在客户端渲染实际内容，避免了水合不匹配。

另一种方案是延迟更新：

```vue
<script setup>
const time = ref('')

onMounted(() => {
  // 水合后再更新时间
  time.value = new Date().toLocaleString()
})
</script>

<template>
  <span>{{ time }}</span>
</template>
```

## 性能权衡

水合的性能开销不容忽视。即使 DOM 已经存在，Vue 仍需要：

遍历整个组件树，创建虚拟 DOM。

比对虚拟 DOM 与真实 DOM。

为所有可交互元素绑定事件。

初始化响应式系统，建立依赖追踪。

对于大型页面，这个过程可能需要数百毫秒。在此期间，页面可见但不可交互，这段时间称为"交互时间"（TTI）。

```
页面加载时间线：
TTFB → FCP → TTI
       ↑      ↑
     HTML显示  水合完成，可交互
```

优化水合性能的策略：

代码分割：只加载当前页面需要的组件代码。

延迟水合：非首屏内容延迟水合。

渐进式水合：按优先级分批水合组件。

## 延迟水合

不是所有组件都需要立即可交互。页脚、广告、评论区等可以延迟水合：

```vue
<template>
  <main>
    <!-- 首屏内容，立即水合 -->
    <article>{{ content }}</article>
  </main>
  
  <LazyHydrate when-visible>
    <!-- 滚动到视口时才水合 -->
    <CommentSection />
  </LazyHydrate>
</template>
```

这种策略减少了首次水合的工作量，加快了 TTI。

## 岛屿架构

更激进的优化是岛屿架构（Islands Architecture）。页面大部分是静态 HTML，只有少数"岛屿"需要 JavaScript 和水合。

```html
<!-- 静态 HTML -->
<header>网站标题</header>
<article>文章内容...</article>

<!-- 岛屿：需要交互 -->
<div data-island="comments">
  <!-- 这部分水合 -->
</div>

<!-- 静态 HTML -->
<footer>版权信息</footer>
```

Astro 等框架原生支持岛屿架构。Vue 生态中，Nuxt 的 Islands 特性提供了类似能力。

岛屿架构的代价是更复杂的开发模型，以及岛屿之间状态共享的限制。

## 水合错误恢复

水合失败时，Vue 提供了回退机制：

```javascript
app.config.errorHandler = (err, instance, info) => {
  if (info === 'hydration') {
    // 水合失败，可以选择重新渲染
    console.error('Hydration failed:', err)
  }
}
```

Nuxt 在检测到严重的水合不匹配时，会自动回退到客户端渲染，确保应用仍然可用。

## 调试水合问题

水合问题的调试可能很困难。Vue DevTools 提供了一些帮助，但最有效的方法是：

检查服务端和客户端渲染的 HTML 差异：

```javascript
// 服务端记录渲染结果
const serverHtml = await renderToString(app)
console.log('Server HTML:', serverHtml)

// 客户端在水合前检查
console.log('Client HTML:', document.getElementById('app').innerHTML)
```

使用开发模式的详细警告。Vue 在开发模式下会提供具体的不匹配信息。

逐步简化，找出导致不匹配的具体组件。

## 设计思考

水合是 SSR 架构的关键权衡点。它带来了快速首屏和 SEO 优势，但也增加了：

开发复杂度：需要考虑同构兼容性。

调试难度：水合问题不易排查。

TTI 延迟：水合期间页面不可交互。

选择 SSR 时需要权衡这些因素。对于交互密集的应用，水合开销可能抵消首屏优势。对于内容密集、交互较少的应用，SSR 的收益更明显。
