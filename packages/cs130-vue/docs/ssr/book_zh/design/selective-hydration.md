# 选择性水合设计

上一章我们讨论了渐进式水合，它通过分批次水合来优化交互时间。选择性水合（Selective Hydration）是另一种优化策略，它与渐进式水合有交叉，但侧重点不同。

选择性水合的核心问题是：当页面的某些部分还在加载数据或代码时，其他已经准备好的部分是否可以先行水合？

## 问题场景

考虑一个典型的页面，包含多个独立的区域：头部导航、主内容区、侧边栏、评论区。每个区域可能需要加载自己的组件代码和数据。

在传统的水合模式下，这些区域被视为一个整体。即使导航栏已经准备好了，如果评论区的代码还在加载，整个页面都无法开始水合。用户必须等待最慢的那个部分加载完成。

```
传统水合：
[加载导航栏代码][加载主内容代码][加载评论区代码][全部完成后开始水合]
                                                              ↓
                                              [------------- 水合整个页面 -------------]
```

这种"等待最慢"的特性在某些场景下是不可接受的。评论区可能需要从 CDN 加载 Markdown 渲染库，这个过程可能很慢。但导航栏只需要很少的代码，应该能够更快变得可交互。

## 选择性水合的解决方案

选择性水合的思路是：将页面划分为多个独立的水合边界，每个边界可以独立地完成加载和水合，互不阻塞。

React 18 引入的 Suspense 与选择性水合的深度集成是这种方法的典型实现。当某个 Suspense 边界内的组件还在加载时，边界外的内容可以正常水合。

```javascript
// React 的选择性水合示例
function App() {
  return (
    <div>
      <Navbar />  {/* 可以立即水合 */}
      
      <Suspense fallback={<LoadingSpinner />}>
        <MainContent />  {/* 独立的水合边界 */}
      </Suspense>
      
      <Suspense fallback={<CommentPlaceholder />}>
        <Comments />  {/* 另一个独立的水合边界 */}
      </Suspense>
    </div>
  )
}
```

在这个结构中，Navbar 可以立即水合。MainContent 和 Comments 各自有独立的 Suspense 边界，它们的加载和水合是独立的。如果 Comments 的代码加载较慢，MainContent 可以先完成水合。

Vue 3 的 Suspense 也支持类似的模式，虽然实现细节有所不同。

```html
<template>
  <div>
    <Navbar />
    
    <Suspense>
      <template #default>
        <MainContent />
      </template>
      <template #fallback>
        <LoadingSpinner />
      </template>
    </Suspense>
    
    <Suspense>
      <template #default>
        <AsyncComments />
      </template>
      <template #fallback>
        <CommentPlaceholder />
      </template>
    </Suspense>
  </div>
</template>
```

## 用户交互优先级提升

选择性水合的一个高级特性是响应用户交互。当用户尝试与某个尚未水合的区域交互时，系统可以提升这个区域的水合优先级。

想象用户在页面加载过程中点击了评论区的输入框。此时评论区可能还没有水合。一个智能的选择性水合系统会：

1. 捕获这个点击事件
2. 立即提升评论区的水合优先级
3. 尽快完成评论区的水合
4. 重放被捕获的点击事件

```javascript
// 概念示例：交互驱动的优先级调整
class SelectiveHydrationScheduler {
  constructor() {
    this.queue = new PriorityQueue()
    this.pendingEvents = new Map()
  }
  
  captureEvent(event, boundary) {
    // 记录事件，稍后重放
    if (!this.pendingEvents.has(boundary)) {
      this.pendingEvents.set(boundary, [])
    }
    this.pendingEvents.get(boundary).push(event.clone())
    
    // 提升优先级
    this.queue.updatePriority(boundary, PRIORITY.CRITICAL)
    
    // 阻止默认行为，防止重复触发
    event.preventDefault()
  }
  
  onHydrationComplete(boundary) {
    // 水合完成后重放事件
    const events = this.pendingEvents.get(boundary)
    if (events) {
      events.forEach(event => event.target.dispatchEvent(event))
      this.pendingEvents.delete(boundary)
    }
  }
}
```

这种机制确保了用户的交互意图不会丢失。即使页面还没有完全准备好，用户的操作也会得到响应——可能有短暂的延迟，但不会被忽略。

## 流式 SSR 与选择性水合的配合

选择性水合与流式 SSR 配合使用时效果最佳。流式 SSR 允许服务器边渲染边发送内容。当某个 Suspense 边界的内容准备好时，服务器可以立即发送，不必等待其他边界。

```
流式 SSR + 选择性水合时间线：

服务器端：
[渲染 Navbar][发送 Navbar HTML]
       [渲染 MainContent][发送 MainContent HTML]
              [渲染 Comments (等待数据)][发送 Comments HTML]

客户端：
[收到 Navbar HTML][加载 JS][水合 Navbar] ← 此时 Navbar 已可交互
        [收到 MainContent HTML][水合 MainContent] ← MainContent 可交互
                     [收到 Comments HTML][水合 Comments] ← 全部完成
```

用户可以在页面还没有完全加载时就开始与已加载的部分交互。这种体验的改善在网络较慢或页面复杂时尤为明显。

## 实现考量

实现选择性水合需要解决几个技术问题。

首先是边界划分。如何确定哪些组件应该组成一个水合边界？划分太细会增加管理复杂性，划分太粗则失去了选择性的意义。一般来说，相对独立的功能区域适合作为水合边界：导航栏、侧边栏、内容区、评论区等。

其次是状态管理。如果不同的水合边界之间有共享状态，需要确保状态在部分水合的情况下也能正确工作。一种策略是让共享状态独立于水合边界存在，在任何边界水合时都可以访问。

第三是错误处理。如果某个边界的水合失败了，不应该影响其他边界。需要在边界层面添加错误边界，隔离故障。

```html
<!-- 每个水合边界有独立的错误处理 -->
<template>
  <div>
    <ErrorBoundary>
      <Suspense>
        <MainContent />
      </Suspense>
    </ErrorBoundary>
    
    <ErrorBoundary>
      <Suspense>
        <Comments />
      </Suspense>
    </ErrorBoundary>
  </div>
</template>
```

## 与渐进式水合的关系

选择性水合和渐进式水合经常一起使用，但它们解决的是不同的问题。

渐进式水合关注的是"何时水合"——按照优先级分批次水合，让重要的部分先变得可交互。

选择性水合关注的是"能否独立水合"——让不同区域的水合相互独立，不必等待最慢的部分。

一个完整的优化方案可能同时使用两种策略：通过选择性水合让各区域独立加载和水合，通过渐进式水合控制每个区域内部的水合时机。

```
综合优化时间线：

[加载核心JS]
     [选择性水合: Navbar边界完成][渐进式: Navbar中的关键按钮可交互]
              [选择性水合: MainContent边界完成][渐进式: 首屏内容可交互]
                       [选择性水合: Comments边界完成][渐进式: 评论输入框可交互]
                                                              [渐进式: 历史评论加载...]
```

## Vue 中的实践

Vue 3 的 Suspense 为选择性水合提供了基础设施。结合异步组件，可以实现区域级的独立加载和水合。

```javascript
// 定义异步组件
const AsyncComments = defineAsyncComponent(() => 
  import('./Comments.vue')
)

// 在模板中使用 Suspense 包裹
<Suspense>
  <AsyncComments />
  <template #fallback>
    <div>Loading comments...</div>
  </template>
</Suspense>
```

在服务端渲染时，Suspense 会等待异步组件解析完成后再渲染。在客户端，异步组件的代码分割确保了它可以独立加载，Suspense 边界确保了它可以独立水合。

Nuxt 3 进一步封装了这些能力，通过 `<NuxtPage>` 和路由级别的数据获取，自动建立合适的水合边界。

选择性水合是提升 SSR 应用性能的重要工具。在设计应用架构时，有意识地划分水合边界，可以显著改善用户的加载体验。在下一章中，我们会讨论另一种提升性能的技术：流式渲染。
