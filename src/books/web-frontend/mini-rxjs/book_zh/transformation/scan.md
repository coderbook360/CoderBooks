---
sidebar_position: 36
title: "scan：累积器操作符"
---

# scan：累积器操作符

`scan` 对每个发射值应用累积器函数，发射每次累积的中间结果。类似于 `Array.reduce`，但发射每一步的结果。

## 基本用法

```javascript
of(1, 2, 3, 4, 5).pipe(
  scan((acc, value) => acc + value, 0)
).subscribe(console.log)
// 1, 3, 6, 10, 15
```

累积过程：
- `0 + 1 = 1` → 发射 1
- `1 + 2 = 3` → 发射 3
- `3 + 3 = 6` → 发射 6
- `6 + 4 = 10` → 发射 10
- `10 + 5 = 15` → 发射 15

## 实现 scan

```javascript
function scan(accumulator, seed) {
  return (source) => new Observable(subscriber => {
    let acc = seed
    let hasSeed = arguments.length >= 2
    let index = 0

    return source.subscribe({
      next(value) {
        try {
          if (!hasSeed) {
            // 没有种子值时，第一个值作为初始累积值
            acc = value
            hasSeed = true
          } else {
            acc = accumulator(acc, value, index)
          }
          index++
          subscriber.next(acc)
        } catch (err) {
          subscriber.error(err)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })
  })
}
```

## 有无种子值的区别

```javascript
// 有种子值
of(1, 2, 3).pipe(
  scan((acc, x) => acc + x, 0)
).subscribe(console.log)
// 1, 3, 6

// 无种子值：第一个值作为初始累积值
of(1, 2, 3).pipe(
  scan((acc, x) => acc + x)
).subscribe(console.log)
// 1, 3, 6（结果相同，但第一次不调用累积函数）
```

## scan vs reduce

| 特性 | scan | reduce |
|------|------|--------|
| 发射时机 | 每次累积都发射 | 只发射最终结果 |
| 发射次数 | 与源相同 | 1次（complete 时） |
| 适用场景 | 需要中间状态 | 只需要最终结果 |

```javascript
// scan：发射每个中间结果
of(1, 2, 3).pipe(scan((a, b) => a + b, 0))
// 1, 3, 6

// reduce：只发射最终结果
of(1, 2, 3).pipe(reduce((a, b) => a + b, 0))
// 6
```

## 实战示例

### 计数器

```javascript
const increment$ = fromEvent(incBtn, 'click').pipe(mapTo(1))
const decrement$ = fromEvent(decBtn, 'click').pipe(mapTo(-1))
const reset$ = fromEvent(resetBtn, 'click').pipe(mapTo(0))

merge(increment$, decrement$).pipe(
  scan((count, delta) => count + delta, 0)
).subscribe(count => {
  display.textContent = count
})
```

### 累积历史

```javascript
source$.pipe(
  scan((history, value) => [...history, value], [])
).subscribe(console.log)
// [1]
// [1, 2]
// [1, 2, 3]
```

限制历史长度：

```javascript
source$.pipe(
  scan((history, value) => {
    const newHistory = [...history, value]
    return newHistory.slice(-5)  // 最多保留5个
  }, [])
)
```

### 状态机

```javascript
const initialState = { count: 0, loading: false }

const actions$ = merge(
  increment$.pipe(map(() => ({ type: 'INCREMENT' }))),
  decrement$.pipe(map(() => ({ type: 'DECREMENT' }))),
  load$.pipe(map(() => ({ type: 'LOAD_START' }))),
  loadComplete$.pipe(map(data => ({ type: 'LOAD_COMPLETE', data })))
)

actions$.pipe(
  scan((state, action) => {
    switch (action.type) {
      case 'INCREMENT':
        return { ...state, count: state.count + 1 }
      case 'DECREMENT':
        return { ...state, count: state.count - 1 }
      case 'LOAD_START':
        return { ...state, loading: true }
      case 'LOAD_COMPLETE':
        return { ...state, loading: false, data: action.data }
      default:
        return state
    }
  }, initialState)
).subscribe(state => {
  console.log('State:', state)
})
```

### 计算平均值

```javascript
of(10, 20, 30, 40).pipe(
  scan(
    (acc, value) => ({
      sum: acc.sum + value,
      count: acc.count + 1,
      average: (acc.sum + value) / (acc.count + 1)
    }),
    { sum: 0, count: 0, average: 0 }
  ),
  map(({ average }) => average)
).subscribe(avg => console.log('Average:', avg))
// Average: 10
// Average: 15
// Average: 20
// Average: 25
```

## 累积器函数参数

```javascript
scan((accumulator, value, index) => {
  console.log(`Index: ${index}, Value: ${value}, Acc: ${accumulator}`)
  return accumulator + value
}, 0)
```

## TypeScript 类型

```typescript
function scan<T, R>(
  accumulator: (acc: R, value: T, index: number) => R,
  seed: R
): OperatorFunction<T, R>

function scan<T>(
  accumulator: (acc: T, value: T, index: number) => T
): OperatorFunction<T, T>
```

## 本章小结

- `scan` 应用累积器函数，发射每个中间结果
- 类似 `reduce`，但发射所有累积步骤
- 非常适合状态管理、计数器、历史记录
- 可选的种子值决定初始累积状态

下一章实现 `reduce` 归约操作符。
