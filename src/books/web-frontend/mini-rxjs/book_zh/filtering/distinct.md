---
sidebar_position: 46
title: "distinct 与 distinctUntilChanged：去重"
---

# distinct 与 distinctUntilChanged：去重

`distinct` 过滤全局重复值，`distinctUntilChanged` 过滤连续重复值。

## distinctUntilChanged

只有值与前一个不同时才发射：

```javascript
of(1, 1, 2, 2, 2, 3, 1, 1).pipe(
  distinctUntilChanged()
).subscribe(console.log)
// 1, 2, 3, 1
```

### 实现 distinctUntilChanged

```javascript
function distinctUntilChanged(compare) {
  const compareFn = compare || ((a, b) => a === b)

  return (source) => new Observable(subscriber => {
    let prev
    let hasPrev = false

    return source.subscribe({
      next(value) {
        if (!hasPrev) {
          hasPrev = true
          prev = value
          subscriber.next(value)
        } else if (!compareFn(prev, value)) {
          prev = value
          subscriber.next(value)
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

### 自定义比较

```javascript
// 比较对象的某个属性
of(
  { id: 1, name: 'Alice' },
  { id: 1, name: 'Alice Updated' },
  { id: 2, name: 'Bob' }
).pipe(
  distinctUntilChanged((prev, curr) => prev.id === curr.id)
).subscribe(console.log)
// { id: 1, name: 'Alice' }
// { id: 2, name: 'Bob' }
```

## distinctUntilKeyChanged

简化版，比较指定键：

```javascript
of(
  { id: 1, name: 'Alice' },
  { id: 1, name: 'Alice Updated' },
  { id: 2, name: 'Bob' }
).pipe(
  distinctUntilKeyChanged('id')
).subscribe(console.log)
// { id: 1, name: 'Alice' }
// { id: 2, name: 'Bob' }
```

### 实现 distinctUntilKeyChanged

```javascript
function distinctUntilKeyChanged(key, compare) {
  const compareFn = compare || ((a, b) => a === b)

  return distinctUntilChanged((prev, curr) => 
    compareFn(prev[key], curr[key])
  )
}
```

## distinct

全局去重，过滤所有曾经发射过的值：

```javascript
of(1, 2, 1, 3, 2, 4, 3, 5).pipe(
  distinct()
).subscribe(console.log)
// 1, 2, 3, 4, 5
```

### 实现 distinct

```javascript
function distinct(keySelector, flushes) {
  return (source) => new Observable(subscriber => {
    const seen = new Set()

    const sourceSubscription = source.subscribe({
      next(value) {
        const key = keySelector ? keySelector(value) : value

        if (!seen.has(key)) {
          seen.add(key)
          subscriber.next(value)
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        subscriber.complete()
      }
    })

    // 可选：通过 flushes Observable 清除已见集合
    let flushSubscription
    if (flushes) {
      flushSubscription = flushes.subscribe({
        next() {
          seen.clear()
        }
      })
    }

    return () => {
      sourceSubscription.unsubscribe()
      flushSubscription?.unsubscribe()
    }
  })
}
```

### keySelector 参数

```javascript
// 按 id 去重
of(
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alice Clone' }
).pipe(
  distinct(user => user.id)
).subscribe(console.log)
// { id: 1, name: 'Alice' }
// { id: 2, name: 'Bob' }
```

### flushes 参数

```javascript
// 每小时清除去重记录
const hourly$ = interval(3600000)

source$.pipe(
  distinct(x => x.id, hourly$)
)
```

## distinct vs distinctUntilChanged

| 特性 | distinct | distinctUntilChanged |
|------|----------|---------------------|
| 比较范围 | 全局 | 仅相邻 |
| 内存 | 需要存储所有值 | 只存储上一个 |
| 重复定义 | 历史出现过 | 与前一个相同 |

```javascript
of(1, 2, 1, 3, 2).pipe(distinct())
// 1, 2, 3

of(1, 2, 1, 3, 2).pipe(distinctUntilChanged())
// 1, 2, 1, 3, 2（全部发射，因为都与前一个不同）
```

## 实战示例

### 输入去抖

```javascript
// 只在值真正改变时发射
searchInput$.pipe(
  debounceTime(300),
  distinctUntilChanged()  // 避免相同搜索词重复请求
).subscribe(term => {
  search(term)
})
```

### 状态变化

```javascript
// 只在状态真正改变时响应
state$.pipe(
  map(state => state.user),
  distinctUntilChanged((prev, curr) => 
    prev?.id === curr?.id
  )
).subscribe(user => {
  console.log('User changed:', user)
})
```

### 去重 ID

```javascript
// 过滤重复的通知 ID
notifications$.pipe(
  distinct(n => n.id)
).subscribe(notification => {
  display(notification)
})
```

## 对象比较注意事项

默认使用 `===` 比较，对象总是不相等：

```javascript
of({ a: 1 }, { a: 1 }).pipe(
  distinctUntilChanged()
).subscribe(console.log)
// { a: 1 }, { a: 1 }（两个都发射）

// 使用 JSON 比较
of({ a: 1 }, { a: 1 }).pipe(
  distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
).subscribe(console.log)
// { a: 1 }（只发射一个）
```

## TypeScript 类型

```typescript
function distinct<T, K>(
  keySelector?: (value: T) => K,
  flushes?: Observable<any>
): OperatorFunction<T, T>

function distinctUntilChanged<T>(
  compare?: (previous: T, current: T) => boolean
): OperatorFunction<T, T>

function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare?: (x: T[K], y: T[K]) => boolean
): OperatorFunction<T, T>
```

## 本章小结

- `distinctUntilChanged` 过滤连续重复，内存友好
- `distinct` 全局去重，需要存储历史
- 可自定义比较函数处理复杂对象
- `distinctUntilKeyChanged` 简化按键比较

下一章实现 `debounceTime` 防抖操作符。
