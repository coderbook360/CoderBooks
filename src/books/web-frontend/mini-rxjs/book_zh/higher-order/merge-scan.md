---
sidebar_position: 67
title: "mergeScan"
---

# mergeScan

`mergeScan` 是 `scan` 的异步版本，累加器返回 Observable。

## 基本用法

```javascript
const clicks$ = fromEvent(document, 'click')

clicks$.pipe(
  mergeScan((acc, _) => 
    ajax(`/api/count?current=${acc}`).pipe(
      map(res => res.response.newCount)
    ),
    0  // 初始值
  )
).subscribe(console.log)
// 每次点击，发送当前累计值，获取新累计值
```

## scan vs mergeScan

```javascript
// scan: 同步累加
of(1, 2, 3).pipe(
  scan((acc, x) => acc + x, 0)
)
// 1, 3, 6

// mergeScan: 异步累加
of(1, 2, 3).pipe(
  mergeScan((acc, x) => 
    of(acc + x).pipe(delay(100)),
    0
  )
)
// 1, 3, 6 (但每个值都是异步返回)
```

## 实现 mergeScan

```javascript
function mergeScan(accumulator, seed, concurrent = Infinity) {
  return (source) => new Observable(subscriber => {
    let acc = seed
    let index = 0
    let activeCount = 0
    let buffer = []
    let sourceComplete = false
    let hasValue = false
    const subscriptions = []

    function processNext(value) {
      activeCount++
      const innerObservable = accumulator(acc, value, index++)

      const innerSubscription = innerObservable.subscribe({
        next(innerValue) {
          acc = innerValue
          hasValue = true
          subscriber.next(innerValue)
        },
        error(err) {
          subscriber.error(err)
        },
        complete() {
          activeCount--
          // 处理缓冲区
          if (buffer.length > 0 && activeCount < concurrent) {
            processNext(buffer.shift())
          }
          // 检查完成
          if (sourceComplete && activeCount === 0 && buffer.length === 0) {
            subscriber.complete()
          }
        }
      })

      subscriptions.push(innerSubscription)
    }

    const sourceSubscription = source.subscribe({
      next(value) {
        if (activeCount < concurrent) {
          processNext(value)
        } else {
          buffer.push(value)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        sourceComplete = true
        if (activeCount === 0 && buffer.length === 0) {
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

## 实战示例

### 串行请求累加

```javascript
// 每次请求依赖上次的结果
of(1, 2, 3, 4, 5).pipe(
  mergeScan((token, page) => 
    fetchPage(page, token).pipe(
      map(res => res.nextToken)
    ),
    null,  // 初始 token
    1      // 串行执行
  )
)
```

### 购物车总价

```javascript
const cartActions$ = merge(
  addItem$.pipe(map(item => ({ type: 'add', item }))),
  removeItem$.pipe(map(item => ({ type: 'remove', item })))
)

cartActions$.pipe(
  mergeScan((total, action) => {
    if (action.type === 'add') {
      return fetchPrice(action.item).pipe(
        map(price => total + price)
      )
    } else {
      return fetchPrice(action.item).pipe(
        map(price => total - price)
      )
    }
  }, 0)
).subscribe(total => {
  displayTotal(total)
})
```

### 增量数据同步

```javascript
const updates$ = changesStream$

updates$.pipe(
  mergeScan((lastSync, change) => 
    syncChange(change, lastSync).pipe(
      map(result => result.timestamp)
    ),
    0  // 初始时间戳
  )
).subscribe(latestSync => {
  updateSyncStatus(latestSync)
})
```

### 链式 API 调用

```javascript
// 每步依赖上一步结果
const steps = ['init', 'validate', 'process', 'complete']

from(steps).pipe(
  mergeScan((context, step) => 
    executeStep(step, context).pipe(
      map(result => ({ ...context, [step]: result }))
    ),
    {},  // 初始上下文
    1    // 串行
  )
).subscribe({
  next: ctx => console.log('Step complete:', ctx),
  complete: () => console.log('All steps done')
})
```

## 并发控制

```javascript
// 默认并发
source$.pipe(
  mergeScan((acc, x) => asyncOp(acc, x), 0)
)
// 可能同时有多个异步操作

// 串行（concurrent = 1）
source$.pipe(
  mergeScan((acc, x) => asyncOp(acc, x), 0, 1)
)
// 保证顺序执行
```

## mergeScan vs expand

```javascript
// mergeScan: 累加器模式
source$.pipe(
  mergeScan((acc, value) => 
    process(acc, value).pipe(map(result => acc + result)),
    0
  )
)
// 每个值都会处理，累加器不断更新

// expand: 递归模式
of(start).pipe(
  expand(value => 
    next(value).pipe(/* ... */)
  )
)
// 每个输出值都可能产生新的输入
```

| 特性 | mergeScan | expand |
|------|-----------|--------|
| 输入来源 | 外部源 | 自身输出 |
| 累加器 | 有 | 无 |
| 适用场景 | 异步累加 | 递归遍历 |

## concatScan

串行版本的 mergeScan：

```javascript
// 使用 mergeScan 实现
function concatScan(accumulator, seed) {
  return mergeScan(accumulator, seed, 1)
}

// 使用
source$.pipe(
  concatScan((acc, x) => asyncOp(acc, x), 0)
)
```

## 常见陷阱

### 累加器值时机

```javascript
// 注意：并发时，acc 的值可能不是最新的
source$.pipe(
  mergeScan((acc, x) => {
    // 这里的 acc 是该值开始处理时的累加器
    // 不一定是最新的
    return asyncOp(acc, x)
  }, 0)
)

// 如果需要严格顺序，使用 concurrent = 1
```

### 内部 Observable 必须发射值

```javascript
// 问题：内部不发射，累加器不更新
source$.pipe(
  mergeScan((acc, x) => 
    condition ? of(acc + x) : EMPTY,  // EMPTY 不更新累加器
    0
  )
)

// 解决：确保发射值
source$.pipe(
  mergeScan((acc, x) => 
    condition ? of(acc + x) : of(acc),  // 保持原值
    0
  )
)
```

## TypeScript 类型

```typescript
function mergeScan<T, R>(
  accumulator: (acc: R, value: T, index: number) => ObservableInput<R>,
  seed: R,
  concurrent?: number
): OperatorFunction<T, R>
```

## 本章小结

- `mergeScan` 是异步版的 `scan`
- 累加器返回 Observable
- `concurrent` 参数控制并发
- 适合依赖上次结果的异步操作

下一章开始错误处理部分，实现 `catchError` 操作符。
