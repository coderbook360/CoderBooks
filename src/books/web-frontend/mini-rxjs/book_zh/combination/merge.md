---
sidebar_position: 51
title: "merge"
---

# merge

`merge` 将多个 Observable 合并为一个，同时订阅所有源。

## 基本用法

```javascript
const a$ = interval(1000).pipe(map(x => `A: ${x}`))
const b$ = interval(1500).pipe(map(x => `B: ${x}`))

merge(a$, b$).subscribe(console.log)
// A: 0
// B: 0
// A: 1
// A: 2
// B: 1
// ...
```

时间线：

```
a$: --A:0--A:1--A:2--A:3-->
b$: ---B:0----B:1----B:2-->
merge:
    --A:0-B:0-A:1-A:2-B:1-->
```

## 实现 merge

```javascript
function merge(...sources) {
  // 处理最后一个参数可能是 concurrent 数字
  let concurrent = Infinity
  
  if (typeof sources[sources.length - 1] === 'number') {
    concurrent = sources.pop()
  }

  return new Observable(subscriber => {
    const subscriptions = []
    let active = 0
    let sourceIndex = 0
    let completed = 0

    function subscribeToSource(source) {
      active++
      
      const subscription = source.subscribe({
        next(value) {
          subscriber.next(value)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          active--
          completed++
          
          // 订阅下一个等待的源
          if (sourceIndex < sources.length) {
            subscribeToSource(sources[sourceIndex++])
          } else if (completed === sources.length) {
            subscriber.complete()
          }
        }
      })

      subscriptions.push(subscription)
    }

    // 初始订阅，受 concurrent 限制
    while (sourceIndex < sources.length && active < concurrent) {
      subscribeToSource(sources[sourceIndex++])
    }

    return () => {
      subscriptions.forEach(s => s.unsubscribe())
    }
  })
}
```

## 并发控制

```javascript
const sources = [
  ajax('/api/1'),
  ajax('/api/2'),
  ajax('/api/3'),
  ajax('/api/4'),
  ajax('/api/5')
]

// 最多同时2个并发请求
merge(...sources, 2).subscribe(console.log)
```

`concurrent` 参数控制同时订阅的源数量：

```
concurrent = 2:
                              
源1: ---1-|
源2: -----2---|
源3:          --3--|   (等源1完成)
源4:              -4-| (等源2完成)
```

## 静态 merge vs 实例 mergeWith

```javascript
// 静态方法
import { merge } from 'rxjs'
merge(a$, b$, c$)

// 实例方法 (RxJS 7+)
a$.pipe(
  mergeWith(b$, c$)
)
```

### 实现 mergeWith

```javascript
function mergeWith(...sources) {
  return (source) => merge(source, ...sources)
}
```

## merge vs concat

```javascript
const a$ = of(1, 2).pipe(delay(100))
const b$ = of(3, 4)

// merge: 同时订阅，谁先发谁先到
merge(a$, b$).subscribe(console.log)
// 3, 4, 1, 2

// concat: 顺序订阅，前一个完成再订阅下一个
concat(a$, b$).subscribe(console.log)
// 1, 2, 3, 4
```

关键区别：

| 特性 | merge | concat |
|------|-------|--------|
| 订阅时机 | 同时 | 顺序 |
| 输出顺序 | 按发射顺序 | 按源顺序 |
| 适用场景 | 并行任务 | 串行任务 |

## 实战示例

### 多数据源聚合

```javascript
const websocket$ = createWebSocket()
const polling$ = interval(5000).pipe(
  switchMap(() => fetchUpdates())
)

// 合并实时推送和轮询
merge(websocket$, polling$).pipe(
  distinctUntilChanged((a, b) => a.id === b.id)
).subscribe(update => {
  applyUpdate(update)
})
```

### 多按钮事件

```javascript
const save$ = fromEvent(saveBtn, 'click').pipe(
  map(() => ({ action: 'save' }))
)
const delete$ = fromEvent(deleteBtn, 'click').pipe(
  map(() => ({ action: 'delete' }))
)
const reset$ = fromEvent(resetBtn, 'click').pipe(
  map(() => ({ action: 'reset' }))
)

merge(save$, delete$, reset$).subscribe(event => {
  handleAction(event.action)
})
```

### 并发请求限制

```javascript
const urls = ['/api/1', '/api/2', '/api/3', '/api/4', '/api/5']

// 最多同时3个请求
merge(
  ...urls.map(url => ajax(url)),
  3
).subscribe(response => {
  processResponse(response)
})
```

### 超时处理

```javascript
const request$ = ajax('/api/data')
const timeout$ = timer(5000).pipe(
  switchMap(() => throwError(() => new Error('Timeout')))
)

merge(request$, timeout$).pipe(
  take(1)
).subscribe({
  next: data => handleData(data),
  error: err => handleError(err)
})
```

## 常见陷阱

### 无限流不会完成

```javascript
// a$ 永不完成
const a$ = interval(1000)
const b$ = of(1, 2, 3)

merge(a$, b$).subscribe({
  complete: () => console.log('done')  // 永远不会触发
})
```

### 错误会立即终止

```javascript
const a$ = interval(1000)
const b$ = throwError(() => new Error('oops'))

merge(a$, b$).subscribe({
  error: err => console.log(err)  // 立即错误
})
// a$ 也会被取消订阅
```

## TypeScript 类型

```typescript
function merge<A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): Observable<A[number]>

function merge<A extends readonly unknown[]>(
  ...sourcesAndConcurrent: [...ObservableInputTuple<A>, number]
): Observable<A[number]>

function mergeWith<T, A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]>
```

## 本章小结

- `merge` 同时订阅多个源，按发射顺序输出
- `concurrent` 参数控制并发数量
- 区别于 `concat` 的顺序订阅
- 适合并行任务、多事件源聚合

下一章实现 `concat` 操作符。
