---
sidebar_position: 11
title: 同步与异步 Observable
---

# 同步与异步 Observable

Observable 可以同步发送值，也可以异步发送值。这两种模式的行为差异很大，理解它们对于正确使用 RxJS 至关重要。

## 同步 Observable

同步 Observable 在订阅时立即、同步地发送所有值：

```typescript
const sync$ = new Observable<number>(subscriber => {
  console.log('开始发送')
  subscriber.next(1)
  subscriber.next(2)
  subscriber.next(3)
  subscriber.complete()
  console.log('发送完成')
})

console.log('订阅前')
sync$.subscribe(v => console.log('收到:', v))
console.log('订阅后')
```

输出：
```
订阅前
开始发送
收到: 1
收到: 2
收到: 3
发送完成
订阅后
```

关键观察：**"订阅后" 在所有值都发送完之后才打印**。同步 Observable 会阻塞执行。

### 同步 Observable 的特点

- **立即执行**：subscribe 调用时立即开始发送
- **阻塞性**：发送完所有值后才返回
- **可预测**：执行顺序完全确定
- **无需清理定时器**：没有异步资源

### 常见的同步 Observable

```typescript
// of：同步发送多个值
of(1, 2, 3).subscribe(console.log)
// 立即打印 1, 2, 3

// from（数组）：同步迭代
from([1, 2, 3]).subscribe(console.log)
// 立即打印 1, 2, 3

// range：同步发送范围
range(1, 5).subscribe(console.log)
// 立即打印 1, 2, 3, 4, 5

// EMPTY：同步完成
EMPTY.subscribe({
  complete: () => console.log('完成')
})
// 立即打印 '完成'
```

## 异步 Observable

异步 Observable 通过定时器、Promise 或事件等机制，在未来某个时刻发送值：

```typescript
const async$ = new Observable<number>(subscriber => {
  console.log('开始')
  
  setTimeout(() => subscriber.next(1), 1000)
  setTimeout(() => subscriber.next(2), 2000)
  setTimeout(() => {
    subscriber.next(3)
    subscriber.complete()
  }, 3000)
  
  console.log('设置完成')
})

console.log('订阅前')
async$.subscribe(v => console.log('收到:', v))
console.log('订阅后')
```

输出：
```
订阅前
开始
设置完成
订阅后        <-- 立即打印
收到: 1       <-- 1秒后
收到: 2       <-- 2秒后
收到: 3       <-- 3秒后
```

关键观察：**"订阅后" 立即打印**，值在之后异步到达。

### 异步 Observable 的特点

- **非阻塞**：subscribe 立即返回
- **延迟发送**：值在未来某个时刻到达
- **需要清理**：可能有定时器、事件监听器等需要清理
- **执行时机不确定**：取决于事件循环

### 常见的异步 Observable

```typescript
// interval：每隔一段时间发送值
interval(1000).subscribe(console.log)
// 每秒打印 0, 1, 2, 3...

// timer：延迟后发送，可选重复
timer(2000).subscribe(() => console.log('2秒后'))
timer(0, 1000).subscribe(console.log)  // 立即开始，每秒一次

// fromEvent：DOM 事件
fromEvent(button, 'click').subscribe(console.log)
// 用户点击时触发

// fromPromise：Promise 转 Observable
from(fetch('/api/data').then(r => r.json()))
  .subscribe(console.log)
// 请求完成时触发
```

## 同步与异步的混合

一个 Observable 可以同时包含同步和异步部分：

```typescript
const mixed$ = new Observable<string>(subscriber => {
  // 同步部分
  subscriber.next('同步1')
  subscriber.next('同步2')
  
  // 异步部分
  setTimeout(() => {
    subscriber.next('异步1')
    subscriber.complete()
  }, 1000)
})

console.log('订阅前')
mixed$.subscribe(v => console.log('收到:', v))
console.log('订阅后')
```

输出：
```
订阅前
收到: 同步1
收到: 同步2
订阅后
收到: 异步1    <-- 1秒后
```

## 操作符对同步/异步的影响

一些操作符可以改变 Observable 的同步/异步特性：

### observeOn：强制异步

```typescript
import { of } from 'rxjs'
import { observeOn, asyncScheduler } from 'rxjs'

console.log('开始')

of(1, 2, 3).pipe(
  observeOn(asyncScheduler)  // 强制异步
).subscribe(v => console.log('收到:', v))

console.log('结束')
```

输出：
```
开始
结束
收到: 1
收到: 2
收到: 3
```

`observeOn` 将同步 Observable 变成了异步的。

### delay：延迟发送

```typescript
of(1, 2, 3).pipe(
  delay(1000)  // 延迟1秒发送
).subscribe(console.log)
```

### subscribeOn：延迟订阅

```typescript
of(1, 2, 3).pipe(
  subscribeOn(asyncScheduler)  // 延迟订阅到下一个事件循环
).subscribe(console.log)

console.log('订阅后')
// 先打印 "订阅后"，再打印 1, 2, 3
```

## 为什么同步/异步很重要

### 1. 影响执行顺序

```typescript
// 同步：可预测的顺序
let value = 0
of(1).subscribe(v => { value = v })
console.log(value)  // 1

// 异步：需要在回调中使用
let value2 = 0
timer(0).subscribe(v => { value2 = v })
console.log(value2)  // 0 !!!（还没执行）
```

### 2. 影响错误处理

```typescript
// 同步错误：可以被 try-catch
try {
  of(1, 2, 3).subscribe(v => {
    if (v === 2) throw new Error('同步错误')
  })
} catch (e) {
  console.log('捕获到')  // 可以捕获
}

// 异步错误：try-catch 无效
try {
  interval(100).subscribe(v => {
    if (v === 2) throw new Error('异步错误')
  })
} catch (e) {
  console.log('捕获到')  // 永远不会执行
}
// 需要用 error 回调或 catchError 操作符
```

### 3. 影响取消行为

```typescript
// 同步：取消可能来不及
const sub = of(1, 2, 3, 4, 5).subscribe(console.log)
sub.unsubscribe()  // 太晚了，所有值都已发送

// 异步：可以随时取消
const sub2 = interval(1000).subscribe(console.log)
setTimeout(() => sub2.unsubscribe(), 2500)  // 只会收到 0, 1, 2
```

## 实现同步/异步创建操作符

### of：同步创建

```typescript
function of<T>(...values: T[]): Observable<T> {
  return new Observable(subscriber => {
    for (const value of values) {
      if (subscriber.closed) break  // 如果已取消，停止
      subscriber.next(value)
    }
    subscriber.complete()
  })
}
```

### interval：异步创建

```typescript
function interval(period: number): Observable<number> {
  return new Observable(subscriber => {
    let count = 0
    
    const id = setInterval(() => {
      subscriber.next(count++)
    }, period)
    
    // 返回清理函数
    return () => clearInterval(id)
  })
}
```

### timer：延迟创建

```typescript
function timer(delay: number, period?: number): Observable<number> {
  return new Observable(subscriber => {
    let count = 0
    let intervalId: number | undefined
    
    const timeoutId = setTimeout(() => {
      subscriber.next(count++)
      
      if (period !== undefined) {
        // 有周期，继续发送
        intervalId = setInterval(() => {
          subscriber.next(count++)
        }, period)
      } else {
        // 无周期，发送一次就完成
        subscriber.complete()
      }
    }, delay)
    
    return () => {
      clearTimeout(timeoutId)
      if (intervalId !== undefined) {
        clearInterval(intervalId)
      }
    }
  })
}
```

## 使用 Scheduler 控制时序

RxJS 使用 **Scheduler（调度器）** 来控制操作的执行时机。

### 主要的 Scheduler

| Scheduler | 说明 | 使用场景 |
|-----------|------|----------|
| `null` | 同步执行 | 默认，适用于同步操作 |
| `queueScheduler` | 同步但排队 | 防止栈溢出 |
| `asapScheduler` | 微任务 | 尽快执行但不阻塞 |
| `asyncScheduler` | 宏任务 | setTimeout 风格 |
| `animationFrameScheduler` | 动画帧 | 动画、UI 更新 |

### Scheduler 的使用

```typescript
import { of, asyncScheduler } from 'rxjs'
import { observeOn, subscribeOn } from 'rxjs/operators'

// 方式1：创建时指定
of(1, 2, 3, asyncScheduler).subscribe(console.log)

// 方式2：通过 observeOn
of(1, 2, 3).pipe(
  observeOn(asyncScheduler)
).subscribe(console.log)

// 方式3：通过 subscribeOn
of(1, 2, 3).pipe(
  subscribeOn(asyncScheduler)
).subscribe(console.log)
```

## 测试同步/异步 Observable

### 测试同步 Observable

同步 Observable 测试简单直接：

```typescript
import { describe, it, expect } from 'vitest'
import { of } from '../creation/of'

describe('of (同步)', () => {
  it('应该同步发送所有值', () => {
    const values: number[] = []
    
    of(1, 2, 3).subscribe(v => values.push(v))
    
    // 同步执行，立即断言
    expect(values).toEqual([1, 2, 3])
  })
})
```

### 测试异步 Observable

异步 Observable 需要特殊处理：

```typescript
import { describe, it, expect, vi } from 'vitest'
import { interval } from '../creation/interval'

describe('interval (异步)', () => {
  it('应该每隔一段时间发送值', async () => {
    vi.useFakeTimers()
    
    const values: number[] = []
    const sub = interval(1000).subscribe(v => values.push(v))
    
    // 快进时间
    vi.advanceTimersByTime(3500)
    
    expect(values).toEqual([0, 1, 2, 3])
    
    sub.unsubscribe()
    vi.useRealTimers()
  })
})
```

## 本章小结

本章探讨了同步与异步 Observable 的区别：

| 特性 | 同步 Observable | 异步 Observable |
|------|-----------------|-----------------|
| 执行时机 | subscribe 时立即执行 | 未来某时刻执行 |
| 阻塞性 | 阻塞直到完成 | 立即返回 |
| 取消 | 可能来不及 | 可以随时取消 |
| 资源清理 | 通常不需要 | 需要清理定时器等 |
| 测试 | 直接断言 | 需要时间控制 |

关键点：
- **of、from（数组）、range** 是同步的
- **interval、timer、fromEvent、HTTP 请求** 是异步的
- **Scheduler** 可以改变同步/异步特性
- 理解同步/异步对于正确处理执行顺序和资源清理至关重要

至此，第二部分"Observable 核心实现"完成。我们已经实现了 Observable 类的核心功能，理解了订阅机制、契约规则和同步/异步特性。下一部分，我们将实现 Observer 和 Subscriber。

---

**思考题**：

1. 为什么 `of(1, 2, 3)` 是同步的，而 `from(promise)` 是异步的？
2. 如果要实现一个既可以同步也可以异步的 Observable（根据参数决定），应该如何设计？
3. 在什么场景下需要使用 `subscribeOn` 将同步 Observable 变成异步的？
