---
sidebar_position: 90
title: "Scheduler 进阶应用"
---

# Scheduler 进阶应用

本章探索 Scheduler 的高级应用场景和技巧。

## 虚拟时间测试

### 弹珠测试模式

```javascript
class MarbleTestScheduler extends TestScheduler {
  // 扩展语法支持
  parseMarbles(marbles, values = {}) {
    const events = []
    let frame = 0
    let groupStart = null
    let i = 0
    
    while (i < marbles.length) {
      const char = marbles[i]
      
      switch (char) {
        case ' ':
          break
        case '-':
          frame++
          break
        case '(':
          groupStart = frame
          break
        case ')':
          groupStart = null
          break
        case '|':
          events.push({ frame: groupStart ?? frame, type: 'complete' })
          break
        case '#':
          events.push({ frame: groupStart ?? frame, type: 'error' })
          break
        default:
          // 支持时间倍数 10ms
          if (/\d/.test(char)) {
            const match = marbles.slice(i).match(/^(\d+)ms/)
            if (match) {
              frame += parseInt(match[1], 10)
              i += match[0].length - 1
              break
            }
          }
          
          const value = values[char] ?? char
          events.push({ frame: groupStart ?? frame, type: 'next', value })
          if (!groupStart) frame++
      }
      
      i++
    }
    
    return events
  }
}

// 使用时间标记
testScheduler.run(({ cold, expectObservable }) => {
  const source = cold('a 10ms b 20ms c|')
  expectObservable(source.pipe(
    debounceTime(15)
  )).toBe('16ms a 20ms c|')
})
```

### 热 Observable 测试

```javascript
class HotTestScheduler extends TestScheduler {
  createHotObservable(marbles, values) {
    const subject = new ReplaySubject()
    const events = this.parseMarbles(marbles, values)
    
    // 查找订阅点 ^
    const subscriptionPoint = marbles.indexOf('^')
    
    // 在订阅点之前的事件立即发送（用于 ReplaySubject）
    events.forEach(event => {
      if (event.frame < subscriptionPoint) {
        // 历史事件
        subject.next(event.value)
      } else {
        // 未来事件，调度执行
        this.schedule(() => {
          if (event.type === 'next') subject.next(event.value)
          else if (event.type === 'error') subject.error(event.error)
          else if (event.type === 'complete') subject.complete()
        }, event.frame - subscriptionPoint)
      }
    })
    
    return subject
  }
}
```

## 时间切片

### 分片执行大任务

```javascript
function timeSlice(items, processFn, sliceTime = 16) {
  return new Observable(subscriber => {
    const queue = [...items]
    let cancelled = false
    
    function processSlice() {
      if (cancelled) return
      
      const start = performance.now()
      
      while (queue.length > 0) {
        // 检查时间片是否用完
        if (performance.now() - start > sliceTime) {
          // 让出控制权，下一帧继续
          requestAnimationFrame(processSlice)
          return
        }
        
        const item = queue.shift()
        try {
          const result = processFn(item)
          subscriber.next(result)
        } catch (err) {
          subscriber.error(err)
          return
        }
      }
      
      subscriber.complete()
    }
    
    requestAnimationFrame(processSlice)
    
    return () => { cancelled = true }
  })
}

// 使用
timeSlice(largeArray, heavyComputation).subscribe(result => {
  updateUI(result)
})
```

### 使用 Scheduler 实现

```javascript
function timeSliceScheduler(sliceTime = 16) {
  return {
    now: () => performance.now(),
    
    schedule(work, delay, state) {
      const startTime = performance.now()
      let cancelled = false
      
      function execute() {
        if (cancelled) return
        
        const context = {
          schedule: (newState, newDelay) => {
            // 检查是否需要让出
            if (performance.now() - startTime > sliceTime) {
              return animationFrameScheduler.schedule(
                () => execute(),
                0
              )
            }
            return this.schedule(work, newDelay, newState)
          }
        }
        
        work.call(context, state)
      }
      
      if (delay > 0) {
        const id = setTimeout(execute, delay)
        return { unsubscribe: () => { cancelled = true; clearTimeout(id) } }
      }
      
      requestAnimationFrame(execute)
      return { unsubscribe: () => { cancelled = true } }
    }
  }
}
```

## 优先级队列

### 多级优先级

```javascript
class PriorityQueueScheduler {
  constructor() {
    this.queues = {
      immediate: [],  // 立即执行
      high: [],       // 高优先级
      normal: [],     // 普通
      low: [],        // 低优先级
      idle: []        // 空闲时
    }
    this.processing = false
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay, state, priority = 'normal') {
    const action = { work, state, delay, priority, cancelled: false }
    
    this.queues[priority].push(action)
    this.process()
    
    return { unsubscribe: () => { action.cancelled = true } }
  }
  
  process() {
    if (this.processing) return
    this.processing = true
    
    const processNext = () => {
      // 按优先级查找任务
      const priorities = ['immediate', 'high', 'normal', 'low', 'idle']
      let action = null
      
      for (const priority of priorities) {
        if (this.queues[priority].length > 0) {
          action = this.queues[priority].shift()
          break
        }
      }
      
      if (!action) {
        this.processing = false
        return
      }
      
      if (action.cancelled) {
        setTimeout(processNext, 0)
        return
      }
      
      // 根据优先级选择执行方式
      switch (action.priority) {
        case 'immediate':
          action.work(action.state)
          processNext()
          break
          
        case 'high':
          Promise.resolve().then(() => {
            action.work(action.state)
            processNext()
          })
          break
          
        case 'normal':
          setTimeout(() => {
            action.work(action.state)
            processNext()
          }, 0)
          break
          
        case 'low':
          setTimeout(() => {
            action.work(action.state)
            processNext()
          }, 10)
          break
          
        case 'idle':
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => {
              action.work(action.state)
              processNext()
            })
          } else {
            setTimeout(() => {
              action.work(action.state)
              processNext()
            }, 50)
          }
          break
      }
    }
    
    processNext()
  }
}
```

### 使用优先级 Scheduler

```javascript
const priorityScheduler = new PriorityQueueScheduler()

// 用户交互 - 立即执行
userClick$.pipe(
  observeOn({
    ...priorityScheduler,
    schedule: (w, d, s) => priorityScheduler.schedule(w, d, s, 'immediate')
  })
)

// API 响应 - 高优先级
apiResponse$.pipe(
  observeOn({
    ...priorityScheduler,
    schedule: (w, d, s) => priorityScheduler.schedule(w, d, s, 'high')
  })
)

// 分析 - 空闲时
analytics$.pipe(
  observeOn({
    ...priorityScheduler,
    schedule: (w, d, s) => priorityScheduler.schedule(w, d, s, 'idle')
  })
)
```

## Web Worker 调度

### Worker Pool Scheduler

```javascript
class WorkerPoolScheduler {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.workers = []
    this.taskQueue = []
    this.idleWorkers = []
    
    // 创建 Worker 池
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript)
      worker.onmessage = (e) => this.handleWorkerMessage(worker, e)
      this.workers.push(worker)
      this.idleWorkers.push(worker)
    }
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay, state) {
    return new Promise((resolve, reject) => {
      const task = {
        work: work.toString(),
        state,
        resolve,
        reject,
        cancelled: false
      }
      
      if (delay > 0) {
        setTimeout(() => this.enqueue(task), delay)
      } else {
        this.enqueue(task)
      }
      
      return { unsubscribe: () => { task.cancelled = true } }
    })
  }
  
  enqueue(task) {
    if (task.cancelled) return
    
    if (this.idleWorkers.length > 0) {
      const worker = this.idleWorkers.pop()
      this.executeTask(worker, task)
    } else {
      this.taskQueue.push(task)
    }
  }
  
  executeTask(worker, task) {
    worker.currentTask = task
    worker.postMessage({
      work: task.work,
      state: task.state
    })
  }
  
  handleWorkerMessage(worker, event) {
    const task = worker.currentTask
    worker.currentTask = null
    
    if (!task.cancelled) {
      if (event.data.error) {
        task.reject(new Error(event.data.error))
      } else {
        task.resolve(event.data.result)
      }
    }
    
    // 处理队列中的下一个任务
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue.shift()
      this.executeTask(worker, nextTask)
    } else {
      this.idleWorkers.push(worker)
    }
  }
  
  terminate() {
    this.workers.forEach(w => w.terminate())
  }
}

// Worker 脚本 (worker.js)
/*
self.onmessage = function(e) {
  try {
    const fn = new Function('return ' + e.data.work)()
    const result = fn(e.data.state)
    self.postMessage({ result })
  } catch (error) {
    self.postMessage({ error: error.message })
  }
}
*/
```

## 事件循环集成

### React 调度器集成

```javascript
// 与 React 调度器优先级对齐
const ReactScheduler = {
  ImmediatePriority: 1,
  UserBlockingPriority: 2,
  NormalPriority: 3,
  LowPriority: 4,
  IdlePriority: 5
}

class ReactCompatScheduler {
  constructor() {
    this.tasksByPriority = new Map()
  }
  
  now() {
    return performance.now()
  }
  
  schedule(work, delay, state, priority = ReactScheduler.NormalPriority) {
    const task = { work, state, priority, cancelled: false }
    
    // 根据优先级选择执行时机
    const execute = () => {
      if (task.cancelled) return
      work(state)
    }
    
    switch (priority) {
      case ReactScheduler.ImmediatePriority:
        // 同步执行
        execute()
        break
        
      case ReactScheduler.UserBlockingPriority:
        // 微任务
        Promise.resolve().then(execute)
        break
        
      case ReactScheduler.NormalPriority:
        // 下一个宏任务
        setTimeout(execute, delay || 0)
        break
        
      case ReactScheduler.LowPriority:
        // 延迟执行
        setTimeout(execute, delay || 250)
        break
        
      case ReactScheduler.IdlePriority:
        // 空闲时
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(execute)
        } else {
          setTimeout(execute, delay || 500)
        }
        break
    }
    
    return { unsubscribe: () => { task.cancelled = true } }
  }
}
```

## 调试工具

### Scheduler 追踪

```javascript
function createTracingScheduler(baseScheduler, name) {
  const trace = []
  
  return {
    now: () => baseScheduler.now(),
    
    schedule(work, delay, state) {
      const id = trace.length
      const start = performance.now()
      
      trace.push({
        id,
        name,
        delay,
        scheduledAt: start,
        executedAt: null,
        duration: null
      })
      
      const wrappedWork = function(s) {
        const executeStart = performance.now()
        trace[id].executedAt = executeStart
        
        try {
          return work.call(this, s)
        } finally {
          trace[id].duration = performance.now() - executeStart
        }
      }
      
      return baseScheduler.schedule(wrappedWork, delay, state)
    },
    
    getTrace() {
      return trace
    },
    
    printTrace() {
      console.table(trace.map(t => ({
        id: t.id,
        delay: t.delay,
        waitTime: t.executedAt - t.scheduledAt,
        duration: t.duration?.toFixed(2)
      })))
    }
  }
}

// 使用
const tracedAsync = createTracingScheduler(asyncScheduler, 'async')

source$.pipe(
  observeOn(tracedAsync)
).subscribe()

// 查看追踪结果
tracedAsync.printTrace()
```

### 性能监控

```javascript
class PerformanceScheduler {
  constructor(baseScheduler) {
    this.baseScheduler = baseScheduler
    this.metrics = {
      totalTasks: 0,
      completedTasks: 0,
      totalDuration: 0,
      maxDuration: 0
    }
  }
  
  now() {
    return this.baseScheduler.now()
  }
  
  schedule(work, delay, state) {
    this.metrics.totalTasks++
    
    const wrappedWork = (s) => {
      const start = performance.now()
      try {
        return work(s)
      } finally {
        const duration = performance.now() - start
        this.metrics.completedTasks++
        this.metrics.totalDuration += duration
        this.metrics.maxDuration = Math.max(this.metrics.maxDuration, duration)
      }
    }
    
    return this.baseScheduler.schedule(wrappedWork, delay, state)
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      avgDuration: this.metrics.totalDuration / this.metrics.completedTasks
    }
  }
}
```

## 本章小结

- 虚拟时间测试让异步测试可控
- 时间切片避免长任务阻塞 UI
- 优先级队列实现任务优先级
- Worker Pool 利用多核并行处理
- 调试工具帮助追踪和优化

下一章进入测试主题，学习 RxJS 测试策略。
