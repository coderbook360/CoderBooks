---
sidebar_position: 19
title: 组合 Subscription
---

# 组合 Subscription

当应用变得复杂，我们需要管理多个订阅。本章探讨如何优雅地组合和管理多个 Subscription。

## 问题场景

一个组件可能有多个订阅：

```typescript
class DashboardComponent {
  constructor() {
    // 多个独立的订阅
    dataService.getUsers().subscribe(users => this.users = users)
    dataService.getOrders().subscribe(orders => this.orders = orders)
    eventBus.on('refresh').subscribe(() => this.refresh())
    timer$.subscribe(() => this.tick())
  }

  destroy() {
    // 如何清理所有订阅？
  }
}
```

## 解决方案一：手动管理

最原始的方式：

```typescript
class DashboardComponent {
  private usersSub!: Subscription
  private ordersSub!: Subscription
  private refreshSub!: Subscription
  private timerSub!: Subscription

  constructor() {
    this.usersSub = dataService.getUsers().subscribe(...)
    this.ordersSub = dataService.getOrders().subscribe(...)
    this.refreshSub = eventBus.on('refresh').subscribe(...)
    this.timerSub = timer$.subscribe(...)
  }

  destroy() {
    this.usersSub.unsubscribe()
    this.ordersSub.unsubscribe()
    this.refreshSub.unsubscribe()
    this.timerSub.unsubscribe()
  }
}
```

**问题**：

1. 代码冗长
2. 容易遗漏
3. 难以维护

## 解决方案二：数组管理

```typescript
class DashboardComponent {
  private subscriptions: Subscription[] = []

  constructor() {
    this.subscriptions.push(
      dataService.getUsers().subscribe(...),
      dataService.getOrders().subscribe(...),
      eventBus.on('refresh').subscribe(...),
      timer$.subscribe(...)
    )
  }

  destroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }
}
```

**改进**：更简洁，但仍有重复代码。

## 解决方案三：使用 Subscription.add()

**推荐方式**：

```typescript
class DashboardComponent {
  private subscription = new Subscription()

  constructor() {
    this.subscription.add(
      dataService.getUsers().subscribe(...)
    )
    this.subscription.add(
      dataService.getOrders().subscribe(...)
    )
    this.subscription.add(
      eventBus.on('refresh').subscribe(...)
    )
    this.subscription.add(
      timer$.subscribe(...)
    )
  }

  destroy() {
    this.subscription.unsubscribe()  // 一次性清理所有
  }
}
```

**优点**：

1. 统一管理入口
2. 一次 unsubscribe 清理全部
3. 支持嵌套和动态添加

## 链式添加

`add()` 方法可以链式调用：

```typescript
const composite = new Subscription()

composite
  .add(sub1)
  .add(sub2)
  .add(() => console.log('清理'))
```

或者利用返回值：

```typescript
// 注意：add() 返回 void，但我们可以这样写
const composite = new Subscription()
;[sub1, sub2, sub3].forEach(s => composite.add(s))
```

## 嵌套 Subscription

Subscription 可以嵌套，形成树形结构：

```typescript
// 页面级
const pageSubscription = new Subscription()

// 组件级
const headerSubscription = new Subscription()
const mainSubscription = new Subscription()
const footerSubscription = new Subscription()

pageSubscription.add(headerSubscription)
pageSubscription.add(mainSubscription)
pageSubscription.add(footerSubscription)

// 组件内的订阅
headerSubscription.add(userService.getUser().subscribe(...))
mainSubscription.add(dataService.getData().subscribe(...))

// 离开页面时
pageSubscription.unsubscribe()  // 清理所有
```

## 动态订阅管理

### 添加新订阅

```typescript
class LiveDataComponent {
  private subscription = new Subscription()

  addDataSource(source$: Observable<any>) {
    this.subscription.add(
      source$.subscribe(data => this.handleData(data))
    )
  }

  destroy() {
    this.subscription.unsubscribe()
  }
}
```

### 移除特定订阅

```typescript
class LiveDataComponent {
  private subscription = new Subscription()
  private sourceSubs = new Map<string, Subscription>()

  addDataSource(id: string, source$: Observable<any>) {
    const sub = source$.subscribe(data => this.handleData(id, data))
    this.sourceSubs.set(id, sub)
    this.subscription.add(sub)
  }

  removeDataSource(id: string) {
    const sub = this.sourceSubs.get(id)
    if (sub) {
      this.subscription.remove(sub)
      sub.unsubscribe()
      this.sourceSubs.delete(id)
    }
  }

  destroy() {
    this.subscription.unsubscribe()
  }
}
```

## 与框架集成

### Angular

```typescript
import { Component, OnDestroy } from '@angular/core'
import { Subscription } from 'rxjs'

@Component({...})
export class MyComponent implements OnDestroy {
  private subscription = new Subscription()

  ngOnInit() {
    this.subscription.add(
      this.dataService.getData().subscribe(...)
    )
  }

  ngOnDestroy() {
    this.subscription.unsubscribe()
  }
}
```

### React（使用 useEffect）

```typescript
import { useEffect } from 'react'
import { Subscription } from 'rxjs'

function MyComponent() {
  useEffect(() => {
    const subscription = new Subscription()

    subscription.add(
      dataService.getData().subscribe(...)
    )

    return () => subscription.unsubscribe()
  }, [])

  return <div>...</div>
}
```

### Vue 3（使用 Composition API）

```typescript
import { onMounted, onUnmounted } from 'vue'
import { Subscription } from 'rxjs'

export default {
  setup() {
    const subscription = new Subscription()

    onMounted(() => {
      subscription.add(
        dataService.getData().subscribe(...)
      )
    })

    onUnmounted(() => {
      subscription.unsubscribe()
    })
  }
}
```

## 工具函数

创建一些辅助函数简化使用：

```typescript
/**
 * 创建组合 Subscription 并添加多个订阅
 */
function combine(...subscriptions: Subscription[]): Subscription {
  const composite = new Subscription()
  subscriptions.forEach(sub => composite.add(sub))
  return composite
}

// 使用
const allSubs = combine(sub1, sub2, sub3)
allSubs.unsubscribe()
```

```typescript
/**
 * 为 Observable 创建一个可管理的订阅
 */
function managedSubscribe<T>(
  parent: Subscription,
  source$: Observable<T>,
  observer: Partial<Observer<T>>
): Subscription {
  const sub = source$.subscribe(observer)
  parent.add(sub)
  return sub
}

// 使用
const parent = new Subscription()
managedSubscribe(parent, data$, { next: console.log })
managedSubscribe(parent, events$, { next: handleEvent })
```

## 测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Subscription } from './Subscription'

describe('组合 Subscription', () => {
  it('应该一次性取消所有子订阅', () => {
    const teardown1 = vi.fn()
    const teardown2 = vi.fn()
    const teardown3 = vi.fn()

    const parent = new Subscription()
    parent.add(new Subscription(teardown1))
    parent.add(new Subscription(teardown2))
    parent.add(new Subscription(teardown3))

    parent.unsubscribe()

    expect(teardown1).toHaveBeenCalled()
    expect(teardown2).toHaveBeenCalled()
    expect(teardown3).toHaveBeenCalled()
  })

  it('嵌套 Subscription 应该级联取消', () => {
    const leafTeardown = vi.fn()

    const grandparent = new Subscription()
    const parent = new Subscription()
    const child = new Subscription(leafTeardown)

    grandparent.add(parent)
    parent.add(child)

    grandparent.unsubscribe()

    expect(leafTeardown).toHaveBeenCalled()
    expect(parent.closed).toBe(true)
    expect(child.closed).toBe(true)
  })

  it('移除后不应该级联取消', () => {
    const teardown = vi.fn()

    const parent = new Subscription()
    const child = new Subscription(teardown)

    parent.add(child)
    parent.remove(child)
    parent.unsubscribe()

    expect(teardown).not.toHaveBeenCalled()
    expect(child.closed).toBe(false)
  })

  it('动态添加应该正确管理', () => {
    const parent = new Subscription()

    const sub1 = new Subscription(() => console.log('1'))
    const sub2 = new Subscription(() => console.log('2'))

    parent.add(sub1)
    // 模拟稍后添加
    parent.add(sub2)

    parent.unsubscribe()

    expect(sub1.closed).toBe(true)
    expect(sub2.closed).toBe(true)
  })
})
```

## 最佳实践

### 1. 每个组件/模块一个根 Subscription

```typescript
class MyComponent {
  private readonly subscription = new Subscription()  // 唯一的根
  
  // 所有订阅都添加到这个根
}
```

### 2. 在适当的生命周期清理

```typescript
// 组件销毁时
ngOnDestroy() { this.subscription.unsubscribe() }

// Effect 清理时
return () => subscription.unsubscribe()

// 组件卸载时
onUnmounted(() => subscription.unsubscribe())
```

### 3. 避免在循环中创建独立订阅

```typescript
// ❌ 每次循环创建独立订阅，难以管理
items.forEach(item => {
  item.data$.subscribe(...)
})

// ✅ 统一管理
items.forEach(item => {
  this.subscription.add(item.data$.subscribe(...))
})
```

### 4. 考虑使用 takeUntil 替代

在某些场景，`takeUntil` 可能更优雅：

```typescript
private destroy$ = new Subject<void>()

ngOnInit() {
  data$.pipe(
    takeUntil(this.destroy$)
  ).subscribe(...)
}

ngOnDestroy() {
  this.destroy$.next()
  this.destroy$.complete()
}
```

## 本章小结

本章探讨了 Subscription 组合管理：

- **问题**：多个订阅难以统一管理
- **方案**：使用 Subscription.add() 组合
- **嵌套**：支持树形结构，级联取消
- **动态**：支持运行时添加/移除
- **框架集成**：Angular、React、Vue 示例
- **最佳实践**：一个根、生命周期清理、避免独立订阅

下一章，我们将学习取消订阅的边界情况和注意事项。

---

**思考题**：

1. Subscription.add() 和 Array.push() 管理订阅有什么本质区别？
2. 如果子 Subscription 比父 Subscription 先取消，会发生什么？
3. 使用 takeUntil 和使用 Subscription 组合有什么区别？各适用什么场景？
