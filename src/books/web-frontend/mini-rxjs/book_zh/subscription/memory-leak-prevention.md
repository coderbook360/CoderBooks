# 内存泄漏防护与最佳实践

内存泄漏是 RxJS 应用中最常见的问题之一。本章讲解如何预防和检测内存泄漏。

## 什么是内存泄漏？

首先要问一个问题：**RxJS 中的内存泄漏是如何产生的？**

```typescript
// ❌ 内存泄漏示例
class Component {
  ngOnInit() {
    interval(1000).subscribe(v => {
      console.log(v)
      this.updateView(v) // 持有组件引用
    })
  }
  
  ngOnDestroy() {
    // 忘记取消订阅
    // interval 持续运行
    // 持有组件引用导致无法回收
  }
}
```

**泄漏原因**：
1. 忘记调用 `unsubscribe()`
2. Observable 持续运行
3. 回调函数持有组件引用
4. 组件被销毁但内存无法释放

## 常见泄漏场景

### 场景1：定时器未清理

```typescript
// ❌ 泄漏
interval(1000).subscribe(console.log)

// ✅ 正确
const sub = interval(1000).subscribe(console.log)
// 在适当时机：
sub.unsubscribe()
```

### 场景2：事件监听未移除

```typescript
// ❌ 泄漏
fromEvent(document, 'click').subscribe(handler)

// ✅ 正确
const sub = fromEvent(document, 'click').subscribe(handler)
sub.unsubscribe() // 移除事件监听
```

### 场景3：HTTP 请求未取消

```typescript
// ❌ 泄漏（组件已销毁但请求仍在等待）
http.get('/api/data').subscribe(data => {
  this.data = data // 持有组件引用
})

// ✅ 正确
const sub = http.get('/api/data').subscribe(data => {
  this.data = data
})
// 组件销毁时：
sub.unsubscribe()
```

### 场景4：Subject 订阅者积累

```typescript
// ❌ 泄漏
const subject = new Subject()

// 多次订阅但从不取消
component1.init = () => subject.subscribe(handler1)
component2.init = () => subject.subscribe(handler2)
component3.init = () => subject.subscribe(handler3)

// Subject 持有所有订阅者引用
```

## 防护策略

### 策略1：组合 Subscription

```typescript
class Component {
  private subscriptions = new Subscription()
  
  ngOnInit() {
    // 所有订阅添加到组合 Subscription
    this.subscriptions.add(
      observable1.subscribe(handler1)
    )
    
    this.subscriptions.add(
      observable2.subscribe(handler2)
    )
    
    this.subscriptions.add(
      observable3.subscribe(handler3)
    )
  }
  
  ngOnDestroy() {
    // 一次性清理所有
    this.subscriptions.unsubscribe()
  }
}
```

### 策略2：takeUntil 模式

```typescript
class Component {
  private destroy$ = new Subject<void>()
  
  ngOnInit() {
    observable1
      .pipe(takeUntil(this.destroy$))
      .subscribe(handler1)
    
    observable2
      .pipe(takeUntil(this.destroy$))
      .subscribe(handler2)
  }
  
  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
```

### 策略3：使用自动取消操作符

```typescript
// take: 自动完成
observable.pipe(take(1)).subscribe(handler)

// first: 自动完成
observable.pipe(first()).subscribe(handler)

// timeout: 超时自动取消
observable.pipe(timeout(5000)).subscribe(handler)
```

### 策略4：使用 async 管道（Angular）

```typescript
// ✅ 模板中使用 async 管道，自动管理订阅
<div *ngIf="data$ | async as data">
  {{ data }}
</div>

// 组件中只声明 Observable
class Component {
  data$ = http.get('/api/data')
}
```

## 检测内存泄漏

### 方法1：Chrome DevTools

```typescript
// 1. 打开 Chrome DevTools
// 2. Memory tab → Take Heap Snapshot
// 3. 执行导致泄漏的操作
// 4. 再次 Take Heap Snapshot
// 5. 对比两次快照，查找持续增长的对象
```

### 方法2：自定义检测工具

```typescript
class SubscriptionTracker {
  private activeSubscriptions = new Set<Subscription>()
  
  track(subscription: Subscription): Subscription {
    this.activeSubscriptions.add(subscription)
    
    const originalUnsubscribe = subscription.unsubscribe.bind(subscription)
    
    subscription.unsubscribe = () => {
      this.activeSubscriptions.delete(subscription)
      originalUnsubscribe()
    }
    
    return subscription
  }
  
  getActiveCount(): number {
    return this.activeSubscriptions.size
  }
  
  reportLeaks(): void {
    if (this.activeSubscriptions.size > 0) {
      console.warn(`检测到 ${this.activeSubscriptions.size} 个未清理的订阅`)
    }
  }
}

// 使用
const tracker = new SubscriptionTracker()

const sub = tracker.track(
  observable.subscribe(handler)
)

// 组件销毁时检查
component.onDestroy = () => {
  tracker.reportLeaks()
}
```

### 方法3：Subscription 计数

```typescript
class SubscriptionMonitor {
  private static count = 0
  
  static subscribe(observable: Observable<any>): Subscription {
    this.count++
    console.log(`订阅数: ${this.count}`)
    
    const sub = observable.subscribe()
    
    const originalUnsubscribe = sub.unsubscribe.bind(sub)
    sub.unsubscribe = () => {
      this.count--
      console.log(`订阅数: ${this.count}`)
      originalUnsubscribe()
    }
    
    return sub
  }
  
  static getCount(): number {
    return this.count
  }
}
```

## 最佳实践

### 实践1：始终取消订阅

```typescript
// ❌ 错误
class Component {
  ngOnInit() {
    observable.subscribe(handler)
  }
}

// ✅ 正确
class Component {
  private subscription?: Subscription
  
  ngOnInit() {
    this.subscription = observable.subscribe(handler)
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe()
  }
}
```

### 实践2：使用 takeUntil

```typescript
class Component {
  private destroy$ = new Subject<void>()
  
  ngOnInit() {
    observable
      .pipe(takeUntil(this.destroy$))
      .subscribe(handler)
  }
  
  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
```

### 实践3：避免在闭包中持有引用

```typescript
// ❌ 持有组件引用
observable.subscribe(value => {
  this.property = value // 闭包持有 this
})

// ✅ 使用弱引用或及时清理
const sub = observable.subscribe(value => {
  this.property = value
})

// 组件销毁时取消
sub.unsubscribe()
```

### 实践4：使用完成操作符

```typescript
// take: 只取前n个值
observable.pipe(take(5)).subscribe(handler)

// first: 只取第一个值
observable.pipe(first()).subscribe(handler)

// takeWhile: 条件满足时继续
observable.pipe(
  takeWhile(value => value < 100)
).subscribe(handler)
```

### 实践5：Subject 及时清理

```typescript
class DataService {
  private dataSubject = new Subject<Data>()
  
  destroy() {
    this.dataSubject.complete() // 完成 Subject
    // 所有订阅者自动清理
  }
}
```

## 性能监控

```typescript
class PerformanceMonitor {
  private subscriptionTimes = new Map<Subscription, number>()
  
  trackSubscription(sub: Subscription): void {
    this.subscriptionTimes.set(sub, Date.now())
  }
  
  checkLongRunning(): void {
    const now = Date.now()
    const threshold = 60000 // 1分钟
    
    for (const [sub, startTime] of this.subscriptionTimes) {
      if (now - startTime > threshold) {
        console.warn('检测到长时间运行的订阅')
      }
    }
  }
}
```

## 调试技巧

### 技巧1：标记订阅

```typescript
class Component {
  private subscriptions = new Map<string, Subscription>()
  
  addSubscription(name: string, sub: Subscription): void {
    this.subscriptions.set(name, sub)
  }
  
  ngOnDestroy() {
    console.log('活动订阅:', Array.from(this.subscriptions.keys()))
    
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe()
    }
  }
}
```

### 技巧2：订阅栈追踪

```typescript
function debugSubscribe<T>(observable: Observable<T>): Subscription {
  const stack = new Error().stack
  
  return observable.subscribe({
    next: value => console.log('Value:', value, 'Stack:', stack),
    error: err => console.error('Error:', err, 'Stack:', stack),
    complete: () => console.log('Complete', 'Stack:', stack)
  })
}
```

## 工具推荐

### 1. rxjs-spy

```typescript
import { create } from 'rxjs-spy'

const spy = create()

// 标记 Observable
observable.pipe(tag('my-observable')).subscribe()

// 检查活动订阅
spy.show()

// 日志输出
spy.log('my-observable')
```

### 2. RxJS DevTools

浏览器扩展，可视化 Observable 执行流程。

### 3. 自定义 Linter

```typescript
// ESLint 规则：检测未取消的订阅
{
  rules: {
    'rxjs/no-ignored-subscribe': 'error',
    'rxjs/no-unsafe-takeuntil': 'error'
  }
}
```

## 总结

**内存泄漏的根源**：
- 忘记取消订阅
- Observable 持续运行
- 持有不必要的引用

**防护策略**：
- 组合 Subscription 统一管理
- takeUntil 模式自动取消
- 使用自动完成操作符
- async 管道自动管理

**检测方法**：
- Chrome DevTools Heap Snapshot
- 自定义订阅追踪器
- 订阅计数监控

**最佳实践**：
- 始终在组件销毁时取消订阅
- 使用 takeUntil 或组合 Subscription
- Subject 使用完毕后调用 complete()
- 使用 Linter 检测潜在问题

理解内存泄漏的成因和防护策略，是编写健壮 RxJS 应用的基础。
