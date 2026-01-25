# lazyHydration 惰性水合

惰性水合是部分水合的延伸，将水合时机延迟到真正需要的时候。这进一步优化了首屏性能，让关键交互优先响应。

## 惰性水合的触发时机

1. **可见性**：元素进入视口时水合
2. **交互**：用户与元素交互时水合
3. **空闲**：浏览器空闲时水合
4. **媒体查询**：满足特定条件时水合
5. **手动**：代码主动触发水合

## 可见性触发

使用 Intersection Observer：

```typescript
function createVisibilityHydration(
  callback: (el: Element) => void
): { observe: (el: Element) => void; disconnect: () => void } {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          callback(entry.target)
          observer.unobserve(entry.target)
        }
      }
    },
    {
      rootMargin: '200px',  // 提前 200px 开始水合
      threshold: 0
    }
  )
  
  return {
    observe: (el: Element) => observer.observe(el),
    disconnect: () => observer.disconnect()
  }
}
```

## 交互触发

```typescript
function createInteractionHydration(
  el: Element,
  hydrate: () => void
) {
  const events = ['click', 'focus', 'touchstart', 'mouseenter']
  
  function handler(e: Event) {
    // 阻止默认行为，水合后重放
    e.preventDefault()
    
    // 移除所有监听器
    for (const event of events) {
      el.removeEventListener(event, handler)
    }
    
    // 执行水合
    hydrate()
    
    // 重放事件
    queueMicrotask(() => {
      const newEvent = new (e.constructor as typeof Event)(e.type, e)
      el.dispatchEvent(newEvent)
    })
  }
  
  for (const event of events) {
    el.addEventListener(event, handler, { once: true, passive: false })
  }
}
```

## 空闲触发

```typescript
function createIdleHydration(
  hydrate: () => void,
  timeout: number = 2000
) {
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(
      (deadline) => {
        if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
          hydrate()
        }
      },
      { timeout }
    )
    
    return () => cancelIdleCallback(id)
  } else {
    // 降级到 setTimeout
    const id = setTimeout(hydrate, timeout)
    return () => clearTimeout(id)
  }
}
```

## 媒体查询触发

```typescript
function createMediaQueryHydration(
  query: string,
  hydrate: () => void
) {
  const mql = window.matchMedia(query)
  
  if (mql.matches) {
    // 已经匹配，立即水合
    hydrate()
    return () => {}
  }
  
  function handler(e: MediaQueryListEvent) {
    if (e.matches) {
      hydrate()
      mql.removeEventListener('change', handler)
    }
  }
  
  mql.addEventListener('change', handler)
  
  return () => mql.removeEventListener('change', handler)
}
```

## 组合触发策略

```typescript
type HydrationTrigger = 'visible' | 'interaction' | 'idle' | 'media' | 'never'

interface LazyHydrationOptions {
  trigger: HydrationTrigger | HydrationTrigger[]
  mediaQuery?: string
  timeout?: number
  rootMargin?: string
}

function setupLazyHydration(
  el: Element,
  vnode: VNode,
  options: LazyHydrationOptions
) {
  const triggers = Array.isArray(options.trigger) 
    ? options.trigger 
    : [options.trigger]
  
  let hydrated = false
  const cleanups: Array<() => void> = []
  
  const doHydrate = () => {
    if (hydrated) return
    hydrated = true
    
    // 清理所有触发器
    cleanups.forEach(cleanup => cleanup())
    
    // 执行水合
    hydrateNode(el.firstChild!, vnode, null, false)
    
    // 标记已水合
    el.setAttribute('data-hydrated', '')
    el.removeAttribute('data-hydration-pending')
  }
  
  for (const trigger of triggers) {
    switch (trigger) {
      case 'visible': {
        const { observe, disconnect } = createVisibilityHydration(doHydrate)
        observe(el)
        cleanups.push(disconnect)
        break
      }
      
      case 'interaction': {
        createInteractionHydration(el, doHydrate)
        break
      }
      
      case 'idle': {
        const cancel = createIdleHydration(doHydrate, options.timeout)
        cleanups.push(cancel)
        break
      }
      
      case 'media': {
        if (options.mediaQuery) {
          const cancel = createMediaQueryHydration(options.mediaQuery, doHydrate)
          cleanups.push(cancel)
        }
        break
      }
      
      case 'never':
        // 永不水合，保持静态
        break
    }
  }
  
  el.setAttribute('data-hydration-pending', '')
}
```

## LazyHydrate 组件

封装为 Vue 组件：

```typescript
const LazyHydrate = defineComponent({
  name: 'LazyHydrate',
  
  props: {
    trigger: {
      type: [String, Array] as PropType<HydrationTrigger | HydrationTrigger[]>,
      default: 'visible'
    },
    mediaQuery: String,
    timeout: {
      type: Number,
      default: 2000
    },
    ssrOnly: Boolean
  },
  
  setup(props, { slots }) {
    const root = ref<HTMLElement>()
    const hydrated = ref(false)
    
    onMounted(() => {
      if (props.ssrOnly) {
        // 客户端直接渲染
        hydrated.value = true
        return
      }
      
      if (root.value) {
        setupLazyHydration(root.value, slots.default!()[0], {
          trigger: props.trigger,
          mediaQuery: props.mediaQuery,
          timeout: props.timeout
        })
      }
    })
    
    return () => {
      if (hydrated.value) {
        return slots.default?.()
      }
      
      return h('div', {
        ref: root,
        'data-lazy-hydrate': ''
      }, slots.default?.())
    }
  }
})
```

## 使用示例

```vue
<template>
  <!-- 进入视口时水合 -->
  <LazyHydrate trigger="visible">
    <HeavyComponent />
  </LazyHydrate>
  
  <!-- 用户交互时水合 -->
  <LazyHydrate trigger="interaction">
    <CommentForm />
  </LazyHydrate>
  
  <!-- 空闲时水合，最多等 5 秒 -->
  <LazyHydrate trigger="idle" :timeout="5000">
    <RelatedPosts />
  </LazyHydrate>
  
  <!-- 大屏幕时才水合 -->
  <LazyHydrate trigger="media" media-query="(min-width: 768px)">
    <DesktopSidebar />
  </LazyHydrate>
  
  <!-- 永不水合，保持静态 -->
  <LazyHydrate trigger="never">
    <StaticFooter />
  </LazyHydrate>
  
  <!-- 组合触发：可见或交互 -->
  <LazyHydrate :trigger="['visible', 'interaction']">
    <ProductCard />
  </LazyHydrate>
</template>
```

## 骨架屏支持

水合前显示骨架屏：

```typescript
const LazyHydrateWithSkeleton = defineComponent({
  name: 'LazyHydrateWithSkeleton',
  
  props: {
    trigger: {
      type: String as PropType<HydrationTrigger>,
      default: 'visible'
    }
  },
  
  setup(props, { slots }) {
    const hydrated = ref(false)
    const root = ref<HTMLElement>()
    
    onMounted(() => {
      // 设置惰性水合...
    })
    
    return () => {
      if (hydrated.value) {
        return slots.default?.()
      }
      
      // 显示骨架屏
      return h('div', { ref: root }, [
        slots.skeleton?.() || h(DefaultSkeleton)
      ])
    }
  }
})
```

```vue
<template>
  <LazyHydrateWithSkeleton>
    <template #default>
      <ProductList :products="products" />
    </template>
    <template #skeleton>
      <ProductListSkeleton :count="6" />
    </template>
  </LazyHydrateWithSkeleton>
</template>
```

## 批量惰性水合

```typescript
function batchLazyHydration(
  targets: Array<{ el: Element; vnode: VNode; options: LazyHydrationOptions }>
) {
  // 按优先级分组
  const byTrigger = groupBy(targets, t => t.options.trigger)
  
  // 可见性触发：共用一个 Observer
  if (byTrigger.visible) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const target = byTrigger.visible.find(t => t.el === entry.target)
          if (target) {
            hydrateNode(target.el.firstChild!, target.vnode, null, false)
            observer.unobserve(target.el)
          }
        }
      }
    })
    
    byTrigger.visible.forEach(t => observer.observe(t.el))
  }
  
  // 空闲触发：按优先级排队
  if (byTrigger.idle) {
    let index = 0
    
    const processNext = () => {
      if (index < byTrigger.idle.length) {
        const target = byTrigger.idle[index++]
        hydrateNode(target.el.firstChild!, target.vnode, null, false)
        
        requestIdleCallback(processNext)
      }
    }
    
    requestIdleCallback(processNext)
  }
}
```

## 预水合提示

当用户接近目标时提前水合：

```typescript
function setupPreHydration(el: Element, hydrate: () => void) {
  // 鼠标接近时预水合
  let timeout: number | null = null
  
  document.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect()
    const distance = Math.hypot(
      e.clientX - (rect.left + rect.width / 2),
      e.clientY - (rect.top + rect.height / 2)
    )
    
    // 距离小于 200px 时开始预水合
    if (distance < 200) {
      if (!timeout) {
        timeout = window.setTimeout(hydrate, 100)
      }
    } else if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  })
}
```

## 水合状态同步

确保组件状态在水合后正确同步：

```typescript
function hydrateWithStateSync(
  el: Element,
  vnode: VNode,
  initialState: Record<string, any>
) {
  // 保存初始状态
  const stateKey = el.getAttribute('data-state-key')
  
  if (stateKey && initialState[stateKey]) {
    // 注入状态
    provide('initialState', initialState[stateKey])
  }
  
  // 执行水合
  hydrateNode(el.firstChild!, vnode, null, false)
  
  // 验证状态
  nextTick(() => {
    const instance = vnode.component
    if (instance && stateKey) {
      // 检查状态是否正确同步
      validateState(instance, initialState[stateKey])
    }
  })
}
```

## 性能监控

```typescript
function createHydrationMetrics() {
  const metrics: Record<string, {
    scheduled: number
    hydrated: number | null
    duration: number | null
  }> = {}
  
  return {
    schedule(id: string) {
      metrics[id] = {
        scheduled: performance.now(),
        hydrated: null,
        duration: null
      }
    },
    
    complete(id: string) {
      const metric = metrics[id]
      if (metric) {
        metric.hydrated = performance.now()
        metric.duration = metric.hydrated - metric.scheduled
      }
    },
    
    report() {
      const sorted = Object.entries(metrics)
        .filter(([, m]) => m.duration !== null)
        .sort(([, a], [, b]) => b.duration! - a.duration!)
      
      console.table(sorted.map(([id, m]) => ({
        id,
        waitTime: m.hydrated! - m.scheduled,
        duration: m.duration
      })))
    }
  }
}
```

## 小结

惰性水合通过延迟水合时机优化性能：

1. **可见性触发**：只水合进入视口的内容
2. **交互触发**：用户操作时才水合
3. **空闲触发**：利用浏览器空闲时间
4. **媒体查询触发**：根据设备条件水合
5. **组合策略**：灵活组合多种触发条件

惰性水合是现代 SSR 应用的重要优化手段，能显著提升首屏交互性能。
