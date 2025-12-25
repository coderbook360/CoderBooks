---
sidebar_position: 77
title: "toArray：收集所有值"
---

# toArray：收集所有值

本章实现 `toArray` 操作符。

## 功能描述

`toArray` 收集源 Observable 的所有值，在完成时作为数组发出。

```javascript
of(1, 2, 3).pipe(
  toArray()
).subscribe(console.log)
// [1, 2, 3]
```

## 实现

```javascript
function toArray() {
  return (source) => new Observable(subscriber => {
    const array = []
    
    return source.subscribe({
      next(value) {
        array.push(value)
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.next(array)
        subscriber.complete()
      }
    })
  })
}
```

## 使用场景

### 收集异步数据

```javascript
// 收集所有响应
fetchAllPages().pipe(
  toArray()
).subscribe(pages => {
  console.log('All pages:', pages)
})
```

### 排序后发出

```javascript
source$.pipe(
  toArray(),
  map(arr => arr.sort((a, b) => a - b)),
  switchMap(arr => from(arr))
)
```

### 统计计算

```javascript
scores$.pipe(
  toArray(),
  map(scores => ({
    count: scores.length,
    sum: scores.reduce((a, b) => a + b, 0),
    avg: scores.reduce((a, b) => a + b, 0) / scores.length
  }))
)
```

## 注意事项

- 源必须完成才会发出数组
- 无限流不适用
- 大量数据会占用内存

## 本章小结

- `toArray` 收集所有值为数组
- 源完成时发出
- 适用于需要处理完整数据集的场景
