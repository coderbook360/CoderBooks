---
sidebar_position: 39
title: "toArray：收集为数组"
---

# toArray：收集为数组

`toArray` 收集源 Observable 的所有发射值，在源完成时发射一个包含所有值的数组。

## 基本用法

```javascript
of(1, 2, 3, 4, 5).pipe(
  toArray()
).subscribe(console.log)
// [1, 2, 3, 4, 5]
```

## 实现 toArray

```javascript
function toArray() {
  return (source) => new Observable(subscriber => {
    const arr = []

    return source.subscribe({
      next(value) {
        arr.push(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.next(arr)
        subscriber.complete()
      }
    })
  })
}
```

或基于 reduce：

```javascript
function toArray() {
  return reduce((arr, value) => {
    arr.push(value)
    return arr
  }, [])
}
```

## 空流处理

```javascript
EMPTY.pipe(toArray()).subscribe(console.log)
// []（发射空数组）
```

## 错误处理

源发生错误时，不发射数组：

```javascript
concat(
  of(1, 2),
  throwError(() => new Error('Oops'))
).pipe(
  toArray()
).subscribe({
  next: arr => console.log('Array:', arr),
  error: err => console.error('Error:', err.message)
})
// Error: Oops（不会输出数组）
```

## 常见用途

### 收集异步结果

```javascript
// 收集所有页面数据
from([1, 2, 3]).pipe(
  mergeMap(page => fetchPage(page)),
  toArray()
).subscribe(allPages => {
  console.log('All pages loaded:', allPages)
})
```

### 排序

```javascript
of(3, 1, 4, 1, 5, 9, 2, 6).pipe(
  toArray(),
  map(arr => arr.sort((a, b) => a - b))
).subscribe(console.log)
// [1, 1, 2, 3, 4, 5, 6, 9]
```

### 去重

```javascript
of(1, 2, 2, 3, 3, 3).pipe(
  toArray(),
  map(arr => [...new Set(arr)])
).subscribe(console.log)
// [1, 2, 3]
```

### 与 switchMap 配合

```javascript
searchTerm$.pipe(
  switchMap(term => 
    searchAPI(term).pipe(
      toArray()  // 收集所有搜索结果
    )
  )
).subscribe(results => {
  displayResults(results)
})
```

## 注意事项

### 无限流

对于无限流，`toArray` 永远不会发射：

```javascript
// 永远不会输出！
interval(1000).pipe(
  toArray()
).subscribe(console.log)
```

需要先限制数量：

```javascript
interval(1000).pipe(
  take(5),
  toArray()
).subscribe(console.log)
// [0, 1, 2, 3, 4]（5秒后）
```

### 内存

大量数据会消耗内存：

```javascript
// 可能消耗大量内存
hugeDataStream$.pipe(
  toArray()  // 所有数据加载到内存
)

// 考虑使用流式处理或分页
```

## 与 reduce 的关系

`toArray()` 是 `reduce` 的特殊情况：

```javascript
// toArray
source$.pipe(toArray())

// 等价的 reduce
source$.pipe(
  reduce((arr, value) => [...arr, value], [])
)

// 更高效的写法
source$.pipe(
  reduce((arr, value) => {
    arr.push(value)
    return arr
  }, [])
)
```

## TypeScript 类型

```typescript
function toArray<T>(): OperatorFunction<T, T[]> {
  return reduce<T, T[]>((arr, value) => {
    arr.push(value)
    return arr
  }, [])
}
```

类型推导：

```typescript
of(1, 2, 3).pipe(toArray())  // Observable<number[]>
of('a', 'b').pipe(toArray())  // Observable<string[]>
```

## 本章小结

- `toArray` 收集所有值到数组，在源完成时发射
- 空流发射空数组
- 错误发生时不发射数组
- 不适用于无限流
- 大数据量要注意内存消耗

下一章实现 `pairwise` 成对发射操作符。
