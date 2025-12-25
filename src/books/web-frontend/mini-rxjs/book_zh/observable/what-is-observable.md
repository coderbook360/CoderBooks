---
sidebar_position: 7
title: Observable 是什么：惰性推送集合
---

# Observable 是什么：惰性推送集合

从这一章开始，我们正式进入 Observable 的核心实现。在动手写代码之前，让我们先深入理解 Observable 的本质：**它是一个惰性的、推送多个值的集合**。

## 一个精确的定义

RxJS 官方对 Observable 的定义是：

> Observable 是多个值的惰性 Push 集合。

这个定义包含三个关键词：

- **惰性（Lazy）**：只有被订阅时才开始执行
- **Push**：生产者决定何时发送数据
- **多个值（Multiple values）**：可以发送零个、一个或多个值

让我们逐一剖析。

## 惰性：订阅才执行

Observable 的惰性特性是它区别于 Promise 的关键特征之一。

### Promise：立即执行

```typescript
// Promise 一创建就开始执行
const promise = new Promise((resolve) => {
  console.log('Promise 执行了')  // 立即打印
  resolve(42)
})

console.log('Promise 创建完成')

// 输出顺序：
// Promise 执行了
// Promise 创建完成
```

### Observable：延迟执行

```typescript
// Observable 创建时不执行
const observable = new Observable((subscriber) => {
  console.log('Observable 执行了')  // 不会立即打印
  subscriber.next(42)
})

console.log('Observable 创建完成')

// 订阅时才执行
observable.subscribe(value => console.log(value))

// 输出顺序：
// Observable 创建完成
// Observable 执行了
// 42
```

### 惰性带来的优势

**1. 资源节约**

```typescript
// 创建一个昂贵的 Observable
const expensive$ = new Observable(subscriber => {
  console.log('执行昂贵的计算...')
  const result = heavyComputation()
  subscriber.next(result)
})

// 如果条件不满足，根本不会执行
if (userNeedsData) {
  expensive$.subscribe(console.log)
}
```

**2. 可复用**

```typescript
const data$ = new Observable(subscriber => {
  fetch('/api/data')
    .then(r => r.json())
    .then(data => {
      subscriber.next(data)
      subscriber.complete()
    })
})

// 每次订阅都是新的执行
data$.subscribe(console.log)  // 发起请求 1
data$.subscribe(console.log)  // 发起请求 2
```

**3. 可组合**

```typescript
// 可以先构建管道，稍后执行
const pipeline$ = source$.pipe(
  filter(x => x > 0),
  map(x => x * 2),
  take(5)
)

// 管道构建完成，但还没执行任何操作
// 直到订阅时才开始

setTimeout(() => {
  pipeline$.subscribe(console.log)  // 现在才执行
}, 5000)
```

## Push：生产者掌控

在 Observable 中，生产者（Observable 内部逻辑）决定数据何时被发送。

### 生产者主动推送

```typescript
const observable = new Observable(subscriber => {
  // 生产者决定发送时机
  subscriber.next(1)                           // 立即发送
  setTimeout(() => subscriber.next(2), 1000)   // 1秒后发送
  setTimeout(() => subscriber.next(3), 2000)   // 2秒后发送
})

observable.subscribe(value => {
  // 消费者只能被动接收
  console.log('收到:', value)
})
```

### 与 Pull 系统对比

```typescript
// Pull：消费者决定何时获取
function* generator() {
  yield 1
  yield 2
  yield 3
}

const iter = generator()
console.log(iter.next().value)  // 消费者主动调用
console.log(iter.next().value)  // 消费者决定时机
console.log(iter.next().value)

// Push：生产者决定何时发送
const observable = new Observable(subscriber => {
  subscriber.next(1)  // 生产者主动发送
  subscriber.next(2)  // 生产者决定时机
  subscriber.next(3)
})

observable.subscribe(console.log)  // 消费者只是注册回调
```

## 多个值：超越 Promise

Promise 只能 resolve 一次，Observable 可以发送任意多个值。

### Promise：单值

```typescript
const promise = new Promise(resolve => {
  resolve(1)
  resolve(2)  // 无效，第一次 resolve 后就结束了
  resolve(3)
})

promise.then(console.log)  // 只打印 1
```

### Observable：多值

```typescript
const observable = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.next(3)
  subscriber.complete()
})

observable.subscribe(console.log)  // 打印 1, 2, 3
```

### 处理持续的数据流

```typescript
// 用户输入事件：持续的数据流
const input$ = new Observable(subscriber => {
  const input = document.querySelector('input')!
  const handler = (e: Event) => {
    subscriber.next((e.target as HTMLInputElement).value)
  }
  input.addEventListener('input', handler)
  
  return () => input.removeEventListener('input', handler)
})

// WebSocket 消息：持续的数据流
const messages$ = new Observable(subscriber => {
  const ws = new WebSocket('ws://example.com')
  ws.onmessage = e => subscriber.next(JSON.parse(e.data))
  ws.onerror = e => subscriber.error(e)
  ws.onclose = () => subscriber.complete()
  
  return () => ws.close()
})

// 定时器：持续的数据流
const timer$ = new Observable(subscriber => {
  let count = 0
  const id = setInterval(() => {
    subscriber.next(count++)
  }, 1000)
  
  return () => clearInterval(id)
})
```

## Observable 的生命周期

每个 Observable 都有清晰的生命周期：

```
创建 ──→ 订阅 ──→ 执行 ──→ 结束
         │         │        │
         │         │        ├── 完成(complete)
         │         │        └── 错误(error)
         │         │
         │         └── 发送值(next)
         │
         └── 取消订阅(unsubscribe)
```

### 三种结束方式

**1. 完成（Complete）**

```typescript
const finite$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()  // 正常完成
  subscriber.next(3)     // 不会被发送
})
```

**2. 错误（Error）**

```typescript
const faulty$ = new Observable(subscriber => {
  subscriber.next(1)
  subscriber.error(new Error('出错了'))  // 错误结束
  subscriber.next(2)  // 不会被发送
})
```

**3. 取消订阅（Unsubscribe）**

```typescript
const infinite$ = new Observable(subscriber => {
  let count = 0
  const id = setInterval(() => {
    subscriber.next(count++)
  }, 1000)
  
  return () => {
    clearInterval(id)
    console.log('已清理')
  }
})

const subscription = infinite$.subscribe(console.log)

// 3秒后取消
setTimeout(() => {
  subscription.unsubscribe()  // 触发清理函数
}, 3000)
```

## Observable 的核心组成

从实现角度看，Observable 包含几个核心部分：

### 1. 订阅函数（Subscribe Function）

这是 Observable 的核心逻辑，定义了如何产生数据：

```typescript
type SubscribeFunction<T> = (subscriber: Subscriber<T>) => TeardownLogic
```

### 2. 观察者（Observer）

接收数据的消费者接口：

```typescript
interface Observer<T> {
  next: (value: T) => void
  error: (err: unknown) => void
  complete: () => void
}
```

### 3. 清理逻辑（Teardown Logic）

取消订阅时执行的清理函数：

```typescript
type TeardownLogic = (() => void) | void | Subscription
```

### 4. 订阅对象（Subscription）

表示一个订阅，可用于取消：

```typescript
interface Subscription {
  unsubscribe(): void
  closed: boolean
}
```

## Observable vs 其他异步原语

| 特性 | Callback | Promise | Observable |
|------|----------|---------|------------|
| 惰性 | ❌ | ❌ | ✅ |
| 多值 | ✅ | ❌ | ✅ |
| 可取消 | 困难 | ❌ | ✅ |
| 错误处理 | 手动 | 链式 | 链式 |
| 组合能力 | 差 | 中等 | 强 |
| 时间控制 | 手动 | 无 | 丰富 |

### 什么时候用什么

**使用 Promise 的场景**：
- 单次异步操作（如一次 HTTP 请求）
- 不需要取消
- 只关心最终结果

**使用 Observable 的场景**：
- 持续的事件流（用户交互、WebSocket）
- 需要取消订阅
- 需要复杂的时序控制（防抖、节流、超时）
- 需要组合多个数据源

## 从零理解：最简 Observable

为了理解 Observable 的本质，让我们从最简单的实现开始：

```typescript
// 最简单的 Observable 实现
class SimpleObservable<T> {
  constructor(private _subscribe: (observer: Observer<T>) => void) {}

  subscribe(observer: Observer<T>): void {
    this._subscribe(observer)
  }
}

// 使用
const simple$ = new SimpleObservable<number>(observer => {
  observer.next(1)
  observer.next(2)
  observer.next(3)
  observer.complete()
})

simple$.subscribe({
  next: value => console.log('值:', value),
  error: err => console.error('错误:', err),
  complete: () => console.log('完成')
})

// 输出：
// 值: 1
// 值: 2
// 值: 3
// 完成
```

这就是 Observable 的核心思想！当然，真正的 Observable 还需要处理更多细节：

- 支持只传递部分回调
- 返回可取消的 Subscription
- 保证 error/complete 后不再发送值
- 自动清理资源

下一章，我们将实现完整的 Observable 类。

## 本章小结

本章我们深入理解了 Observable 的本质：

- **惰性**：只有订阅时才执行，可复用、可组合
- **Push 模式**：生产者决定数据发送时机
- **多值**：可以发送零个、一个或多个值
- **生命周期**：创建 → 订阅 → 执行 → 结束（完成/错误/取消）
- **核心组成**：订阅函数、观察者、清理逻辑、订阅对象

Observable 可以统一处理各种异步场景：事件、定时器、HTTP 请求、WebSocket 等。它是响应式编程的核心抽象。

---

**思考题**：

1. 为什么说 Observable 是"惰性"的？这和 Promise 有什么本质区别？
2. 如果一个 Observable 永远不发送 complete 或 error，会有什么问题？
3. 设计一个 Observable，将普通数组转换为异步发射的数据流（每 100ms 发射一个元素）。
