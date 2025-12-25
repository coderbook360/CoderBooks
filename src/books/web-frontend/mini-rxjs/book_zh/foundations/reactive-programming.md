---
sidebar_position: 3
title: 响应式编程思想入门
---

# 响应式编程思想入门

在开始实现 Observable 之前，我们需要先理解响应式编程的核心思想。这不仅仅是一个库的使用方法，更是一种看待程序运行的全新视角。

## 从一个问题开始

假设我们要实现一个搜索框的自动补全功能，用户输入时实时显示搜索建议。听起来很简单，但实际需求往往更复杂：

- 用户输入后等待 300ms 再发请求（防抖）
- 忽略少于 2 个字符的输入
- 如果用户快速修改输入，取消之前的请求
- 请求失败时最多重试 3 次
- 显示加载状态

用传统的命令式编程来实现，代码可能是这样的：

```typescript
let timeoutId: number | null = null
let currentRequest: AbortController | null = null
let retryCount = 0
const MAX_RETRIES = 3

async function handleInput(value: string) {
  // 清除之前的定时器
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
  
  // 取消之前的请求
  if (currentRequest) {
    currentRequest.abort()
  }
  
  // 忽略短输入
  if (value.length < 2) {
    return
  }
  
  // 防抖
  timeoutId = setTimeout(async () => {
    retryCount = 0
    await fetchWithRetry(value)
  }, 300)
}

async function fetchWithRetry(value: string) {
  try {
    currentRequest = new AbortController()
    showLoading(true)
    
    const response = await fetch(`/api/search?q=${value}`, {
      signal: currentRequest.signal
    })
    
    if (!response.ok) throw new Error('Request failed')
    
    const data = await response.json()
    showSuggestions(data)
  } catch (error) {
    if ((error as Error).name === 'AbortError') return
    
    if (retryCount < MAX_RETRIES) {
      retryCount++
      await fetchWithRetry(value)
    } else {
      showError('搜索失败，请重试')
    }
  } finally {
    showLoading(false)
  }
}
```

代码能工作，但问题也很明显：

1. **状态分散**：`timeoutId`、`currentRequest`、`retryCount` 散落各处
2. **逻辑交织**：防抖、过滤、重试、取消的逻辑混在一起
3. **难以测试**：依赖定时器和网络请求
4. **难以复用**：想在别处使用相同逻辑？复制粘贴

## 换一个视角：数据流

如果我们换一个视角来看待这个问题呢？

与其关注"用户输入时我该做什么"，不如思考"数据是如何流动的"：

```
用户输入 → 过滤短输入 → 防抖300ms → 发起请求 → 重试3次 → 显示结果
```

这就是**响应式编程的核心思想**：**将程序看作数据流的转换**。

用 RxJS 实现同样的功能：

```typescript
import { fromEvent } from 'rxjs'
import { 
  map, 
  filter, 
  debounceTime, 
  switchMap, 
  retry,
  tap
} from 'rxjs/operators'

const input = document.querySelector('input')!

fromEvent(input, 'input').pipe(
  map(event => (event.target as HTMLInputElement).value),  // 提取输入值
  filter(value => value.length >= 2),                       // 过滤短输入
  debounceTime(300),                                        // 防抖
  tap(() => showLoading(true)),                            // 显示加载
  switchMap(value =>                                        // 切换到新请求
    fetch(`/api/search?q=${value}`).then(r => r.json())
  ),
  retry(3)                                                  // 重试3次
).subscribe({
  next: data => showSuggestions(data),
  error: () => showError('搜索失败'),
  complete: () => showLoading(false)
})
```

代码从 60 行缩减到 20 行，而且：

- **逻辑清晰**：每一步做什么一目了然
- **无状态变量**：不需要手动管理 `timeoutId`、`retryCount`
- **可复用**：每个操作符都是独立的、可复用的
- **可测试**：可以用虚拟时间测试时序逻辑

## 什么是响应式编程

响应式编程（Reactive Programming）是一种**面向数据流和变化传播**的编程范式。

### 核心概念

**1. 数据流（Stream）**

一切都是流。用户点击是流、网络请求是流、定时器是流、甚至变量的变化也可以是流。

```
时间 →  ──────────────────────────────────────→
点击事件:    ●          ●    ●         ●
输入事件:      ●  ●  ●         ●  ●
请求响应:           ●               ●
```

**2. 声明式转换**

我们不去命令程序"怎么做"，而是声明"数据如何流动"。

```typescript
// 命令式：告诉程序怎么做
let doubled = []
for (let i = 0; i < numbers.length; i++) {
  doubled.push(numbers[i] * 2)
}

// 声明式：描述数据转换
const doubled = numbers.map(n => n * 2)
```

**3. 自动传播变化**

当上游数据变化时，下游会自动更新。这就像 Excel 的公式：当 A1 单元格变化时，引用 A1 的所有公式都会自动重新计算。

### 响应式 vs 命令式

| 特性 | 命令式 | 响应式 |
|------|--------|--------|
| 关注点 | 怎么做（How） | 做什么（What） |
| 数据处理 | 主动获取（Pull） | 被动接收（Push） |
| 状态管理 | 手动管理变量 | 流自动传播 |
| 时间处理 | 回调、定时器 | 操作符声明 |
| 组合能力 | 嵌套回调 | 链式管道 |

## ReactiveX 的诞生

响应式编程的概念由来已久，但真正将其系统化的是 **ReactiveX**（Reactive Extensions）项目。

2009 年，微软的 Erik Meijer 团队在开发 Bing 搜索时，面临大量异步数据流处理的挑战。他们发现：

> **可迭代对象（Iterable）和可观察对象（Observable）是对偶的。**

这个洞见成为了 RxJS 的理论基础。

### 迭代器与观察者的对偶

先来看熟悉的迭代器模式：

```typescript
// 迭代器：消费者主动拉取数据
interface Iterator<T> {
  next(): { value: T; done: boolean }
}

const iterator = [1, 2, 3][Symbol.iterator]()
console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
```

迭代器是**拉取（Pull）**模式：消费者决定何时获取下一个值。

现在把这个模式"翻转"过来：

```typescript
// 观察者：生产者主动推送数据
interface Observer<T> {
  next(value: T): void
  error(err: unknown): void
  complete(): void
}

observable.subscribe({
  next: value => console.log(value),
  error: err => console.error(err),
  complete: () => console.log('Done')
})
```

观察者是**推送（Push）**模式：生产者决定何时发送下一个值。

这种对偶关系可以用表格表示：

| | 单值 | 多值 |
|---|---|---|
| **Pull（拉取）** | 函数调用 | 迭代器 |
| **Push（推送）** | Promise | Observable |

Observable 就是**可推送多个值的 Promise**。

## RxJS 的设计哲学

RxJS 不仅仅是一个工具库，它承载了一套完整的设计哲学。

### 1. 惰性执行

Observable 是惰性的，只有被订阅时才会执行：

```typescript
const observable = new Observable(subscriber => {
  console.log('开始执行')  // 不会立即执行
  subscriber.next(1)
})

// 直到调用 subscribe
console.log('准备订阅')
observable.subscribe(value => console.log(value))

// 输出：
// 准备订阅
// 开始执行
// 1
```

这与 Promise 不同——Promise 一创建就立即执行。

### 2. 纯函数与不可变性

操作符是纯函数，不会修改原 Observable，而是返回新的 Observable：

```typescript
const source$ = of(1, 2, 3)
const doubled$ = source$.pipe(map(x => x * 2))  // 新的 Observable
const filtered$ = source$.pipe(filter(x => x > 1))  // 另一个新的 Observable

// source$ 不受影响
source$.subscribe(console.log)  // 1, 2, 3
doubled$.subscribe(console.log)  // 2, 4, 6
```

### 3. 组合优于继承

RxJS 通过操作符组合来构建复杂逻辑，而非通过继承：

```typescript
// 不好：通过继承扩展
class RetryableObservable extends Observable {
  retry(count: number) { /* ... */ }
}

// 好：通过组合
const result$ = source$.pipe(
  retry(3),
  catchError(err => of('fallback'))
)
```

### 4. 显式取消

每个订阅都可以被取消，资源会被正确清理：

```typescript
const subscription = interval(1000).subscribe(console.log)

// 5秒后取消
setTimeout(() => {
  subscription.unsubscribe()  // 停止定时器，释放资源
}, 5000)
```

这解决了传统回调和 Promise 难以取消的问题。

## 理解"流"的思维方式

要真正掌握响应式编程，需要培养"流式思维"。

### 一切皆流

学会将各种事件和数据源看作流：

```typescript
// DOM 事件是流
const clicks$ = fromEvent(document, 'click')

// HTTP 请求是流（单值流）
const response$ = from(fetch('/api/data'))

// WebSocket 消息是流
const messages$ = new Observable(subscriber => {
  const ws = new WebSocket('ws://...')
  ws.onmessage = e => subscriber.next(e.data)
  ws.onerror = e => subscriber.error(e)
  ws.onclose = () => subscriber.complete()
  return () => ws.close()
})

// 定时器是流
const timer$ = interval(1000)

// 甚至状态变化也可以是流
const state$ = new BehaviorSubject({ count: 0 })
```

### 思考数据转换

当面对需求时，先画出数据流图：

```
需求：点击按钮时显示当前时间，连续点击 3 次显示警告

点击事件:     ●        ●  ●  ●         ●
              │        │  │  │         │
              ▼        ▼  ▼  ▼         ▼
显示时间:  "10:00"  "10:01" ...
              
              └──┬──┘
           500ms内3次点击
                 │
                 ▼
            显示警告
```

转换为代码：

```typescript
const clicks$ = fromEvent(button, 'click')

// 显示时间
clicks$.pipe(
  map(() => new Date().toLocaleTimeString())
).subscribe(time => display.textContent = time)

// 检测连续点击
clicks$.pipe(
  bufferTime(500),
  filter(clicks => clicks.length >= 3)
).subscribe(() => alert('别点了！'))
```

## 本章小结

本章我们建立了响应式编程的基础认知：

- **核心思想**：将程序看作数据流的转换，而非命令序列
- **核心概念**：数据流、声明式转换、自动传播
- **ReactiveX 起源**：Observable 是迭代器的对偶，是可推送多值的 Promise
- **RxJS 哲学**：惰性执行、纯函数、组合优于继承、显式取消
- **流式思维**：一切皆流，关注数据如何流动和转换

理解了这些概念，接下来我们将深入探讨 Push 与 Pull 两种数据模型，为理解 Observable 的设计打下更坚实的基础。

---

**思考题**：

1. 为什么说 Observable 是"惰性"的？这与 Promise 有什么区别？
2. 在你的项目中，有哪些场景适合用响应式的方式来处理？
3. 如果要用响应式思维重构一个复杂的表单验证逻辑，你会如何设计数据流？
