---
sidebar_position: 37
title: "reduce：归约操作符"
---

# reduce：归约操作符

`reduce` 对所有发射值应用累积器函数，在源完成时发射最终结果。

## 基本用法

```javascript
of(1, 2, 3, 4, 5).pipe(
  reduce((acc, value) => acc + value, 0)
).subscribe(console.log)
// 15（只输出一次）
```

## 实现 reduce

```javascript
function reduce(accumulator, seed) {
  return (source) => new Observable(subscriber => {
    let acc = seed
    let hasSeed = arguments.length >= 2
    let hasValue = false
    let index = 0

    return source.subscribe({
      next(value) {
        hasValue = true
        if (!hasSeed) {
          acc = value
          hasSeed = true
        } else {
          try {
            acc = accumulator(acc, value, index++)
          } catch (err) {
            subscriber.error(err)
            return
          }
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (hasValue || hasSeed) {
          subscriber.next(acc)
        }
        subscriber.complete()
      }
    })
  })
}
```

## 与 Array.reduce 对比

```javascript
// Array
[1, 2, 3].reduce((a, b) => a + b, 0)  // 6

// Observable
of(1, 2, 3).pipe(
  reduce((a, b) => a + b, 0)
).subscribe(console.log)  // 6
```

关键区别：Observable 的 reduce 是异步的，等待源完成才发射结果。

## 无种子值的行为

```javascript
// 有种子值
of(1, 2, 3).pipe(
  reduce((a, b) => a + b, 0)
).subscribe(console.log)
// 6

// 无种子值：第一个值作为初始值
of(1, 2, 3).pipe(
  reduce((a, b) => a + b)
).subscribe(console.log)
// 6

// 空流 + 无种子值
EMPTY.pipe(
  reduce((a, b) => a + b)
).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（无 next，因为没有值可归约）

// 空流 + 有种子值
EMPTY.pipe(
  reduce((a, b) => a + b, 0)
).subscribe(console.log)
// 0（发射种子值）
```

## reduce vs scan

```javascript
of(1, 2, 3, 4, 5).pipe(
  scan((acc, x) => acc + x, 0)
)
// 1, 3, 6, 10, 15（每次累积都发射）

of(1, 2, 3, 4, 5).pipe(
  reduce((acc, x) => acc + x, 0)
)
// 15（只发射最终结果）
```

## 常见用途

### 收集所有值

```javascript
source$.pipe(
  reduce((arr, value) => [...arr, value], [])
).subscribe(allValues => {
  console.log('All values:', allValues)
})
```

等价于 `toArray()`：

```javascript
source$.pipe(toArray())
```

### 统计数据

```javascript
of(10, 20, 30, 40, 50).pipe(
  reduce((stats, value, index) => ({
    count: index + 1,
    sum: stats.sum + value,
    min: Math.min(stats.min, value),
    max: Math.max(stats.max, value),
    average: (stats.sum + value) / (index + 1)
  }), { count: 0, sum: 0, min: Infinity, max: -Infinity, average: 0 })
).subscribe(console.log)
// { count: 5, sum: 150, min: 10, max: 50, average: 30 }
```

### 分组

```javascript
of(
  { type: 'fruit', name: 'apple' },
  { type: 'vegetable', name: 'carrot' },
  { type: 'fruit', name: 'banana' }
).pipe(
  reduce((groups, item) => {
    const key = item.type
    groups[key] = groups[key] || []
    groups[key].push(item)
    return groups
  }, {})
).subscribe(console.log)
// { fruit: [...], vegetable: [...] }
```

### 找最大/最小值

```javascript
of(3, 1, 4, 1, 5, 9, 2, 6).pipe(
  reduce((max, value) => value > max ? value : max)
).subscribe(console.log)
// 9
```

## 注意事项

### 无限流

`reduce` 在源完成时才发射，对于无限流永远不会发射：

```javascript
// 这个永远不会输出！
interval(1000).pipe(
  reduce((acc, x) => acc + x, 0)
).subscribe(console.log)
```

解决：配合 `take` 或 `takeUntil`：

```javascript
interval(1000).pipe(
  take(5),
  reduce((acc, x) => acc + x, 0)
).subscribe(console.log)
// 10（0+1+2+3+4）
```

### 错误处理

累积函数抛出的错误会传递给 error：

```javascript
of(1, 2, 3).pipe(
  reduce((acc, x) => {
    if (x === 2) throw new Error('Two!')
    return acc + x
  }, 0)
).subscribe({
  error: err => console.error('Error:', err.message)
})
// Error: Two!
```

## TypeScript 类型

```typescript
function reduce<T, R>(
  accumulator: (acc: R, value: T, index: number) => R,
  seed: R
): OperatorFunction<T, R>

function reduce<T>(
  accumulator: (acc: T, value: T, index: number) => T
): OperatorFunction<T, T>
```

## 本章小结

- `reduce` 归约所有值，在源完成时发射最终结果
- 只发射一个值（或种子值）
- 对于无限流不适用，需要配合 `take` 等
- 常用于统计、分组、收集等场景

下一章实现 `buffer` 和 `bufferCount` 缓冲操作符。
