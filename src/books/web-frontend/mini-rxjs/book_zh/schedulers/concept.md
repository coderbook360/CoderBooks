---
sidebar_position: 84
title: "Scheduler 核心概念"
---

# Scheduler 核心概念

Scheduler 控制任务的执行时机和上下文——它是 RxJS 的"时间管理器"。

## 为什么需要 Scheduler

默认情况下，RxJS 操作是同步执行的：

```javascript
console.log('Before')
of(1, 2, 3).subscribe(console.log)
console.log('After')

// 输出：
// Before
// 1
// 2
// 3
// After
```

有时需要控制执行时机：

```javascript
console.log('Before')
of(1, 2, 3, asyncScheduler).subscribe(console.log)
console.log('After')

// 输出：
// Before
// After
// 1
// 2
// 3
```

## Scheduler 的作用

Scheduler 决定：
1. **何时**执行任务（立即、延迟、下一个事件循环）
2. **如何**执行任务（同步、异步、动画帧）
3. **在哪里**执行任务（主线程、Worker）

## 四种内置 Scheduler

### queueScheduler（同步队列）

在当前事件循环中同步执行，但使用队列管理递归：

```javascript
// 没有 Scheduler：可能栈溢出
function recursive(n) {
  if (n > 0) {
    console.log(n)
    recursive(n - 1)  // 递归调用
  }
}

// 使用 queueScheduler：安全的递归
queueScheduler.schedule(function(n) {
  if (n > 0) {
    console.log(n)
    this.schedule(n - 1)  // 加入队列
  }
}, 0, 10)
```

### asapScheduler（微任务）

使用 Promise（微任务）调度：

```javascript
console.log('Start')

asapScheduler.schedule(() => console.log('asap'))
Promise.resolve().then(() => console.log('Promise'))

console.log('End')

// Start
// End
// asap（或 Promise，顺序不确定）
// Promise（或 asap）
```

### asyncScheduler（宏任务）

使用 setTimeout（宏任务）调度：

```javascript
console.log('Start')

asyncScheduler.schedule(() => console.log('async'))
setTimeout(() => console.log('setTimeout'), 0)

console.log('End')

// Start
// End
// async（或 setTimeout）
// setTimeout（或 async）
```

### animationFrameScheduler（动画帧）

使用 requestAnimationFrame 调度：

```javascript
// 平滑动画
animationFrameScheduler.schedule(function() {
  updateAnimation()
  this.schedule()  // 下一帧继续
})
```

## Scheduler 优先级

```
同步代码
    ↓
queueScheduler（同步，但队列化）
    ↓
微任务（Promise, asapScheduler）
    ↓
宏任务（setTimeout, asyncScheduler）
    ↓
动画帧（requestAnimationFrame, animationFrameScheduler）
```

## 实现 Scheduler 接口

```javascript
// Scheduler 基本接口
class Scheduler {
  // 立即调度
  schedule(work, delay = 0, state) {
    const action = new SchedulerAction(this, work)
    return action.schedule(state, delay)
  }
  
  // 获取当前时间
  now() {
    return Date.now()
  }
}

// Action 执行具体任务
class SchedulerAction {
  constructor(scheduler, work) {
    this.scheduler = scheduler
    this.work = work
    this.pending = false
  }
  
  schedule(state, delay = 0) {
    this.state = state
    this.delay = delay
    this.pending = true
    
    // 子类实现具体调度逻辑
    this._schedule()
    
    return this
  }
  
  execute(state) {
    if (this.pending) {
      this.pending = false
      this.work.call(this, state)
    }
  }
  
  unsubscribe() {
    this.pending = false
    this._unsubscribe()
  }
}
```

### 实现 asyncScheduler

```javascript
class AsyncScheduler extends Scheduler {
  schedule(work, delay = 0, state) {
    const action = new AsyncAction(this, work)
    return action.schedule(state, delay)
  }
}

class AsyncAction extends SchedulerAction {
  _schedule() {
    this.id = setTimeout(() => {
      this.execute(this.state)
    }, this.delay)
  }
  
  _unsubscribe() {
    clearTimeout(this.id)
    this.id = null
  }
  
  // 支持重新调度
  schedule(state, delay = 0) {
    if (this.id) {
      clearTimeout(this.id)
    }
    return super.schedule(state, delay)
  }
}

const asyncScheduler = new AsyncScheduler()
```

### 实现 asapScheduler

```javascript
class AsapScheduler extends Scheduler {
  schedule(work, delay = 0, state) {
    const action = new AsapAction(this, work)
    return action.schedule(state, delay)
  }
}

class AsapAction extends SchedulerAction {
  _schedule() {
    if (this.delay > 0) {
      // 有延迟时退化为 setTimeout
      this.id = setTimeout(() => this.execute(this.state), this.delay)
    } else {
      // 使用 Promise 微任务
      Promise.resolve().then(() => this.execute(this.state))
    }
  }
  
  _unsubscribe() {
    if (this.id) {
      clearTimeout(this.id)
    }
  }
}

const asapScheduler = new AsapScheduler()
```

### 实现 animationFrameScheduler

```javascript
class AnimationFrameScheduler extends Scheduler {
  schedule(work, delay = 0, state) {
    const action = new AnimationFrameAction(this, work)
    return action.schedule(state, delay)
  }
}

class AnimationFrameAction extends SchedulerAction {
  _schedule() {
    if (this.delay > 0) {
      this.id = setTimeout(() => {
        this.rafId = requestAnimationFrame(() => this.execute(this.state))
      }, this.delay)
    } else {
      this.rafId = requestAnimationFrame(() => this.execute(this.state))
    }
  }
  
  _unsubscribe() {
    if (this.id) {
      clearTimeout(this.id)
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
  }
}

const animationFrameScheduler = new AnimationFrameScheduler()
```

### 实现 queueScheduler

```javascript
class QueueScheduler extends Scheduler {
  constructor() {
    super()
    this.queue = []
    this.flushing = false
  }
  
  schedule(work, delay = 0, state) {
    const action = new QueueAction(this, work)
    return action.schedule(state, delay)
  }
  
  flush() {
    if (this.flushing) return
    
    this.flushing = true
    
    while (this.queue.length > 0) {
      const action = this.queue.shift()
      action.execute(action.state)
    }
    
    this.flushing = false
  }
}

class QueueAction extends SchedulerAction {
  _schedule() {
    this.scheduler.queue.push(this)
    this.scheduler.flush()
  }
  
  _unsubscribe() {
    const index = this.scheduler.queue.indexOf(this)
    if (index !== -1) {
      this.scheduler.queue.splice(index, 1)
    }
  }
}

const queueScheduler = new QueueScheduler()
```

## 在操作符中使用 Scheduler

```javascript
// 创建操作符通常支持 Scheduler 参数
of(1, 2, 3, asyncScheduler)
from([1, 2, 3], asapScheduler)
interval(1000, animationFrameScheduler)
timer(1000, asyncScheduler)
```

## 实战示例

### 避免 UI 阻塞

```javascript
// 同步处理大量数据会阻塞 UI
const bigArray = new Array(100000).fill(0)

// ❌ 阻塞
from(bigArray).pipe(
  map(expensiveComputation)
).subscribe()

// ✅ 异步处理，不阻塞
from(bigArray, asyncScheduler).pipe(
  map(expensiveComputation)
).subscribe()
```

### 批量处理

```javascript
// 使用 queueScheduler 批量处理
function processBatch(items) {
  let results = []
  
  return new Observable(subscriber => {
    queueScheduler.schedule(function(index) {
      if (index < items.length) {
        results.push(process(items[index]))
        this.schedule(index + 1)
      } else {
        subscriber.next(results)
        subscriber.complete()
      }
    }, 0, 0)
  })
}
```

### 平滑动画

```javascript
// 使用 animationFrameScheduler 实现平滑动画
function animate(from, to, duration) {
  return new Observable(subscriber => {
    const start = animationFrameScheduler.now()
    
    const action = animationFrameScheduler.schedule(function() {
      const elapsed = animationFrameScheduler.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const current = from + (to - from) * progress
      
      subscriber.next(current)
      
      if (progress < 1) {
        this.schedule()
      } else {
        subscriber.complete()
      }
    })
    
    return () => action.unsubscribe()
  })
}

// 使用
animate(0, 100, 1000).subscribe(value => {
  element.style.left = `${value}px`
})
```

### 测试时间控制

```javascript
// 使用自定义 Scheduler 控制时间
class TestScheduler extends Scheduler {
  constructor() {
    super()
    this.currentTime = 0
    this.scheduledActions = []
  }
  
  now() {
    return this.currentTime
  }
  
  schedule(work, delay = 0, state) {
    const action = {
      work,
      state,
      time: this.currentTime + delay
    }
    this.scheduledActions.push(action)
    this.scheduledActions.sort((a, b) => a.time - b.time)
    
    return {
      unsubscribe: () => {
        const index = this.scheduledActions.indexOf(action)
        if (index !== -1) {
          this.scheduledActions.splice(index, 1)
        }
      }
    }
  }
  
  // 前进时间
  advanceTo(time) {
    while (
      this.scheduledActions.length > 0 &&
      this.scheduledActions[0].time <= time
    ) {
      const action = this.scheduledActions.shift()
      this.currentTime = action.time
      action.work.call({ schedule: (s, d) => this.schedule(action.work, d, s) }, action.state)
    }
    this.currentTime = time
  }
}
```

## TypeScript 类型

```typescript
interface SchedulerLike {
  now(): number
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription
}

interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription
}
```

## 本章小结

- Scheduler 控制任务的执行时机
- 四种内置 Scheduler：queue、asap、async、animationFrame
- 用于避免 UI 阻塞、平滑动画、测试时间控制
- 大多数情况下不需要手动指定 Scheduler

下一章深入 `observeOn` 和 `subscribeOn`——控制订阅和发射的调度。
