---
sidebar_position: 52
title: "concat"
---

# concat

`concat` 按顺序连接多个 Observable，前一个完成后才订阅下一个。

## 基本用法

```javascript
const a$ = of(1, 2)
const b$ = of(3, 4)
const c$ = of(5, 6)

concat(a$, b$, c$).subscribe(console.log)
// 1, 2, 3, 4, 5, 6
```

时间线：

```
a$: -(1)(2)|
b$:        -(3)(4)|
c$:               -(5)(6)|
concat:
    -(1)(2)-(3)(4)-(5)(6)|
```

## 实现 concat

```javascript
function concat(...sources) {
  return new Observable(subscriber => {
    let currentIndex = 0
    let currentSubscription = null

    function subscribeNext() {
      if (currentIndex >= sources.length) {
        subscriber.complete()
        return
      }

      const source = sources[currentIndex++]
      
      currentSubscription = source.subscribe({
        next(value) {
          subscriber.next(value)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          subscribeNext()  // 订阅下一个源
        }
      })
    }

    subscribeNext()

    return () => {
      if (currentSubscription) {
        currentSubscription.unsubscribe()
      }
    }
  })
}
```

## 静态 concat vs 实例 concatWith

```javascript
// 静态方法
import { concat } from 'rxjs'
concat(a$, b$, c$)

// 实例方法 (RxJS 7+)
a$.pipe(
  concatWith(b$, c$)
)
```

### 实现 concatWith

```javascript
function concatWith(...sources) {
  return (source) => concat(source, ...sources)
}
```

## 异步源的顺序保证

```javascript
const slow$ = ajax('/api/slow').pipe(delay(2000))
const fast$ = ajax('/api/fast').pipe(delay(500))

// merge: fast 先到
merge(slow$, fast$).subscribe(console.log)
// fast, slow

// concat: 保持顺序
concat(slow$, fast$).subscribe(console.log)
// slow, fast (等 slow 完成才请求 fast)
```

## 实战示例

### 初始化序列

```javascript
const loadConfig$ = ajax('/api/config')
const loadUser$ = ajax('/api/user')
const loadData$ = ajax('/api/data')

// 按顺序初始化
concat(
  loadConfig$.pipe(tap(config => applyConfig(config))),
  loadUser$.pipe(tap(user => setCurrentUser(user))),
  loadData$.pipe(tap(data => renderData(data)))
).subscribe({
  complete: () => console.log('App initialized')
})
```

### 历史数据 + 实时数据

```javascript
const history$ = fetchHistory()
const realtime$ = websocket$

// 先加载历史，再接收实时
concat(history$, realtime$).subscribe(message => {
  displayMessage(message)
})
```

### 文件按序上传

```javascript
const files = [file1, file2, file3]

concat(
  ...files.map(file => 
    uploadFile(file).pipe(
      tap(progress => updateProgress(file, progress))
    )
  )
).subscribe({
  complete: () => console.log('All files uploaded')
})
```

### 动画序列

```javascript
const fadeOut$ = animate(element, { opacity: 0 }, 500)
const move$ = animate(element, { left: '100px' }, 300)
const fadeIn$ = animate(element, { opacity: 1 }, 500)

// 先淡出，再移动，最后淡入
concat(fadeOut$, move$, fadeIn$).subscribe({
  complete: () => console.log('Animation done')
})
```

## startWith 和 endWith

在流的开头或结尾添加值：

### 实现 startWith

```javascript
function startWith(...values) {
  return (source) => concat(of(...values), source)
}
```

### 实现 endWith

```javascript
function endWith(...values) {
  return (source) => concat(source, of(...values))
}
```

使用示例：

```javascript
of(2, 3, 4).pipe(
  startWith(1),
  endWith(5)
).subscribe(console.log)
// 1, 2, 3, 4, 5
```

实际场景：

```javascript
// 初始值
searchResults$.pipe(
  startWith([])  // 初始空数组
).subscribe(results => render(results))

// 结束标记
messages$.pipe(
  endWith({ type: 'END' })
).subscribe(msg => {
  if (msg.type === 'END') {
    cleanup()
  }
})
```

## concat vs merge vs combineLatest

```javascript
const a$ = timer(100).pipe(mapTo('A'))
const b$ = timer(50).pipe(mapTo('B'))

// concat: 顺序
concat(a$, b$).subscribe(console.log)
// A (100ms), B (150ms)

// merge: 并行
merge(a$, b$).subscribe(console.log)
// B (50ms), A (100ms)

// combineLatest: 组合
combineLatest([a$, b$]).subscribe(console.log)
// ['A', 'B'] (100ms，等两个都有值)
```

## 常见陷阱

### 前一个源不完成

```javascript
// interval 永不完成
const a$ = interval(1000)
const b$ = of('B')

concat(a$, b$).subscribe(console.log)
// 0, 1, 2, ... (b$ 永远不会被订阅)
```

解决：

```javascript
const a$ = interval(1000).pipe(take(3))
const b$ = of('B')

concat(a$, b$).subscribe(console.log)
// 0, 1, 2, B
```

### 错误立即终止

```javascript
const a$ = of(1, 2)
const b$ = throwError(() => new Error('oops'))
const c$ = of(3, 4)

concat(a$, b$, c$).subscribe({
  next: console.log,
  error: err => console.log('Error:', err)
})
// 1, 2, Error: oops (c$ 不会被订阅)
```

## TypeScript 类型

```typescript
function concat<A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): Observable<A[number]>

function concatWith<T, A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]>

function startWith<T, A extends unknown[]>(
  ...values: A
): OperatorFunction<T, T | ValueFromArray<A>>

function endWith<T, A extends unknown[]>(
  ...values: A
): OperatorFunction<T, T | ValueFromArray<A>>
```

## 本章小结

- `concat` 按顺序连接多个源，保证顺序
- 前一个源必须完成才会订阅下一个
- `startWith` 和 `endWith` 是基于 concat 的便捷操作符
- 适合串行任务、序列动画、历史+实时数据

下一章实现 `combineLatest` 操作符。
