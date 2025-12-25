---
sidebar_position: 62
title: "concatMap"
---

# concatMap

`concatMap` 将值映射为 Observable，并按顺序串行订阅每个内部 Observable。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')

clicks$.pipe(
  concatMap(() => interval(1000).pipe(take(3)))
).subscribe(console.log)
// 点击后：0, 1, 2
// 再点击后（等前一个完成）：0, 1, 2
```

时间线：

```
clicks$: --c-----c-------->
inner1:    |--0--1--2|
inner2:              |--0--1--2|
output:  ----0--1--2---0--1--2-->
```

前一个必须完成，后一个才开始。

## 实现 concatMap

```javascript
function concatMap(project) {
  // concatMap 本质上是 concurrent=1 的 mergeMap
  return mergeMap(project, 1)
}
```

不依赖 mergeMap 的独立实现：

```javascript
function concatMap(project) {
  return (source) => new Observable(subscriber => {
    const queue = []
    let innerSubscription = null
    let sourceComplete = false
    let index = 0

    function subscribeToNext() {
      if (queue.length === 0) {
        if (sourceComplete) {
          subscriber.complete()
        }
        return
      }

      const value = queue.shift()
      const innerObservable = project(value, index++)

      innerSubscription = innerObservable.subscribe({
        next(innerValue) {
          subscriber.next(innerValue)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          innerSubscription = null
          subscribeToNext()  // 订阅下一个
        }
      })
    }

    const sourceSubscription = source.subscribe({
      next(value) {
        queue.push(value)
        if (!innerSubscription) {
          subscribeToNext()
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        sourceComplete = true
        if (!innerSubscription && queue.length === 0) {
          subscriber.complete()
        }
      }
    })

    return () => {
      if (innerSubscription) {
        innerSubscription.unsubscribe()
      }
      sourceSubscription.unsubscribe()
    }
  })
}
```

## concatMapTo

固定内部 Observable：

```javascript
clicks$.pipe(
  concatMapTo(ajax('/api/save'))
)

// 等价于
clicks$.pipe(
  concatMap(() => ajax('/api/save'))
)
```

### 实现 concatMapTo

```javascript
function concatMapTo(innerObservable) {
  return concatMap(() => innerObservable)
}
```

## 实战示例

### 顺序文件上传

```javascript
const files = Array.from(fileInput.files)

from(files).pipe(
  concatMap((file, index) => 
    uploadFile(file).pipe(
      tap(progress => {
        updateProgress(index, progress)
      }),
      last(),  // 只取完成时的最终结果
      map(response => ({ file: file.name, response }))
    )
  )
).subscribe({
  next: ({ file, response }) => {
    console.log(`${file} uploaded:`, response)
  },
  complete: () => {
    console.log('All files uploaded')
  }
})
```

### 消息队列

```javascript
const messageQueue$ = new Subject()

messageQueue$.pipe(
  concatMap(message => 
    sendMessage(message).pipe(
      retryWhen(errors => errors.pipe(
        delay(1000),
        take(3)
      ))
    )
  )
).subscribe({
  next: result => console.log('Sent:', result),
  error: err => console.log('Failed:', err)
})

// 使用
messageQueue$.next({ to: 'user1', text: 'Hello' })
messageQueue$.next({ to: 'user2', text: 'Hi' })
```

### 动画序列

```javascript
const animations = [
  animate(element, { opacity: 0 }, 500),
  animate(element, { left: '100px' }, 300),
  animate(element, { opacity: 1 }, 500)
]

from(animations).pipe(
  concatMap(anim$ => anim$)
).subscribe({
  complete: () => console.log('All animations done')
})
```

### 事务操作

```javascript
const operations = [
  { type: 'insert', data: user },
  { type: 'update', data: profile },
  { type: 'insert', data: settings }
]

from(operations).pipe(
  concatMap(op => 
    database.execute(op).pipe(
      catchError(err => {
        // 事务回滚
        return database.rollback().pipe(
          switchMap(() => throwError(() => err))
        )
      })
    )
  )
).subscribe({
  complete: () => database.commit(),
  error: err => console.log('Transaction failed:', err)
})
```

## concatAll

展平高阶 Observable（串行）：

```javascript
const higherOrder$ = source$.pipe(
  map(x => ajax(`/api/${x}`))
)

higherOrder$.pipe(
  concatAll()
)
```

### 实现 concatAll

```javascript
function concatAll() {
  return concatMap(inner => inner)
}
```

## concatMap vs switchMap vs mergeMap

```javascript
const source$ = of(1, 2, 3)
const project = x => of(x).pipe(delay(100))

// concatMap: 1, 2, 3（串行，共300ms）
source$.pipe(concatMap(project)).subscribe(console.log)

// switchMap: 3（只有最后一个，共100ms）
source$.pipe(switchMap(project)).subscribe(console.log)

// mergeMap: 1, 2, 3（并行，共100ms，顺序不确定）
source$.pipe(mergeMap(project)).subscribe(console.log)
```

| 操作符 | 执行方式 | 取消策略 | 输出顺序 |
|--------|----------|----------|----------|
| concatMap | 串行 | 无 | 保持输入顺序 |
| switchMap | 串行 | 取消之前的 | 只有最新 |
| mergeMap | 并行 | 无 | 完成顺序 |

## 常见陷阱

### 堆积问题

```javascript
// 问题：如果内部 Observable 很慢，源很快，会堆积
interval(100).pipe(
  concatMap(() => ajax('/api/slow'))  // 假设需要1秒
).subscribe(...)
// 队列会无限增长

// 解决：使用 exhaustMap 或限制源的发射
interval(100).pipe(
  exhaustMap(() => ajax('/api/slow'))  // 忽略繁忙时的请求
)
```

### 永不完成的内部 Observable

```javascript
// 问题：内部不完成，后续都被阻塞
source$.pipe(
  concatMap(() => interval(1000))  // 永不完成
)

// 解决：确保内部完成
source$.pipe(
  concatMap(() => interval(1000).pipe(take(5)))
)
```

### 与 concat 操作符的区别

```javascript
// concat：静态操作符，连接固定的 Observable
concat(
  of(1, 2),
  of(3, 4)
)

// concatMap：实例操作符，动态创建内部 Observable
of('a', 'b').pipe(
  concatMap(x => of(x, x.toUpperCase()))
)
// a, A, b, B
```

## TypeScript 类型

```typescript
function concatMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R>

function concatMapTo<R>(
  innerObservable: ObservableInput<R>
): OperatorFunction<any, R>

function concatAll<T>(): OperatorFunction<ObservableInput<T>, T>
```

## 本章小结

- `concatMap` 串行执行内部 Observable
- 保证输出顺序与输入顺序一致
- 适合需要顺序执行的场景
- 注意队列堆积和阻塞问题

下一章实现 `exhaustMap` 操作符。
