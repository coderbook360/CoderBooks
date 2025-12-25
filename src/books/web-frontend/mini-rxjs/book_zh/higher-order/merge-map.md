---
sidebar_position: 61
title: "mergeMap（flatMap）"
---

# mergeMap（flatMap）

`mergeMap` 将值映射为 Observable，并发订阅所有内部 Observable。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')

clicks$.pipe(
  mergeMap(() => interval(1000).pipe(take(3)))
).subscribe(console.log)
// 每次点击启动一个计数器，所有计数器并行运行
```

时间线：

```
clicks$: --c-------c-------->
inner1:    |--0--1--2|
inner2:           |--0--1--2|
output:  ----0--1--0-2-1--2-->
```

## 实现 mergeMap

```javascript
function mergeMap(project, concurrent = Infinity) {
  return (source) => new Observable(subscriber => {
    const buffer = []
    const subscriptions = []
    let active = 0
    let sourceComplete = false
    let index = 0

    function subscribeToInner(value) {
      active++
      const innerObservable = project(value, index++)
      
      const innerSubscription = innerObservable.subscribe({
        next(innerValue) {
          subscriber.next(innerValue)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          active--
          // 处理缓冲区
          if (buffer.length > 0 && active < concurrent) {
            subscribeToInner(buffer.shift())
          }
          // 检查完成
          if (sourceComplete && active === 0 && buffer.length === 0) {
            subscriber.complete()
          }
        }
      })

      subscriptions.push(innerSubscription)
    }

    const sourceSubscription = source.subscribe({
      next(value) {
        if (active < concurrent) {
          subscribeToInner(value)
        } else {
          buffer.push(value)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        sourceComplete = true
        if (active === 0 && buffer.length === 0) {
          subscriber.complete()
        }
      }
    })

    return () => {
      subscriptions.forEach(s => s.unsubscribe())
      sourceSubscription.unsubscribe()
    }
  })
}
```

## 并发控制

```javascript
const ids = [1, 2, 3, 4, 5]

// 无限并发（默认）
from(ids).pipe(
  mergeMap(id => fetchUser(id))
)
// 5个请求同时发出

// 限制并发为2
from(ids).pipe(
  mergeMap(id => fetchUser(id), 2)
)
// 最多2个同时请求
```

时间线（concurrent = 2）：

```
ids:    (1)(2)(3)(4)(5)|
        |--1--|        fetch 1
        |--2--|        fetch 2
              |--3--|  fetch 3（等1完成）
              |--4--|  fetch 4（等2完成）
                    |--5--| fetch 5
```

## mergeMapTo

固定内部 Observable：

```javascript
clicks$.pipe(
  mergeMapTo(ajax('/api/log'))
)

// 等价于
clicks$.pipe(
  mergeMap(() => ajax('/api/log'))
)
```

### 实现 mergeMapTo

```javascript
function mergeMapTo(innerObservable, concurrent) {
  return mergeMap(() => innerObservable, concurrent)
}
```

## flatMap 别名

`flatMap` 是 `mergeMap` 的别名：

```javascript
// 这两个完全相同
source$.pipe(flatMap(fn))
source$.pipe(mergeMap(fn))
```

## 实战示例

### 批量下载

```javascript
const urls = [
  '/api/file1',
  '/api/file2',
  '/api/file3',
  '/api/file4',
  '/api/file5'
]

from(urls).pipe(
  mergeMap(url => 
    ajax(url).pipe(
      map(res => ({ url, data: res.response }))
    ),
    3  // 最多3个并发下载
  )
).subscribe(({ url, data }) => {
  saveFile(url, data)
})
```

### 事件日志记录

```javascript
const userEvents$ = merge(
  clicks$.pipe(map(() => 'click')),
  scrolls$.pipe(map(() => 'scroll')),
  inputs$.pipe(map(() => 'input'))
)

userEvents$.pipe(
  bufferTime(5000),
  filter(events => events.length > 0),
  mergeMap(events => 
    ajax.post('/api/analytics', { events })
  )
).subscribe()
```

### 递归获取分页数据

```javascript
function fetchAllPages(url) {
  return ajax(url).pipe(
    mergeMap(response => {
      const items$ = of(...response.data)
      
      if (response.nextPage) {
        return merge(
          items$,
          fetchAllPages(response.nextPage)
        )
      }
      return items$
    })
  )
}

fetchAllPages('/api/items?page=1').subscribe(item => {
  processItem(item)
})
```

### WebSocket 消息处理

```javascript
const messages$ = websocket.messages$

messages$.pipe(
  filter(msg => msg.type === 'task'),
  mergeMap(task => 
    processTask(task).pipe(
      map(result => ({ taskId: task.id, result })),
      catchError(err => of({ taskId: task.id, error: err }))
    ),
    5  // 最多5个任务并行
  )
).subscribe(({ taskId, result, error }) => {
  if (error) {
    reportTaskError(taskId, error)
  } else {
    reportTaskComplete(taskId, result)
  }
})
```

## mergeAll

展平高阶 Observable：

```javascript
const higherOrder$ = source$.pipe(
  map(x => ajax(`/api/${x}`))
)
// Observable<Observable<Response>>

higherOrder$.pipe(
  mergeAll()
)
// Observable<Response>
```

### 实现 mergeAll

```javascript
function mergeAll(concurrent = Infinity) {
  return mergeMap(inner => inner, concurrent)
}
```

## mergeMap vs concatMap

```javascript
const ids = of(1, 2, 3)

// mergeMap: 并发
ids.pipe(
  mergeMap(id => fetchUser(id).pipe(delay(id * 100)))
).subscribe(console.log)
// 顺序不确定：可能是 1, 2, 3 或 2, 1, 3 等

// concatMap: 串行
ids.pipe(
  concatMap(id => fetchUser(id).pipe(delay(id * 100)))
).subscribe(console.log)
// 顺序确定：1, 2, 3
```

| 特性 | mergeMap | concatMap |
|------|----------|-----------|
| 执行方式 | 并发 | 串行 |
| 输出顺序 | 不确定 | 确定 |
| 适用场景 | 独立任务 | 顺序依赖 |

## 常见陷阱

### 内存问题

```javascript
// 危险：无限产生 Observable，无限内存增长
interval(10).pipe(
  mergeMap(() => interval(1000))  // 每10ms创建一个永不完成的Observable
).subscribe(...)

// 解决：限制并发 + 确保内部完成
interval(10).pipe(
  mergeMap(() => interval(1000).pipe(take(5)), 3)
).subscribe(...)
```

### 输出顺序

```javascript
// 输出顺序可能与输入不同
of('slow', 'fast').pipe(
  mergeMap(x => x === 'slow' 
    ? of(x).pipe(delay(1000))
    : of(x).pipe(delay(100))
  )
).subscribe(console.log)
// fast, slow（不是 slow, fast）
```

## TypeScript 类型

```typescript
function mergeMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent?: number
): OperatorFunction<T, R>

function mergeMapTo<R>(
  innerObservable: ObservableInput<R>,
  concurrent?: number
): OperatorFunction<any, R>

function mergeAll<T>(
  concurrent?: number
): OperatorFunction<ObservableInput<T>, T>

// flatMap 是 mergeMap 的别名
declare const flatMap: typeof mergeMap
```

## 本章小结

- `mergeMap` 并发订阅所有内部 Observable
- `concurrent` 参数控制最大并发数
- 输出顺序取决于内部完成顺序
- 适合独立的并行任务

下一章实现 `concatMap` 操作符。
