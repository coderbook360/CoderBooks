---
sidebar_position: 12
title: Observer 接口设计
---

# Observer 接口设计

Observer（观察者）是接收 Observable 推送数据的消费者。它定义了处理数据流的三个回调：`next`、`error`、`complete`。本章我们将深入设计 Observer 接口。

## Observer 的职责

Observer 是数据流的**终点**，负责：

- **接收值**：通过 `next` 处理 Observable 推送的每个值
- **处理错误**：通过 `error` 响应异常情况
- **完成处理**：通过 `complete` 执行收尾逻辑

```typescript
observable.subscribe({
  next: value => console.log('收到:', value),
  error: err => console.error('错误:', err),
  complete: () => console.log('完成')
})
```

## 核心接口定义

```typescript
// src/types/index.ts

/**
 * Observer 接口 - 观察者
 * 
 * 定义了接收 Observable 推送的三种通知的方法。
 * 这三个方法形成了 Observable 契约的消费端。
 */
export interface Observer<T> {
  /**
   * 接收下一个值
   * 
   * 可以被调用零次或多次。
   * 如果 Observable 已经完成或出错，此方法不会被调用。
   * 
   * @param value - Observable 推送的值
   */
  next: (value: T) => void

  /**
   * 接收错误通知
   * 
   * 最多被调用一次。
   * 调用后，Observable 停止，不会再有 next 或 complete。
   * 
   * @param err - 错误对象
   */
  error: (err: unknown) => void

  /**
   * 接收完成通知
   * 
   * 最多被调用一次。
   * 调用后，Observable 停止，不会再有 next 或 error。
   */
  complete: () => void
}
```

### 为什么 error 参数是 unknown

你可能注意到 `error` 方法的参数类型是 `unknown` 而不是 `Error`：

```typescript
error: (err: unknown) => void
```

这是因为：

1. **JavaScript 可以抛出任何值**

```typescript
throw 'string error'
throw 42
throw { code: 500 }
throw new Error('real error')
```

2. **操作符可能传递任意错误**

```typescript
source$.pipe(
  map(value => {
    if (value < 0) throw 'negative not allowed'  // 字符串
    return value
  })
)
```

3. **类型安全**

使用 `unknown` 强制消费者进行类型检查：

```typescript
observer.error(err => {
  if (err instanceof Error) {
    console.log(err.message)
  } else {
    console.log(String(err))
  }
})
```

## 部分 Observer（PartialObserver）

实际使用中，我们通常只关心部分回调：

```typescript
/**
 * 部分 Observer - 允许只实现部分方法
 * 
 * 这是最常用的形式，因为很多场景只需要处理 next。
 */
export type PartialObserver<T> = Partial<Observer<T>>

// 等价于：
// {
//   next?: (value: T) => void
//   error?: (err: unknown) => void
//   complete?: () => void
// }
```

使用示例：

```typescript
// 只关心值
source$.subscribe({ next: console.log })

// 只关心错误
source$.subscribe({ error: console.error })

// 只关心完成
source$.subscribe({ complete: () => cleanup() })

// next 和 error
source$.subscribe({
  next: console.log,
  error: console.error
})
```

## Observer 的变体

### 函数形式

最简形式，只传一个 next 函数：

```typescript
type NextObserver<T> = (value: T) => void

// 使用
source$.subscribe(console.log)
source$.subscribe(value => process(value))
```

### 完整函数形式（已废弃）

RxJS 旧版本支持传三个函数：

```typescript
// 旧式 API（RxJS 7 已废弃）
source$.subscribe(
  value => console.log(value),  // next
  err => console.error(err),    // error
  () => console.log('done')     // complete
)

// 新版本推荐
source$.subscribe({
  next: value => console.log(value),
  error: err => console.error(err),
  complete: () => console.log('done')
})
```

我们的 Mini-RxJS 也会支持这种旧式 API，但推荐使用对象形式。

## 实现 Observer 规范化

我们需要一个函数将各种输入规范化为完整的 Observer：

```typescript
// src/internal/utils/toObserver.ts

import type { Observer, PartialObserver } from '../../types'

/**
 * Observer 输入类型
 */
export type ObserverInput<T> = 
  | PartialObserver<T>      // { next?, error?, complete? }
  | ((value: T) => void)     // 只有 next 函数
  | null
  | undefined

/**
 * 将各种输入形式规范化为完整的 Observer
 */
export function toObserver<T>(observerOrNext?: ObserverInput<T>): Observer<T> {
  // 空值：返回空 Observer
  if (observerOrNext == null) {
    return {
      next: noop,
      error: defaultErrorHandler,
      complete: noop
    }
  }

  // 函数：作为 next 回调
  if (typeof observerOrNext === 'function') {
    return {
      next: observerOrNext,
      error: defaultErrorHandler,
      complete: noop
    }
  }

  // 对象：补全缺失的方法
  return {
    next: observerOrNext.next?.bind(observerOrNext) ?? noop,
    error: observerOrNext.error?.bind(observerOrNext) ?? defaultErrorHandler,
    complete: observerOrNext.complete?.bind(observerOrNext) ?? noop
  }
}

/**
 * 空函数
 */
function noop(): void {}

/**
 * 默认错误处理：重新抛出
 */
function defaultErrorHandler(err: unknown): void {
  // 使用 setTimeout 将错误抛到全局，不阻塞当前执行
  setTimeout(() => { throw err }, 0)
}
```

### 为什么用 bind

考虑 Observer 对象中的方法可能依赖 `this`：

```typescript
const observer = {
  results: [],
  next(value) {
    this.results.push(value)  // 依赖 this
  }
}

// 不 bind 会丢失 this
const { next } = observer
next(1)  // TypeError: Cannot read property 'push' of undefined

// bind 保持上下文
const boundNext = observer.next.bind(observer)
boundNext(1)  // 正常工作
```

## Observer 与 Subscriber 的关系

**Observer** 是接口，定义了方法签名。  
**Subscriber** 是实现，添加了契约保证和生命周期管理。

```
                    ┌──────────────┐
                    │   Observer   │  <- 接口
                    │  (interface) │
                    └──────────────┘
                           ▲
                           │ implements
                           │
                    ┌──────────────┐
                    │  Subscriber  │  <- 实现
                    │   (class)    │
                    └──────────────┘
                           │
                           │ extends
                           ▼
                    ┌──────────────┐
                    │ Subscription │  <- 生命周期
                    │   (class)    │
                    └──────────────┘
```

Observer 只是"消费者想要什么"的描述，Subscriber 确保"以正确的方式给消费者"。

## Observer 的设计原则

### 1. 回调应该是幂等安全的

每个回调应该能被安全调用（虽然契约限制了调用次数）：

```typescript
// 好的实践：幂等操作
const observer = {
  next: value => console.log(value),
  error: err => console.error(err),
  complete: () => console.log('done')
}

// 不好的实践：依赖外部状态
let hasReceived = false
const observer = {
  next: value => {
    if (hasReceived) throw new Error('已经收到过了')
    hasReceived = true
    // ...
  }
}
```

### 2. 回调不应该抛出异常

回调抛出异常会导致流异常终止：

```typescript
// 危险：抛出异常
source$.subscribe({
  next: value => {
    if (value < 0) throw new Error('不允许负数')
  }
})

// 安全：妥善处理
source$.subscribe({
  next: value => {
    if (value < 0) {
      console.warn('收到负数，忽略')
      return
    }
    // 处理正常值
  }
})
```

### 3. complete 和 error 应该执行清理

这两个回调标志着流的结束，应该在这里执行必要的清理：

```typescript
const resources: Resource[] = []

source$.subscribe({
  next: value => {
    resources.push(createResource(value))
  },
  error: () => {
    resources.forEach(r => r.dispose())
    resources.length = 0
  },
  complete: () => {
    finalizeResources(resources)
    resources.length = 0
  }
})
```

## 测试 Observer

```typescript
import { describe, it, expect, vi } from 'vitest'
import { toObserver } from './toObserver'

describe('toObserver', () => {
  it('应该处理函数输入', () => {
    const next = vi.fn()
    const observer = toObserver(next)

    observer.next(1)

    expect(next).toHaveBeenCalledWith(1)
  })

  it('应该处理部分 Observer', () => {
    const next = vi.fn()
    const observer = toObserver({ next })

    observer.next(1)
    observer.complete()  // 不应抛出

    expect(next).toHaveBeenCalledWith(1)
  })

  it('应该处理空输入', () => {
    const observer = toObserver(null)

    // 不应抛出
    observer.next(1)
    observer.complete()
  })

  it('应该保持 this 上下文', () => {
    const obj = {
      value: 0,
      next(v: number) {
        this.value = v
      }
    }

    const observer = toObserver(obj)
    observer.next(42)

    expect(obj.value).toBe(42)
  })
})
```

## 本章小结

本章设计了 Observer 接口：

- **Observer** 接口定义了 `next`、`error`、`complete` 三个方法
- **PartialObserver** 允许只实现部分方法
- **toObserver** 函数规范化各种输入形式
- **设计原则**：幂等安全、不抛异常、完成时清理

Observer 是 Observable 契约的消费端。下一章，我们将实现 Subscriber 类，它在 Observer 基础上添加契约保证和生命周期管理。

---

**思考题**：

1. 为什么 `error` 参数设计为 `unknown` 而不是 `Error`？
2. 如果 observer.next 抛出异常，应该如何处理？
3. Observer 对象中的方法为什么需要 bind？
