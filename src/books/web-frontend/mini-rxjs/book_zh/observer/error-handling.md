---
sidebar_position: 15
title: Observer 错误处理机制
---

# Observer 错误处理机制

错误处理是响应式编程中最关键的部分之一。本章系统地探讨 Observer 层面的错误处理机制。

## 错误的分类

在 Observable 系统中，错误来源有两类：

### 来源一：Observable 发出的错误

```typescript
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.error(new Error('数据源错误'))  // Observable 主动发出
})
```

这是正常的错误通知，表示数据流出现了问题。

### 来源二：Observer 回调中的错误

```typescript
source$.subscribe({
  next: value => {
    throw new Error('处理数据时出错')  // Observer 回调抛出
  }
})
```

这是用户代码的错误，需要特殊处理。

## 错误处理策略

### 策略一：error 回调

最基本的错误处理方式：

```typescript
source$.subscribe({
  next: value => console.log(value),
  error: err => console.error('出错了:', err),
  complete: () => console.log('完成')
})
```

error 回调接收错误对象，可以进行日志记录、用户提示等。

### 策略二：默认错误处理

如果没有提供 error 回调：

```typescript
source$.subscribe(value => console.log(value))
// 如果发生错误会怎样？
```

RxJS 的默认行为是抛出错误：

```typescript
function defaultErrorHandler(err: unknown): void {
  throw err
}
```

这确保错误不会被静默吞掉。

### 策略三：全局错误处理

对于无法通过 error 回调处理的错误（如 complete 回调中的错误）：

```typescript
// 浏览器环境
window.addEventListener('error', event => {
  console.error('全局错误:', event.error)
})

window.addEventListener('unhandledrejection', event => {
  console.error('未处理的 Promise 拒绝:', event.reason)
})

// Node.js 环境
process.on('uncaughtException', err => {
  console.error('未捕获异常:', err)
})
```

## 错误传播规则

### 规则一：error 终止数据流

一旦调用 error，数据流结束：

```typescript
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.error(new Error('oops'))
  subscriber.next(2)  // 不会发送
  subscriber.complete()  // 不会调用
})

source$.subscribe({
  next: v => console.log('next:', v),
  error: e => console.log('error:', e.message),
  complete: () => console.log('complete')
})

// 输出:
// next: 1
// error: oops
```

### 规则二：next 错误转为 error

用户 next 回调中的错误会被转为 error 通知：

```typescript
let count = 0
const source$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.next(3)
})

source$.subscribe({
  next: value => {
    count++
    if (value === 2) throw new Error('不喜欢2')
    console.log('处理:', value)
  },
  error: err => console.log('捕获错误:', err.message)
})

// 输出:
// 处理: 1
// 捕获错误: 不喜欢2
```

注意：value 为 3 时已经不会执行了。

### 规则三：error/complete 错误异步抛出

error 和 complete 回调中的错误无法传播，只能异步抛出：

```typescript
source$.subscribe({
  error: err => {
    throw new Error('处理错误时又出错了')  // 异步抛出
  }
})
```

## 实现错误处理

### Subscriber 中的错误处理

```typescript
class Subscriber<T> extends Subscription implements Observer<T> {
  protected destination: Observer<T>
  protected isStopped = false

  error(err: unknown): void {
    if (this.isStopped) return

    this.isStopped = true
    
    try {
      this.destination.error(err)
    } catch (innerErr) {
      reportError(innerErr)
    }
    
    this.unsubscribe()
  }
}
```

关键点：

1. 检查 isStopped 防止重复调用
2. 设置 isStopped 阻止后续通知
3. try-catch 包裹用户回调
4. 异步报告无法处理的错误
5. 触发取消订阅释放资源

### 操作符中的错误处理

操作符需要正确传播错误：

```typescript
export function map<T, R>(
  project: (value: T, index: number) => R
): OperatorFunction<T, R> {
  return source => new Observable(subscriber => {
    let index = 0
    
    return source.subscribe({
      next: value => {
        let result: R
        try {
          result = project(value, index++)
        } catch (err) {
          subscriber.error(err)  // 转换错误传播给下游
          return
        }
        subscriber.next(result)
      },
      error: err => subscriber.error(err),  // 直接传播
      complete: () => subscriber.complete()
    })
  })
}
```

## 错误恢复

### catchError 操作符

捕获错误并返回替代 Observable：

```typescript
import { catchError, of } from 'rxjs'

source$.pipe(
  map(x => {
    if (x < 0) throw new Error('负数')
    return x * 2
  }),
  catchError(err => {
    console.log('捕获错误:', err.message)
    return of(0)  // 返回默认值
  })
).subscribe(console.log)
```

### retry 操作符

出错时重新订阅：

```typescript
import { retry } from 'rxjs'

source$.pipe(
  retry(3)  // 最多重试3次
).subscribe({
  next: console.log,
  error: err => console.log('重试3次后仍失败')
})
```

### retryWhen 操作符

自定义重试逻辑：

```typescript
import { retryWhen, delay } from 'rxjs'

source$.pipe(
  retryWhen(errors => errors.pipe(
    delay(1000)  // 等待1秒后重试
  ))
).subscribe(console.log)
```

## 最佳实践

### 1. 总是提供 error 回调

```typescript
// ❌ 危险：错误可能导致崩溃
source$.subscribe(value => console.log(value))

// ✅ 安全：错误被处理
source$.subscribe({
  next: value => console.log(value),
  error: err => handleError(err)
})
```

### 2. 在管道中处理错误

```typescript
source$.pipe(
  // 各种操作...
  catchError(err => {
    // 记录日志
    logError(err)
    // 返回默认值或空流
    return of(defaultValue)
  })
).subscribe(console.log)
```

### 3. 区分可恢复和不可恢复错误

```typescript
source$.pipe(
  catchError(err => {
    if (err instanceof NetworkError) {
      // 网络错误可重试
      return source$.pipe(retry(3))
    }
    // 其他错误直接传播
    throw err
  })
).subscribe(console.log)
```

### 4. 使用 finalize 确保清理

```typescript
source$.pipe(
  finalize(() => {
    // 无论成功、失败还是取消订阅都执行
    cleanup()
  })
).subscribe({
  next: console.log,
  error: handleError
})
```

## 错误处理测试

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('Observer 错误处理', () => {
  it('Observable error 应终止数据流', () => {
    const next = vi.fn()
    const error = vi.fn()
    const complete = vi.fn()

    const source$ = new Observable(subscriber => {
      subscriber.next(1)
      subscriber.error(new Error('test'))
      subscriber.next(2)  // 不应调用
    })

    source$.subscribe({ next, error, complete })

    expect(next).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
    expect(complete).not.toHaveBeenCalled()
  })

  it('next 回调错误应传播给 error', () => {
    const error = vi.fn()

    const source$ = new Observable(subscriber => {
      subscriber.next(1)
      subscriber.next(2)
    })

    source$.subscribe({
      next: value => {
        if (value === 2) throw new Error('不喜欢2')
      },
      error
    })

    expect(error).toHaveBeenCalledWith(expect.any(Error))
  })

  it('error 后应取消订阅', () => {
    const teardown = vi.fn()

    const source$ = new Observable(subscriber => {
      subscriber.next(1)
      subscriber.error(new Error('test'))
      return teardown
    })

    source$.subscribe({
      error: () => {}
    })

    expect(teardown).toHaveBeenCalled()
  })
})
```

## 本章小结

本章深入探讨了 Observer 错误处理机制：

- **错误分类**：Observable 发出的错误 vs Observer 回调中的错误
- **处理策略**：error 回调、默认处理、全局处理
- **传播规则**：error 终止流、next 错误转 error、无法传播则异步抛出
- **错误恢复**：catchError、retry、retryWhen
- **最佳实践**：总是提供 error 回调、在管道中处理、区分错误类型

错误处理是构建健壮响应式应用的关键。下一部分，我们将学习 Subscription 订阅管理。

---

**思考题**：

1. 如果在 catchError 的回调中又抛出错误，会发生什么？
2. retry 和 catchError 的执行顺序有什么影响？
3. 如何实现一个"指数退避"的重试策略？
