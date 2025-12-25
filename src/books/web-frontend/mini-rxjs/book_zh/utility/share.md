---
sidebar_position: 75
title: "share 与 shareReplay"
---

# share 与 shareReplay

`share` 共享订阅，`shareReplay` 共享并缓存最近的值。

## 冷 Observable vs 热 Observable

```javascript
// 冷 Observable：每次订阅都重新执行
const cold$ = new Observable(subscriber => {
  console.log('Side effect!')
  subscriber.next(Math.random())
  subscriber.complete()
})

cold$.subscribe(console.log)  // Side effect! 0.123
cold$.subscribe(console.log)  // Side effect! 0.456（不同的值）

// 热 Observable：共享同一个执行
const hot$ = cold$.pipe(share())

hot$.subscribe(console.log)  // Side effect! 0.789
hot$.subscribe(console.log)  // (无副作用，相同的值)
```

## share

共享订阅，自动管理生命周期：

```javascript
const source$ = interval(1000).pipe(
  tap(x => console.log('Source:', x)),
  share()
)

const sub1 = source$.subscribe(x => console.log('A:', x))

setTimeout(() => {
  const sub2 = source$.subscribe(x => console.log('B:', x))
}, 2500)
// Source: 0, A: 0
// Source: 1, A: 1
// Source: 2, A: 2, B: 2
// Source: 3, A: 3, B: 3
```

### 实现 share

```javascript
function share() {
  return (source) => {
    let subject = null
    let subscription = null
    let refCount = 0

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
          subscription.unsubscribe()
          subject = null
          subscription = null
        }
      }
    })
  }
}
```

## shareReplay

共享并缓存最近 N 个值：

```javascript
const source$ = interval(1000).pipe(
  take(5),
  shareReplay(2)  // 缓存最近2个值
)

source$.subscribe(x => console.log('A:', x))
// A: 0, A: 1, A: 2, A: 3, A: 4

setTimeout(() => {
  source$.subscribe(x => console.log('B:', x))
  // 立即收到: B: 3, B: 4（缓存的最后2个）
}, 6000)
```

### 实现 shareReplay

```javascript
function shareReplay(bufferSize = Infinity) {
  return (source) => {
    let subject = null
    let subscription = null
    let hasCompleted = false

    return new Observable(subscriber => {
      if (!subject) {
        subject = new ReplaySubject(bufferSize)
        subscription = source.subscribe({
          next(value) {
            subject.next(value)
          },
          error(err) {
            subject.error(err)
          },
          complete() {
            hasCompleted = true
            subject.complete()
          }
        })
      }

      return subject.subscribe(subscriber)
    })
  }
}
```

### shareReplay 配置

```javascript
// 缓存大小
shareReplay(3)

// 完整配置
shareReplay({
  bufferSize: 3,
  refCount: true,  // 订阅者归零时重置
  windowTime: 5000  // 缓存有效期
})
```

## 实战示例

### API 请求缓存

```javascript
// 多个组件共享同一个请求
const user$ = ajax('/api/user').pipe(
  shareReplay(1)
)

// 组件 A
user$.subscribe(user => renderUserA(user))

// 组件 B
user$.subscribe(user => renderUserB(user))

// 只发起一次请求
```

### 配置数据

```javascript
// 全局配置，只加载一次
const config$ = ajax('/api/config').pipe(
  map(res => res.response),
  shareReplay(1)
)

export function getConfig() {
  return config$
}

// 任何地方调用都共享
getConfig().subscribe(config => {/* ... */})
getConfig().subscribe(config => {/* ... */})
```

### 实时数据流

```javascript
// WebSocket 消息共享
const messages$ = new Observable(subscriber => {
  const ws = new WebSocket('ws://...')
  ws.onmessage = e => subscriber.next(JSON.parse(e.data))
  ws.onerror = e => subscriber.error(e)
  ws.onclose = () => subscriber.complete()
  return () => ws.close()
}).pipe(
  share()  // 共享 WebSocket 连接
)

// 多个订阅者共享同一个连接
messages$.subscribe(handleMessage1)
messages$.subscribe(handleMessage2)
```

### 表单状态共享

```javascript
const formValue$ = fromEvent(form, 'input').pipe(
  map(() => getFormData()),
  shareReplay(1)
)

// 验证
formValue$.pipe(
  map(validateForm)
).subscribe(updateValidationUI)

// 自动保存
formValue$.pipe(
  debounceTime(2000)
).subscribe(autoSave)

// 预览
formValue$.subscribe(updatePreview)
```

## share vs shareReplay

```javascript
const source$ = of(1, 2, 3).pipe(delay(100))

// share: 晚订阅可能错过
const shared$ = source$.pipe(share())
shared$.subscribe(x => console.log('A:', x))  // A: 1, 2, 3

setTimeout(() => {
  shared$.subscribe(x => console.log('B:', x))  // 什么都没有
}, 200)

// shareReplay: 晚订阅也能收到缓存
const replayed$ = source$.pipe(shareReplay())
replayed$.subscribe(x => console.log('A:', x))  // A: 1, 2, 3

setTimeout(() => {
  replayed$.subscribe(x => console.log('B:', x))  // B: 1, 2, 3
}, 200)
```

| 特性 | share | shareReplay |
|------|-------|-------------|
| 缓存 | 无 | 有 |
| 晚订阅 | 错过历史值 | 收到缓存值 |
| 完成后订阅 | 立即完成 | 收到缓存再完成 |
| 内存 | 低 | 取决于缓存大小 |

## refCount 行为

```javascript
// share 默认 refCount=true
const shared$ = source$.pipe(share())
// 所有订阅者取消后，重置

// shareReplay 默认 refCount=false
const replayed$ = source$.pipe(shareReplay(1))
// 即使没有订阅者，缓存保持

// 手动设置
const replayed$ = source$.pipe(
  shareReplay({ bufferSize: 1, refCount: true })
)
// 订阅者归零后重置
```

## 常见陷阱

### 意外的重订阅

```javascript
// 问题：每次调用都新建
function getData() {
  return ajax('/api').pipe(shareReplay(1))
}

getData().subscribe()  // 请求1
getData().subscribe()  // 请求2（不是同一个 Observable！）

// 解决：保存引用
const data$ = ajax('/api').pipe(shareReplay(1))
function getData() {
  return data$
}
```

### 内存泄漏

```javascript
// 问题：shareReplay 默认不 refCount
const data$ = source$.pipe(shareReplay(1000))
// 即使没有订阅者，缓存 1000 个值

// 解决：使用 refCount
const data$ = source$.pipe(
  shareReplay({ bufferSize: 1000, refCount: true })
)
```

## TypeScript 类型

```typescript
interface ShareConfig<T> {
  connector?: () => SubjectLike<T>
  resetOnError?: boolean
  resetOnComplete?: boolean
  resetOnRefCountZero?: boolean
}

function share<T>(config?: ShareConfig<T>): OperatorFunction<T, T>

interface ShareReplayConfig {
  bufferSize?: number
  windowTime?: number
  refCount?: boolean
}

function shareReplay<T>(
  configOrBufferSize?: ShareReplayConfig | number
): OperatorFunction<T, T>
```

## 本章小结

- `share` 共享订阅，晚订阅错过历史值
- `shareReplay` 共享并缓存，晚订阅收到缓存
- 适合 API 请求、配置数据、实时流
- 注意 refCount 配置避免内存泄漏

下一章实现更多实用操作符：`materialize` 和 `dematerialize`。
