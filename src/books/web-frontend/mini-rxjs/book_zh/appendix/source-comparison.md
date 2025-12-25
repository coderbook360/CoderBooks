---
sidebar_position: 105
title: "源码对照分析"
---

# 源码对照分析

本章对比 Mini RxJS 与官方 RxJS 的实现差异。

## Observable 实现对比

### Mini RxJS

```typescript
class Observable<T> {
  constructor(private subscribe: SubscribeFunction<T>) {}
  
  subscribe(observer?: Partial<Observer<T>>): Subscription {
    const subscriber = new Subscriber(observer)
    const cleanup = this.subscribe(subscriber)
    return new Subscription(() => {
      subscriber.closed = true
      cleanup?.()
    })
  }
  
  pipe(...operators: OperatorFunction<any, any>[]): Observable<any> {
    return operators.reduce((obs, op) => op(obs), this)
  }
}
```

### RxJS 源码

```typescript
// 简化的核心逻辑
class Observable<T> {
  constructor(subscribe?: (subscriber: Subscriber<T>) => TeardownLogic) {
    if (subscribe) {
      this._subscribe = subscribe
    }
  }
  
  subscribe(observerOrNext?: Partial<Observer<T>> | ((value: T) => void)): Subscription {
    const subscriber = observerOrNext instanceof Subscriber
      ? observerOrNext
      : new SafeSubscriber(observerOrNext)
    
    // 错误处理和上下文绑定
    const { operator, source } = this
    subscriber.add(
      operator
        ? operator.call(subscriber, source)
        : source
          ? this._subscribe(subscriber)
          : this._trySubscribe(subscriber)
    )
    
    return subscriber
  }
  
  pipe(...operations: OperatorFunction<any, any>[]): Observable<any> {
    return pipeFromArray(operations)(this)
  }
}
```

**主要差异**：
| 方面 | Mini RxJS | RxJS |
|------|-----------|------|
| Subscriber | 简单包装 | SafeSubscriber 安全包装 |
| 错误处理 | 基本 | 完整的错误边界 |
| operator 支持 | 无 | 保留旧版 operator 模式 |
| lift 机制 | 无 | 支持（已废弃） |

## Subscriber 实现对比

### Mini RxJS

```typescript
class Subscriber<T> implements Observer<T> {
  closed = false
  
  constructor(private observer?: Partial<Observer<T>>) {}
  
  next(value: T): void {
    if (!this.closed) {
      this.observer?.next?.(value)
    }
  }
  
  error(err: any): void {
    if (!this.closed) {
      this.closed = true
      this.observer?.error?.(err)
    }
  }
  
  complete(): void {
    if (!this.closed) {
      this.closed = true
      this.observer?.complete?.()
    }
  }
}
```

### RxJS 源码

```typescript
class SafeSubscriber<T> extends Subscriber<T> {
  constructor(observerOrNext?: Partial<Observer<T>> | ((value: T) => void)) {
    super()
    // 支持多种参数形式
    if (isFunction(observerOrNext)) {
      this.destination = {
        next: observerOrNext as (value: T) => void,
        error: /* ... */,
        complete: /* ... */
      }
    } else if (observerOrNext) {
      this.destination = {
        next: observerOrNext.next?.bind(observerOrNext),
        error: observerOrNext.error?.bind(observerOrNext),
        complete: observerOrNext.complete?.bind(observerOrNext)
      }
    }
  }
  
  next(value: T): void {
    if (this.isStopped) return
    try {
      this.destination.next?.(value)
    } catch (err) {
      this._handleUnhandledError(err)
    }
  }
}
```

**主要差异**：
- RxJS 使用 `SafeSubscriber` 包装，自动处理异常
- RxJS 支持多种参数形式（函数、对象）
- RxJS 绑定 `this` 上下文

## map 操作符对比

### Mini RxJS

```typescript
function map<T, R>(project: (value: T, index: number) => R) {
  return (source: Observable<T>): Observable<R> => {
    return new Observable(subscriber => {
      let index = 0
      return source.subscribe({
        next: value => {
          try {
            subscriber.next(project(value, index++))
          } catch (err) {
            subscriber.error(err)
          }
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })
    })
  }
}
```

### RxJS 源码

```typescript
function map<T, R>(
  project: (value: T, index: number) => R,
  thisArg?: any
): OperatorFunction<T, R> {
  return operate((source, subscriber) => {
    let index = 0
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => {
          subscriber.next(project.call(thisArg, value, index++))
        }
      )
    )
  })
}

// operate 辅助函数
function operate<T, R>(
  init: (liftedSource: Observable<T>, subscriber: Subscriber<R>) => void
): OperatorFunction<T, R> {
  return (source: Observable<T>) => 
    new Observable((subscriber) => init(source, subscriber))
}
```

**主要差异**：
- RxJS 使用 `operate` 抽象通用逻辑
- RxJS 使用 `createOperatorSubscriber` 统一订阅处理
- RxJS 支持 `thisArg` 参数

## switchMap 对比

### Mini RxJS

```typescript
function switchMap<T, R>(project: (value: T) => Observable<R>) {
  return (source: Observable<T>): Observable<R> => {
    return new Observable(subscriber => {
      let innerSub: Subscription | null = null
      let outerComplete = false
      
      const checkComplete = () => {
        if (outerComplete && !innerSub) {
          subscriber.complete()
        }
      }
      
      const outerSub = source.subscribe({
        next: value => {
          innerSub?.unsubscribe()
          innerSub = project(value).subscribe({
            next: v => subscriber.next(v),
            error: e => subscriber.error(e),
            complete: () => {
              innerSub = null
              checkComplete()
            }
          })
        },
        error: e => subscriber.error(e),
        complete: () => {
          outerComplete = true
          checkComplete()
        }
      })
      
      return () => {
        innerSub?.unsubscribe()
        outerSub.unsubscribe()
      }
    })
  }
}
```

### RxJS 源码

```typescript
function switchMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  resultSelector?: /* 已废弃 */
): OperatorFunction<T, R> {
  return operate((source, subscriber) => {
    let innerSubscriber: Subscriber<R> | null = null
    let index = 0
    let isComplete = false
    
    const checkComplete = () => isComplete && !innerSubscriber && subscriber.complete()
    
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => {
          innerSubscriber?.unsubscribe()
          let innerIndex = 0
          const outerIndex = index++
          
          innerFrom(project(value, outerIndex)).subscribe(
            (innerSubscriber = createOperatorSubscriber(
              subscriber,
              (innerValue) => subscriber.next(innerValue),
              () => {
                innerSubscriber = null
                checkComplete()
              }
            ))
          )
        },
        () => {
          isComplete = true
          checkComplete()
        }
      )
    )
  })
}
```

**主要差异**：
- RxJS 使用 `innerFrom` 自动转换 ObservableInput
- RxJS 支持 `index` 参数
- RxJS 保留废弃的 `resultSelector`（向后兼容）

## Subject 对比

### Mini RxJS

```typescript
class Subject<T> extends Observable<T> {
  private observers: Observer<T>[] = []
  private closed = false
  
  constructor() {
    super(subscriber => {
      this.observers.push(subscriber)
      return () => {
        const index = this.observers.indexOf(subscriber)
        if (index >= 0) this.observers.splice(index, 1)
      }
    })
  }
  
  next(value: T): void {
    if (!this.closed) {
      this.observers.forEach(o => o.next(value))
    }
  }
  
  // error, complete...
}
```

### RxJS 源码

```typescript
class Subject<T> extends Observable<T> implements SubscriptionLike {
  observers: Observer<T>[] = []
  closed = false
  isStopped = false
  hasError = false
  thrownError: any = null
  
  constructor() {
    super()
  }
  
  next(value: T) {
    if (!this.closed) {
      const { observers } = this
      const len = observers.length
      const copy = observers.slice()
      for (let i = 0; i < len; i++) {
        copy[i].next(value)
      }
    }
  }
  
  // 内部订阅方法
  _subscribe(subscriber: Subscriber<T>): Subscription {
    this._checkFinalizedStatuses(subscriber)
    return this._innerSubscribe(subscriber)
  }
  
  _innerSubscribe(subscriber: Subscriber<T>) {
    if (this.hasError || this.isStopped) {
      return Subscription.EMPTY
    }
    this.observers.push(subscriber)
    return new Subscription(() => arrRemove(this.observers, subscriber))
  }
}
```

**主要差异**：
- RxJS 在遍历时创建副本（防止并发修改）
- RxJS 有更多状态标记（`isStopped`, `hasError`）
- RxJS 检查已完成状态

## Scheduler 对比

### Mini RxJS

```typescript
const asyncScheduler = {
  schedule<T>(work: () => void, delay = 0): Subscription {
    const id = setTimeout(work, delay)
    return new Subscription(() => clearTimeout(id))
  }
}
```

### RxJS 源码

```typescript
class AsyncScheduler extends Scheduler {
  public actions: Array<AsyncAction<any>> = []
  
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay = 0,
    state?: T
  ): Subscription {
    return new AsyncAction<T>(this, work).schedule(state, delay)
  }
  
  flush(action: AsyncAction<any>): void {
    const { actions } = this
    if (this._active) {
      actions.push(action)
      return
    }
    
    this._active = true
    // 执行队列中的所有 action
    do {
      if (action.execute(action.state, action.delay)) {
        break
      }
    } while ((action = actions.shift()!))
    
    this._active = false
  }
}
```

**主要差异**：
- RxJS 使用 Action 队列管理
- RxJS 支持批量执行（flush）
- RxJS 有防止重入机制

## 复杂度对比

| 组件 | Mini RxJS | RxJS |
|------|-----------|------|
| Observable | ~30 行 | ~200 行 |
| Subscriber | ~30 行 | ~150 行 |
| Subject | ~40 行 | ~150 行 |
| map | ~20 行 | ~30 行 |
| switchMap | ~40 行 | ~60 行 |
| Scheduler | ~10 行 | ~200 行 |

## 设计取舍

### Mini RxJS 设计目标

1. **学习优先**：代码简洁，易于理解
2. **核心功能**：实现最常用的 API
3. **最小依赖**：无第三方依赖
4. **现代语法**：使用 ES6+ 特性

### RxJS 设计目标

1. **生产就绪**：完善的错误处理
2. **向后兼容**：保留废弃 API
3. **性能优化**：内存和执行效率
4. **完整功能**：覆盖所有用例

### 功能差异总结

```typescript
// Mini RxJS 不支持的功能

// 1. lift 机制（已废弃）
observable.lift(new MapOperator(fn))

// 2. 完整的 ObservableInput 支持
from(promise)  // 仅基本支持
from(asyncIterable)  // 不支持

// 3. 高级 Scheduler
observeOn(animationFrameScheduler)

// 4. 连接式操作符
observable.pipe(connect(/* ... */))

// 5. 完整的错误边界
// RxJS 的 SafeSubscriber 提供更强的错误隔离
```

## 本章小结

- Observable 核心实现思路相同
- RxJS 添加大量安全检查和边界处理
- RxJS 使用辅助函数抽象通用逻辑
- Mini RxJS 约为 RxJS 代码量的 20%
- 理解 Mini RxJS 有助于阅读 RxJS 源码

下一章：操作符速查表。
