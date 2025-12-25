---
sidebar_position: 86
title: "内置 Scheduler 详解"
---

# 内置 Scheduler 详解

深入理解四种内置 Scheduler 的实现原理和应用场景。

## queueScheduler

### 执行原理

queueScheduler 使用蹦床（trampoline）模式，在当前事件循环中同步执行，但通过队列管理避免栈溢出：

```javascript
// 普通递归：可能栈溢出
function countdown(n) {
  if (n > 0) {
    console.log(n)
    countdown(n - 1)  // 递归调用，栈增长
  }
}

// queueScheduler：安全递归
queueScheduler.schedule(function(n) {
  if (n > 0) {
    console.log(n)
    this.schedule(n - 1)  // 加入队列，不增加栈
  }
}, 0, 10000)  // 不会栈溢出
```

### 完整实现

```javascript
class QueueScheduler {
  constructor() {
    this.queue = []
    this.active = false
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay = 0, state) {
    const action = {
      work,
      state,
      delay,
      scheduler: this
    }
    
    this.queue.push(action)
    
    // 如果不在刷新中，开始刷新
    if (!this.active) {
      this.flush()
    }
    
    return {
      unsubscribe: () => {
        const index = this.queue.indexOf(action)
        if (index !== -1) {
          this.queue.splice(index, 1)
        }
      }
    }
  }
  
  flush() {
    this.active = true
    
    while (this.queue.length > 0) {
      const action = this.queue.shift()
      
      // 执行 work，绑定 schedule 方法
      const context = {
        schedule: (newState, newDelay) => {
          return this.schedule(action.work, newDelay, newState)
        }
      }
      
      action.work.call(context, action.state)
    }
    
    this.active = false
  }
}

const queueScheduler = new QueueScheduler()
```

### 应用场景

```javascript
// 1. 安全递归
queueScheduler.schedule(function(items) {
  if (items.length > 0) {
    processItem(items[0])
    this.schedule(items.slice(1))
  }
}, 0, largeArray)

// 2. 迭代器转 Observable
function fromIterable(iterable, scheduler = queueScheduler) {
  return new Observable(subscriber => {
    const iterator = iterable[Symbol.iterator]()
    
    const action = scheduler.schedule(function() {
      const { value, done } = iterator.next()
      
      if (done) {
        subscriber.complete()
      } else {
        subscriber.next(value)
        this.schedule()  // 继续迭代
      }
    })
    
    return () => action.unsubscribe()
  })
}

// 3. 深度优先遍历
function traverse(node) {
  queueScheduler.schedule(function(n) {
    visit(n)
    
    for (const child of n.children || []) {
      this.schedule(child)
    }
  }, 0, node)
}
```

## asapScheduler

### 执行原理

asapScheduler 使用微任务（microtask），在当前宏任务结束后立即执行：

```javascript
console.log('1. Sync')

asapScheduler.schedule(() => console.log('3. Microtask'))
Promise.resolve().then(() => console.log('4. Promise'))

console.log('2. Sync end')

// 输出顺序：
// 1. Sync
// 2. Sync end
// 3. Microtask（或 4）
// 4. Promise（或 3）
```

### 完整实现

```javascript
class AsapScheduler {
  constructor() {
    this.pending = []
    this.flushing = false
  }
  
  now() {
    return Date.now()
  }
  
  schedule(work, delay = 0, state) {
    if (delay > 0) {
      // 有延迟时使用 setTimeout
      const id = setTimeout(() => work(state), delay)
      return { unsubscribe: () => clearTimeout(id) }
    }
    
    const action = { work, state }
    this.pending.push(action)
    
    if (!this.flushing) {
      this.flushing = true
      
      // 使用 Promise 调度微任务
      Promise.resolve().then(() => {
        this.flush()
      })
    }
    
    return {
      unsubscribe: () => {
        const index = this.pending.indexOf(action)
        if (index !== -1) {
          this.pending.splice(index, 1)
        }
      }
    }
  }
  
  flush() {
    while (this.pending.length > 0) {
      const action = this.pending.shift()
      action.work(action.state)
    }
    this.flushing = false
  }
}

const asapScheduler = new AsapScheduler()
```

### 应用场景

```javascript
// 1. 尽快执行但不阻塞当前代码
function notifyAsync(callback) {
  asapScheduler.schedule(callback)
}

// 2. 批量状态更新
class Store {
  private pending = false
  private listeners = []
  
  notify() {
    if (!this.pending) {
      this.pending = true
      asapScheduler.schedule(() => {
        this.pending = false
        this.listeners.forEach(l => l())
      })
    }
  }
}

// 3. 避免同步回调中的异常影响调用者
function safeCallback(fn) {
  return (...args) => {
    asapScheduler.schedule(() => fn(...args))
  }
}
```

## asyncScheduler

### 执行原理

asyncScheduler 使用宏任务（setTimeout/setInterval）：

```javascript
console.log('1. Sync')

asyncScheduler.schedule(() => console.log('4. Macro'))
setTimeout(() => console.log('5. setTimeout'), 0)
Promise.resolve().then(() => console.log('3. Micro'))

console.log('2. Sync end')

// 输出顺序：
// 1. Sync
// 2. Sync end
// 3. Micro
// 4. Macro（或 5）
// 5. setTimeout（或 4）
```

### 完整实现

```javascript
class AsyncScheduler {
  now() {
    return Date.now()
  }
  
  schedule(work, delay = 0, state) {
    const context = {
      pending: true,
      id: null,
      state,
      
      schedule: (newState, newDelay = 0) => {
        // 取消之前的调度
        if (context.id) {
          clearTimeout(context.id)
        }
        
        context.state = newState !== undefined ? newState : context.state
        context.pending = true
        
        context.id = setTimeout(() => {
          if (context.pending) {
            context.pending = false
            work.call(context, context.state)
          }
        }, newDelay)
        
        return { unsubscribe: () => context.unsubscribe() }
      },
      
      unsubscribe: () => {
        context.pending = false
        if (context.id) {
          clearTimeout(context.id)
          context.id = null
        }
      }
    }
    
    context.schedule(state, delay)
    
    return { unsubscribe: () => context.unsubscribe() }
  }
}

const asyncScheduler = new AsyncScheduler()
```

### 应用场景

```javascript
// 1. 定时器
function interval(period, scheduler = asyncScheduler) {
  return new Observable(subscriber => {
    let count = 0
    
    const action = scheduler.schedule(function() {
      subscriber.next(count++)
      this.schedule(null, period)  // 重新调度
    }, period)
    
    return () => action.unsubscribe()
  })
}

// 2. 延迟执行
function delay(ms) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        asyncScheduler.schedule(() => subscriber.next(value), ms)
      },
      error(err) {
        asyncScheduler.schedule(() => subscriber.error(err), ms)
      },
      complete() {
        asyncScheduler.schedule(() => subscriber.complete(), ms)
      }
    })
  })
}

// 3. 超时控制
function timeout(ms) {
  return (source) => new Observable(subscriber => {
    let timeoutId
    
    const startTimeout = () => {
      timeoutId = asyncScheduler.schedule(() => {
        subscriber.error(new Error('Timeout'))
      }, ms)
    }
    
    startTimeout()
    
    return source.subscribe({
      next(value) {
        timeoutId?.unsubscribe()
        subscriber.next(value)
        startTimeout()
      },
      error(err) {
        timeoutId?.unsubscribe()
        subscriber.error(err)
      },
      complete() {
        timeoutId?.unsubscribe()
        subscriber.complete()
      }
    })
  })
}
```

## animationFrameScheduler

### 执行原理

animationFrameScheduler 使用 requestAnimationFrame，与浏览器渲染同步：

```javascript
// 在下一帧执行
animationFrameScheduler.schedule(() => {
  console.log('Next frame')
})

// 连续动画
animationFrameScheduler.schedule(function() {
  updateAnimation()
  this.schedule()  // 下一帧继续
})
```

### 完整实现

```javascript
class AnimationFrameScheduler {
  now() {
    return performance?.now() || Date.now()
  }
  
  schedule(work, delay = 0, state) {
    const context = {
      pending: true,
      rafId: null,
      timeoutId: null,
      state,
      
      schedule: (newState, newDelay = 0) => {
        // 取消之前的调度
        context.unsubscribe()
        
        context.state = newState !== undefined ? newState : context.state
        context.pending = true
        
        if (newDelay > 0) {
          // 有延迟：先 setTimeout，再 requestAnimationFrame
          context.timeoutId = setTimeout(() => {
            context.rafId = requestAnimationFrame(() => {
              if (context.pending) {
                context.pending = false
                work.call(context, context.state)
              }
            })
          }, newDelay)
        } else {
          // 无延迟：直接 requestAnimationFrame
          context.rafId = requestAnimationFrame(() => {
            if (context.pending) {
              context.pending = false
              work.call(context, context.state)
            }
          })
        }
        
        return { unsubscribe: () => context.unsubscribe() }
      },
      
      unsubscribe: () => {
        context.pending = false
        if (context.rafId) {
          cancelAnimationFrame(context.rafId)
          context.rafId = null
        }
        if (context.timeoutId) {
          clearTimeout(context.timeoutId)
          context.timeoutId = null
        }
      }
    }
    
    context.schedule(state, delay)
    
    return { unsubscribe: () => context.unsubscribe() }
  }
}

const animationFrameScheduler = new AnimationFrameScheduler()
```

### 应用场景

```javascript
// 1. 平滑动画
function animateValue(from, to, duration) {
  return new Observable(subscriber => {
    const startTime = animationFrameScheduler.now()
    
    const action = animationFrameScheduler.schedule(function() {
      const elapsed = animationFrameScheduler.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 缓动函数
      const eased = easeOutCubic(progress)
      const current = from + (to - from) * eased
      
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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// 2. 帧率控制
function frameRate() {
  return new Observable(subscriber => {
    let lastTime = animationFrameScheduler.now()
    let frameCount = 0
    
    const action = animationFrameScheduler.schedule(function() {
      const now = animationFrameScheduler.now()
      frameCount++
      
      // 每秒报告一次帧率
      if (now - lastTime >= 1000) {
        subscriber.next(frameCount)
        frameCount = 0
        lastTime = now
      }
      
      this.schedule()
    })
    
    return () => action.unsubscribe()
  })
}

// 3. 视觉更新批处理
function batchVisualUpdates() {
  const updates = []
  let scheduled = false
  
  return {
    add(update) {
      updates.push(update)
      
      if (!scheduled) {
        scheduled = true
        animationFrameScheduler.schedule(() => {
          const batch = updates.splice(0)
          batch.forEach(u => u())
          scheduled = false
        })
      }
    }
  }
}
```

## Scheduler 对比

| Scheduler | 执行时机 | 底层 API | 适用场景 |
|-----------|---------|---------|---------|
| queueScheduler | 同步，队列化 | 无 | 递归、迭代 |
| asapScheduler | 微任务 | Promise | 尽快执行 |
| asyncScheduler | 宏任务 | setTimeout | 定时器、延迟 |
| animationFrameScheduler | 渲染帧 | requestAnimationFrame | 动画、视觉更新 |

## 选择指南

```javascript
// 需要同步但安全的递归
queueScheduler

// 需要尽快执行，但不阻塞当前代码
asapScheduler

// 需要定时或延迟执行
asyncScheduler

// 需要与渲染同步
animationFrameScheduler
```

## 本章小结

- queueScheduler：同步队列，避免栈溢出
- asapScheduler：微任务，尽快执行
- asyncScheduler：宏任务，定时延迟
- animationFrameScheduler：动画帧，平滑渲染
- 根据场景选择合适的 Scheduler

下一章学习自定义 Scheduler。
