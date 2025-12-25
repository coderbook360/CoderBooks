---
sidebar_position: 81
title: "AsyncSubject 实现"
---

# AsyncSubject 实现

AsyncSubject 只在完成时发出最后一个值——类似 Promise。

## 为什么需要 AsyncSubject

有时只关心最终结果，不关心中间过程：

```javascript
// 普通 Subject：发出所有值
const subject = new Subject()
subject.subscribe(console.log)
subject.next(1)  // 1
subject.next(2)  // 2
subject.next(3)  // 3
subject.complete()

// AsyncSubject：只发出最后一个值
const async = new AsyncSubject()
async.subscribe(console.log)
async.next(1)  // 不输出
async.next(2)  // 不输出
async.next(3)  // 不输出
async.complete()  // 3（完成时发出最后一个值）
```

## 基本用法

```javascript
const async$ = new AsyncSubject()

async$.subscribe(v => console.log('A:', v))

async$.next(1)
async$.next(2)
async$.next(3)

// 此时 A 没有收到任何值

async$.subscribe(v => console.log('B:', v))

async$.complete()
// A: 3
// B: 3
```

### 出错时不发值

```javascript
const async$ = new AsyncSubject()

async$.subscribe({
  next: console.log,
  error: console.error
})

async$.next(1)
async$.next(2)
async$.error(new Error('oops'))
// Error: oops
// 不会发出任何值
```

### 完成后订阅

```javascript
const async$ = new AsyncSubject()
async$.next(1)
async$.next(2)
async$.complete()

// 完成后订阅，仍然收到最后一个值
async$.subscribe(console.log)  // 2
```

## 实现 AsyncSubject

```javascript
class AsyncSubject extends Subject {
  constructor() {
    super()
    this._value = undefined
    this._hasValue = false
  }
  
  // 重写 next：只保存最后一个值，不立即发送
  next(value) {
    if (this.closed || this.isStopped) return
    
    this._value = value
    this._hasValue = true
    // 注意：不调用 super.next()，不立即发送
  }
  
  // 重写 complete：发送最后一个值，然后完成
  complete() {
    if (this.closed || this.isStopped) return
    
    this.isStopped = true
    
    const observers = this.observers.slice()
    
    // 如果有值，先发送
    if (this._hasValue) {
      for (const observer of observers) {
        observer.next(this._value)
      }
    }
    
    // 然后完成
    for (const observer of observers) {
      observer.complete()
    }
    
    this.observers = []
  }
  
  // 重写 subscribe：如果已完成，立即发送值
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
      if (this._hasValue) {
        observer.next?.(this._value)
      }
      observer.complete?.()
      return { unsubscribe: () => {} }
    }
    
    // 添加到订阅者列表（不立即发送值）
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
}
```

## 与 Promise 对比

```javascript
// Promise
const promise = new Promise(resolve => {
  setTimeout(() => resolve(1), 100)
  setTimeout(() => resolve(2), 200)  // 被忽略
})

promise.then(console.log)  // 1（只有第一个 resolve 生效）

// AsyncSubject
const async$ = new AsyncSubject()

setTimeout(() => async$.next(1), 100)
setTimeout(() => async$.next(2), 200)
setTimeout(() => async$.complete(), 300)

async$.subscribe(console.log)  // 2（最后一个值）
```

关键区别：
- Promise：第一个 resolve 的值
- AsyncSubject：最后一个值（complete 时）

## 实战示例

### 长时间计算

```javascript
function compute(data) {
  const result$ = new AsyncSubject()
  
  // 模拟长时间计算
  let result = data
  
  // 多个计算阶段
  setTimeout(() => {
    result = transform1(result)
    result$.next(result)  // 中间结果
  }, 100)
  
  setTimeout(() => {
    result = transform2(result)
    result$.next(result)  // 中间结果
  }, 200)
  
  setTimeout(() => {
    result = transform3(result)
    result$.next(result)  // 最终结果
    result$.complete()
  }, 300)
  
  return result$.asObservable()
}

// 只关心最终结果
compute(input).subscribe(finalResult => {
  console.log('计算完成:', finalResult)
})
```

### 懒加载模块

```javascript
class ModuleLoader {
  private modules = new Map()
  
  load(moduleName) {
    if (!this.modules.has(moduleName)) {
      const subject = new AsyncSubject()
      this.modules.set(moduleName, subject)
      
      // 异步加载
      import(`./modules/${moduleName}.js`).then(
        module => {
          subject.next(module)
          subject.complete()
        },
        err => {
          subject.error(err)
        }
      )
    }
    
    return this.modules.get(moduleName).asObservable()
  }
}

// 使用
const loader = new ModuleLoader()

// 多次调用只加载一次
loader.load('utils').subscribe(m => console.log('A got:', m))
loader.load('utils').subscribe(m => console.log('B got:', m))
// 模块加载完成后，A 和 B 都收到相同的模块
```

### 初始化状态

```javascript
class AppInitializer {
  private ready$ = new AsyncSubject()
  
  async initialize() {
    try {
      // 初始化步骤
      await this.loadConfig()
      this.ready$.next(true)
      
      await this.connectDB()
      this.ready$.next(true)
      
      await this.setupServices()
      this.ready$.next(true)
      
      // 全部完成
      this.ready$.complete()
    } catch (err) {
      this.ready$.error(err)
    }
  }
  
  // 等待初始化完成
  whenReady() {
    return this.ready$.asObservable()
  }
}

// 使用
const app = new AppInitializer()
app.initialize()

// 任何时候订阅，都会等待初始化完成
app.whenReady().subscribe({
  next: () => console.log('App is ready!'),
  error: err => console.error('Init failed:', err)
})
```

### 请求聚合

```javascript
function createBatchedRequest(batchFn, delay = 50) {
  let pending = null
  let ids = []
  
  return (id) => {
    if (!pending) {
      pending = new AsyncSubject()
      ids = []
      
      // 延迟执行批量请求
      setTimeout(() => {
        const currentIds = ids
        const currentPending = pending
        
        pending = null
        ids = []
        
        batchFn(currentIds).then(
          results => {
            currentPending.next(results)
            currentPending.complete()
          },
          err => {
            currentPending.error(err)
          }
        )
      }, delay)
    }
    
    ids.push(id)
    
    // 返回只包含当前 id 结果的 Observable
    return pending.pipe(
      map(results => results[id])
    )
  }
}

// 使用
const getUsers = createBatchedRequest(
  ids => api.getUsersByIds(ids)
)

// 这三个调用会合并成一个批量请求
getUsers('1').subscribe(user => console.log(user))
getUsers('2').subscribe(user => console.log(user))
getUsers('3').subscribe(user => console.log(user))
```

### 缓存计算结果

```javascript
class ComputeCache {
  private cache = new Map()
  
  compute(key, computeFn) {
    if (!this.cache.has(key)) {
      const subject = new AsyncSubject()
      this.cache.set(key, subject)
      
      // 执行计算
      try {
        const result = computeFn()
        
        if (result instanceof Promise) {
          result.then(
            value => {
              subject.next(value)
              subject.complete()
            },
            err => {
              subject.error(err)
              this.cache.delete(key)  // 失败时清除缓存
            }
          )
        } else {
          subject.next(result)
          subject.complete()
        }
      } catch (err) {
        subject.error(err)
        this.cache.delete(key)
      }
    }
    
    return this.cache.get(key).asObservable()
  }
  
  invalidate(key) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
  }
}

// 使用
const cache = new ComputeCache()

// 相同的 key，computeFn 只执行一次
cache.compute('factorial-10', () => factorial(10)).subscribe(console.log)
cache.compute('factorial-10', () => factorial(10)).subscribe(console.log)
```

### Promise 转 Observable（多播）

```javascript
function fromPromiseShared(promiseFn) {
  const subject = new AsyncSubject()
  let started = false
  
  return new Observable(subscriber => {
    const subscription = subject.subscribe(subscriber)
    
    if (!started) {
      started = true
      promiseFn().then(
        value => {
          subject.next(value)
          subject.complete()
        },
        err => {
          subject.error(err)
        }
      )
    }
    
    return subscription
  })
}

// 使用
const sharedRequest$ = fromPromiseShared(() => fetch('/api/data'))

// 多次订阅，只发一次请求
sharedRequest$.subscribe(console.log)
sharedRequest$.subscribe(console.log)
```

## 与其他 Subject 对比

| 特性 | Subject | BehaviorSubject | ReplaySubject | AsyncSubject |
|-----|---------|-----------------|---------------|--------------|
| 需要初始值 | 否 | 是 | 否 | 否 |
| 缓存值 | 0 | 1 | N | 1 |
| 发送时机 | 立即 | 立即 | 立即 | 完成时 |
| 晚订阅者 | 无值 | 当前值 | 历史值 | 最终值 |
| 类似于 | EventEmitter | 状态变量 | 事件历史 | Promise |

## 常见陷阱

### 忘记调用 complete

```javascript
const async$ = new AsyncSubject()

async$.subscribe(console.log)
async$.next(1)
async$.next(2)
// 如果不调用 complete()，订阅者永远收不到值

// 必须调用 complete
async$.complete()  // 输出 2
```

### 没有值就 complete

```javascript
const async$ = new AsyncSubject()
async$.subscribe(console.log)
async$.complete()  // 没有输出，因为没有值
```

### 用于需要中间值的场景

```javascript
// 错误用法：需要看到中间状态
const progress$ = new AsyncSubject()

progress$.subscribe(p => {
  progressBar.value = p  // 想看到 0%, 50%, 100%
})

progress$.next(0)
progress$.next(50)
progress$.next(100)
progress$.complete()  // 只看到 100%

// 正确用法：用 BehaviorSubject 或 Subject
const progress$ = new BehaviorSubject(0)
```

## TypeScript 类型

```typescript
class AsyncSubject<T> extends Subject<T> {
  next(value: T): void
  complete(): void
  
  // 继承自 Subject
  subscribe(observer?: Partial<Observer<T>>): Subscription
  subscribe(next?: (value: T) => void): Subscription
}
```

## 本章小结

- AsyncSubject 只在 complete 时发出最后一个值
- 类似 Promise，但可以多播
- 适合只关心最终结果的场景
- 必须调用 complete 才会发值
- 适用于模块加载、初始化、请求聚合

下一章实现更多 Subject 工具函数。
