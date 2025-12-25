---
sidebar_position: 14
title: SafeSubscriber：安全的观察者包装
---

# SafeSubscriber：安全的观察者包装

在上一章，我们提到了 SafeSubscriber。它是专门用来安全执行用户提供的回调的包装器。本章深入探讨为什么需要它以及如何实现。

## 为什么需要 SafeSubscriber

用户提供的回调是不可信的——它们可能抛出异常：

```typescript
source$.subscribe({
  next: value => {
    if (value < 0) throw new Error('负数不允许')  // 用户代码可能抛出
    console.log(value)
  }
})
```

如果不做处理，这个异常会：

1. **中断数据流**：后续的值无法发送
2. **可能导致资源泄漏**：清理函数可能无法执行
3. **破坏其他订阅者**：如果有多个订阅者共享 Observable

SafeSubscriber 的职责就是隔离这些风险。

## SafeSubscriber 的设计

### 核心原则

1. **隔离用户代码**：用户回调在 try-catch 中执行
2. **错误传播**：next 中的错误转为 error 通知
3. **错误报告**：无法传播的错误异步抛出
4. **上下文保持**：保持用户对象的 this 绑定

### 完整实现

```typescript
// src/internal/SafeSubscriber.ts

import type { Observer, PartialObserver } from '../types'

/**
 * SafeSubscriber - 安全的 Observer 包装
 * 
 * 包装用户提供的回调，确保：
 * 1. 回调在 try-catch 中执行
 * 2. next 错误转为 error 通知
 * 3. 保持正确的 this 上下文
 */
export class SafeSubscriber<T> implements Observer<T> {
  /** 用户的 next 回调 */
  private _next: (value: T) => void
  
  /** 用户的 error 回调 */
  private _error: (err: unknown) => void
  
  /** 用户的 complete 回调 */
  private _complete: () => void

  /** 父 Subscriber，用于传播错误 */
  private _parentSubscriber?: { error: (err: unknown) => void }

  constructor(
    destination: PartialObserver<T> | ((value: T) => void) | null | undefined,
    parentSubscriber?: { error: (err: unknown) => void }
  ) {
    this._parentSubscriber = parentSubscriber

    if (destination == null) {
      // 空订阅
      this._next = noop
      this._error = defaultErrorHandler
      this._complete = noop
    } else if (typeof destination === 'function') {
      // 只有 next 函数
      this._next = destination
      this._error = defaultErrorHandler
      this._complete = noop
    } else {
      // Observer 对象
      this._next = destination.next?.bind(destination) ?? noop
      this._error = destination.error?.bind(destination) ?? defaultErrorHandler
      this._complete = destination.complete?.bind(destination) ?? noop
    }
  }

  /**
   * 安全执行 next 回调
   */
  next(value: T): void {
    try {
      this._next(value)
    } catch (err) {
      // next 回调出错，尝试传播给 error
      this.handleError(err)
    }
  }

  /**
   * 安全执行 error 回调
   */
  error(err: unknown): void {
    try {
      this._error(err)
    } catch (innerErr) {
      // error 回调也出错，只能报告
      reportError(innerErr)
    }
  }

  /**
   * 安全执行 complete 回调
   */
  complete(): void {
    try {
      this._complete()
    } catch (err) {
      reportError(err)
    }
  }

  /**
   * 处理 next 中的错误
   */
  private handleError(err: unknown): void {
    if (this._parentSubscriber) {
      // 通过父 Subscriber 传播错误
      this._parentSubscriber.error(err)
    } else {
      // 直接调用 error 回调
      this.error(err)
    }
  }
}

/** 空函数 */
function noop(): void {}

/** 默认错误处理 */
function defaultErrorHandler(err: unknown): void {
  throw err
}

/** 报告无法处理的错误 */
function reportError(err: unknown): void {
  // 异步抛出，让错误能被全局错误处理器捕获
  // 同时不阻塞当前执行流程
  setTimeout(() => { throw err }, 0)
}
```

## 错误处理流程

### next 中的错误

```
next 回调抛出
     │
     ▼
try-catch 捕获
     │
     ▼
┌────────────────────┐
│ 有父 Subscriber？  │
└────────────────────┘
     │        │
    是       否
     │        │
     ▼        ▼
传播给父   调用 error
Subscriber   回调
     │        │
     └────┬───┘
          │
          ▼
    停止数据流
```

### error 中的错误

```
error 回调抛出
     │
     ▼
try-catch 捕获
     │
     ▼
异步抛出 (setTimeout)
     │
     ▼
全局错误处理器
(如 window.onerror)
```

### complete 中的错误

与 error 类似，异步抛出。

## 为什么用 setTimeout 抛出

考虑这个场景：

```typescript
source$.subscribe({
  complete: () => {
    throw new Error('complete 出错')
  }
})
```

如果直接抛出：

1. 后续的清理逻辑无法执行
2. 其他订阅者可能受影响
3. 调用栈被打断

使用 setTimeout：

1. 当前执行流程继续完成
2. 清理逻辑正常执行
3. 错误在下一个事件循环中抛出
4. 可以被全局错误处理器捕获

```typescript
// 用户可以设置全局处理
window.onerror = (message, source, lineno, colno, error) => {
  console.error('未处理的错误:', error)
  // 发送到错误监控服务
}
```

## this 绑定的重要性

用户可能在 Observer 对象中使用方法引用：

```typescript
class Logger {
  logs: string[] = []
  
  log(value: unknown): void {
    this.logs.push(String(value))  // 依赖 this
  }
}

const logger = new Logger()

// 方式1：可能丢失 this
source$.subscribe({
  next: logger.log  // ❌ this 是 undefined
})

// 方式2：手动绑定
source$.subscribe({
  next: logger.log.bind(logger)  // ✅ 正确
})

// 方式3：箭头函数
source$.subscribe({
  next: v => logger.log(v)  // ✅ 正确
})
```

SafeSubscriber 自动处理绑定：

```typescript
this._next = destination.next?.bind(destination) ?? noop
```

这样用户可以安全使用方式1。

## 与 Subscriber 的协作

SafeSubscriber 通常被 Subscriber 使用：

```typescript
class Subscriber<T> extends Subscription implements Observer<T> {
  protected destination: Observer<T>

  constructor(destination?: PartialObserver<T> | ((value: T) => void) | null) {
    super()

    if (destination instanceof Subscriber) {
      this.destination = destination
    } else {
      // 用 SafeSubscriber 包装用户回调
      this.destination = new SafeSubscriber(destination, this)
    }
  }
}
```

传入 `this` 作为 `parentSubscriber`，使得 next 中的错误能通过 Subscriber.error 正确传播。

## 测试 SafeSubscriber

```typescript
import { describe, it, expect, vi } from 'vitest'
import { SafeSubscriber } from './SafeSubscriber'

describe('SafeSubscriber', () => {
  describe('正常执行', () => {
    it('应该调用 next 回调', () => {
      const next = vi.fn()
      const safe = new SafeSubscriber({ next })

      safe.next(1)
      safe.next(2)

      expect(next).toHaveBeenCalledTimes(2)
      expect(next).toHaveBeenNthCalledWith(1, 1)
      expect(next).toHaveBeenNthCalledWith(2, 2)
    })

    it('应该支持只传函数', () => {
      const fn = vi.fn()
      const safe = new SafeSubscriber(fn)

      safe.next(42)

      expect(fn).toHaveBeenCalledWith(42)
    })
  })

  describe('this 绑定', () => {
    it('应该保持 Observer 对象的 this', () => {
      const obj = {
        result: 0,
        next(value: number) {
          this.result = value
        }
      }

      const safe = new SafeSubscriber(obj)
      safe.next(42)

      expect(obj.result).toBe(42)
    })
  })

  describe('错误处理', () => {
    it('next 出错应调用 parent.error', () => {
      const parent = { error: vi.fn() }
      const safe = new SafeSubscriber(
        { next: () => { throw new Error('test') } },
        parent
      )

      safe.next(1)

      expect(parent.error).toHaveBeenCalledWith(expect.any(Error))
    })

    it('没有 parent 时应调用自身 error', () => {
      const error = vi.fn()
      const safe = new SafeSubscriber({
        next: () => { throw new Error('test') },
        error
      })

      safe.next(1)

      expect(error).toHaveBeenCalled()
    })

    it('complete 出错应异步抛出', () => {
      vi.useFakeTimers()
      
      const safe = new SafeSubscriber({
        complete: () => { throw new Error('complete error') }
      })

      expect(() => safe.complete()).not.toThrow()
      
      expect(() => vi.runAllTimers()).toThrow('complete error')
      
      vi.useRealTimers()
    })
  })
})
```

## 本章小结

本章实现了 SafeSubscriber：

- **职责**：安全执行用户提供的回调
- **错误隔离**：所有回调在 try-catch 中执行
- **错误传播**：next 错误 → error 通知
- **错误报告**：无法传播的错误异步抛出
- **this 绑定**：自动绑定用户对象的上下文

SafeSubscriber 是 RxJS 健壮性的重要保障。它确保用户代码的错误不会破坏整个数据流系统。

下一章，我们将深入探讨 Observer 的错误处理机制。

---

**思考题**：

1. 为什么 next 中的错误要传播给 error，而 complete 中的错误要异步抛出？
2. 如果用户同时提供了 error 回调，next 中的错误是传给 error 回调还是 parentSubscriber.error？
3. 有没有其他方式来报告无法处理的错误？
