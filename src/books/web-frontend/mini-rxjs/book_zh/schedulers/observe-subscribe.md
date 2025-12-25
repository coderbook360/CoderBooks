---
sidebar_position: 85
title: "observeOn 与 subscribeOn"
---

# observeOn 与 subscribeOn

`observeOn` 控制发射的调度，`subscribeOn` 控制订阅的调度。

## 理解区别

```javascript
// subscribeOn: 控制订阅（生产者）在哪个调度器执行
source$.pipe(
  subscribeOn(asyncScheduler)
)

// observeOn: 控制发射（消费者）在哪个调度器接收
source$.pipe(
  observeOn(asyncScheduler)
)
```

## subscribeOn

### 基本用法

```javascript
const source$ = new Observable(subscriber => {
  console.log('Producer running on:', getContext())
  subscriber.next(1)
  subscriber.complete()
})

// 默认：同步执行
source$.subscribe(console.log)
// Producer running on: sync
// 1

// 使用 subscribeOn
source$.pipe(
  subscribeOn(asyncScheduler)
).subscribe(console.log)
// (异步执行)
// Producer running on: async
// 1
```

### subscribeOn 位置不影响效果

```javascript
// 无论 subscribeOn 在管道哪个位置，都影响订阅时机
source$.pipe(
  map(x => x * 2),
  subscribeOn(asyncScheduler),  // 位置无关
  filter(x => x > 0)
)

// 等价于
source$.pipe(
  subscribeOn(asyncScheduler),
  map(x => x * 2),
  filter(x => x > 0)
)
```

### 实现 subscribeOn

```javascript
function subscribeOn(scheduler, delay = 0) {
  return (source) => new Observable(subscriber => {
    // 延迟订阅源 Observable
    const action = scheduler.schedule(() => {
      source.subscribe(subscriber)
    }, delay)
    
    return () => action.unsubscribe()
  })
}
```

## observeOn

### 基本用法

```javascript
const source$ = of(1, 2, 3)

source$.pipe(
  tap(v => console.log('Before observeOn:', v)),
  observeOn(asyncScheduler),
  tap(v => console.log('After observeOn:', v))
).subscribe(console.log)

// Before observeOn: 1
// Before observeOn: 2
// Before observeOn: 3
// (然后异步)
// After observeOn: 1
// 1
// After observeOn: 2
// 2
// After observeOn: 3
// 3
```

### observeOn 位置很重要

```javascript
// observeOn 只影响后面的操作符
source$.pipe(
  map(x => x * 2),        // 同步
  observeOn(asyncScheduler),
  filter(x => x > 0),     // 异步
  map(x => x + 1)         // 异步
)

// 不等价于
source$.pipe(
  observeOn(asyncScheduler),
  map(x => x * 2),        // 异步
  filter(x => x > 0),     // 异步
  map(x => x + 1)         // 异步
)
```

### 实现 observeOn

```javascript
function observeOn(scheduler, delay = 0) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        scheduler.schedule(() => {
          subscriber.next(value)
        }, delay)
      },
      error(err) {
        scheduler.schedule(() => {
          subscriber.error(err)
        }, delay)
      },
      complete() {
        scheduler.schedule(() => {
          subscriber.complete()
        }, delay)
      }
    })
  })
}
```

## 组合使用

```javascript
// subscribeOn + observeOn
heavyComputation$.pipe(
  subscribeOn(asyncScheduler),   // 异步开始计算
  observeOn(animationFrameScheduler)  // 结果在动画帧更新 UI
).subscribe(result => {
  updateUI(result)
})
```

## 实战示例

### 后台计算

```javascript
// CPU 密集型计算不阻塞 UI
function compute(data) {
  return of(data).pipe(
    subscribeOn(asyncScheduler),  // 异步执行计算
    map(d => heavyComputation(d)),
    observeOn(asapScheduler)      // 尽快返回结果
  )
}

// 使用
compute(bigData).subscribe(result => {
  console.log('Computation done:', result)
})
console.log('UI not blocked')
```

### 动画更新

```javascript
// 数据变化平滑更新 UI
data$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(data => {
  renderChart(data)
})
```

### 批量 DOM 更新

```javascript
// 收集一帧内的所有更新，一次性应用
const updates$ = new Subject()

updates$.pipe(
  bufferTime(0, animationFrameScheduler),
  filter(batch => batch.length > 0)
).subscribe(batch => {
  // 批量更新 DOM
  batch.forEach(update => applyUpdate(update))
})

// 触发更新
updates$.next({ id: 1, value: 'a' })
updates$.next({ id: 2, value: 'b' })
updates$.next({ id: 3, value: 'c' })
// 在下一帧一次性应用所有更新
```

### 延迟订阅

```javascript
// 延迟 1 秒后开始
source$.pipe(
  subscribeOn(asyncScheduler, 1000)
).subscribe(console.log)
```

### Worker 线程模拟

```javascript
// 模拟在 Worker 中执行
const workerScheduler = {
  schedule(work, delay, state) {
    const id = setTimeout(() => {
      // 模拟 Worker 环境
      work.call({ schedule: (s, d) => this.schedule(work, d, s) }, state)
    }, delay)
    
    return { unsubscribe: () => clearTimeout(id) }
  },
  now: () => Date.now()
}

heavyTask$.pipe(
  subscribeOn(workerScheduler)
).subscribe(result => {
  // 回到主线程处理结果
})
```

### 优先级调度

```javascript
// 高优先级：微任务
const highPriority$ = source$.pipe(
  observeOn(asapScheduler)
)

// 普通优先级：宏任务
const normalPriority$ = source$.pipe(
  observeOn(asyncScheduler)
)

// 低优先级：空闲时
const lowPriority$ = source$.pipe(
  observeOn({
    schedule(work, delay, state) {
      const id = requestIdleCallback(() => work(state))
      return { unsubscribe: () => cancelIdleCallback(id) }
    },
    now: () => Date.now()
  })
)
```

### 多阶段调度

```javascript
// 数据处理管道，不同阶段使用不同调度器
dataSource$.pipe(
  // 阶段1：异步获取数据
  subscribeOn(asyncScheduler),
  
  // 阶段2：同步过滤
  filter(isValid),
  
  // 阶段3：切换到异步处理
  observeOn(asyncScheduler),
  map(heavyTransform),
  
  // 阶段4：切换到动画帧更新 UI
  observeOn(animationFrameScheduler)
).subscribe(result => {
  updateUI(result)
})
```

## 与其他操作符交互

### delay vs observeOn

```javascript
// delay: 延迟发射
source$.pipe(
  delay(1000)
)
// 每个值延迟 1 秒发射

// observeOn: 切换调度器
source$.pipe(
  observeOn(asyncScheduler)
)
// 异步发射，但不延迟
```

### debounceTime/throttleTime

```javascript
// 这些操作符内部使用 asyncScheduler
source$.pipe(
  debounceTime(300)  // 默认使用 asyncScheduler
)

// 可以指定调度器
source$.pipe(
  debounceTime(300, animationFrameScheduler)
)
```

## 常见陷阱

### subscribeOn 多次调用只有第一个生效

```javascript
source$.pipe(
  subscribeOn(asyncScheduler),   // 生效
  subscribeOn(asapScheduler)     // 忽略
)
```

### observeOn 顺序依赖

```javascript
// 错误：期望所有操作都异步
source$.pipe(
  map(x => x * 2),        // 同步！
  filter(x => x > 0),     // 同步！
  observeOn(asyncScheduler)
)

// 正确：早点加 observeOn
source$.pipe(
  observeOn(asyncScheduler),
  map(x => x * 2),        // 异步
  filter(x => x > 0)      // 异步
)
```

### 过度使用调度器

```javascript
// 不必要的调度器切换增加开销
source$.pipe(
  observeOn(asyncScheduler),
  map(x => x * 2),
  observeOn(asyncScheduler),  // 不必要
  map(x => x + 1),
  observeOn(asyncScheduler)   // 不必要
)

// 只在需要时使用
source$.pipe(
  map(x => x * 2),
  map(x => x + 1),
  observeOn(asyncScheduler)  // 最后切换一次
)
```

## 性能考虑

```javascript
// 同步操作最快
source$.pipe(map(x => x * 2))

// 异步有调度开销
source$.pipe(
  observeOn(asyncScheduler),
  map(x => x * 2)
)

// 只在必要时使用异步：
// 1. 避免阻塞 UI
// 2. 与特定 API 对齐（如 requestAnimationFrame）
// 3. 控制执行优先级
```

## TypeScript 类型

```typescript
function observeOn<T>(
  scheduler: SchedulerLike,
  delay?: number
): MonoTypeOperatorFunction<T>

function subscribeOn<T>(
  scheduler: SchedulerLike,
  delay?: number
): MonoTypeOperatorFunction<T>
```

## 本章小结

- `subscribeOn` 控制订阅时机，位置无关
- `observeOn` 控制发射时机，只影响后面的操作符
- 用于避免 UI 阻塞、动画更新、优先级控制
- 避免过度使用，同步操作性能最好

下一章详解四种 Scheduler 的实现和应用场景。
