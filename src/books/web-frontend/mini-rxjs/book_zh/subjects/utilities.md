---
sidebar_position: 82
title: "Subject 工具函数"
---

# Subject 工具函数

本章介绍与 Subject 配合使用的工具函数和高级模式。

## connectable

创建可连接的 Observable，手动控制数据流开始：

```javascript
// 问题：share() 在第一个订阅时就开始
const shared$ = source$.pipe(share())
shared$.subscribe(console.log)  // 立即开始

// 解决：connectable 需要手动 connect
const connectable$ = connectable(source$, {
  connector: () => new Subject()
})

connectable$.subscribe(v => console.log('A:', v))
connectable$.subscribe(v => console.log('B:', v))

// 手动开始
connectable$.connect()
```

### 实现 connectable

```javascript
function connectable(source, config = {}) {
  const { connector = () => new Subject(), resetOnDisconnect = true } = config
  
  let subject = null
  let connection = null
  let refCount = 0
  
  const result = new Observable(subscriber => {
    // 懒创建 Subject
    if (!subject) {
      subject = connector()
    }
    
    // 订阅 Subject
    const subscription = subject.subscribe(subscriber)
    refCount++
    
    return () => {
      subscription.unsubscribe()
      refCount--
      
      // 如果没有订阅者且配置了重置
      if (refCount === 0 && resetOnDisconnect) {
        connection?.unsubscribe()
        connection = null
        subject = null
      }
    }
  })
  
  // 添加 connect 方法
  result.connect = () => {
    if (!subject) {
      subject = connector()
    }
    
    if (!connection) {
      connection = source.subscribe(subject)
    }
    
    return connection
  }
  
  return result
}
```

## multicast（已废弃，了解原理）

使用 Subject 多播 Observable：

```javascript
// 旧 API
const multicasted$ = source$.pipe(
  multicast(new Subject())
)

multicasted$.subscribe(console.log)
multicasted$.connect()

// 新 API 等价
const shared$ = source$.pipe(
  share({ connector: () => new Subject() })
)
```

### 实现 multicast

```javascript
function multicast(subjectOrFactory, selector) {
  const subjectFactory = typeof subjectOrFactory === 'function'
    ? subjectOrFactory
    : () => subjectOrFactory
  
  return (source) => {
    if (selector) {
      // 有 selector：返回普通 Observable
      return new Observable(subscriber => {
        const subject = subjectFactory()
        
        const subscription = selector(subject.asObservable()).subscribe(subscriber)
        subscription.add(source.subscribe(subject))
        
        return subscription
      })
    }
    
    // 无 selector：返回 ConnectableObservable
    return connectable(source, { connector: subjectFactory })
  }
}
```

## publish（已废弃，了解原理）

`multicast` 使用 Subject 的简写：

```javascript
// 等价
source$.pipe(publish())
source$.pipe(multicast(() => new Subject()))

// publishBehavior
source$.pipe(publishBehavior(0))
source$.pipe(multicast(() => new BehaviorSubject(0)))

// publishReplay
source$.pipe(publishReplay(1))
source$.pipe(multicast(() => new ReplaySubject(1)))

// publishLast
source$.pipe(publishLast())
source$.pipe(multicast(() => new AsyncSubject()))
```

### 实现 publish 系列

```javascript
function publish(selector) {
  return multicast(() => new Subject(), selector)
}

function publishBehavior(initialValue) {
  return multicast(() => new BehaviorSubject(initialValue))
}

function publishReplay(bufferSize, windowTime) {
  return multicast(() => new ReplaySubject(bufferSize, windowTime))
}

function publishLast() {
  return multicast(() => new AsyncSubject())
}
```

## refCount

自动管理连接的引用计数：

```javascript
// 第一个订阅自动 connect，最后一个取消订阅自动断开
const shared$ = connectable(source$).pipe(
  refCount()
)

const sub1 = shared$.subscribe(console.log)  // 自动 connect
const sub2 = shared$.subscribe(console.log)

sub1.unsubscribe()
sub2.unsubscribe()  // 自动断开
```

### 实现 refCount

```javascript
function refCount() {
  return (source) => {
    let refCount = 0
    let connection = null
    
    return new Observable(subscriber => {
      refCount++
      
      // 第一个订阅者触发 connect
      if (refCount === 1 && source.connect) {
        connection = source.connect()
      }
      
      const subscription = source.subscribe(subscriber)
      
      return () => {
        subscription.unsubscribe()
        refCount--
        
        // 最后一个取消订阅时断开
        if (refCount === 0 && connection) {
          connection.unsubscribe()
          connection = null
        }
      }
    })
  }
}
```

## 实战模式

### 热转冷

```javascript
// 热 Observable（WebSocket）转为冷 Observable
function coldify(hot$) {
  return new Observable(subscriber => {
    const subject = new ReplaySubject()
    const subscription = hot$.subscribe(subject)
    
    return subject.subscribe(subscriber).add(() => {
      subscription.unsubscribe()
    })
  })
}

// 使用：每个订阅者从头开始收到所有值
const cold$ = coldify(webSocket$)
```

### 冷转热

```javascript
// 冷 Observable 转为热 Observable
function hotify(cold$, connector = () => new Subject()) {
  let subject = null
  let subscription = null
  let refCount = 0
  
  return new Observable(subscriber => {
    if (!subject) {
      subject = connector()
      subscription = cold$.subscribe(subject)
    }
    
    refCount++
    const sub = subject.subscribe(subscriber)
    
    return () => {
      sub.unsubscribe()
      refCount--
      
      if (refCount === 0) {
        subscription?.unsubscribe()
        subject = null
        subscription = null
      }
    }
  })
}

// 使用
const hot$ = hotify(interval(1000))
```

### 带缓存的热转换

```javascript
function shareWithCache(bufferSize = 1, windowTime = Infinity) {
  let subject = null
  let subscription = null
  let refCount = 0
  
  return (source) => new Observable(subscriber => {
    if (!subject) {
      subject = new ReplaySubject(bufferSize, windowTime)
      subscription = source.subscribe(subject)
    }
    
    refCount++
    const sub = subject.subscribe(subscriber)
    
    return () => {
      sub.unsubscribe()
      refCount--
      
      if (refCount === 0) {
        subscription?.unsubscribe()
        subject = null
        subscription = null
      }
    }
  })
}

// API 响应缓存 30 秒
const user$ = ajax.getJSON('/api/user').pipe(
  shareWithCache(1, 30000)
)
```

### 事件总线

```javascript
class EventBus {
  private subjects = new Map()
  
  emit(event, data) {
    this.getSubject(event).next(data)
  }
  
  on(event) {
    return this.getSubject(event).asObservable()
  }
  
  once(event) {
    return this.on(event).pipe(take(1))
  }
  
  private getSubject(event) {
    if (!this.subjects.has(event)) {
      this.subjects.set(event, new Subject())
    }
    return this.subjects.get(event)
  }
  
  // 清理特定事件
  clear(event) {
    if (this.subjects.has(event)) {
      this.subjects.get(event).complete()
      this.subjects.delete(event)
    }
  }
  
  // 清理所有
  destroy() {
    for (const subject of this.subjects.values()) {
      subject.complete()
    }
    this.subjects.clear()
  }
}

// 使用
const bus = new EventBus()

bus.on('user:login').subscribe(user => {
  console.log('User logged in:', user)
})

bus.emit('user:login', { id: 1, name: 'Alice' })
```

### 状态机

```javascript
class StateMachine {
  private state$ = new BehaviorSubject(this.initialState)
  private transitions = new Map()
  
  constructor(initialState, transitions) {
    this.initialState = initialState
    
    for (const [from, events] of Object.entries(transitions)) {
      for (const [event, to] of Object.entries(events)) {
        this.transitions.set(`${from}:${event}`, to)
      }
    }
  }
  
  get current$() {
    return this.state$.asObservable()
  }
  
  get current() {
    return this.state$.getValue()
  }
  
  send(event) {
    const key = `${this.current}:${event}`
    const nextState = this.transitions.get(key)
    
    if (nextState) {
      this.state$.next(nextState)
      return true
    }
    
    return false
  }
  
  // 等待进入特定状态
  waitFor(state) {
    return this.state$.pipe(
      filter(s => s === state),
      take(1)
    )
  }
}

// 使用
const machine = new StateMachine('idle', {
  idle: { start: 'loading' },
  loading: { success: 'ready', error: 'error' },
  error: { retry: 'loading' },
  ready: { reset: 'idle' }
})

machine.current$.subscribe(state => {
  console.log('State:', state)
})

machine.send('start')    // loading
machine.send('success')  // ready
```

### 请求队列

```javascript
class RequestQueue {
  private queue$ = new Subject()
  
  constructor(concurrency = 1) {
    this.results$ = this.queue$.pipe(
      mergeMap(
        ({ request, resolve, reject }) => 
          request.pipe(
            tap({
              next: resolve,
              error: reject
            }),
            catchError(() => EMPTY)
          ),
        concurrency
      ),
      share()
    )
    
    // 启动处理
    this.results$.subscribe()
  }
  
  add(request$) {
    return new Promise((resolve, reject) => {
      this.queue$.next({ request: request$, resolve, reject })
    })
  }
}

// 使用：限制并发请求数
const queue = new RequestQueue(3)

const urls = ['/api/1', '/api/2', '/api/3', '/api/4', '/api/5']

urls.forEach(url => {
  queue.add(ajax.getJSON(url)).then(console.log)
})
```

### 双向绑定

```javascript
function createBidirectionalBinding(initial) {
  const subject = new BehaviorSubject(initial)
  
  return {
    // 获取值流
    value$: subject.asObservable(),
    
    // 设置值
    setValue: (value) => subject.next(value),
    
    // 从另一个 Observable 同步
    syncFrom: (source$) => {
      return source$.subscribe(value => subject.next(value))
    },
    
    // 同步到另一个 Subject
    syncTo: (target) => {
      return subject.subscribe(value => target.next(value))
    },
    
    // 双向同步
    syncWith: (other$, setter) => {
      const sub1 = subject.pipe(
        distinctUntilChanged()
      ).subscribe(setter)
      
      const sub2 = other$.pipe(
        distinctUntilChanged()
      ).subscribe(value => subject.next(value))
      
      return { unsubscribe: () => { sub1.unsubscribe(); sub2.unsubscribe() } }
    }
  }
}

// 表单双向绑定
const name = createBidirectionalBinding('')

// 绑定到 input
nameInput.addEventListener('input', e => name.setValue(e.target.value))
name.value$.subscribe(v => nameInput.value = v)

// 绑定到显示
name.value$.subscribe(v => nameDisplay.textContent = v)
```

## Subject 选择指南

```javascript
// 1. 只需要事件通知，不关心历史
const events$ = new Subject()

// 2. 需要当前状态，且有默认值
const state$ = new BehaviorSubject(defaultState)

// 3. 需要历史值（如消息历史）
const messages$ = new ReplaySubject(100)

// 4. 只关心最终结果（如加载完成）
const loaded$ = new AsyncSubject()
```

## 常见陷阱

### Subject 作为参数传递

```javascript
// 危险：外部可以调用 complete/error
function process(subject) {
  subject.next('processed')
  subject.complete()  // 可能不是调用者期望的
}

// 安全：传递 Observer 接口
function process(observer) {
  observer.next('processed')
  // 不能调用 complete，因为不确定是否应该
}

// 或者只暴露 asObservable()
```

### 忘记取消内部订阅

```javascript
// 错误：内存泄漏
class Component {
  data$ = new BehaviorSubject(null)
  
  init() {
    api.getData().subscribe(data => {
      this.data$.next(data)
    })
  }
}

// 正确：保存并取消订阅
class Component {
  data$ = new BehaviorSubject(null)
  private subscription
  
  init() {
    this.subscription = api.getData().subscribe(data => {
      this.data$.next(data)
    })
  }
  
  destroy() {
    this.subscription?.unsubscribe()
    this.data$.complete()
  }
}
```

## 本章小结

- `connectable` 创建可手动连接的 Observable
- `refCount` 自动管理连接生命周期
- Subject 可实现事件总线、状态机、请求队列等模式
- 选择合适的 Subject 类型：Subject、BehaviorSubject、ReplaySubject、AsyncSubject

下一章进入 Scheduler 主题——控制执行时机。
