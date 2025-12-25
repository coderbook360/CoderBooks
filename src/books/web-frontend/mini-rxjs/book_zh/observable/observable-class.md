---
sidebar_position: 8
title: 实现 Observable 类
---

# 实现 Observable 类

在上一章我们理解了 Observable 的本质。现在，让我们动手实现一个完整的 Observable 类。我们会采用渐进式的方法：从最简版本开始，逐步增加功能，直到实现一个生产级的 Observable。

## 第一版：最简实现

从最核心的功能开始——保存订阅函数，并在订阅时执行：

```typescript
// src/internal/Observable.ts

import type { Observer, PartialObserver, TeardownLogic } from '../types'

export class Observable<T> {
  /**
   * 订阅函数 - Observable 的核心逻辑
   * 当有人订阅时，这个函数会被调用
   */
  constructor(
    private _subscribe?: (observer: Observer<T>) => TeardownLogic
  ) {}

  /**
   * 订阅 Observable
   */
  subscribe(observer: Observer<T>): void {
    if (this._subscribe) {
      this._subscribe(observer)
    }
  }
}
```

测试一下：

```typescript
const observable = new Observable<number>(observer => {
  observer.next(1)
  observer.next(2)
  observer.complete()
})

observable.subscribe({
  next: value => console.log('值:', value),
  error: err => console.error('错误:', err),
  complete: () => console.log('完成')
})

// 输出：
// 值: 1
// 值: 2
// 完成
```

这个版本能工作，但有几个问题：

1. 必须传完整的 Observer 对象
2. 没有返回 Subscription，无法取消
3. 没有清理机制

## 第二版：支持部分 Observer

用户可能只关心 `next`，不想每次都写 `error` 和 `complete`。让我们支持部分 Observer：

```typescript
import type { Observer, PartialObserver, TeardownLogic } from '../types'

export class Observable<T> {
  constructor(
    private _subscribe?: (observer: Observer<T>) => TeardownLogic
  ) {}

  /**
   * 订阅 Observable
   * 支持传入完整 Observer 或部分 Observer
   */
  subscribe(observerOrNext?: PartialObserver<T> | ((value: T) => void)): void {
    // 规范化为完整的 Observer
    const observer = this.toObserver(observerOrNext)
    
    if (this._subscribe) {
      this._subscribe(observer)
    }
  }

  /**
   * 将各种形式的输入规范化为 Observer
   */
  private toObserver(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Observer<T> {
    // 如果是函数，作为 next 回调
    if (typeof observerOrNext === 'function') {
      return {
        next: observerOrNext,
        error: () => {},      // 默认空函数
        complete: () => {}
      }
    }
    
    // 如果是 Observer 对象，补全缺失的方法
    return {
      next: observerOrNext?.next ?? (() => {}),
      error: observerOrNext?.error ?? (() => {}),
      complete: observerOrNext?.complete ?? (() => {})
    }
  }
}
```

现在可以这样使用：

```typescript
// 只传 next 回调
observable.subscribe(value => console.log(value))

// 传部分 Observer
observable.subscribe({
  next: value => console.log(value)
})

// 传完整 Observer
observable.subscribe({
  next: value => console.log(value),
  error: err => console.error(err),
  complete: () => console.log('done')
})
```

## 第三版：返回 Subscription

订阅应该返回一个 Subscription 对象，用于取消订阅和清理资源。

首先定义 Subscription 类（简化版，后续章节会完善）：

```typescript
// src/internal/Subscription.ts

import type { TeardownLogic } from '../types'

export class Subscription {
  /** 是否已取消订阅 */
  public closed = false
  
  /** 清理函数列表 */
  private _teardowns: Set<() => void> = new Set()

  constructor(private _teardown?: () => void) {
    if (_teardown) {
      this._teardowns.add(_teardown)
    }
  }

  /**
   * 取消订阅
   */
  unsubscribe(): void {
    if (this.closed) return
    
    this.closed = true
    
    // 执行所有清理函数
    this._teardowns.forEach(teardown => {
      try {
        teardown()
      } catch (err) {
        console.error('清理函数执行出错:', err)
      }
    })
    
    this._teardowns.clear()
  }

  /**
   * 添加清理逻辑
   */
  add(teardown: TeardownLogic): void {
    if (!teardown) return
    if (typeof teardown === 'function') {
      this._teardowns.add(teardown)
    } else if (teardown instanceof Subscription) {
      this._teardowns.add(() => teardown.unsubscribe())
    }
  }
}
```

更新 Observable：

```typescript
import type { Observer, PartialObserver, TeardownLogic } from '../types'
import { Subscription } from './Subscription'

export class Observable<T> {
  constructor(
    private _subscribe?: (observer: Observer<T>) => TeardownLogic
  ) {}

  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Subscription {
    const observer = this.toObserver(observerOrNext)
    const subscription = new Subscription()

    if (this._subscribe) {
      // 执行订阅函数，获取清理逻辑
      const teardown = this._subscribe(observer)
      
      // 将清理逻辑添加到 subscription
      if (teardown) {
        subscription.add(teardown)
      }
    }

    return subscription
  }

  private toObserver(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Observer<T> {
    if (typeof observerOrNext === 'function') {
      return {
        next: observerOrNext,
        error: () => {},
        complete: () => {}
      }
    }
    
    return {
      next: observerOrNext?.next ?? (() => {}),
      error: observerOrNext?.error ?? (() => {}),
      complete: observerOrNext?.complete ?? (() => {})
    }
  }
}
```

现在可以取消订阅了：

```typescript
const timer$ = new Observable<number>(observer => {
  let count = 0
  const id = setInterval(() => {
    observer.next(count++)
  }, 1000)

  // 返回清理函数
  return () => {
    clearInterval(id)
    console.log('定时器已清理')
  }
})

const subscription = timer$.subscribe(value => {
  console.log('收到:', value)
})

// 3秒后取消
setTimeout(() => {
  subscription.unsubscribe()
  // 输出: 定时器已清理
}, 3000)
```

## 第四版：实现 pipe 方法

Observable 的强大之处在于可以通过 `pipe` 方法链式调用操作符：

```typescript
import type { 
  Observer, 
  PartialObserver, 
  TeardownLogic,
  OperatorFunction 
} from '../types'
import { Subscription } from './Subscription'

export class Observable<T> {
  constructor(
    private _subscribe?: (observer: Observer<T>) => TeardownLogic
  ) {}

  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Subscription {
    const observer = this.toObserver(observerOrNext)
    const subscription = new Subscription()

    if (this._subscribe) {
      const teardown = this._subscribe(observer)
      if (teardown) {
        subscription.add(teardown)
      }
    }

    return subscription
  }

  /**
   * 管道方法 - 链式调用操作符
   * 使用函数重载确保类型安全
   */
  pipe(): Observable<T>
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>
  pipe<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>
  ): Observable<B>
  pipe<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>
  ): Observable<C>
  pipe<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>
  ): Observable<D>
  pipe<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>
  ): Observable<E>
  // 可以继续扩展更多重载...
  pipe(...operators: OperatorFunction<any, any>[]): Observable<any> {
    // 没有操作符，返回自身
    if (operators.length === 0) {
      return this
    }
    
    // 依次应用每个操作符
    return operators.reduce(
      (source, operator) => operator(source),
      this as Observable<any>
    )
  }

  private toObserver(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Observer<T> {
    if (typeof observerOrNext === 'function') {
      return {
        next: observerOrNext,
        error: () => {},
        complete: () => {}
      }
    }
    
    return {
      next: observerOrNext?.next ?? (() => {}),
      error: observerOrNext?.error ?? (() => {}),
      complete: observerOrNext?.complete ?? (() => {})
    }
  }
}
```

配合操作符使用：

```typescript
// 简单的 map 操作符
function map<T, R>(project: (value: T) => R): OperatorFunction<T, R> {
  return (source: Observable<T>) => {
    return new Observable<R>(observer => {
      return source.subscribe({
        next: value => observer.next(project(value)),
        error: err => observer.error(err),
        complete: () => observer.complete()
      })
    })
  }
}

// 使用
const source$ = new Observable<number>(observer => {
  observer.next(1)
  observer.next(2)
  observer.complete()
})

source$.pipe(
  map(x => x * 2),
  map(x => x + 1)
).subscribe(console.log)
// 输出: 3, 5
```

## 完整实现

综合以上所有版本，这是我们的完整 Observable 类：

```typescript
// src/internal/Observable.ts

import type { 
  Observer, 
  PartialObserver, 
  TeardownLogic,
  OperatorFunction 
} from '../types'
import { Subscription } from './Subscription'

/**
 * Observable - 可观察对象
 * 
 * 表示一个惰性的、推送多个值的集合。
 * 只有被订阅时才开始执行。
 */
export class Observable<T> {
  /**
   * 创建 Observable
   * @param _subscribe 订阅函数，当有人订阅时执行
   */
  constructor(
    private _subscribe?: (observer: Observer<T>) => TeardownLogic
  ) {}

  /**
   * 订阅 Observable
   * 
   * @param observerOrNext Observer 对象或 next 回调函数
   * @returns Subscription 对象，用于取消订阅
   * 
   * @example
   * // 使用 next 回调
   * source$.subscribe(value => console.log(value))
   * 
   * @example
   * // 使用完整 Observer
   * source$.subscribe({
   *   next: value => console.log(value),
   *   error: err => console.error(err),
   *   complete: () => console.log('done')
   * })
   */
  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Subscription {
    // 规范化 Observer
    const observer = this.toObserver(observerOrNext)
    
    // 创建 Subscription
    const subscription = new Subscription()

    // 执行订阅函数
    if (this._subscribe) {
      try {
        const teardown = this._subscribe(observer)
        if (teardown) {
          subscription.add(teardown)
        }
      } catch (err) {
        // 订阅函数抛出错误，通知 observer
        observer.error(err)
      }
    }

    return subscription
  }

  /**
   * 管道方法 - 链式调用操作符
   * 
   * @example
   * source$.pipe(
   *   map(x => x * 2),
   *   filter(x => x > 5),
   *   take(3)
   * )
   */
  pipe(): Observable<T>
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>
  pipe<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>
  ): Observable<B>
  pipe<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>
  ): Observable<C>
  pipe<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>
  ): Observable<D>
  pipe<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>
  ): Observable<E>
  pipe<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>
  ): Observable<F>
  pipe(...operators: OperatorFunction<any, any>[]): Observable<any> {
    if (operators.length === 0) {
      return this
    }
    
    return operators.reduce(
      (source, operator) => operator(source),
      this as Observable<any>
    )
  }

  /**
   * 将各种形式的输入规范化为完整的 Observer
   */
  private toObserver(
    observerOrNext?: PartialObserver<T> | ((value: T) => void)
  ): Observer<T> {
    if (typeof observerOrNext === 'function') {
      return {
        next: observerOrNext,
        error: this.defaultErrorHandler,
        complete: () => {}
      }
    }
    
    return {
      next: observerOrNext?.next ?? (() => {}),
      error: observerOrNext?.error ?? this.defaultErrorHandler,
      complete: observerOrNext?.complete ?? (() => {})
    }
  }

  /**
   * 默认错误处理 - 重新抛出错误
   */
  private defaultErrorHandler(err: unknown): void {
    throw err
  }
}
```

## 单元测试

为 Observable 编写测试：

```typescript
// src/internal/Observable.test.ts

import { describe, it, expect, vi } from 'vitest'
import { Observable } from './Observable'

describe('Observable', () => {
  describe('constructor', () => {
    it('应该创建 Observable 实例', () => {
      const observable = new Observable()
      expect(observable).toBeInstanceOf(Observable)
    })

    it('应该接受订阅函数', () => {
      const subscribeFn = vi.fn()
      const observable = new Observable(subscribeFn)
      expect(observable).toBeInstanceOf(Observable)
    })
  })

  describe('subscribe', () => {
    it('应该在订阅时执行订阅函数', () => {
      const subscribeFn = vi.fn()
      const observable = new Observable(subscribeFn)
      
      observable.subscribe(() => {})
      
      expect(subscribeFn).toHaveBeenCalledTimes(1)
    })

    it('应该将值传递给 observer', () => {
      const observable = new Observable<number>(observer => {
        observer.next(1)
        observer.next(2)
        observer.next(3)
      })

      const values: number[] = []
      observable.subscribe(value => values.push(value))

      expect(values).toEqual([1, 2, 3])
    })

    it('应该返回 Subscription', () => {
      const observable = new Observable()
      const subscription = observable.subscribe()
      
      expect(subscription).toBeDefined()
      expect(typeof subscription.unsubscribe).toBe('function')
    })

    it('应该在取消订阅时执行清理函数', () => {
      const cleanup = vi.fn()
      const observable = new Observable(() => cleanup)

      const subscription = observable.subscribe()
      subscription.unsubscribe()

      expect(cleanup).toHaveBeenCalledTimes(1)
    })
  })

  describe('pipe', () => {
    it('没有操作符时应该返回自身', () => {
      const observable = new Observable()
      expect(observable.pipe()).toBe(observable)
    })

    it('应该依次应用操作符', () => {
      const source$ = new Observable<number>(observer => {
        observer.next(1)
        observer.next(2)
        observer.complete()
      })

      const double = (source: Observable<number>) =>
        new Observable<number>(observer => {
          return source.subscribe({
            next: v => observer.next(v * 2),
            error: e => observer.error(e),
            complete: () => observer.complete()
          })
        })

      const values: number[] = []
      source$.pipe(double).subscribe(v => values.push(v))

      expect(values).toEqual([2, 4])
    })
  })
})
```

## 本章小结

本章我们从零实现了 Observable 类：

- **第一版**：最简实现，只保存和执行订阅函数
- **第二版**：支持部分 Observer，用户可以只传 next 回调
- **第三版**：返回 Subscription，支持取消订阅和资源清理
- **第四版**：实现 pipe 方法，支持链式调用操作符

关键设计决策：

- 使用 `toObserver` 方法规范化各种形式的输入
- 订阅函数可以返回清理逻辑
- pipe 使用函数重载保证类型安全
- 订阅函数的错误会通过 observer.error 传递

下一章，我们将深入 subscribe 函数的实现细节，理解生产者与消费者是如何连接的。

---

**思考题**：

1. 为什么 pipe 方法需要这么多函数重载？不重载会有什么问题？
2. 当前实现有一个问题：observer.complete() 之后仍可以调用 observer.next()。如何解决？
3. 如果订阅函数抛出同步错误，当前实现会如何处理？这样处理合理吗？
