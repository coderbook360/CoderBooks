---
sidebar_position: 102
title: "性能分析"
---

# 性能分析

本章介绍 RxJS 应用的性能分析和优化。

## 性能指标

### 关键指标

1. **吞吐量**：单位时间处理的事件数
2. **延迟**：事件从发出到处理完成的时间
3. **内存占用**：Observable 链和订阅的内存消耗
4. **CPU 使用**：操作符处理的 CPU 时间

### 测量工具

```javascript
// 简单计时器
function measureTime(fn, label = 'Operation') {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  console.log(`${label}: ${duration.toFixed(2)}ms`)
  return result
}

// Observable 包装器
function measureObservable(source$, label = 'Stream') {
  const startTime = performance.now()
  let count = 0
  
  return source$.pipe(
    tap({
      next: () => count++,
      complete: () => {
        const duration = performance.now() - startTime
        console.log(`${label}: ${count} events in ${duration.toFixed(2)}ms`)
        console.log(`Throughput: ${(count / duration * 1000).toFixed(0)} events/sec`)
      }
    })
  )
}
```

## 常见性能问题

### 1. 订阅泄漏

```javascript
// ❌ 问题：未取消订阅导致内存泄漏
class Component {
  init() {
    interval(1000).subscribe(x => {
      this.update(x)
    })
  }
  
  destroy() {
    // 订阅仍在运行！
  }
}

// ✅ 解决方案
class Component {
  private subscription: Subscription
  
  init() {
    this.subscription = interval(1000).subscribe(x => {
      this.update(x)
    })
  }
  
  destroy() {
    this.subscription.unsubscribe()
  }
}

// ✅ 更好：使用 takeUntil
class Component {
  private destroy$ = new Subject<void>()
  
  init() {
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(x => {
      this.update(x)
    })
  }
  
  destroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
```

### 2. 重复订阅

```javascript
// ❌ 问题：每次调用都创建新订阅
function getData() {
  return fetchData().pipe(
    map(process)
  )
}

// 多次调用 = 多次请求
getData().subscribe(...)
getData().subscribe(...)

// ✅ 解决方案：共享订阅
const data$ = fetchData().pipe(
  map(process),
  shareReplay(1)
)

data$.subscribe(...)
data$.subscribe(...)  // 使用缓存
```

### 3. 过长的操作符链

```javascript
// ❌ 问题：过多中间操作符
source$.pipe(
  map(x => x + 1),
  map(x => x * 2),
  map(x => x - 1),
  filter(x => x > 0),
  filter(x => x < 100)
)

// ✅ 优化：合并操作
source$.pipe(
  map(x => (x + 1) * 2 - 1),
  filter(x => x > 0 && x < 100)
)
```

### 4. 同步大量数据

```javascript
// ❌ 问题：阻塞主线程
from(largeArray).pipe(
  map(heavyComputation)
).subscribe()

// ✅ 解决方案：使用调度器分批处理
from(largeArray).pipe(
  observeOn(asyncScheduler),
  map(heavyComputation)
).subscribe()

// 或自定义批处理
function batchProcess(items, batchSize, process) {
  return new Observable(subscriber => {
    let index = 0
    
    function processNext() {
      const batch = items.slice(index, index + batchSize)
      if (batch.length === 0) {
        subscriber.complete()
        return
      }
      
      batch.forEach(item => {
        subscriber.next(process(item))
      })
      
      index += batchSize
      setTimeout(processNext, 0)  // 让出主线程
    }
    
    processNext()
  })
}
```

## 内存分析

### 追踪订阅数量

```javascript
class SubscriptionTracker {
  private static count = 0
  private static subscriptions = new Map()
  
  static track(subscription, label = 'unknown') {
    this.count++
    const id = this.count
    this.subscriptions.set(id, { label, createdAt: Date.now() })
    
    const originalUnsubscribe = subscription.unsubscribe.bind(subscription)
    subscription.unsubscribe = () => {
      this.subscriptions.delete(id)
      originalUnsubscribe()
    }
    
    return subscription
  }
  
  static getActiveCount() {
    return this.subscriptions.size
  }
  
  static getActiveSubscriptions() {
    return Array.from(this.subscriptions.entries())
  }
  
  static report() {
    console.log(`Active subscriptions: ${this.subscriptions.size}`)
    this.subscriptions.forEach((info, id) => {
      console.log(`  #${id}: ${info.label} (${Date.now() - info.createdAt}ms)`)
    })
  }
}

// 使用
const sub = SubscriptionTracker.track(
  source$.subscribe(),
  'data-fetch'
)

// 定期检查
setInterval(() => {
  SubscriptionTracker.report()
}, 10000)
```

### 检测 Subject 泄漏

```javascript
class TrackedSubject extends Subject {
  private static instances = new Set()
  
  constructor() {
    super()
    TrackedSubject.instances.add(this)
  }
  
  complete() {
    super.complete()
    TrackedSubject.instances.delete(this)
  }
  
  static getActiveCount() {
    return this.instances.size
  }
}
```

### 内存快照对比

```javascript
// 使用浏览器 DevTools
// 1. 打开 Memory 面板
// 2. 操作前拍摄快照
// 3. 执行操作（如订阅/取消订阅）
// 4. 操作后拍摄快照
// 5. 对比两个快照，查找增长的对象

// 或使用代码记录
function trackMemory(label) {
  if (performance.memory) {
    console.log(`[${label}] Used JS Heap: ${
      (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)
    } MB`)
  }
}

trackMemory('Before')
// ... 操作
trackMemory('After')
```

## 性能优化技巧

### 1. 使用 share 避免重复订阅

```javascript
const source$ = fetchData().pipe(
  tap(() => console.log('Fetching...')),
  shareReplay(1)
)

// 多个订阅者共享同一个请求
source$.subscribe(data => console.log('A:', data))
source$.subscribe(data => console.log('B:', data))
```

### 2. debounce 减少处理频率

```javascript
// 输入事件可能每秒触发多次
fromEvent(input, 'input').pipe(
  debounceTime(300),
  switchMap(e => search(e.target.value))
)
```

### 3. 使用 distinctUntilChanged 避免重复处理

```javascript
state$.pipe(
  map(s => s.user),
  distinctUntilChanged((a, b) => a.id === b.id),
  tap(user => expensiveRender(user))
)
```

### 4. 选择正确的扁平化操作符

```javascript
// switchMap: 取消之前的请求（搜索）
input$.pipe(switchMap(term => search(term)))

// exhaustMap: 忽略新请求直到当前完成（提交表单）
click$.pipe(exhaustMap(() => submitForm()))

// mergeMap: 并行执行（批量操作）
items$.pipe(mergeMap(item => process(item), 5))  // 限制并发

// concatMap: 顺序执行（保持顺序）
items$.pipe(concatMap(item => orderedProcess(item)))
```

### 5. 延迟订阅

```javascript
// 使用 defer 延迟创建
const lazy$ = defer(() => {
  console.log('Creating observable...')
  return fetchData()
})

// 只在订阅时才创建
// lazy$  // 不订阅不执行

lazy$.subscribe()  // 现在才执行
```

### 6. 批量处理

```javascript
// 收集事件批量处理
source$.pipe(
  bufferTime(100),  // 每 100ms 收集一批
  filter(batch => batch.length > 0),
  tap(batch => batchProcess(batch))
)

// 或按数量
source$.pipe(
  bufferCount(10),
  tap(batch => batchProcess(batch))
)
```

## 性能测试

### 吞吐量测试

```javascript
function testThroughput(operatorPipeline, eventCount = 100000) {
  return new Promise(resolve => {
    let received = 0
    const start = performance.now()
    
    range(1, eventCount).pipe(
      ...operatorPipeline
    ).subscribe({
      next: () => received++,
      complete: () => {
        const duration = performance.now() - start
        const throughput = received / duration * 1000
        resolve({
          events: received,
          duration,
          throughput: `${throughput.toFixed(0)} events/sec`
        })
      }
    })
  })
}

// 测试不同操作符
async function benchmark() {
  console.log('map only:')
  console.log(await testThroughput([map(x => x * 2)]))
  
  console.log('map + filter:')
  console.log(await testThroughput([
    map(x => x * 2),
    filter(x => x % 2 === 0)
  ]))
  
  console.log('complex chain:')
  console.log(await testThroughput([
    map(x => x * 2),
    filter(x => x % 2 === 0),
    scan((acc, x) => acc + x, 0),
    take(10000)
  ]))
}
```

### 内存测试

```javascript
async function testMemory(iterations = 1000) {
  const initialMemory = performance.memory?.usedJSHeapSize || 0
  
  const subscriptions = []
  
  for (let i = 0; i < iterations; i++) {
    const sub = interval(100).pipe(
      map(x => ({ id: i, value: x }))
    ).subscribe()
    
    subscriptions.push(sub)
  }
  
  const afterSubscribe = performance.memory?.usedJSHeapSize || 0
  console.log(`Memory after ${iterations} subscriptions: ${
    ((afterSubscribe - initialMemory) / 1024).toFixed(2)
  } KB`)
  
  // 清理
  subscriptions.forEach(s => s.unsubscribe())
  
  // 等待 GC
  await new Promise(r => setTimeout(r, 1000))
  
  const afterCleanup = performance.memory?.usedJSHeapSize || 0
  console.log(`Memory after cleanup: ${
    ((afterCleanup - initialMemory) / 1024).toFixed(2)
  } KB`)
}
```

## 生产环境监控

### 性能指标收集

```javascript
class RxPerformanceMonitor {
  private metrics = {
    subscriptions: 0,
    unsubscriptions: 0,
    errors: 0,
    events: 0
  }
  
  wrapObservable(source$, name) {
    return new Observable(subscriber => {
      this.metrics.subscriptions++
      
      const subscription = source$.subscribe({
        next: (value) => {
          this.metrics.events++
          subscriber.next(value)
        },
        error: (err) => {
          this.metrics.errors++
          subscriber.error(err)
        },
        complete: () => {
          subscriber.complete()
        }
      })
      
      return () => {
        this.metrics.unsubscriptions++
        subscription.unsubscribe()
      }
    })
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      activeSubscriptions: this.metrics.subscriptions - this.metrics.unsubscriptions
    }
  }
  
  reset() {
    this.metrics = {
      subscriptions: 0,
      unsubscriptions: 0,
      errors: 0,
      events: 0
    }
  }
}

// 使用
const monitor = new RxPerformanceMonitor()

const tracked$ = monitor.wrapObservable(source$, 'data-stream')
tracked$.subscribe()

// 定期上报
setInterval(() => {
  const metrics = monitor.getMetrics()
  console.log('RxJS Metrics:', metrics)
  // 发送到监控系统
}, 60000)
```

## 本章小结

- 订阅泄漏是最常见的性能问题
- 使用 share 和 shareReplay 避免重复订阅
- 选择正确的扁平化操作符优化场景
- debounce 和 distinctUntilChanged 减少处理频率
- 建立性能监控追踪生产环境问题
- 定期进行性能测试发现回归

下一章学习调试技巧。
