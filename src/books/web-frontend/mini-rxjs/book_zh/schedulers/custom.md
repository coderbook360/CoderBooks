---
sidebar_position: 87
title: "自定义 Scheduler"
---

# 自定义 Scheduler

本章学习如何创建自定义 Scheduler 满足特殊需求。

## Scheduler 接口

```typescript
interface SchedulerLike {
  now(): number
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription
}

interface SchedulerAction<T> {
  schedule(state?: T, delay?: number): Subscription
}
```

## 简单自定义 Scheduler

### ImmediateScheduler（立即执行）

```javascript
const immediateScheduler = {
  now() {
    return Date.now()
  },
  
  schedule(work, delay = 0, state) {
    if (delay > 0) {
      const id = setTimeout(() => work(state), delay)
      return { unsubscribe: () => clearTimeout(id) }
    }
    
    // 立即同步执行
    work(state)
    return { unsubscribe: () => {} }
  }
}

// 使用
of(1, 2, 3).pipe(
  observeOn(immediateScheduler)
).subscribe(console.log)
```

### IdleScheduler（空闲时执行）

```javascript
const idleScheduler = {
  now() {
    return Date.now()
  },
  
  schedule(work, delay = 0, state) {
    if (typeof requestIdleCallback === 'undefined') {
      // 降级到 setTimeout
      const id = setTimeout(() => work(state), delay)
      return { unsubscribe: () => clearTimeout(id) }
    }
    
    let idleId
    let timeoutId
    
    if (delay > 0) {
      timeoutId = setTimeout(() => {
        idleId = requestIdleCallback(() => work(state))
      }, delay)
    } else {
      idleId = requestIdleCallback(() => work(state))
    }
    
    return {
      unsubscribe: () => {
        if (timeoutId) clearTimeout(timeoutId)
        if (idleId) cancelIdleCallback(idleId)
      }
    }
  }
}

// 使用：低优先级任务
lowPriorityTask$.pipe(
  observeOn(idleScheduler)
).subscribe(result => {
  // 在浏览器空闲时处理
})
```

### VirtualTimeScheduler（虚拟时间）

```javascript
class VirtualTimeScheduler {
  constructor() {
    this.frame = 0
    this.maxFrames = 750  // 默认最大帧数
    this.queue = []
  }
  
  now() {
    return this.frame
  }
  
  schedule(work, delay = 0, state) {
    const action = {
      work,
      state,
      time: this.frame + delay,
      cancelled: false
    }
    
    // 按时间排序插入
    const index = this.queue.findIndex(a => a.time > action.time)
    if (index === -1) {
      this.queue.push(action)
    } else {
      this.queue.splice(index, 0, action)
    }
    
    return {
      unsubscribe: () => {
        action.cancelled = true
      }
    }
  }
  
  // 执行到指定时间
  flush() {
    while (this.queue.length > 0 && this.frame < this.maxFrames) {
      const action = this.queue.shift()
      
      if (action.cancelled) continue
      
      // 前进时间
      this.frame = action.time
      
      // 执行任务
      const context = {
        schedule: (newState, newDelay) => 
          this.schedule(action.work, newDelay, newState)
      }
      action.work.call(context, action.state)
    }
  }
  
  // 重置
  reset() {
    this.frame = 0
    this.queue = []
  }
}

// 使用：测试时间相关的代码
const testScheduler = new VirtualTimeScheduler()

interval(1000).pipe(
  take(5),
  observeOn(testScheduler)
).subscribe(console.log)

testScheduler.flush()  // 立即执行所有任务
```

## 高级自定义 Scheduler

### PriorityScheduler（优先级调度）

```javascript
class PriorityScheduler {
  constructor() {
    this.queues = {
      high: [],
      normal: [],
      low: []
    }
    this.processing = false
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay = 0, state, priority = 'normal') {
    const action = {
      work,
      state,
      delay,
      priority,
      time: Date.now() + delay,
      cancelled: false
    }
    
    this.queues[priority].push(action)
    this.processQueue()
    
    return {
      unsubscribe: () => {
        action.cancelled = true
      }
    }
  }
  
  // 高优先级方法
  scheduleHigh(work, delay, state) {
    return this.schedule(work, delay, state, 'high')
  }
  
  scheduleLow(work, delay, state) {
    return this.schedule(work, delay, state, 'low')
  }
  
  processQueue() {
    if (this.processing) return
    this.processing = true
    
    const process = () => {
      // 按优先级处理
      const action = 
        this.queues.high.shift() ||
        this.queues.normal.shift() ||
        this.queues.low.shift()
      
      if (!action) {
        this.processing = false
        return
      }
      
      if (action.cancelled) {
        // 继续处理下一个
        setTimeout(process, 0)
        return
      }
      
      const now = Date.now()
      const remaining = action.time - now
      
      if (remaining > 0) {
        // 还没到时间，放回队列
        this.queues[action.priority].unshift(action)
        setTimeout(process, remaining)
      } else {
        // 执行任务
        const context = {
          schedule: (s, d) => this.schedule(action.work, d, s, action.priority)
        }
        action.work.call(context, action.state)
        
        // 继续处理
        setTimeout(process, 0)
      }
    }
    
    setTimeout(process, 0)
  }
}

// 使用
const priorityScheduler = new PriorityScheduler()

// 低优先级任务
analytics$.pipe(
  observeOn({
    ...priorityScheduler,
    schedule: (w, d, s) => priorityScheduler.scheduleLow(w, d, s)
  })
)

// 高优先级任务
userInteraction$.pipe(
  observeOn({
    ...priorityScheduler,
    schedule: (w, d, s) => priorityScheduler.scheduleHigh(w, d, s)
  })
)
```

### BatchScheduler（批量调度）

```javascript
class BatchScheduler {
  constructor(batchSize = 10, batchDelay = 16) {
    this.batchSize = batchSize
    this.batchDelay = batchDelay
    this.queue = []
    this.scheduled = false
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay = 0, state) {
    const action = { work, state, cancelled: false }
    
    if (delay > 0) {
      const id = setTimeout(() => {
        if (!action.cancelled) {
          work(state)
        }
      }, delay)
      return { unsubscribe: () => { action.cancelled = true; clearTimeout(id) } }
    }
    
    this.queue.push(action)
    this.scheduleBatch()
    
    return { unsubscribe: () => { action.cancelled = true } }
  }
  
  scheduleBatch() {
    if (this.scheduled) return
    this.scheduled = true
    
    setTimeout(() => {
      this.processBatch()
    }, this.batchDelay)
  }
  
  processBatch() {
    // 每批处理固定数量
    let count = 0
    
    while (this.queue.length > 0 && count < this.batchSize) {
      const action = this.queue.shift()
      if (!action.cancelled) {
        action.work(action.state)
        count++
      }
    }
    
    this.scheduled = false
    
    // 如果还有任务，继续调度
    if (this.queue.length > 0) {
      this.scheduleBatch()
    }
  }
}

// 使用：避免一次处理太多任务阻塞
const batchScheduler = new BatchScheduler(100, 16)

largeDataStream$.pipe(
  observeOn(batchScheduler)
).subscribe(item => {
  processItem(item)
})
```

### WorkerScheduler（Web Worker 调度）

```javascript
class WorkerScheduler {
  constructor(workerUrl) {
    this.worker = new Worker(workerUrl)
    this.callbacks = new Map()
    this.nextId = 0
    
    this.worker.onmessage = (e) => {
      const { id, result } = e.data
      const callback = this.callbacks.get(id)
      if (callback) {
        callback(result)
        this.callbacks.delete(id)
      }
    }
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay = 0, state) {
    const id = this.nextId++
    
    return new Promise(resolve => {
      this.callbacks.set(id, resolve)
      
      const execute = () => {
        this.worker.postMessage({
          id,
          // 将函数序列化（实际使用需要更复杂的处理）
          code: work.toString(),
          state
        })
      }
      
      if (delay > 0) {
        setTimeout(execute, delay)
      } else {
        execute()
      }
    })
  }
  
  terminate() {
    this.worker.terminate()
  }
}

// Worker 代码 (worker.js)
/*
self.onmessage = (e) => {
  const { id, code, state } = e.data
  const fn = eval('(' + code + ')')
  const result = fn(state)
  self.postMessage({ id, result })
}
*/
```

### TestScheduler（测试调度器）

```javascript
class TestScheduler {
  constructor() {
    this.currentTime = 0
    this.actions = []
    this.results = []
  }
  
  now() {
    return this.currentTime
  }
  
  schedule(work, delay = 0, state) {
    const action = {
      time: this.currentTime + delay,
      work,
      state,
      cancelled: false
    }
    
    this.actions.push(action)
    this.actions.sort((a, b) => a.time - b.time)
    
    return {
      unsubscribe: () => {
        action.cancelled = true
      }
    }
  }
  
  // 前进时间
  advanceBy(time) {
    this.advanceTo(this.currentTime + time)
  }
  
  // 前进到指定时间
  advanceTo(time) {
    while (this.actions.length > 0 && this.actions[0].time <= time) {
      const action = this.actions.shift()
      this.currentTime = action.time
      
      if (!action.cancelled) {
        const context = {
          schedule: (s, d) => this.schedule(action.work, d, s)
        }
        
        try {
          const result = action.work.call(context, action.state)
          this.results.push({
            time: this.currentTime,
            value: result
          })
        } catch (error) {
          this.results.push({
            time: this.currentTime,
            error
          })
        }
      }
    }
    
    this.currentTime = time
  }
  
  // 执行所有任务
  flush() {
    while (this.actions.length > 0) {
      const action = this.actions.shift()
      this.currentTime = action.time
      
      if (!action.cancelled) {
        const context = {
          schedule: (s, d) => this.schedule(action.work, d, s)
        }
        action.work.call(context, action.state)
      }
    }
  }
  
  // 重置
  reset() {
    this.currentTime = 0
    this.actions = []
    this.results = []
  }
  
  // 创建可观察的
  createColdObservable(marbles) {
    return this.parseMarbles(marbles, 0)
  }
  
  createHotObservable(marbles) {
    return this.parseMarbles(marbles, this.currentTime)
  }
  
  parseMarbles(marbles, startTime) {
    // 简化的弹珠图解析
    // '-a-b-c|'
    // - = 10ms
    // | = complete
    // # = error
    // a-z = 值
    
    const events = []
    let time = startTime
    
    for (const char of marbles) {
      if (char === '-') {
        time += 10
      } else if (char === '|') {
        events.push({ time, type: 'complete' })
      } else if (char === '#') {
        events.push({ time, type: 'error', value: new Error() })
      } else if (/[a-z0-9]/.test(char)) {
        events.push({ time, type: 'next', value: char })
      }
    }
    
    return new Observable(subscriber => {
      events.forEach(event => {
        this.schedule(() => {
          if (event.type === 'next') {
            subscriber.next(event.value)
          } else if (event.type === 'error') {
            subscriber.error(event.value)
          } else if (event.type === 'complete') {
            subscriber.complete()
          }
        }, event.time - this.currentTime)
      })
    })
  }
}

// 使用
const testScheduler = new TestScheduler()

// 测试 debounceTime
testScheduler.createColdObservable('-a--b-c---|').pipe(
  debounceTime(30, testScheduler)
).subscribe(console.log)

testScheduler.flush()
// 输出 c（只有最后一个值通过了 debounce）
```

## 组合 Scheduler

```javascript
// 组合多个 Scheduler
function combineSchedulers(schedulers) {
  return {
    now() {
      return Date.now()
    },
    
    schedule(work, delay, state) {
      const subscriptions = schedulers.map(scheduler =>
        scheduler.schedule(work, delay, state)
      )
      
      return {
        unsubscribe: () => {
          subscriptions.forEach(s => s.unsubscribe())
        }
      }
    }
  }
}

// 使用：同时在多个调度器上执行
const combined = combineSchedulers([
  asyncScheduler,
  animationFrameScheduler
])
```

## 本章小结

- Scheduler 接口包含 `now()` 和 `schedule()` 方法
- 可以创建自定义 Scheduler 满足特殊需求
- 常见自定义 Scheduler：IdleScheduler、PriorityScheduler、TestScheduler
- TestScheduler 是测试时间相关代码的利器

下一章学习 TestScheduler 的高级用法。
