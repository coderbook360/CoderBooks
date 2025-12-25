---
sidebar_position: 13
title: 实现 Subscriber 类
---

# 实现 Subscriber 类

Subscriber 是 RxJS 内部最重要的类之一。它既是 Observer（接收值），又是 Subscription（可取消）。Subscriber 确保 Observable 契约被正确执行，并管理订阅的生命周期。

## Subscriber 的双重身份

```typescript
class Subscriber<T> extends Subscription implements Observer<T> {
  // 作为 Observer：接收 next、error、complete
  // 作为 Subscription：可以 unsubscribe、add、remove
}
```

为什么需要这种设计？

1. **契约保证**：确保 error/complete 后不再发送值
2. **生命周期管理**：自动清理资源
3. **统一接口**：既能接收值，又能被取消

## 从零实现 Subscriber

### 第一版：基础结构

```typescript
// src/internal/Subscriber.ts

import type { Observer, TeardownLogic } from '../types'
import { Subscription } from './Subscription'

export class Subscriber<T> extends Subscription implements Observer<T> {
  /** 是否已停止接收值 */
  protected isStopped = false

  /** 目标 Observer */
  protected destination: Observer<T>

  constructor(destination: Partial<Observer<T>> | ((value: T) => void)) {
    super()
    this.destination = this.normalizeDestination(destination)
  }

  /** 接收下一个值 */
  next(value: T): void {
    if (!this.isStopped && !this.closed) {
      this.destination.next(value)
    }
  }

  /** 接收错误 */
  error(err: unknown): void {
    if (!this.isStopped && !this.closed) {
      this.isStopped = true
      this.destination.error(err)
      this.unsubscribe()
    }
  }

  /** 接收完成 */
  complete(): void {
    if (!this.isStopped && !this.closed) {
      this.isStopped = true
      this.destination.complete()
      this.unsubscribe()
    }
  }

  private normalizeDestination(
    destination: Partial<Observer<T>> | ((value: T) => void)
  ): Observer<T> {
    if (typeof destination === 'function') {
      return {
        next: destination,
        error: (err) => { throw err },
        complete: () => {}
      }
    }

    return {
      next: destination.next ?? (() => {}),
      error: destination.error ?? ((err) => { throw err }),
      complete: destination.complete ?? (() => {})
    }
  }
}
```

测试基本功能：

```typescript
const subscriber = new Subscriber<number>({
  next: v => console.log('next:', v),
  complete: () => console.log('complete')
})

subscriber.next(1)  // next: 1
subscriber.next(2)  // next: 2
subscriber.complete()  // complete
subscriber.next(3)  // 被忽略（已停止）
```

### 第二版：安全的回调执行

回调可能抛出异常，我们需要安全处理：

```typescript
export class Subscriber<T> extends Subscription implements Observer<T> {
  protected isStopped = false
  protected destination: Observer<T>

  constructor(destination: Partial<Observer<T>> | ((value: T) => void)) {
    super()
    this.destination = this.normalizeDestination(destination)
  }

  next(value: T): void {
    if (this.isStopped || this.closed) return

    try {
      this.destination.next(value)
    } catch (err) {
      // next 回调出错，转为 error
      this.error(err)
    }
  }

  error(err: unknown): void {
    if (this.isStopped || this.closed) return
    this.isStopped = true

    try {
      this.destination.error(err)
    } catch (innerErr) {
      // error 回调也出错，报告错误
      reportError(innerErr)
    }

    this.unsubscribe()
  }

  complete(): void {
    if (this.isStopped || this.closed) return
    this.isStopped = true

    try {
      this.destination.complete()
    } catch (err) {
      reportError(err)
    }

    this.unsubscribe()
  }

  // ... normalizeDestination
}

/** 报告未处理的错误 */
function reportError(err: unknown): void {
  setTimeout(() => { throw err }, 0)
}
```

### 第三版：支持操作符链

操作符需要创建中间 Subscriber，将值转发给下游：

```typescript
export class Subscriber<T> extends Subscription implements Observer<T> {
  protected isStopped = false
  protected destination: Observer<T>

  constructor(
    destination: Subscriber<T> | Partial<Observer<T>> | ((value: T) => void)
  ) {
    super()

    // 如果目标是另一个 Subscriber，建立父子关系
    if (destination instanceof Subscriber) {
      this.destination = destination
      // 子 Subscriber 取消时，不影响父级
      // 父 Subscriber 取消时，子级也取消
      destination.add(this)
    } else {
      this.destination = this.normalizeDestination(destination)
    }
  }

  // ... 其他方法不变
}
```

这允许操作符这样工作：

```typescript
function map<T, R>(project: (value: T) => R) {
  return (source: Observable<T>): Observable<R> => {
    return new Observable(subscriber => {
      // 创建源 Subscriber，将映射后的值发送给 subscriber
      const sourceSubscriber = new Subscriber<T>({
        next: value => subscriber.next(project(value)),
        error: err => subscriber.error(err),
        complete: () => subscriber.complete()
      })

      // 建立关联：subscriber 取消时，sourceSubscriber 也取消
      subscriber.add(sourceSubscriber)

      return source.subscribe(sourceSubscriber)
    })
  }
}
```

## 完整的 Subscriber 实现

```typescript
// src/internal/Subscriber.ts

import type { Observer, PartialObserver, TeardownLogic } from '../types'
import { Subscription } from './Subscription'

/**
 * Subscriber - Observer 的安全实现
 * 
 * 职责：
 * 1. 确保 Observable 契约（next* (error|complete)?）
 * 2. 安全执行回调（捕获异常）
 * 3. 管理订阅生命周期
 */
export class Subscriber<T> extends Subscription implements Observer<T> {
  /** 是否已停止（error 或 complete 后） */
  protected isStopped = false

  /** 目标 Observer 或下游 Subscriber */
  protected destination: Observer<T>

  /**
   * 创建 Subscriber
   * @param destination 目标 Observer、Subscriber 或 next 函数
   */
  constructor(
    destination?: Subscriber<T> | PartialObserver<T> | ((value: T) => void) | null
  ) {
    super()

    if (destination == null) {
      // 空 Subscriber
      this.destination = EMPTY_OBSERVER
    } else if (destination instanceof Subscriber) {
      // 下游是另一个 Subscriber
      this.destination = destination
      destination.add(this)
    } else {
      // 普通 Observer 或函数
      this.destination = new SafeSubscriber(destination)
    }
  }

  /**
   * 接收下一个值
   */
  next(value: T): void {
    if (this.isStopped || this.closed) return
    this._next(value)
  }

  /**
   * 接收错误
   */
  error(err: unknown): void {
    if (this.isStopped || this.closed) return
    this.isStopped = true
    this._error(err)
    this.unsubscribe()
  }

  /**
   * 接收完成
   */
  complete(): void {
    if (this.isStopped || this.closed) return
    this.isStopped = true
    this._complete()
    this.unsubscribe()
  }

  /** 内部 next 实现，子类可覆盖 */
  protected _next(value: T): void {
    this.destination.next(value)
  }

  /** 内部 error 实现，子类可覆盖 */
  protected _error(err: unknown): void {
    this.destination.error(err)
  }

  /** 内部 complete 实现，子类可覆盖 */
  protected _complete(): void {
    this.destination.complete()
  }
}

/**
 * 空 Observer，用于没有提供目标时
 */
const EMPTY_OBSERVER: Observer<any> = {
  next: () => {},
  error: (err: unknown) => {
    throw err
  },
  complete: () => {}
}

/**
 * SafeSubscriber - 安全执行用户回调
 * 
 * 与 Subscriber 分开，专门处理用户提供的回调
 */
class SafeSubscriber<T> implements Observer<T> {
  private _next: (value: T) => void
  private _error: (err: unknown) => void
  private _complete: () => void

  constructor(destination: PartialObserver<T> | ((value: T) => void)) {
    if (typeof destination === 'function') {
      this._next = destination
      this._error = defaultErrorHandler
      this._complete = noop
    } else {
      this._next = destination.next?.bind(destination) ?? noop
      this._error = destination.error?.bind(destination) ?? defaultErrorHandler
      this._complete = destination.complete?.bind(destination) ?? noop
    }
  }

  next(value: T): void {
    try {
      this._next(value)
    } catch (err) {
      handleError(err)
    }
  }

  error(err: unknown): void {
    try {
      this._error(err)
    } catch (innerErr) {
      handleError(innerErr)
    }
  }

  complete(): void {
    try {
      this._complete()
    } catch (err) {
      handleError(err)
    }
  }
}

function noop(): void {}

function defaultErrorHandler(err: unknown): void {
  throw err
}

function handleError(err: unknown): void {
  // 异步抛出，避免阻塞当前执行
  setTimeout(() => { throw err }, 0)
}
```

## Subscriber 在 Observable 中的使用

更新 Observable.subscribe 方法：

```typescript
// src/internal/Observable.ts

subscribe(
  observerOrNext?: PartialObserver<T> | ((value: T) => void) | null
): Subscription {
  // 创建 Subscriber
  const subscriber = new Subscriber(observerOrNext)

  // 执行订阅函数
  if (this._subscribe) {
    try {
      const teardown = this._subscribe(subscriber)
      subscriber.add(teardown)
    } catch (err) {
      subscriber.error(err)
    }
  }

  return subscriber
}
```

## Subscriber vs Observer

| 特性 | Observer | Subscriber |
|------|----------|------------|
| 类型 | 接口 | 类 |
| 契约保证 | ❌ | ✅ |
| 可取消 | ❌ | ✅ |
| 资源管理 | ❌ | ✅ |
| 安全执行 | ❌ | ✅ |

## 单元测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Subscriber } from './Subscriber'

describe('Subscriber', () => {
  describe('契约保证', () => {
    it('complete 后应忽略 next', () => {
      const next = vi.fn()
      const subscriber = new Subscriber({ next })

      subscriber.next(1)
      subscriber.complete()
      subscriber.next(2)

      expect(next).toHaveBeenCalledTimes(1)
    })

    it('error 后应忽略 next 和 complete', () => {
      const next = vi.fn()
      const complete = vi.fn()
      const subscriber = new Subscriber({ next, complete })

      subscriber.next(1)
      subscriber.error(new Error())
      subscriber.next(2)
      subscriber.complete()

      expect(next).toHaveBeenCalledTimes(1)
      expect(complete).not.toHaveBeenCalled()
    })
  })

  describe('生命周期', () => {
    it('complete 后应自动 unsubscribe', () => {
      const subscriber = new Subscriber({})
      
      expect(subscriber.closed).toBe(false)
      subscriber.complete()
      expect(subscriber.closed).toBe(true)
    })

    it('error 后应自动 unsubscribe', () => {
      const subscriber = new Subscriber({ error: () => {} })
      
      subscriber.error(new Error())
      expect(subscriber.closed).toBe(true)
    })

    it('应执行添加的清理逻辑', () => {
      const cleanup = vi.fn()
      const subscriber = new Subscriber({})
      
      subscriber.add(cleanup)
      subscriber.complete()

      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    it('next 回调出错应转为 error', () => {
      const error = vi.fn()
      const subscriber = new Subscriber({
        next: () => { throw new Error('next error') },
        error
      })

      subscriber.next(1)

      expect(error).toHaveBeenCalled()
    })
  })
})
```

## 本章小结

本章实现了 Subscriber 类：

- **双重身份**：既是 Observer（接收值）又是 Subscription（可取消）
- **契约保证**：确保 error/complete 后不再发送值
- **安全执行**：捕获回调中的异常
- **生命周期管理**：error/complete 后自动清理资源
- **链式支持**：支持操作符链的父子关系

Subscriber 是 Observable 内部机制的核心。下一章，我们将深入 SafeSubscriber 的设计。

---

**思考题**：

1. 为什么 Subscriber 要继承 Subscription？
2. Subscriber 的 `destination` 和 `add` 方法是如何配合工作的？
3. 如果 complete 回调抛出异常，为什么要用 setTimeout 重新抛出？
