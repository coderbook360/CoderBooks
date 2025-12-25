---
sidebar_position: 74
title: "observeOn 与 subscribeOn"
---

# observeOn 与 subscribeOn

`observeOn` 控制值的发射调度，`subscribeOn` 控制订阅的调度。

## observeOn

改变值发射的执行上下文：

```javascript
source$.pipe(
  observeOn(asyncScheduler)
).subscribe(console.log)
```

### 实现 observeOn

```javascript
function observeOn(scheduler) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        scheduler.schedule(() => subscriber.next(value))
      },
      error(err) {
        scheduler.schedule(() => subscriber.error(err))
      },
      complete() {
        scheduler.schedule(() => subscriber.complete())
      }
    })
  })
}
```

### 简化版（使用 setTimeout）

```javascript
function observeOnAsync(source) {
  return new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        setTimeout(() => subscriber.next(value), 0)
      },
      error(err) {
        setTimeout(() => subscriber.error(err), 0)
      },
      complete() {
        setTimeout(() => subscriber.complete())
      }
    })
  })
}
```

## subscribeOn

改变订阅发生的时机：

```javascript
source$.pipe(
  subscribeOn(asyncScheduler)
).subscribe(console.log)
// 订阅延迟到下一个事件循环
```

### 实现 subscribeOn

```javascript
function subscribeOn(scheduler) {
  return (source) => new Observable(subscriber => {
    let subscription

    scheduler.schedule(() => {
      subscription = source.subscribe(subscriber)
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  })
}
```

## observeOn vs subscribeOn

```javascript
console.log('1')

of('a', 'b').pipe(
  tap(x => console.log('tap', x)),
  observeOn(asyncScheduler)
).subscribe(x => console.log('subscribe', x))

console.log('2')

// 输出:
// 1
// tap a
// tap b
// 2
// subscribe a
// subscribe b
```

```javascript
console.log('1')

of('a', 'b').pipe(
  tap(x => console.log('tap', x)),
  subscribeOn(asyncScheduler)
).subscribe(x => console.log('subscribe', x))

console.log('2')

// 输出:
// 1
// 2
// tap a
// subscribe a
// tap b
// subscribe b
```

关键区别：

| 特性 | observeOn | subscribeOn |
|------|-----------|-------------|
| 影响范围 | 下游操作符 | 整个订阅 |
| 生效时机 | 每个值发射时 | 订阅时 |
| 位置影响 | 只影响后面的操作符 | 任意位置，效果相同 |

## 调度器类型

### queueScheduler

同步执行，但排队（防止栈溢出）：

```javascript
of(1, 2, 3, queueScheduler).subscribe(console.log)
// 同步输出：1, 2, 3
```

### asyncScheduler

使用 setTimeout，异步执行：

```javascript
of(1, 2, 3).pipe(
  observeOn(asyncScheduler)
).subscribe(console.log)
// 异步输出：1, 2, 3
```

### asapScheduler

使用 Promise/microtask，尽快执行：

```javascript
of(1, 2, 3).pipe(
  observeOn(asapScheduler)
).subscribe(console.log)
// 在 microtask 中执行
```

### animationFrameScheduler

使用 requestAnimationFrame：

```javascript
interval(0, animationFrameScheduler).pipe(
  take(60)
).subscribe(() => {
  updateAnimation()
})
```

## 实战示例

### 不阻塞 UI

```javascript
// 大量数据处理不阻塞主线程
from(largeArray).pipe(
  observeOn(asyncScheduler),
  map(item => heavyComputation(item))
).subscribe(result => {
  updateUI(result)
})
```

### 动画优化

```javascript
fromEvent(document, 'mousemove').pipe(
  map(e => ({ x: e.clientX, y: e.clientY })),
  observeOn(animationFrameScheduler)
).subscribe(pos => {
  element.style.left = `${pos.x}px`
  element.style.top = `${pos.y}px`
})
```

### 后台任务

```javascript
// 延迟初始化，不阻塞首屏
heavyInitialization$.pipe(
  subscribeOn(asyncScheduler)
).subscribe()

console.log('UI ready')  // 立即执行
```

### 批量 DOM 更新

```javascript
updates$.pipe(
  bufferTime(16),  // 约60fps
  filter(updates => updates.length > 0),
  observeOn(animationFrameScheduler)
).subscribe(updates => {
  updates.forEach(update => applyUpdate(update))
})
```

## 自定义调度器

```javascript
const customScheduler = {
  schedule(work, delay = 0) {
    const id = setTimeout(work, delay)
    return { unsubscribe: () => clearTimeout(id) }
  }
}

// 使用
source$.pipe(
  observeOn(customScheduler)
)
```

## 浏览器中的调度器实现

```javascript
const asyncScheduler = {
  schedule(work, delay = 0) {
    const id = setTimeout(work, delay)
    return { unsubscribe: () => clearTimeout(id) }
  }
}

const asapScheduler = {
  schedule(work) {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) work()
    })
    return { unsubscribe: () => { cancelled = true } }
  }
}

const animationFrameScheduler = {
  schedule(work) {
    const id = requestAnimationFrame(work)
    return { unsubscribe: () => cancelAnimationFrame(id) }
  }
}
```

## 常见陷阱

### 顺序保证

```javascript
// asyncScheduler 保证顺序
of(1, 2, 3).pipe(
  observeOn(asyncScheduler)
).subscribe(console.log)
// 总是：1, 2, 3

// 但如果有并发操作
merge(
  of('a').pipe(delay(100)),
  of('b').pipe(delay(50))
).subscribe(console.log)
// b, a（按完成顺序）
```

### 性能考虑

```javascript
// 过度使用调度器会影响性能
source$.pipe(
  observeOn(asyncScheduler),  // 每个值都 setTimeout
  map(x => x * 2),
  observeOn(asyncScheduler),  // 又一次
  filter(x => x > 5),
  observeOn(asyncScheduler)   // 又一次
)

// 通常只在最后使用一次
source$.pipe(
  map(x => x * 2),
  filter(x => x > 5),
  observeOn(asyncScheduler)   // 只在需要时使用
)
```

## TypeScript 类型

```typescript
interface SchedulerLike {
  schedule<T>(
    work: (state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription
}

function observeOn<T>(
  scheduler: SchedulerLike,
  delay?: number
): OperatorFunction<T, T>

function subscribeOn<T>(
  scheduler: SchedulerLike,
  delay?: number
): OperatorFunction<T, T>
```

## 本章小结

- `observeOn` 改变下游发射的调度
- `subscribeOn` 改变订阅的调度
- 调度器控制代码执行的时机
- 使用 `animationFrameScheduler` 优化动画
- 使用 `asyncScheduler` 避免阻塞

下一章实现 `share` 和 `shareReplay` 操作符。
