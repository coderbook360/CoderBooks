# 渐进式水合设计

在前面的章节中，我们讨论了水合的基本概念和常见问题。传统的水合方式有一个显著的缺点：它是一个"全有或全无"的过程。当页面加载时，整个应用必须完成水合才能变得可交互。对于大型应用，这个过程可能需要相当长的时间，在此期间用户的交互操作得不到响应。

渐进式水合（Progressive Hydration）是一种优化策略，它的核心思想是：不必一次性水合整个页面，而是分批次、按优先级逐步完成水合。

## 传统水合的问题

让我们先量化一下传统水合的问题。假设有一个电商首页，包含顶部导航栏、轮播图、商品推荐列表、底部信息栏等区域。整个页面可能有上百个组件。

当用户访问这个页面时，服务端快速返回完整的 HTML，用户立即看到页面内容。JavaScript 开始加载和执行。然后进入水合阶段——Vue 需要遍历整个组件树，为每个组件创建实例、建立响应式系统、附加事件监听器。

在水合完成之前，页面看起来已经加载完成，但实际上是"假死"状态。用户点击导航链接没有反应，点击"加入购物车"按钮没有反应。这种"可见但不可用"的状态比完全空白的页面更让人困惑——用户不知道为什么他的操作没有得到响应。

这段时间被称为"交互延迟"（Time to Interactive，TTI）。对于复杂的页面，这个延迟可能达到数秒，严重影响用户体验。

## 渐进式水合的思路

渐进式水合的核心洞察是：并非页面的所有部分都同等重要。用户首先看到的是首屏内容，首先可能交互的是导航栏和主要的 CTA 按钮。页面底部的内容、不在视口内的区域，可以稍后再水合。

基于这个洞察，渐进式水合将水合过程拆分为多个阶段。首先水合最重要的、用户最可能交互的部分，然后逐步处理其他区域。这样用户可以更快开始与页面交互，即使页面还没有完全水合完成。

```
传统水合时间线：
[--------- 加载 JS --------][-------- 水合整个页面 --------][可交互]

渐进式水合时间线：
[--------- 加载 JS --------][水合导航栏][可交互]
                                    [水合首屏内容][更多可交互]
                                                 [水合剩余部分][完全可交互]
```

从时间线可以看到，渐进式水合让用户更早获得部分交互能力。总的水合时间可能相同甚至更长，但用户感知到的响应时间大大缩短。

## 实现策略

渐进式水合有多种实现策略，每种策略有不同的触发时机和适用场景。

第一种是基于可见性的水合。只有当组件进入视口时才触发水合。使用 `IntersectionObserver` API 可以高效地检测元素是否可见。

```javascript
// 概念示例：基于可见性的延迟水合
function createLazyHydrationComponent(Component) {
  return {
    setup(props) {
      const root = ref(null)
      const hydrated = ref(false)
      
      onMounted(() => {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            hydrated.value = true
            observer.disconnect()
          }
        })
        
        observer.observe(root.value)
      })
      
      return () => {
        if (hydrated.value) {
          return h(Component, props)
        }
        // 返回服务端渲染的静态 HTML
        return h('div', { ref: root, innerHTML: getSSRContent() })
      }
    }
  }
}
```

这个简化的例子展示了基本思路：组件最初保持为静态 HTML，当它进入视口时才触发真正的水合。对于长页面来说，这意味着用户滚动到某个区域时，那个区域才开始水合。首屏以下的内容不会阻塞首屏的交互。

第二种是基于用户交互的水合。组件保持静态状态，直到用户尝试与它交互。比如一个评论区可以在用户点击它时才开始水合。

```javascript
// 概念示例：交互触发水合
function createInteractionHydrationComponent(Component) {
  return {
    setup(props) {
      const root = ref(null)
      const hydrated = ref(false)
      
      const triggerHydration = () => {
        if (!hydrated.value) {
          hydrated.value = true
        }
      }
      
      onMounted(() => {
        // 监听多种交互事件
        const events = ['click', 'focus', 'mouseenter', 'touchstart']
        events.forEach(event => {
          root.value?.addEventListener(event, triggerHydration, { once: true })
        })
      })
      
      return () => {
        if (hydrated.value) {
          return h(Component, props)
        }
        return h('div', { ref: root, innerHTML: getSSRContent() })
      }
    }
  }
}
```

这种策略特别适合页面中不常用的交互区域。用户可能根本不会与某些组件交互，那么这些组件的水合就完全可以省略。

第三种是基于空闲时间的水合。利用 `requestIdleCallback` API，在浏览器空闲时逐步完成剩余的水合工作。

```javascript
// 概念示例：空闲时间水合
function scheduleIdleHydration(components) {
  const queue = [...components]
  
  function hydrateNext() {
    if (queue.length === 0) return
    
    requestIdleCallback((deadline) => {
      // 在空闲时间内尽可能多地水合
      while (deadline.timeRemaining() > 0 && queue.length > 0) {
        const component = queue.shift()
        hydrateComponent(component)
      }
      
      // 如果还有剩余，等待下一个空闲期
      if (queue.length > 0) {
        hydrateNext()
      }
    })
  }
  
  hydrateNext()
}
```

这种策略确保水合工作不会阻塞用户的交互和动画。浏览器忙的时候暂停水合，空闲时继续，让用户几乎感知不到水合过程的存在。

## 优先级调度

更复杂的渐进式水合实现会引入优先级系统。不同的组件根据其重要性分配不同的优先级，高优先级的组件先水合。

```javascript
// 优先级定义示例
const PRIORITY = {
  CRITICAL: 0,    // 立即水合：导航栏、主要 CTA
  HIGH: 1,        // 尽快水合：首屏交互组件
  NORMAL: 2,      // 正常水合：次要功能
  LOW: 3,         // 延迟水合：不在视口的内容
  IDLE: 4         // 空闲水合：很少使用的功能
}

// 使用示例
<HydrationBoundary :priority="PRIORITY.CRITICAL">
  <Navbar />
</HydrationBoundary>

<HydrationBoundary :priority="PRIORITY.LOW">
  <FooterLinks />
</HydrationBoundary>
```

调度器根据优先级和当前的系统状态决定水合顺序。在页面加载的关键时期，只处理 CRITICAL 级别的组件。用户开始交互后，逐步处理其他级别。

## 框架层面的支持

一些框架已经内置了渐进式水合的支持。Nuxt 3 提供了 `<LazyHydrate>` 组件，可以声明式地控制水合时机。

```vue
<template>
  <!-- 立即水合 -->
  <Navbar />
  
  <!-- 当组件进入视口时水合 -->
  <LazyHydrate when-visible>
    <ProductRecommendations />
  </LazyHydrate>
  
  <!-- 当用户交互时水合 -->
  <LazyHydrate when-interaction>
    <CommentSection />
  </LazyHydrate>
  
  <!-- 浏览器空闲时水合 -->
  <LazyHydrate when-idle>
    <Footer />
  </LazyHydrate>
</template>
```

这种声明式的 API 让开发者可以轻松地为不同区域指定水合策略，而不需要关心底层实现细节。

## 权衡与注意事项

渐进式水合不是银弹。它增加了系统的复杂性，也引入了一些需要注意的问题。

首先是事件丢失问题。如果用户在组件水合之前就进行了交互，这些事件可能得不到处理。一些框架通过事件重放机制来解决这个问题——在水合之前捕获用户事件，水合完成后重放这些事件。

其次是状态一致性问题。如果页面的不同部分使用共享状态，而这些部分的水合时机不同，可能出现状态不一致的情况。需要仔细设计状态管理策略。

第三是调试复杂性增加。渐进式水合让组件的生命周期变得更复杂，某些组件可能在页面加载后很久才被水合，这让问题的复现和调试变得更困难。

在决定是否使用渐进式水合时，需要权衡它带来的性能收益和引入的复杂性。对于页面简单、组件数量少的应用，传统水合可能已经足够快。只有当水合延迟确实成为性能瓶颈时，才值得引入渐进式水合。

在下一章中，我们会介绍另一种水合优化策略：选择性水合。它与渐进式水合有相似之处，但关注点不同。
