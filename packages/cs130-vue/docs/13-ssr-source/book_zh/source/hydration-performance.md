# hydrationPerformance 水合性能

水合性能直接影响首屏交互时间（TTI）。本章分析水合性能的关键指标、优化策略和监控方法。

## 性能指标

```typescript
interface HydrationMetrics {
  // 水合开始时间
  startTime: number
  
  // 水合完成时间
  endTime: number
  
  // 总耗时
  duration: number
  
  // 组件数量
  componentCount: number
  
  // DOM 节点数量
  nodeCount: number
  
  // JavaScript 执行时间
  scriptTime: number
  
  // 阻塞时间
  blockingTime: number
}
```

## 性能测量

```typescript
function measureHydration(
  hydrate: () => void
): HydrationMetrics {
  const metrics: Partial<HydrationMetrics> = {}
  
  // 记录开始
  metrics.startTime = performance.now()
  
  // 计数器
  let componentCount = 0
  let nodeCount = 0
  
  // 包装水合函数
  const originalHydrateNode = hydrateNode
  
  // @ts-ignore
  hydrateNode = (node, vnode, parent, optimized) => {
    nodeCount++
    if (vnode.component) componentCount++
    return originalHydrateNode(node, vnode, parent, optimized)
  }
  
  // 执行水合
  hydrate()
  
  // 恢复原函数
  // @ts-ignore
  hydrateNode = originalHydrateNode
  
  // 记录结束
  metrics.endTime = performance.now()
  metrics.duration = metrics.endTime - metrics.startTime
  metrics.componentCount = componentCount
  metrics.nodeCount = nodeCount
  
  return metrics as HydrationMetrics
}
```

## Long Task 分析

水合可能产生长任务：

```typescript
function monitorLongTasks() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {  // 超过 50ms
          console.warn('[Long Task]', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          })
        }
      }
    })
    
    observer.observe({ entryTypes: ['longtask'] })
  }
}
```

## 分块水合

避免长任务的关键策略：

```typescript
async function chunkedHydration(
  nodes: Array<{ node: Node; vnode: VNode }>,
  chunkSize: number = 10
) {
  const chunks: Array<typeof nodes> = []
  
  // 分块
  for (let i = 0; i < nodes.length; i += chunkSize) {
    chunks.push(nodes.slice(i, i + chunkSize))
  }
  
  // 逐块执行
  for (const chunk of chunks) {
    // 执行一批
    for (const { node, vnode } of chunk) {
      hydrateNode(node, vnode, null, false)
    }
    
    // 让出主线程
    await yieldToMain()
  }
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      (window as any).scheduler.yield().then(resolve)
    } else {
      setTimeout(resolve, 0)
    }
  })
}
```

## 优先级调度

```typescript
interface HydrationTask {
  node: Node
  vnode: VNode
  priority: 'critical' | 'high' | 'normal' | 'low'
}

function priorityScheduler(tasks: HydrationTask[]) {
  // 按优先级排序
  const sorted = tasks.sort((a, b) => {
    const order = { critical: 0, high: 1, normal: 2, low: 3 }
    return order[a.priority] - order[b.priority]
  })
  
  let index = 0
  
  function processNext(deadline: IdleDeadline) {
    while (index < sorted.length) {
      const task = sorted[index]
      
      // critical 任务立即执行
      if (task.priority === 'critical') {
        hydrateNode(task.node, task.vnode, null, false)
        index++
        continue
      }
      
      // 其他任务检查时间
      if (deadline.timeRemaining() < 5) {
        requestIdleCallback(processNext)
        return
      }
      
      hydrateNode(task.node, task.vnode, null, false)
      index++
    }
  }
  
  // 先处理所有 critical
  while (index < sorted.length && sorted[index].priority === 'critical') {
    hydrateNode(sorted[index].node, sorted[index].vnode, null, false)
    index++
  }
  
  // 其余使用空闲时间
  if (index < sorted.length) {
    requestIdleCallback(processNext)
  }
}
```

## 内存优化

```typescript
function memoryEfficientHydration(container: Element, vnode: VNode) {
  // 使用 WeakMap 避免内存泄漏
  const nodeMap = new WeakMap<Node, VNode>()
  
  // 分阶段处理
  // Phase 1: 建立映射
  function buildMap(node: Node, vnode: VNode) {
    nodeMap.set(node, vnode)
    
    if (vnode.children && Array.isArray(vnode.children)) {
      let childNode = node.firstChild
      for (const child of vnode.children as VNode[]) {
        if (childNode) {
          buildMap(childNode, child)
          childNode = childNode.nextSibling
        }
      }
    }
  }
  
  buildMap(container.firstChild!, vnode)
  
  // Phase 2: 执行水合（可以分批）
  function hydrateFromMap(node: Node) {
    const vnode = nodeMap.get(node)
    if (vnode) {
      attachEvents(node as Element, vnode)
      attachRefs(node as Element, vnode)
    }
    
    let child = node.firstChild
    while (child) {
      hydrateFromMap(child)
      child = child.nextSibling
    }
  }
  
  hydrateFromMap(container.firstChild!)
}
```

## 避免重复工作

```typescript
// 缓存规范化结果
const classCache = new Map<string, string>()

function normalizeClassCached(value: unknown): string {
  const key = JSON.stringify(value)
  
  if (classCache.has(key)) {
    return classCache.get(key)!
  }
  
  const result = normalizeClass(value)
  classCache.set(key, result)
  
  return result
}

// 使用 DocumentFragment 批量操作
function batchDOMOperations(operations: Array<() => void>) {
  // 触发一次重排
  const dummy = document.body.offsetHeight
  
  // 批量执行
  for (const op of operations) {
    op()
  }
}
```

## Web Vitals 影响

水合对 Core Web Vitals 的影响：

```typescript
interface WebVitalsImpact {
  // Total Blocking Time - 水合造成的阻塞
  tbt: number
  
  // First Input Delay - 首次输入延迟
  fid: number
  
  // Interaction to Next Paint - 交互到下一帧
  inp: number
}

function measureWebVitalsImpact(): WebVitalsImpact {
  const impact: WebVitalsImpact = {
    tbt: 0,
    fid: 0,
    inp: 0
  }
  
  // 监听 FID
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      impact.fid = (entry as PerformanceEventTiming).processingStart - entry.startTime
    }
  }).observe({ type: 'first-input', buffered: true })
  
  // 计算 TBT
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 50) {
        impact.tbt += entry.duration - 50
      }
    }
  }).observe({ type: 'longtask', buffered: true })
  
  return impact
}
```

## 性能预算

```typescript
interface PerformanceBudget {
  maxHydrationTime: number      // 最大水合时间
  maxLongTasks: number          // 最大长任务数
  maxBlockingTime: number       // 最大阻塞时间
  maxComponentCount: number     // 最大组件数
}

const defaultBudget: PerformanceBudget = {
  maxHydrationTime: 200,    // 200ms
  maxLongTasks: 2,
  maxBlockingTime: 100,     // 100ms
  maxComponentCount: 50
}

function checkBudget(
  metrics: HydrationMetrics,
  budget: PerformanceBudget
): string[] {
  const violations: string[] = []
  
  if (metrics.duration > budget.maxHydrationTime) {
    violations.push(
      `Hydration time ${metrics.duration}ms exceeds budget ${budget.maxHydrationTime}ms`
    )
  }
  
  if (metrics.blockingTime > budget.maxBlockingTime) {
    violations.push(
      `Blocking time ${metrics.blockingTime}ms exceeds budget ${budget.maxBlockingTime}ms`
    )
  }
  
  if (metrics.componentCount > budget.maxComponentCount) {
    violations.push(
      `Component count ${metrics.componentCount} exceeds budget ${budget.maxComponentCount}`
    )
  }
  
  return violations
}
```

## 渐进式水合策略

```typescript
function progressiveHydration(app: App, container: Element) {
  const vnode = app._component
  
  // 1. 关键路径优先
  const criticalSelectors = [
    'header',
    'nav',
    '[data-critical]'
  ]
  
  for (const selector of criticalSelectors) {
    const el = container.querySelector(selector)
    if (el) {
      const criticalVNode = findVNodeForElement(el, vnode)
      if (criticalVNode) {
        hydrateNode(el.firstChild!, criticalVNode, null, false)
      }
    }
  }
  
  // 2. 可见区域次之
  requestIdleCallback(() => {
    const viewportElements = getElementsInViewport(container)
    for (const el of viewportElements) {
      const vn = findVNodeForElement(el, vnode)
      if (vn && !isHydrated(el)) {
        hydrateNode(el.firstChild!, vn, null, false)
      }
    }
  })
  
  // 3. 其余空闲处理
  requestIdleCallback(() => {
    hydrateRemaining(container, vnode)
  }, { timeout: 5000 })
}
```

## 性能监控仪表盘

```typescript
function createHydrationDashboard() {
  const data = {
    history: [] as HydrationMetrics[],
    current: null as HydrationMetrics | null,
    budget: defaultBudget
  }
  
  return {
    record(metrics: HydrationMetrics) {
      data.current = metrics
      data.history.push(metrics)
      
      // 检查预算
      const violations = checkBudget(metrics, data.budget)
      if (violations.length > 0) {
        console.warn('[Hydration Budget Exceeded]', violations)
      }
    },
    
    getStats() {
      if (data.history.length === 0) return null
      
      const durations = data.history.map(m => m.duration)
      
      return {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p50: percentile(durations, 50),
        p90: percentile(durations, 90),
        p99: percentile(durations, 99)
      }
    },
    
    report() {
      console.group('[Hydration Performance Report]')
      console.log('Current:', data.current)
      console.log('Stats:', this.getStats())
      console.log('History:', data.history)
      console.groupEnd()
    }
  }
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[index]
}
```

## 生产环境优化

```typescript
// 生产环境的精简水合
function productionHydrate(container: Element, vnode: VNode) {
  // 禁用开发模式检查
  const __DEV__ = false
  
  // 跳过不必要的验证
  const skipValidation = true
  
  // 使用快速路径
  hydrateNodeFast(container.firstChild!, vnode)
}

function hydrateNodeFast(node: Node, vnode: VNode): Node | null {
  // 最小化操作
  vnode.el = node
  
  // 只附加事件和 ref
  if (typeof vnode.type === 'string') {
    attachEventsFast(node as Element, vnode.props)
    attachRefFast(node as Element, vnode.ref)
  }
  
  // 递归处理子节点
  if (vnode.children && node.firstChild) {
    let childNode: Node | null = node.firstChild
    const children = vnode.children as VNode[]
    
    for (let i = 0; i < children.length && childNode; i++) {
      childNode = hydrateNodeFast(childNode, children[i])
    }
  }
  
  return node.nextSibling
}
```

## 小结

水合性能优化的关键策略：

1. **分块执行**：避免长任务阻塞主线程
2. **优先级调度**：关键交互优先水合
3. **惰性加载**：非关键内容延迟水合
4. **内存优化**：避免不必要的对象创建
5. **缓存复用**：缓存规范化结果
6. **监控预算**：设定性能指标，持续监控

良好的水合性能是 SSR 应用成功的关键，直接影响用户体验和业务指标。
