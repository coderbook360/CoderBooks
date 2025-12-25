---
sidebar_position: 80
title: "ReplaySubject 实现"
---

# ReplaySubject 实现

ReplaySubject 缓存多个历史值，新订阅者可以收到之前发出的值。

## 为什么需要 ReplaySubject

BehaviorSubject 只保存最新值，但有时需要更多历史：

```javascript
// BehaviorSubject 只能获取最新值
const behavior = new BehaviorSubject(null)
behavior.next(1)
behavior.next(2)
behavior.next(3)

behavior.subscribe(console.log)  // 只收到 3

// ReplaySubject 可以获取历史值
const replay = new ReplaySubject(3)
replay.next(1)
replay.next(2)
replay.next(3)

replay.subscribe(console.log)  // 收到 1, 2, 3
```

## 基本用法

```javascript
// 缓存最近 2 个值
const replay$ = new ReplaySubject(2)

replay$.next(1)
replay$.next(2)
replay$.next(3)

replay$.subscribe(v => console.log('A:', v))
// A: 2
// A: 3（最近两个值）

replay$.next(4)
// A: 4

replay$.subscribe(v => console.log('B:', v))
// B: 3
// B: 4（最近两个值）
```

### 时间窗口

```javascript
// 缓存最近 1 秒内的值
const replay$ = new ReplaySubject(Infinity, 1000)

replay$.next(1)  // t=0
setTimeout(() => replay$.next(2), 500)   // t=500
setTimeout(() => replay$.next(3), 1500)  // t=1500

// t=2000 订阅，只能收到 t=1000~2000 内的值
setTimeout(() => {
  replay$.subscribe(console.log)  // 只收到 3
}, 2000)
```

### 缓存全部

```javascript
// 缓存所有值
const replay$ = new ReplaySubject()  // 或 new ReplaySubject(Infinity)

replay$.next(1)
replay$.next(2)
replay$.next(3)

replay$.subscribe(console.log)  // 1, 2, 3 全部收到
```

## 实现 ReplaySubject

```javascript
class ReplaySubject extends Subject {
  constructor(bufferSize = Infinity, windowTime = Infinity) {
    super()
    this._bufferSize = bufferSize
    this._windowTime = windowTime
    this._buffer = []  // { value, time }
  }
  
  // 清理过期的缓存
  _trimBuffer() {
    if (this._windowTime === Infinity) return
    
    const now = Date.now()
    const cutoff = now - this._windowTime
    
    // 移除过期的值
    while (this._buffer.length > 0 && this._buffer[0].time < cutoff) {
      this._buffer.shift()
    }
  }
  
  // 重写 next：添加到缓冲区
  next(value) {
    if (this.closed || this.isStopped) return
    
    // 清理过期缓存
    this._trimBuffer()
    
    // 添加新值
    this._buffer.push({
      value,
      time: Date.now()
    })
    
    // 限制缓冲区大小
    while (this._buffer.length > this._bufferSize) {
      this._buffer.shift()
    }
    
    // 通知当前订阅者
    super.next(value)
  }
  
  // 重写 subscribe：先发送缓冲值
  subscribe(observerOrNext) {
    const observer = typeof observerOrNext === 'function'
      ? { next: observerOrNext }
      : observerOrNext
    
    // 如果已经出错
    if (this.hasError) {
      // 先发送缓冲值
      this._trimBuffer()
      for (const { value } of this._buffer) {
        observer.next?.(value)
      }
      observer.error?.(this.thrownError)
      return { unsubscribe: () => {} }
    }
    
    // 如果已经完成
    if (this.isStopped) {
      // 先发送缓冲值
      this._trimBuffer()
      for (const { value } of this._buffer) {
        observer.next?.(value)
      }
      observer.complete?.()
      return { unsubscribe: () => {} }
    }
    
    // 发送缓冲值
    this._trimBuffer()
    for (const { value } of this._buffer) {
      observer.next?.(value)
    }
    
    // 添加到订阅者列表
    this.observers.push(observer)
    
    return {
      unsubscribe: () => {
        const index = this.observers.indexOf(observer)
        if (index !== -1) {
          this.observers.splice(index, 1)
        }
      }
    }
  }
  
  // 重写 error：保留缓冲区用于晚订阅者
  error(err) {
    if (this.closed || this.isStopped) return
    
    this.hasError = true
    this.thrownError = err
    this.isStopped = true
    
    const observers = this.observers.slice()
    for (const observer of observers) {
      observer.error(err)
    }
    
    this.observers = []
    // 注意：不清空 _buffer，让晚订阅者能获取历史
  }
  
  // 重写 complete：保留缓冲区
  complete() {
    if (this.closed || this.isStopped) return
    
    this.isStopped = true
    
    const observers = this.observers.slice()
    for (const observer of observers) {
      observer.complete()
    }
    
    this.observers = []
    // 注意：不清空 _buffer
  }
}
```

## 与其他 Subject 对比

```javascript
// Subject: 不缓存
const subject = new Subject()
subject.next(1); subject.next(2); subject.next(3)
subject.subscribe(console.log)  // 无输出

// BehaviorSubject: 缓存最新值
const behavior = new BehaviorSubject(0)
behavior.next(1); behavior.next(2); behavior.next(3)
behavior.subscribe(console.log)  // 3

// ReplaySubject(1): 类似 BehaviorSubject
const replay1 = new ReplaySubject(1)
replay1.next(1); replay1.next(2); replay1.next(3)
replay1.subscribe(console.log)  // 3

// ReplaySubject(2): 缓存最近 2 个
const replay2 = new ReplaySubject(2)
replay2.next(1); replay2.next(2); replay2.next(3)
replay2.subscribe(console.log)  // 2, 3

// ReplaySubject(): 缓存全部
const replayAll = new ReplaySubject()
replayAll.next(1); replayAll.next(2); replayAll.next(3)
replayAll.subscribe(console.log)  // 1, 2, 3
```

## 实战示例

### 消息历史

```javascript
class ChatRoom {
  // 缓存最近 100 条消息
  private messages$ = new ReplaySubject(100)
  
  sendMessage(message) {
    this.messages$.next({
      id: Date.now(),
      ...message,
      timestamp: new Date()
    })
  }
  
  // 新用户加入时可以看到历史消息
  join() {
    return this.messages$.asObservable()
  }
}

// 使用
const room = new ChatRoom()

room.sendMessage({ user: 'Alice', text: 'Hello' })
room.sendMessage({ user: 'Bob', text: 'Hi there!' })

// 新用户加入
room.join().subscribe(msg => {
  console.log(`${msg.user}: ${msg.text}`)
})
// 立即收到之前的消息
```

### 事件回放

```javascript
class EventRecorder {
  // 记录最近 5 秒的事件
  private events$ = new ReplaySubject(Infinity, 5000)
  
  record(event) {
    this.events$.next({
      ...event,
      recordedAt: Date.now()
    })
  }
  
  // 回放最近的事件
  replay() {
    return this.events$.asObservable()
  }
  
  // 获取当前缓冲区快照
  snapshot() {
    return new Promise(resolve => {
      const events = []
      this.events$.subscribe({
        next: e => events.push(e),
        complete: () => resolve(events)
      })
      setTimeout(() => resolve(events), 0)
    })
  }
}

// 错误上报：记录出错前的用户操作
const recorder = new EventRecorder()

document.addEventListener('click', e => {
  recorder.record({ type: 'click', target: e.target.tagName })
})

window.onerror = (message) => {
  recorder.snapshot().then(events => {
    sendErrorReport({ message, events })
  })
}
```

### 热缓存 API

```javascript
function createCachedRequest(url, cacheTime = 30000) {
  const subject = new ReplaySubject(1, cacheTime)
  let loading = false
  let lastFetch = 0
  
  return () => {
    const now = Date.now()
    
    // 缓存过期或首次请求
    if (!loading && now - lastFetch > cacheTime) {
      loading = true
      lastFetch = now
      
      ajax.getJSON(url).subscribe({
        next: data => {
          subject.next(data)
          loading = false
        },
        error: err => {
          subject.error(err)
          loading = false
        }
      })
    }
    
    return subject.asObservable()
  }
}

// 使用
const getUser = createCachedRequest('/api/user', 60000)

// 第一次调用：发起请求
getUser().subscribe(console.log)

// 1 秒后调用：使用缓存
setTimeout(() => {
  getUser().subscribe(console.log)  // 立即收到缓存的数据
}, 1000)
```

### 撤销/重做

```javascript
class UndoManager {
  private history$ = new ReplaySubject()
  private states = []
  private currentIndex = -1
  
  push(state) {
    // 丢弃 redo 历史
    this.states = this.states.slice(0, this.currentIndex + 1)
    
    // 添加新状态
    this.states.push(state)
    this.currentIndex++
    
    this.history$.next(state)
  }
  
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--
      const state = this.states[this.currentIndex]
      this.history$.next(state)
      return state
    }
    return null
  }
  
  redo() {
    if (this.currentIndex < this.states.length - 1) {
      this.currentIndex++
      const state = this.states[this.currentIndex]
      this.history$.next(state)
      return state
    }
    return null
  }
  
  canUndo() {
    return this.currentIndex > 0
  }
  
  canRedo() {
    return this.currentIndex < this.states.length - 1
  }
}
```

### 日志收集

```javascript
class Logger {
  // 保留最近 1000 条日志
  private logs$ = new ReplaySubject(1000)
  
  log(level, message, data) {
    this.logs$.next({
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    })
  }
  
  debug(message, data) {
    this.log('debug', message, data)
  }
  
  info(message, data) {
    this.log('info', message, data)
  }
  
  warn(message, data) {
    this.log('warn', message, data)
  }
  
  error(message, data) {
    this.log('error', message, data)
  }
  
  // 获取所有日志
  getLogs() {
    return this.logs$.pipe(toArray())
  }
  
  // 按级别过滤
  getLogsByLevel(level) {
    return this.logs$.pipe(
      filter(log => log.level === level)
    )
  }
  
  // 实时监控
  watch() {
    return this.logs$.asObservable()
  }
}

// 使用
const logger = new Logger()

logger.info('App started')
logger.debug('Config loaded', { env: 'production' })

// 后来添加日志查看器，能看到之前的日志
logger.watch().subscribe(log => {
  console.log(`[${log.level}] ${log.message}`)
})
```

### 最近搜索

```javascript
class SearchHistory {
  // 保留最近 10 条搜索
  private history$ = new ReplaySubject(10)
  private searches = new Set()
  
  add(query) {
    // 避免重复
    if (!this.searches.has(query)) {
      this.searches.add(query)
      this.history$.next(query)
      
      // 限制 Set 大小
      if (this.searches.size > 10) {
        const first = this.searches.values().next().value
        this.searches.delete(first)
      }
    }
  }
  
  getRecent() {
    return this.history$.pipe(
      toArray(),
      map(arr => arr.reverse())  // 最新的在前
    )
  }
  
  clear() {
    this.searches.clear()
    // ReplaySubject 缓冲区无法清空，需要创建新的
  }
}
```

## bufferSize vs windowTime

```javascript
// 只用 bufferSize：保留最近 N 个值
const replay = new ReplaySubject(5)

// 只用 windowTime：保留时间窗口内的值
const replay = new ReplaySubject(Infinity, 5000)

// 同时使用：满足两个条件
const replay = new ReplaySubject(5, 5000)
// 保留最近 5 个值，且这些值在 5 秒内
```

## 常见陷阱

### 内存泄漏

```javascript
// 危险：无限缓冲
const replay = new ReplaySubject()

// 如果持续发值，内存会无限增长
setInterval(() => replay.next(new Date()), 100)

// 安全：限制缓冲大小或时间
const replay = new ReplaySubject(100)
const replay = new ReplaySubject(Infinity, 60000)
```

### 缓冲区无法清空

```javascript
// ReplaySubject 没有清空缓冲区的方法
const replay = new ReplaySubject(10)

// 要"重置"只能创建新的 ReplaySubject
let replay = new ReplaySubject(10)

function reset() {
  replay.complete()
  replay = new ReplaySubject(10)
}
```

### 时间窗口的精度

```javascript
// windowTime 依赖系统时间，不是精确的
const replay = new ReplaySubject(Infinity, 1000)

// 在时间边界上的行为可能不符合预期
// 比如 t=999 的值在 t=1001 可能还在，也可能不在
```

## TypeScript 类型

```typescript
class ReplaySubject<T> extends Subject<T> {
  constructor(
    bufferSize?: number,  // 默认 Infinity
    windowTime?: number   // 默认 Infinity，单位毫秒
  )
}
```

## 本章小结

- ReplaySubject 缓存多个历史值
- `bufferSize` 控制缓存数量
- `windowTime` 控制缓存时间窗口
- 适合消息历史、事件回放、日志收集
- 注意内存泄漏风险

下一章实现 `AsyncSubject`——只在完成时发出最后一个值。
