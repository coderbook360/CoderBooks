---
sidebar_position: 9
title: subscribe 函数：连接生产者与消费者
---

# subscribe 函数：连接生产者与消费者

`subscribe` 是 Observable 最重要的方法。它是生产者和消费者之间的桥梁——调用 `subscribe` 的那一刻，Observable 从"定义"变成"执行"。

## subscribe 的本质

思考一下 subscribe 做了什么：

```typescript
observable.subscribe(observer)
```

1. **接收** Observer（消费者）
2. **执行** 订阅函数（生产者逻辑）
3. **连接** 生产者和消费者
4. **返回** Subscription（用于断开连接）

这就像接通一条水管：Observable 是水源，Observer 是接水的容器，subscribe 是打开阀门。

## 订阅的触发时机

Observable 是惰性的，只有 subscribe 才能触发执行：

```typescript
const observable = new Observable(observer => {
  console.log('生产者开始执行')
  observer.next(1)
  observer.next(2)
})

console.log('Observable 已创建')

// 此时才开始执行
observable.subscribe(value => console.log('收到:', value))

// 输出顺序：
// Observable 已创建
// 生产者开始执行
// 收到: 1
// 收到: 2
```

### 每次订阅都是独立执行

```typescript
const random$ = new Observable<number>(observer => {
  const value = Math.random()
  console.log('生成随机数:', value)
  observer.next(value)
})

random$.subscribe(v => console.log('订阅1:', v))
random$.subscribe(v => console.log('订阅2:', v))

// 输出：
// 生成随机数: 0.123...
// 订阅1: 0.123...
// 生成随机数: 0.789...  // 注意：不同的值
// 订阅2: 0.789...
```

这是 **Cold Observable** 的特性——每次订阅都创建新的执行上下文。

## subscribe 的多种调用方式

RxJS 提供了灵活的 subscribe API：

### 1. 传入完整 Observer

```typescript
source$.subscribe({
  next: value => console.log(value),
  error: err => console.error(err),
  complete: () => console.log('done')
})
```

### 2. 只传 next 回调

```typescript
source$.subscribe(value => console.log(value))
```

### 3. 传入部分 Observer

```typescript
source$.subscribe({
  next: value => console.log(value)
  // 不关心 error 和 complete
})

source$.subscribe({
  error: err => console.error(err)
  // 只关心错误
})
```

### 4. 不传任何参数

```typescript
// 纯粹为了触发副作用
source$.subscribe()
```

## 深入 subscribe 的实现

让我们完善 subscribe 方法的实现，处理所有这些情况：

```typescript
/**
 * subscribe 方法 - 连接生产者与消费者
 */
subscribe(
  observerOrNext?: PartialObserver<T> | ((value: T) => void) | null,
  error?: ((err: unknown) => void) | null,
  complete?: (() => void) | null
): Subscription {
  // 规范化为完整的 Observer
  const observer = this.normalizeObserver(observerOrNext, error, complete)
  
  // 创建订阅对象
  const subscription = new Subscription()
  
  // 执行订阅函数
  if (this._subscribe) {
    try {
      const teardown = this._subscribe(observer)
      if (teardown) {
        subscription.add(teardown)
      }
    } catch (err) {
      // 同步错误传递给 observer
      observer.error(err)
    }
  }
  
  return subscription
}

/**
 * 规范化 Observer
 * 支持多种调用方式
 */
private normalizeObserver(
  observerOrNext?: PartialObserver<T> | ((value: T) => void) | null,
  error?: ((err: unknown) => void) | null,
  complete?: (() => void) | null
): Observer<T> {
  // 空调用
  if (observerOrNext == null && error == null && complete == null) {
    return {
      next: () => {},
      error: this.defaultErrorHandler,
      complete: () => {}
    }
  }
  
  // 传入函数参数（旧式 API）
  if (typeof observerOrNext === 'function') {
    return {
      next: observerOrNext,
      error: error ?? this.defaultErrorHandler,
      complete: complete ?? (() => {})
    }
  }
  
  // 传入 Observer 对象
  return {
    next: observerOrNext?.next?.bind(observerOrNext) ?? (() => {}),
    error: observerOrNext?.error?.bind(observerOrNext) ?? this.defaultErrorHandler,
    complete: observerOrNext?.complete?.bind(observerOrNext) ?? (() => {})
  }
}

private defaultErrorHandler(err: unknown): void {
  // 未处理的错误重新抛出
  setTimeout(() => { throw err }, 0)
}
```

### 为什么要 bind(observerOrNext)？

考虑这种情况：

```typescript
const logger = {
  prefix: '[LOG]',
  log(value: unknown) {
    console.log(this.prefix, value)  // this 指向 logger
  }
}

source$.subscribe({
  next: logger.log  // 危险：this 可能丢失
})
```

如果不做 bind，`logger.log` 被调用时 `this` 会是 undefined（严格模式）或 window。bind 确保方法能正确访问原对象。

## 订阅函数的执行上下文

订阅函数接收的 observer 参数，是生产者与消费者通信的唯一通道：

```typescript
new Observable(observer => {
  // observer 是唯一的通信接口
  observer.next(1)      // 发送值
  observer.error(err)   // 发送错误
  observer.complete()   // 发送完成
  
  return () => {
    // 清理逻辑
  }
})
```

### 同步执行

订阅函数可以同步发送值：

```typescript
const sync$ = new Observable<number>(observer => {
  console.log('开始')
  observer.next(1)
  console.log('发送了 1')
  observer.next(2)
  console.log('发送了 2')
  observer.complete()
  console.log('完成')
})

console.log('订阅前')
sync$.subscribe(v => console.log('收到:', v))
console.log('订阅后')

// 输出：
// 订阅前
// 开始
// 收到: 1
// 发送了 1
// 收到: 2
// 发送了 2
// 完成
// 订阅后
```

同步 Observable 会阻塞执行。

### 异步执行

订阅函数也可以异步发送值：

```typescript
const async$ = new Observable<number>(observer => {
  console.log('开始')
  setTimeout(() => observer.next(1), 1000)
  setTimeout(() => observer.next(2), 2000)
  setTimeout(() => observer.complete(), 3000)
  console.log('设置完成')
})

console.log('订阅前')
async$.subscribe(v => console.log('收到:', v))
console.log('订阅后')

// 立即输出：
// 订阅前
// 开始
// 设置完成
// 订阅后

// 1秒后：收到: 1
// 2秒后：收到: 2
```

异步 Observable 不会阻塞。

## 返回值：清理逻辑

订阅函数可以返回一个清理函数，在取消订阅时执行：

```typescript
const interval$ = new Observable<number>(observer => {
  let count = 0
  
  // 启动定时器
  const id = setInterval(() => {
    observer.next(count++)
  }, 1000)
  
  // 返回清理函数
  return () => {
    clearInterval(id)
    console.log('定时器已清理')
  }
})

const sub = interval$.subscribe(console.log)

// 5秒后取消
setTimeout(() => {
  sub.unsubscribe()
  // 输出: 定时器已清理
}, 5000)
```

清理函数可以是：

- 普通函数：`() => { ... }`
- Subscription 对象：自动调用其 `unsubscribe`
- undefined/void：无需清理

```typescript
new Observable(observer => {
  // 方式1：返回函数
  return () => console.log('清理1')
})

new Observable(observer => {
  // 方式2：返回 Subscription
  const innerSub = otherSource$.subscribe(/*...*/)
  return innerSub
})

new Observable(observer => {
  // 方式3：不返回（无需清理）
  observer.next(1)
  observer.complete()
})
```

## 错误处理

subscribe 需要正确处理各种错误场景：

### 订阅函数的同步错误

```typescript
const faulty$ = new Observable(observer => {
  throw new Error('同步错误')
})

faulty$.subscribe({
  next: () => {},
  error: err => console.log('捕获到:', err.message)
})
// 输出: 捕获到: 同步错误
```

### 订阅函数的异步错误

```typescript
const asyncFaulty$ = new Observable(observer => {
  setTimeout(() => {
    // 这个错误无法被 subscribe 的 try-catch 捕获
    throw new Error('异步错误')
  }, 1000)
})

// 正确做法：在订阅函数中捕获并传递给 observer
const asyncFaulty2$ = new Observable(observer => {
  setTimeout(() => {
    try {
      throw new Error('异步错误')
    } catch (err) {
      observer.error(err)  // 通过 observer 传递
    }
  }, 1000)
})
```

### 未处理的错误

如果 observer 没有提供 error 处理：

```typescript
source$.subscribe(console.log)  // 只有 next，没有 error

// 如果 source$ 发生错误，我们的实现会重新抛出
```

## Subscription 的返回

subscribe 返回 Subscription，用于：

1. **取消订阅**：停止接收值
2. **释放资源**：执行清理逻辑
3. **检查状态**：通过 `closed` 属性

```typescript
const sub = source$.subscribe(console.log)

// 检查状态
console.log(sub.closed)  // false

// 取消订阅
sub.unsubscribe()

console.log(sub.closed)  // true
```

### 组合多个订阅

```typescript
const parent = new Subscription()

const sub1 = source1$.subscribe(/*...*/)
const sub2 = source2$.subscribe(/*...*/)
const sub3 = source3$.subscribe(/*...*/)

parent.add(sub1)
parent.add(sub2)
parent.add(sub3)

// 一次性取消所有
parent.unsubscribe()
```

## 完整的 subscribe 流程

```
subscribe(observer) 被调用
         │
         ▼
┌─────────────────────────┐
│ 规范化 observer 参数    │
│ (处理多种调用方式)       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 创建 Subscription 对象  │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 执行订阅函数            │
│ try {                   │
│   teardown = _subscribe │
│ } catch (err) {         │
│   observer.error(err)   │
│ }                       │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 将 teardown 添加到      │
│ Subscription            │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 返回 Subscription       │
└─────────────────────────┘
```

## 单元测试

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Observable } from './Observable'

describe('Observable.subscribe', () => {
  it('应该支持只传 next 回调', () => {
    const values: number[] = []
    const obs$ = new Observable<number>(o => {
      o.next(1)
      o.next(2)
    })
    
    obs$.subscribe(v => values.push(v))
    
    expect(values).toEqual([1, 2])
  })

  it('应该支持部分 Observer', () => {
    const completed = vi.fn()
    const obs$ = new Observable(o => o.complete())
    
    obs$.subscribe({ complete: completed })
    
    expect(completed).toHaveBeenCalled()
  })

  it('应该在取消时执行清理函数', () => {
    const cleanup = vi.fn()
    const obs$ = new Observable(() => cleanup)
    
    const sub = obs$.subscribe()
    sub.unsubscribe()
    
    expect(cleanup).toHaveBeenCalled()
  })

  it('应该捕获同步错误', () => {
    const errorHandler = vi.fn()
    const obs$ = new Observable(() => {
      throw new Error('test')
    })
    
    obs$.subscribe({ error: errorHandler })
    
    expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
  })

  it('空订阅不应抛出', () => {
    const obs$ = new Observable(o => o.next(1))
    
    expect(() => obs$.subscribe()).not.toThrow()
  })
})
```

## 本章小结

本章深入探讨了 subscribe 方法：

- **本质**：subscribe 是连接生产者与消费者的桥梁
- **多种调用方式**：完整 Observer、只有 next、部分 Observer、空调用
- **参数规范化**：将各种输入统一转换为 Observer
- **执行时机**：subscribe 触发订阅函数执行（惰性）
- **清理机制**：订阅函数返回的 teardown 在取消时执行
- **错误处理**：同步错误捕获并传递给 observer.error

下一章，我们将详细讨论 Observable 的契约：next、error、complete 三者之间的约束关系。

---

**思考题**：

1. 为什么 subscribe 的默认 error 处理要用 `setTimeout` 重新抛出错误？
2. 如果订阅函数中的 observer.next 抛出错误，应该如何处理？
3. Cold Observable 和 Hot Observable 在 subscribe 行为上有什么区别？
