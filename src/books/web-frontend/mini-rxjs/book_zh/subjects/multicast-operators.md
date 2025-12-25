---
sidebar_position: 83
title: "多播操作符：share 与 shareReplay"
---

# 多播操作符：share 与 shareReplay

本章实现多播相关操作符。

## share 操作符

### 功能描述

`share` 将单播 Observable 转为多播，多个订阅者共享同一执行。

### 实现

```javascript
function share() {
  return (source) => {
    let subject = null
    let refCount = 0
    let subscription = null
    
    return new Observable(subscriber => {
      refCount++
      
      if (!subject) {
        subject = new Subject()
        subscription = source.subscribe(subject)
      }
      
      const innerSub = subject.subscribe(subscriber)
      
      return () => {
        refCount--
        innerSub.unsubscribe()
        
        if (refCount === 0) {
          subscription?.unsubscribe()
          subject = null
          subscription = null
        }
      }
    })
  }
}
```

### 使用示例

```javascript
const source$ = interval(1000).pipe(
  tap(x => console.log('Source:', x)),
  share()
)

source$.subscribe(x => console.log('A:', x))

setTimeout(() => {
  source$.subscribe(x => console.log('B:', x))
}, 2500)

// 输出：
// Source: 0
// A: 0
// Source: 1
// A: 1
// Source: 2
// A: 2
// B: 2  (B 加入时，共享当前值)
// Source: 3
// A: 3
// B: 3
```

## shareReplay 操作符

### 功能描述

`shareReplay` 多播并缓存最近的值，新订阅者立即收到缓存值。

### 实现

```javascript
function shareReplay(bufferSize = Infinity) {
  return (source) => {
    let subject = null
    let refCount = 0
    let subscription = null
    
    return new Observable(subscriber => {
      refCount++
      
      if (!subject) {
        subject = new ReplaySubject(bufferSize)
        subscription = source.subscribe(subject)
      }
      
      const innerSub = subject.subscribe(subscriber)
      
      return () => {
        refCount--
        innerSub.unsubscribe()
        
        if (refCount === 0) {
          subscription?.unsubscribe()
          subject = null
          subscription = null
        }
      }
    })
  }
}
```

### 使用示例

```javascript
const source$ = interval(1000).pipe(
  take(5),
  shareReplay(2)  // 缓存最近 2 个值
)

source$.subscribe(x => console.log('A:', x))

setTimeout(() => {
  // B 立即收到缓存的值
  source$.subscribe(x => console.log('B:', x))
}, 3500)

// 输出：
// A: 0
// A: 1
// A: 2
// A: 3
// B: 2  (缓存)
// B: 3  (缓存)
// A: 4
// B: 4
```

## share vs shareReplay

### share

```javascript
const shared$ = http.get('/api/data').pipe(
  share()
)

// 第一个订阅：发起请求
shared$.subscribe(console.log)

// 同时第二个订阅：共享同一请求
shared$.subscribe(console.log)

// 稍后第三个订阅：请求已完成，什么都收不到
setTimeout(() => {
  shared$.subscribe(console.log)  // 收不到数据
}, 5000)
```

### shareReplay

```javascript
const cached$ = http.get('/api/data').pipe(
  shareReplay(1)
)

// 第一个订阅：发起请求
cached$.subscribe(console.log)

// 同时第二个订阅：共享同一请求
cached$.subscribe(console.log)

// 稍后第三个订阅：从缓存获取
setTimeout(() => {
  cached$.subscribe(console.log)  // 立即收到缓存的数据
}, 5000)
```

## 配置选项

### share 配置

```javascript
function share(config = {}) {
  const {
    connector = () => new Subject(),
    resetOnError = true,
    resetOnComplete = true,
    resetOnRefCountZero = true
  } = config
  
  return (source) => {
    let subject = null
    let refCount = 0
    let subscription = null
    
    const reset = () => {
      subject = null
      subscription?.unsubscribe()
      subscription = null
    }
    
    return new Observable(subscriber => {
      refCount++
      
      if (!subject) {
        subject = connector()
        subscription = source.subscribe({
          next: v => subject.next(v),
          error: err => {
            const s = subject
            if (resetOnError) reset()
            s.error(err)
          },
          complete: () => {
            const s = subject
            if (resetOnComplete) reset()
            s.complete()
          }
        })
      }
      
      const innerSub = subject.subscribe(subscriber)
      
      return () => {
        refCount--
        innerSub.unsubscribe()
        
        if (refCount === 0 && resetOnRefCountZero) {
          reset()
        }
      }
    })
  }
}

// 使用
const source$ = fetchData().pipe(
  share({
    resetOnError: false,      // 错误后不重置
    resetOnComplete: false,   // 完成后不重置
    resetOnRefCountZero: true // 无订阅时重置
  })
)
```

### shareReplay 配置

```javascript
function shareReplay(config) {
  const bufferSize = typeof config === 'number' ? config : config?.bufferSize ?? Infinity
  const windowTime = typeof config === 'object' ? config.windowTime : undefined
  const refCount = typeof config === 'object' ? config.refCount ?? false : false
  
  return share({
    connector: () => new ReplaySubject(bufferSize, windowTime),
    resetOnError: true,
    resetOnComplete: false,
    resetOnRefCountZero: refCount
  })
}

// 使用
const cached$ = fetchData().pipe(
  shareReplay({
    bufferSize: 1,
    refCount: true  // 无订阅者时清除缓存
  })
)
```

## 实际应用

### HTTP 请求缓存

```javascript
class DataService {
  private cache$ = null
  
  getData() {
    if (!this.cache$) {
      this.cache$ = http.get('/api/data').pipe(
        shareReplay(1)
      )
    }
    return this.cache$
  }
  
  clearCache() {
    this.cache$ = null
  }
}
```

### 多组件共享状态

```javascript
const userState$ = authService.currentUser$.pipe(
  switchMap(user => user ? fetchUserDetails(user.id) : of(null)),
  shareReplay(1)
)

// 组件 A
userState$.subscribe(updateHeaderUI)

// 组件 B
userState$.subscribe(updateSidebarUI)

// 组件 C
userState$.subscribe(updateProfileUI)
```

### 防止重复请求

```javascript
class SearchService {
  private searchCache = new Map()
  
  search(term) {
    if (!this.searchCache.has(term)) {
      this.searchCache.set(term, 
        http.get(`/api/search?q=${term}`).pipe(
          shareReplay(1)
        )
      )
    }
    return this.searchCache.get(term)
  }
}
```

## 本章小结

- `share` 多播当前执行
- `shareReplay` 多播并缓存历史值
- 配置选项控制重置行为
- 适用于 HTTP 缓存和状态共享
- 注意内存泄漏（缓存不释放）

下一章学习 Scheduler 调度器。
