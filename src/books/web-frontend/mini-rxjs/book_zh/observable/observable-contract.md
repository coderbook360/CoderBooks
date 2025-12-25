---
sidebar_position: 10
title: Observable 契约：next、error、complete
---

# Observable 契约：next、error、complete

Observable 不是随意发送数据的。它遵循一套严格的契约（Contract），定义了 `next`、`error`、`complete` 三者之间的关系。这套契约来自 ReactiveX 规范，是所有 Observable 实现必须遵守的规则。

## 契约的核心规则

Observable 契约可以用一个正则表达式精确描述：

```
next* (error | complete)?
```

翻译成自然语言：

- **next** 可以调用零次或多次
- **error** 和 **complete** 最多只能调用一次
- **error** 和 **complete** 互斥，调用一个后不能调用另一个
- **error** 或 **complete** 之后，不能再调用 **next**

### 合法的序列

```
✅ next
✅ next, next, next
✅ next, complete
✅ next, next, error
✅ complete  (没有 next 也可以)
✅ error     (没有 next 也可以)
✅ (空)      (什么都不调用)
```

### 非法的序列

```
❌ complete, next        (complete 后不能 next)
❌ error, next           (error 后不能 next)
❌ complete, error       (不能两个终止信号)
❌ error, complete       (不能两个终止信号)
❌ next, complete, next  (complete 后不能 next)
```

## 为什么需要契约

契约存在的根本原因是**保证行为可预测**。

### 问题场景：无契约的混乱

想象一下没有契约会怎样：

```typescript
// 假设没有契约限制
observable.subscribe({
  next: value => {
    console.log('处理值:', value)
    // 这里做了一些清理工作，因为之前收到了 complete
  },
  complete: () => {
    console.log('完成，清理资源')
    cleanup()
  }
})

// 如果生产者这样做：
observer.complete()
observer.next(1)  // complete 后又发值！
// 消费者已经清理了资源，现在又收到值，会出问题
```

### 契约带来的保证

有了契约，消费者可以安全地假设：

```typescript
subscribe({
  next: value => {
    // 可以放心处理，不用担心 complete 后还会调用
    processValue(value)
  },
  complete: () => {
    // 可以安全清理，不用担心之后还有 next
    cleanup()
    closeConnections()
  },
  error: err => {
    // 可以安全处理错误，不用担心之后还有 next 或 complete
    logError(err)
    cleanup()
  }
})
```

## 实现契约保证

我们需要在代码层面强制执行这些规则。这就是 `Subscriber` 类的作用。

### 问题：裸 Observer 无法保证契约

```typescript
// 当前的实现有问题
new Observable(observer => {
  observer.next(1)
  observer.complete()
  observer.next(2)  // 违反契约，但代码不会阻止
})
```

### 解决：用 Subscriber 包装 Observer

```typescript
// src/internal/Subscriber.ts

import type { Observer, TeardownLogic } from '../types'
import { Subscription } from './Subscription'

/**
 * Subscriber - 实现 Observable 契约的安全包装
 * 
 * 包装原始 Observer，确保：
 * 1. error/complete 后不再调用任何方法
 * 2. 自动执行清理逻辑
 */
export class Subscriber<T> extends Subscription implements Observer<T> {
  /** 是否已停止（error 或 complete 后） */
  private _isStopped = false
  
  constructor(private destination: Observer<T>) {
    super()
  }

  /**
   * 接收下一个值
   * 如果已停止，忽略调用
   */
  next(value: T): void {
    if (this._isStopped) return
    this.destination.next(value)
  }

  /**
   * 接收错误
   * 停止后续所有调用，执行清理
   */
  error(err: unknown): void {
    if (this._isStopped) return
    this._isStopped = true
    this.destination.error(err)
    this.unsubscribe()
  }

  /**
   * 接收完成信号
   * 停止后续所有调用，执行清理
   */
  complete(): void {
    if (this._isStopped) return
    this._isStopped = true
    this.destination.complete()
    this.unsubscribe()
  }
}
```

### 在 Observable 中使用 Subscriber

```typescript
// 更新 Observable.subscribe 方法
subscribe(
  observerOrNext?: PartialObserver<T> | ((value: T) => void)
): Subscription {
  const observer = this.normalizeObserver(observerOrNext)
  
  // 用 Subscriber 包装，确保契约
  const subscriber = new Subscriber(observer)

  if (this._subscribe) {
    try {
      const teardown = this._subscribe(subscriber)  // 传入 subscriber
      if (teardown) {
        subscriber.add(teardown)
      }
    } catch (err) {
      subscriber.error(err)
    }
  }

  return subscriber  // Subscriber 也是 Subscription
}
```

现在契约被强制执行：

```typescript
new Observable(subscriber => {
  subscriber.next(1)
  subscriber.complete()
  subscriber.next(2)  // 被静默忽略
}).subscribe({
  next: v => console.log('next:', v),
  complete: () => console.log('complete')
})

// 输出：
// next: 1
// complete
// (不会打印 next: 2)
```

## 三种终止方式的语义

### next：传递值

- 可以调用任意多次（包括零次）
- 传递生产者产生的值
- 只在"活跃"状态下有效

```typescript
new Observable(subscriber => {
  subscriber.next(1)  // 第一个值
  subscriber.next(2)  // 第二个值
  subscriber.next(3)  // 第三个值
  // 可以无限继续...
})
```

### complete：正常结束

- 最多调用一次
- 表示数据流正常结束，没有更多值
- 调用后自动清理资源

```typescript
new Observable<number>(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()  // 正常结束
  // 之后的 next 会被忽略
})
```

使用场景：
- 有限序列（如数组转 Observable）
- HTTP 请求成功返回
- 文件读取完成

### error：异常结束

- 最多调用一次
- 表示发生了错误，数据流异常终止
- 调用后自动清理资源

```typescript
new Observable<number>(subscriber => {
  subscriber.next(1)
  subscriber.error(new Error('出错了'))  // 异常结束
  // 之后的 next 和 complete 会被忽略
})
```

使用场景：
- HTTP 请求失败
- 解析错误
- 验证失败
- 任何异常情况

## 错误与完成的区别

| 特性 | complete | error |
|------|----------|-------|
| 含义 | 正常结束 | 异常结束 |
| 参数 | 无 | 错误对象 |
| 后续处理 | 流程继续 | 需要恢复或终止 |
| 操作符行为 | 正常传递 | 可能被捕获/重试 |

### 操作符对两者的处理

```typescript
source$.pipe(
  catchError(err => {
    // 只捕获 error，不影响 complete
    return of('fallback')
  }),
  finalize(() => {
    // error 和 complete 都会触发
    console.log('清理资源')
  })
)
```

## 自动取消订阅

error 和 complete 后会自动取消订阅：

```typescript
const observable = new Observable(subscriber => {
  const id = setInterval(() => {
    subscriber.next(Date.now())
  }, 1000)

  return () => {
    clearInterval(id)
    console.log('定时器已清理')
  }
})

observable.subscribe({
  next: v => console.log(v),
  complete: () => console.log('完成')
})

// 如果生产者调用 complete()，清理函数会自动执行
```

### 实现自动清理

在 Subscriber 中，error 和 complete 后调用 `unsubscribe()`：

```typescript
error(err: unknown): void {
  if (this._isStopped) return
  this._isStopped = true
  this.destination.error(err)
  this.unsubscribe()  // 自动清理
}

complete(): void {
  if (this._isStopped) return
  this._isStopped = true
  this.destination.complete()
  this.unsubscribe()  // 自动清理
}
```

## 处理回调中的错误

如果 observer 的回调函数抛出错误怎么办？

```typescript
source$.subscribe({
  next: value => {
    throw new Error('处理出错')  // 这个错误怎么办？
  }
})
```

### 安全的 Subscriber 实现

```typescript
export class Subscriber<T> extends Subscription implements Observer<T> {
  private _isStopped = false

  constructor(private destination: Observer<T>) {
    super()
  }

  next(value: T): void {
    if (this._isStopped) return
    
    try {
      this.destination.next(value)
    } catch (err) {
      // next 回调出错，转为 error
      this.error(err)
    }
  }

  error(err: unknown): void {
    if (this._isStopped) return
    this._isStopped = true
    
    try {
      this.destination.error(err)
    } catch (innerErr) {
      // error 回调也出错，重新抛出
      this.reportError(innerErr)
    }
    
    this.unsubscribe()
  }

  complete(): void {
    if (this._isStopped) return
    this._isStopped = true
    
    try {
      this.destination.complete()
    } catch (err) {
      // complete 回调出错
      this.reportError(err)
    }
    
    this.unsubscribe()
  }

  private reportError(err: unknown): void {
    // 异步抛出，避免阻塞
    setTimeout(() => { throw err }, 0)
  }
}
```

## 完整的 Subscriber 实现

综合以上所有考虑：

```typescript
// src/internal/Subscriber.ts

import type { Observer, TeardownLogic } from '../types'
import { Subscription } from './Subscription'

/**
 * Subscriber - Observable 契约的守护者
 * 
 * 职责：
 * 1. 确保 next/error/complete 调用顺序符合契约
 * 2. 安全处理回调中的错误
 * 3. 自动管理订阅生命周期
 */
export class Subscriber<T> extends Subscription implements Observer<T> {
  /** 是否已停止接收值 */
  protected isStopped = false

  constructor(
    protected destination: Partial<Observer<T>> | ((value: T) => void)
  ) {
    super()
  }

  next(value: T): void {
    if (this.isStopped || this.closed) return

    try {
      this._next(value)
    } catch (err) {
      this.error(err)
    }
  }

  error(err: unknown): void {
    if (this.isStopped || this.closed) return
    this.isStopped = true

    try {
      this._error(err)
    } catch (innerErr) {
      this._reportError(innerErr)
    }

    this.unsubscribe()
  }

  complete(): void {
    if (this.isStopped || this.closed) return
    this.isStopped = true

    try {
      this._complete()
    } catch (err) {
      this._reportError(err)
    }

    this.unsubscribe()
  }

  protected _next(value: T): void {
    const dest = this.destination
    if (typeof dest === 'function') {
      dest(value)
    } else if (dest.next) {
      dest.next(value)
    }
  }

  protected _error(err: unknown): void {
    const dest = this.destination
    if (typeof dest === 'function') {
      this._reportError(err)
    } else if (dest.error) {
      dest.error(err)
    } else {
      this._reportError(err)
    }
  }

  protected _complete(): void {
    const dest = this.destination
    if (typeof dest !== 'function' && dest.complete) {
      dest.complete()
    }
  }

  protected _reportError(err: unknown): void {
    setTimeout(() => { throw err }, 0)
  }
}
```

## 单元测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Subscriber } from './Subscriber'

describe('Subscriber 契约', () => {
  it('complete 后应忽略 next', () => {
    const next = vi.fn()
    const complete = vi.fn()
    const subscriber = new Subscriber({ next, complete })

    subscriber.next(1)
    subscriber.complete()
    subscriber.next(2)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(1)
  })

  it('error 后应忽略 next 和 complete', () => {
    const next = vi.fn()
    const error = vi.fn()
    const complete = vi.fn()
    const subscriber = new Subscriber({ next, error, complete })

    subscriber.next(1)
    subscriber.error(new Error('test'))
    subscriber.next(2)
    subscriber.complete()

    expect(next).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
    expect(complete).not.toHaveBeenCalled()
  })

  it('complete 后应自动 unsubscribe', () => {
    const subscriber = new Subscriber({})
    
    expect(subscriber.closed).toBe(false)
    subscriber.complete()
    expect(subscriber.closed).toBe(true)
  })

  it('next 回调出错应转为 error', () => {
    const error = vi.fn()
    const subscriber = new Subscriber({
      next: () => { throw new Error('next error') },
      error
    })

    subscriber.next(1)

    expect(error).toHaveBeenCalledWith(expect.any(Error))
  })
})
```

## 本章小结

本章详细阐述了 Observable 的核心契约：

- **契约规则**：`next* (error | complete)?`
- **next**：可以调用任意多次，传递值
- **error**：最多一次，异常结束，自动清理
- **complete**：最多一次，正常结束，自动清理
- **互斥**：error 和 complete 只能选一个
- **终止后忽略**：终止后的调用被静默忽略

**Subscriber** 是契约的守护者，它包装原始 Observer，确保所有调用都符合规则。

下一章，我们将探讨同步与异步 Observable 的区别，理解它们在执行时机上的差异。

---

**思考题**：

1. 为什么契约规定 error/complete 后要静默忽略后续调用，而不是抛出异常？
2. 如果 next 回调中抛出错误，为什么要转为 error 而不是直接抛出？
3. 有些 Observable 永远不会 complete（如 interval），这符合契约吗？应该如何处理？
