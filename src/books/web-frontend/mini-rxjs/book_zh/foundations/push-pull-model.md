---
sidebar_position: 4
title: Push 与 Pull 系统：理解数据流模型
---

# Push 与 Pull 系统：理解数据流模型

在上一章，我们提到 Observable 是迭代器的"对偶"。这个概念的核心在于 **Push（推送）** 和 **Pull（拉取）** 两种数据流动方式的本质区别。理解这个区别，是理解 Observable 设计的关键。

## 谁在控制数据流动？

思考一个最基本的问题：**数据的生产者和消费者，谁在掌控数据的流动？**

这个问题的答案决定了系统的架构模式。

### Pull 系统：消费者主导

在 Pull 系统中，**消费者决定何时获取数据**。生产者是被动的，只有被请求时才提供数据。

最典型的例子是**函数调用**：

```typescript
// 消费者（调用方）决定何时获取数据
function getUser(id: number): User {
  return database.findById(id)  // 生产者被动响应
}

// 消费者主动调用
const user = getUser(1)  // 我想要数据，现在就给我
```

**迭代器**是另一个 Pull 系统的典型例子：

```typescript
function* generateNumbers() {
  console.log('生成 1')
  yield 1
  console.log('生成 2')
  yield 2
  console.log('生成 3')
  yield 3
}

const iterator = generateNumbers()
// 消费者控制节奏
console.log(iterator.next().value)  // 打印 "生成 1"，然后返回 1
// ... 消费者可以在任意时机继续
console.log(iterator.next().value)  // 打印 "生成 2"，然后返回 2
```

在这个模型中：
- 生产者（generator 函数）不知道消费者何时会请求下一个值
- 消费者完全控制数据获取的时机和节奏
- 如果消费者不调用 `next()`，生产者就暂停等待

### Push 系统：生产者主导

在 Push 系统中，**生产者决定何时发送数据**。消费者是被动的，只能等待接收数据。

最典型的例子是**事件监听**：

```typescript
// 消费者只能被动等待
button.addEventListener('click', (event) => {
  console.log('用户点击了！')  // 不知道什么时候会执行
})

// 生产者（用户）决定何时点击
// 消费者无法控制
```

**Promise** 也是 Push 系统（单值）：

```typescript
const promise = fetch('/api/data')

// 消费者只能被动等待结果
promise.then(data => {
  console.log(data)  // 不知道什么时候执行
})

// 网络请求何时返回，消费者无法控制
```

在这个模型中：
- 生产者决定数据何时到达
- 消费者无法控制接收时机
- 消费者必须准备好处理任意时刻到达的数据

## Pull 与 Push 的对比

用一个表格来系统对比：

| 特性 | Pull 系统 | Push 系统 |
|------|-----------|-----------|
| 控制权 | 消费者 | 生产者 |
| 数据流向 | 消费者主动获取 | 生产者主动推送 |
| 执行时机 | 消费者决定 | 生产者决定 |
| 典型例子 | 函数、迭代器 | 事件、Promise、Observable |
| 阻塞特性 | 同步阻塞等待 | 异步非阻塞 |
| 背压处理 | 消费者天然控制 | 需要额外机制 |

### 生活中的类比

**Pull 模式**就像去餐厅点餐：
- 你（消费者）决定什么时候点什么菜
- 服务员（生产者）等你点餐
- 你不点，厨房就不做

**Push 模式**就像订阅外卖服务：
- 餐厅（生产者）做好了就送
- 你（消费者）等着接收
- 什么时候送到，你无法控制

## JavaScript 中的四种数据获取模式

结合单值/多值和 Pull/Push 两个维度，JavaScript 中有四种基本模式：

```
                 单值              多值
            ┌──────────────┬──────────────┐
    Pull    │   Function   │   Iterator   │
            ├──────────────┼──────────────┤
    Push    │   Promise    │  Observable  │
            └──────────────┴──────────────┘
```

### 1. Function（Pull + 单值）

```typescript
function getValue(): number {
  return 42
}

// 消费者拉取单个值
const value = getValue()
```

特点：同步、阻塞、立即返回。

### 2. Iterator（Pull + 多值）

```typescript
function* getValues(): Generator<number> {
  yield 1
  yield 2
  yield 3
}

// 消费者逐个拉取多个值
const iterator = getValues()
for (const value of iterator) {
  console.log(value)
}
```

特点：可以产出多个值，消费者控制迭代节奏。

### 3. Promise（Push + 单值）

```typescript
function getValueAsync(): Promise<number> {
  return new Promise(resolve => {
    setTimeout(() => resolve(42), 1000)
  })
}

// 消费者被动接收单个值
getValueAsync().then(value => {
  console.log(value)
})
```

特点：异步、单值、不可取消。

### 4. Observable（Push + 多值）

```typescript
function getValuesAsync(): Observable<number> {
  return new Observable(subscriber => {
    subscriber.next(1)
    setTimeout(() => subscriber.next(2), 1000)
    setTimeout(() => {
      subscriber.next(3)
      subscriber.complete()
    }, 2000)
  })
}

// 消费者被动接收多个值
getValuesAsync().subscribe(value => {
  console.log(value)
})
```

特点：异步、多值、可取消、惰性执行。

## Observable 填补了什么空白

在 Observable 出现之前，JavaScript 处理"异步多值"场景时非常尴尬：

```typescript
// 场景：WebSocket 消息流

// 方式1：回调地狱
ws.onmessage = (msg1) => {
  process(msg1)
  // 如何处理后续消息？如何组合？如何取消？
}

// 方式2：事件监听
ws.addEventListener('message', handler)
// 如何与其他事件组合？如何做超时处理？如何重试？

// 方式3：Promise（不够用）
// Promise 只能 resolve 一次，无法处理持续的消息流
```

Observable 完美填补了这个空白：

```typescript
// Observable 方式
const messages$ = new Observable<Message>(subscriber => {
  const ws = new WebSocket('ws://...')
  
  ws.onmessage = e => subscriber.next(JSON.parse(e.data))
  ws.onerror = e => subscriber.error(e)
  ws.onclose = () => subscriber.complete()
  
  // 返回清理函数
  return () => ws.close()
})

// 可以轻松组合
messages$.pipe(
  filter(msg => msg.type === 'chat'),
  map(msg => msg.content),
  takeUntil(logout$),
  retry(3)
).subscribe(content => {
  displayMessage(content)
})
```

## Push 系统的核心挑战：背压

Push 系统有一个 Pull 系统不存在的问题：**背压（Backpressure）**。

当生产者推送数据的速度超过消费者处理的速度时，会发生什么？

```typescript
// 生产者：每毫秒产生一个值
const fast$ = interval(1).pipe(
  take(1000)
)

// 消费者：每100毫秒才能处理一个值
fast$.subscribe(async value => {
  await heavyComputation(value)  // 耗时 100ms
})
```

在这个例子中，生产者 1 秒产生 1000 个值，消费者 1 秒只能处理 10 个。

### 背压策略

RxJS 提供了多种操作符来处理背压：

**1. 丢弃策略（Sampling）**

```typescript
// 每100ms采样一次，丢弃中间的值
fast$.pipe(
  sampleTime(100)
).subscribe(handle)
```

**2. 缓冲策略（Buffering）**

```typescript
// 缓冲100个值后批量处理
fast$.pipe(
  bufferCount(100)
).subscribe(batch => {
  processBatch(batch)
})
```

**3. 节流策略（Throttling）**

```typescript
// 每100ms最多处理一个值
fast$.pipe(
  throttleTime(100)
).subscribe(handle)
```

**4. 切换策略（Switching）**

```typescript
// 有新值时放弃处理旧值
fast$.pipe(
  switchMap(value => processAsync(value))
).subscribe(result => {})
```

理解背压对于设计健壮的响应式系统至关重要。我们在后续实现操作符时会深入讨论。

## 理解"时间"在 Push 系统中的角色

Push 系统引入了一个 Pull 系统不需要考虑的维度：**时间**。

在 Pull 系统中，时间由消费者控制。在 Push 系统中，时间是数据流的一部分。

### Marble 图：可视化时间流

RxJS 社区发明了 Marble 图来可视化带时间维度的数据流：

```
时间轴:  ────────────────────────────────→

source$:   ──1────2────3────4────5───|
              ↓    ↓    ↓    ↓    ↓
filter(x => x % 2 === 0)
              ×    ↓    ×    ↓    ×
filtered$: ───────2─────────4────────|
```

符号说明：
- `─` 时间流逝
- `1, 2, 3` 发射的值
- `|` 完成信号
- `×` 值被过滤掉

### 时间相关操作符

RxJS 有大量处理时间的操作符：

```typescript
// 延迟发射
source$.pipe(delay(1000))

// 防抖：等待静默期
source$.pipe(debounceTime(300))

// 节流：限制发射频率
source$.pipe(throttleTime(1000))

// 超时：限制等待时间
source$.pipe(timeout(5000))

// 采样：定时取最新值
source$.pipe(sampleTime(100))
```

这些操作符是 Observable 相对于 Promise 的巨大优势所在。

## Observable 的惰性本质

Observable 继承了 Pull 系统的一个重要特性：**惰性（Lazy）**。

虽然 Observable 是 Push 系统，但它的**创建是惰性的**：只有被订阅时才开始执行。

```typescript
// 创建 Observable —— 此时什么都不会发生
const observable = new Observable(subscriber => {
  console.log('开始执行')
  subscriber.next(1)
  subscriber.next(2)
  subscriber.complete()
})

console.log('Observable 已创建')

// 直到订阅，才开始执行
observable.subscribe(value => console.log(value))

// 输出顺序：
// "Observable 已创建"
// "开始执行"
// 1
// 2
```

这与 Promise 形成对比：

```typescript
// Promise 一创建就立即执行
const promise = new Promise(resolve => {
  console.log('立即执行')  // 立刻打印
  resolve(1)
})

console.log('Promise 已创建')  // 在 "立即执行" 之后打印
```

惰性执行带来重要优势：
- **资源节省**：不订阅就不消耗资源
- **可复用**：同一个 Observable 可以被多次订阅
- **可测试**：可以创建 Observable 但延迟到测试时才执行

## 本章小结

本章我们深入理解了 Push 和 Pull 两种数据流模型：

- **Pull 系统**：消费者控制数据获取时机（Function、Iterator）
- **Push 系统**：生产者控制数据推送时机（Promise、Observable）
- **Observable 定位**：Push + 多值，填补了 JavaScript 的空白
- **背压问题**：Push 系统需要处理生产速度超过消费速度的情况
- **时间维度**：Push 系统需要考虑时间，RxJS 提供了丰富的时间操作符
- **惰性执行**：Observable 虽是 Push 模式，但创建是惰性的

理解了 Push 与 Pull 的本质区别，下一章我们将深入观察者模式和迭代器模式，这两个模式正是 Observable 的设计基础。

---

**思考题**：

1. 为什么说 Iterator 是 Pull 系统而 Observable 是 Push 系统？从代码结构上如何体现？
2. 在什么场景下应该选择 Promise，什么场景下应该选择 Observable？
3. 如果让你设计一个实时股票价格展示功能，你会如何处理背压问题？
