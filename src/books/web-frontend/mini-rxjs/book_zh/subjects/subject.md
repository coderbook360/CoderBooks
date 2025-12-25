---
sidebar_position: 78
title: "Subject 核心概念"
---

# Subject 核心概念

Subject 既是 Observable 也是 Observer——它是响应式编程中的"桥梁"。

## 为什么需要 Subject

Observable 有一个限制——它是单播的：

```javascript
// Observable 是单播的
const random$ = new Observable(subscriber => {
  subscriber.next(Math.random())
})

random$.subscribe(v => console.log('A:', v))  // A: 0.123
random$.subscribe(v => console.log('B:', v))  // B: 0.789（不同的随机数）
```

每个订阅都执行独立的生产者逻辑。但有时我们需要多播：

```javascript
// Subject 是多播的
const subject = new Subject()

subject.subscribe(v => console.log('A:', v))
subject.subscribe(v => console.log('B:', v))

subject.next(Math.random())  
// A: 0.456
// B: 0.456（相同的值）
```

## Subject 的双重身份

```javascript
// 作为 Observer：可以接收值
const subject = new Subject()
subject.next(1)
subject.error(new Error('oops'))
subject.complete()

// 作为 Observable：可以被订阅
subject.subscribe({
  next: console.log,
  error: console.error,
  complete: () => console.log('done')
})
```

这让 Subject 成为连接命令式和声明式世界的桥梁：

```javascript
// 命令式代码
button.onclick = () => {
  subject.next('clicked')
}

// 响应式代码
subject.pipe(
  debounceTime(300),
  map(event => fetchData())
).subscribe(...)
```

## 实现 Subject

```javascript
class Subject {
  constructor() {
    this.observers = []
    this.closed = false
    this.hasError = false
    this.thrownError = null
    this.isStopped = false
  }
  
  // Observer 接口
  next(value) {
    if (this.closed || this.isStopped) return
    
    // 通知所有订阅者
    const observers = this.observers.slice()
    for (const observer of observers) {
      observer.next(value)
    }
  }
  
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
  }
  
  complete() {
    if (this.closed || this.isStopped) return
    
    this.isStopped = true
    
    const observers = this.observers.slice()
    for (const observer of observers) {
      observer.complete()
    }
    
    this.observers = []
  }
  
  // Observable 接口
  subscribe(observerOrNext) {
    const observer = typeof observerOrNext === 'function'
      ? { next: observerOrNext }
      : observerOrNext
    
    // 如果已经出错
    if (this.hasError) {
      observer.error?.(this.thrownError)
      return { unsubscribe: () => {} }
    }
    
    // 如果已经完成
    if (this.isStopped) {
      observer.complete?.()
      return { unsubscribe: () => {} }
    }
    
    // 添加到订阅者列表
    this.observers.push(observer)
    
    // 返回取消订阅函数
    return {
      unsubscribe: () => {
        const index = this.observers.indexOf(observer)
        if (index !== -1) {
          this.observers.splice(index, 1)
        }
      }
    }
  }
  
  // 转为纯 Observable（隐藏 next/error/complete）
  asObservable() {
    return new Observable(subscriber => {
      return this.subscribe(subscriber)
    })
  }
  
  // 获取订阅者数量
  get observerCount() {
    return this.observers.length
  }
}
```

## 订阅时机很重要

Subject 是"热"的——只有订阅后才能收到值：

```javascript
const subject = new Subject()

subject.next(1)  // 没有订阅者，丢失

subject.subscribe(v => console.log('A:', v))
subject.next(2)  // A: 2

subject.subscribe(v => console.log('B:', v))
subject.next(3)  // A: 3, B: 3

subject.next(1)  // 丢失
subject.subscribe(...)  // 收不到 1
```

如果需要接收之前的值，使用 BehaviorSubject 或 ReplaySubject。

## Subject 变体对比

```javascript
// Subject: 不缓存，仅转发
const subject = new Subject()

// BehaviorSubject: 缓存最后一个值，需要初始值
const behavior = new BehaviorSubject(0)

// ReplaySubject: 缓存 N 个历史值
const replay = new ReplaySubject(3)

// AsyncSubject: 只在完成时发出最后一个值
const async = new AsyncSubject()
```

## 实战示例

### 事件桥接

```javascript
class EventBridge {
  constructor() {
    this.events = new Subject()
  }
  
  emit(event) {
    this.events.next(event)
  }
  
  on(type) {
    return this.events.pipe(
      filter(e => e.type === type),
      map(e => e.payload)
    )
  }
  
  destroy() {
    this.events.complete()
  }
}

// 使用
const bridge = new EventBridge()

bridge.on('click').subscribe(data => console.log('Click:', data))
bridge.on('hover').subscribe(data => console.log('Hover:', data))

bridge.emit({ type: 'click', payload: { x: 100, y: 200 } })
bridge.emit({ type: 'hover', payload: { target: 'button' } })
```

### 状态管理

```javascript
class Store {
  constructor(initialState) {
    this.state$ = new BehaviorSubject(initialState)
  }
  
  getState() {
    return this.state$.getValue()
  }
  
  setState(updater) {
    const current = this.getState()
    const next = typeof updater === 'function'
      ? updater(current)
      : { ...current, ...updater }
    this.state$.next(next)
  }
  
  select(selector) {
    return this.state$.pipe(
      map(selector),
      distinctUntilChanged()
    )
  }
}

// 使用
const store = new Store({ count: 0, name: 'app' })

store.select(s => s.count).subscribe(count => {
  console.log('Count changed:', count)
})

store.setState({ count: 1 })
store.setState(s => ({ count: s.count + 1 }))
```

### 请求去重

```javascript
const searchSubject = new Subject()

// 输入框变化时
input.addEventListener('input', e => {
  searchSubject.next(e.target.value)
})

// 处理搜索
searchSubject.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(query => search(query))
).subscribe(results => {
  displayResults(results)
})
```

### 多播 API 响应

```javascript
function createSharedRequest(url) {
  const subject = new Subject()
  let pending = false
  
  return {
    fetch() {
      if (!pending) {
        pending = true
        ajax.getJSON(url).subscribe({
          next: data => subject.next(data),
          error: err => subject.error(err),
          complete: () => {
            pending = false
            subject.complete()
          }
        })
      }
      return subject.asObservable()
    }
  }
}

// 多个组件共享同一个请求
const userRequest = createSharedRequest('/api/user')
userRequest.fetch().subscribe(user => console.log('Header:', user))
userRequest.fetch().subscribe(user => console.log('Sidebar:', user))
// 只发一次请求，两个订阅者都收到响应
```

### WebSocket 消息分发

```javascript
class WebSocketService {
  private messages$ = new Subject()
  
  constructor(url) {
    const ws = new WebSocket(url)
    
    ws.onmessage = event => {
      const message = JSON.parse(event.data)
      this.messages$.next(message)
    }
    
    ws.onerror = err => {
      this.messages$.error(err)
    }
    
    ws.onclose = () => {
      this.messages$.complete()
    }
  }
  
  // 按类型订阅消息
  onMessage(type) {
    return this.messages$.pipe(
      filter(msg => msg.type === type)
    )
  }
}

// 使用
const ws = new WebSocketService('wss://api.example.com')

ws.onMessage('chat').subscribe(msg => displayChat(msg))
ws.onMessage('notification').subscribe(msg => showNotification(msg))
ws.onMessage('status').subscribe(msg => updateStatus(msg))
```

## 常见陷阱

### 在 Subject 完成后发值

```javascript
const subject = new Subject()
subject.complete()
subject.next(1)  // 无效，Subject 已停止
```

### 忘记取消订阅

```javascript
// 错误：内存泄漏
subject.subscribe(v => this.value = v)

// 正确：保存订阅并取消
const sub = subject.subscribe(v => this.value = v)
// 组件销毁时
sub.unsubscribe()
```

### 暴露 Subject

```javascript
// 错误：外部可以调用 next/error/complete
class Service {
  events = new Subject()
}

// 正确：只暴露 Observable
class Service {
  private _events = new Subject()
  events$ = this._events.asObservable()
  
  emit(event) {
    this._events.next(event)
  }
}
```

### 同步订阅后发值

```javascript
const subject = new Subject()

// 同步发值，此时没有订阅者
subject.next(1)

// 订阅
subject.subscribe(console.log)

// 收不到 1
```

## TypeScript 类型

```typescript
class Subject<T> implements Observer<T>, Observable<T> {
  observers: Observer<T>[]
  closed: boolean
  isStopped: boolean
  hasError: boolean
  thrownError: any
  
  next(value: T): void
  error(err: any): void
  complete(): void
  
  subscribe(observer?: Partial<Observer<T>>): Subscription
  subscribe(next?: (value: T) => void): Subscription
  
  asObservable(): Observable<T>
  
  readonly observerCount: number
}
```

## 本章小结

- Subject 既是 Observer 也是 Observable
- Subject 实现多播——多个订阅者共享同一个值
- Subject 是"热"的，订阅前的值会丢失
- 使用 `asObservable()` 隐藏 Subject 的写入能力
- 常用于事件桥接、状态管理、请求多播

下一章实现 `BehaviorSubject`——带初始值的 Subject。
