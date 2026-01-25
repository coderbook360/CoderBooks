# partialHydration 部分水合

部分水合是一种优化策略，允许只水合页面中需要交互的部分，其余部分保持静态 HTML。这可以显著减少客户端 JavaScript 执行时间。

## 为什么需要部分水合

传统的全量水合存在问题：

1. **JavaScript 包体积大**：整个应用的代码都需要下载
2. **TTI 延迟**：需要等待所有组件水合完成才能交互
3. **不必要的开销**：静态内容也被水合

部分水合的思路是：只对需要交互的部分进行水合。

## 实现原理

```typescript
interface PartialHydrationOptions {
  // 需要水合的选择器
  selectors: string[]
  
  // 或者使用组件标记
  components: Set<string>
  
  // 跳过的区域
  skip: string[]
}

function createPartialHydration(options: PartialHydrationOptions) {
  return {
    shouldHydrate(vnode: VNode): boolean {
      // 检查组件是否需要水合
      if (vnode.type && typeof vnode.type === 'object') {
        const name = (vnode.type as any).name
        return options.components.has(name)
      }
      return false
    }
  }
}
```

## 选择性水合

```typescript
function selectiveHydrate(
  container: Element,
  vnodes: VNode[],
  options: PartialHydrationOptions
): void {
  const { selectors, skip } = options
  
  // 找到需要水合的 DOM 节点
  const hydrateTargets = selectors.flatMap(
    selector => Array.from(container.querySelectorAll(selector))
  )
  
  // 排除跳过的区域
  const skipElements = new Set(
    skip.flatMap(selector => Array.from(container.querySelectorAll(selector)))
  )
  
  for (const target of hydrateTargets) {
    if (!skipElements.has(target)) {
      // 找到对应的 VNode
      const vnode = findMatchingVNode(target, vnodes)
      if (vnode) {
        hydrateNode(target.firstChild!, vnode, null, false)
      }
    }
  }
}
```

## 组件级标记

使用指令标记需要水合的组件：

```vue
<template>
  <!-- 静态内容，不需要水合 -->
  <header>
    <nav>...</nav>
  </header>
  
  <!-- 需要交互，标记水合 -->
  <div v-hydrate>
    <Counter />
  </div>
  
  <!-- 静态内容 -->
  <footer>...</footer>
</template>
```

```typescript
const vHydrate = {
  created(el: Element, binding: DirectiveBinding, vnode: VNode) {
    // 标记这个 VNode 需要水合
    ;(vnode as any).__hydrate = true
  }
}
```

## 跳过静态内容

```typescript
function shouldSkipHydration(vnode: VNode): boolean {
  // 检查 v-hydrate:skip 指令
  if (vnode.dirs?.some(d => d.dir === vSkip)) {
    return true
  }
  
  // 检查静态标记
  if (vnode.patchFlag === PatchFlags.HOISTED) {
    return true
  }
  
  // 纯静态组件
  if (vnode.type && typeof vnode.type === 'object') {
    const comp = vnode.type as Component
    if (comp.__static) {
      return true
    }
  }
  
  return false
}
```

## 边界处理

```typescript
function hydrateWithBoundary(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // 检查是否跳过
  if (shouldSkipHydration(vnode)) {
    // 跳过这个节点，直接返回下一个
    return skipNode(node, vnode)
  }
  
  // 检查是否是水合边界
  if (isHydrationBoundary(vnode)) {
    return hydrateNode(node, vnode, parentComponent, false)
  }
  
  // 普通节点，遍历子节点
  if (node.nodeType === Node.ELEMENT_NODE && vnode.children) {
    traverseChildren(node as Element, vnode, parentComponent)
  }
  
  return node.nextSibling
}

function skipNode(node: Node, vnode: VNode): Node | null {
  // 关联 el 但不水合
  vnode.el = node
  
  // 如果是元素，跳过所有子节点
  if (node.nodeType === Node.ELEMENT_NODE) {
    // 递归标记子 VNode
    markAsSkipped(vnode)
  }
  
  return node.nextSibling
}

function markAsSkipped(vnode: VNode) {
  vnode.__skipped = true
  
  if (vnode.children && Array.isArray(vnode.children)) {
    for (const child of vnode.children as VNode[]) {
      markAsSkipped(child)
    }
  }
}
```

## 动态边界

根据运行时条件决定是否水合：

```typescript
function dynamicHydrationBoundary(
  condition: () => boolean
): Component {
  return {
    name: 'DynamicHydrationBoundary',
    
    setup(props, { slots }) {
      const shouldHydrate = condition()
      
      return () => {
        const children = slots.default?.()
        
        if (shouldHydrate) {
          // 返回正常内容
          return children
        } else {
          // 返回静态占位符
          return h('div', {
            innerHTML: getStaticHTML(children)
          })
        }
      }
    }
  }
}
```

## 事件委托

未水合的区域使用事件委托：

```typescript
function setupEventDelegation(container: Element) {
  // 常见事件的委托
  const events = ['click', 'input', 'change', 'submit']
  
  for (const event of events) {
    container.addEventListener(event, (e) => {
      const target = e.target as Element
      
      // 检查是否在未水合区域
      if (isInSkippedRegion(target)) {
        // 触发惰性水合
        triggerLazyHydration(target)
      }
    })
  }
}

function isInSkippedRegion(el: Element): boolean {
  let current: Element | null = el
  
  while (current) {
    if (current.hasAttribute('data-hydration-skip')) {
      return true
    }
    current = current.parentElement
  }
  
  return false
}
```

## 与 Island 架构配合

```typescript
interface Island {
  selector: string
  component: Component
  props?: Record<string, any>
}

function hydrateIslands(islands: Island[]) {
  for (const island of islands) {
    const elements = document.querySelectorAll(island.selector)
    
    for (const el of elements) {
      // 创建独立的 Vue 应用
      const app = createApp(island.component, island.props)
      
      // 水合到岛屿位置
      app.mount(el)
    }
  }
}
```

## 进度追踪

```typescript
interface HydrationProgress {
  total: number
  completed: number
  skipped: number
  pending: string[]
}

function createHydrationTracker(): HydrationProgress {
  return reactive({
    total: 0,
    completed: 0,
    skipped: 0,
    pending: []
  })
}

function trackHydration(
  vnode: VNode,
  progress: HydrationProgress
) {
  progress.total++
  
  const name = getVNodeName(vnode)
  progress.pending.push(name)
  
  return {
    complete() {
      progress.completed++
      const index = progress.pending.indexOf(name)
      if (index > -1) {
        progress.pending.splice(index, 1)
      }
    },
    skip() {
      progress.skipped++
      progress.pending.splice(progress.pending.indexOf(name), 1)
    }
  }
}
```

## 优先级控制

```typescript
enum HydrationPriority {
  CRITICAL = 0,   // 必须立即水合
  HIGH = 1,       // 高优先级
  NORMAL = 2,     // 普通优先级
  LOW = 3,        // 低优先级
  IDLE = 4        // 空闲时水合
}

function prioritizedHydration(
  targets: Array<{ node: Node; vnode: VNode; priority: HydrationPriority }>
) {
  // 按优先级排序
  const sorted = [...targets].sort((a, b) => a.priority - b.priority)
  
  // 分批执行
  let index = 0
  
  function processBatch() {
    const startTime = performance.now()
    
    while (index < sorted.length) {
      const { node, vnode, priority } = sorted[index]
      
      // 高优先级任务不限制时间
      if (priority > HydrationPriority.HIGH) {
        // 检查是否超时（16ms，一帧）
        if (performance.now() - startTime > 16) {
          // 下一帧继续
          requestAnimationFrame(processBatch)
          return
        }
      }
      
      hydrateNode(node, vnode, null, false)
      index++
    }
  }
  
  processBatch()
}
```

## 调试工具

```typescript
function createPartialHydrationDevtools() {
  if (!__DEV__) return
  
  // 高亮显示水合区域
  const style = document.createElement('style')
  style.textContent = `
    [data-hydrated] {
      outline: 2px solid green;
    }
    [data-hydration-skip] {
      outline: 2px dashed gray;
    }
    [data-hydration-pending] {
      outline: 2px solid orange;
    }
  `
  document.head.appendChild(style)
  
  // 控制台面板
  window.__PARTIAL_HYDRATION__ = {
    showHydrated() {
      document.querySelectorAll('[data-hydrated]').forEach(el => {
        console.log('Hydrated:', el)
      })
    },
    showSkipped() {
      document.querySelectorAll('[data-hydration-skip]').forEach(el => {
        console.log('Skipped:', el)
      })
    }
  }
}
```

## 与 SSR 配合

服务端标记需要水合的区域：

```typescript
// 服务端
function renderWithHydrationMarkers(app: App): string {
  const ctx = {
    hydrationTargets: new Set<string>()
  }
  
  const html = renderToString(app, ctx)
  
  // 注入水合目标信息
  return html + `
    <script>
      window.__HYDRATION_TARGETS__ = ${JSON.stringify([...ctx.hydrationTargets])}
    </script>
  `
}

// 客户端
function partialHydrateFromServer(app: App, container: Element) {
  const targets = (window as any).__HYDRATION_TARGETS__ || []
  
  const partialHydration = createPartialHydration({
    selectors: targets,
    components: new Set(),
    skip: []
  })
  
  // 执行部分水合
  selectiveHydrate(container, [app._component], partialHydration)
}
```

## 小结

部分水合是一种重要的性能优化策略：

1. **选择性水合**：只水合需要交互的区域
2. **跳过静态内容**：减少不必要的 JavaScript 执行
3. **优先级控制**：关键区域优先水合
4. **事件委托**：未水合区域通过委托处理事件
5. **与 Island 架构配合**：实现更细粒度的水合控制

通过部分水合，可以显著提升首屏交互时间（TTI），特别是对于内容为主的网站。
