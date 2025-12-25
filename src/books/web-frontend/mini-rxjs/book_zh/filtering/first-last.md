---
sidebar_position: 45
title: "first 与 last：首尾取值"
---

# first 与 last：首尾取值

`first` 取第一个值（可带条件），`last` 取最后一个值。

## first

```javascript
of(1, 2, 3).pipe(
  first()
).subscribe(console.log)
// 1
```

带条件：

```javascript
of(1, 2, 3, 4, 5).pipe(
  first(x => x > 2)
).subscribe(console.log)
// 3（第一个大于2的值）
```

### 实现 first

```javascript
function first(predicate, defaultValue) {
  const hasDefaultValue = arguments.length >= 2

  return (source) => new Observable(subscriber => {
    let index = 0
    let found = false

    const subscription = source.subscribe({
      next(value) {
        const pass = predicate ? predicate(value, index++) : true

        if (pass) {
          found = true
          subscriber.next(value)
          subscriber.complete()
          subscription.unsubscribe()
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (!found) {
          if (hasDefaultValue) {
            subscriber.next(defaultValue)
            subscriber.complete()
          } else {
            subscriber.error(new Error('no elements in sequence'))
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  })
}
```

### 默认值

```javascript
// 空流报错
EMPTY.pipe(first()).subscribe({
  error: err => console.error(err.message)
})
// 'no elements in sequence'

// 使用默认值
EMPTY.pipe(first(null, 'default')).subscribe(console.log)
// 'default'

// 条件不满足时使用默认值
of(1, 2, 3).pipe(
  first(x => x > 10, -1)
).subscribe(console.log)
// -1
```

## last

```javascript
of(1, 2, 3).pipe(
  last()
).subscribe(console.log)
// 3
```

带条件：

```javascript
of(1, 2, 3, 4, 5).pipe(
  last(x => x < 4)
).subscribe(console.log)
// 3（最后一个小于4的值）
```

### 实现 last

```javascript
function last(predicate, defaultValue) {
  const hasDefaultValue = arguments.length >= 2

  return (source) => new Observable(subscriber => {
    let index = 0
    let lastValue
    let hasLastValue = false

    return source.subscribe({
      next(value) {
        const pass = predicate ? predicate(value, index++) : true

        if (pass) {
          lastValue = value
          hasLastValue = true
        }
      },
      error(err) {
        subscriber.error(err)
      },
      complete() {
        if (hasLastValue) {
          subscriber.next(lastValue)
          subscriber.complete()
        } else if (hasDefaultValue) {
          subscriber.next(defaultValue)
          subscriber.complete()
        } else {
          subscriber.error(new Error('no elements in sequence'))
        }
      }
    })
  })
}
```

## first vs take(1)

```javascript
// 空流时的差异
EMPTY.pipe(take(1)).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（不报错）

EMPTY.pipe(first()).subscribe({
  next: v => console.log('Next:', v),
  error: err => console.error('Error:', err.message)
})
// Error: no elements in sequence
```

| 特性 | first() | take(1) |
|------|---------|---------|
| 空流 | 报错 | 直接完成 |
| 条件过滤 | 支持 | 不支持 |
| 默认值 | 支持 | 不支持 |

## last vs takeLast(1)

类似地，`last()` 在空流时报错，`takeLast(1)` 直接完成。

## 实战示例

### 获取第一个响应

```javascript
// 获取第一个有效响应
responses$.pipe(
  first(res => res.status === 200)
).subscribe(response => {
  console.log('First success:', response)
})
```

### 获取最后一个值

```javascript
// 等待动画完成
animation$.pipe(
  last()
).subscribe(finalState => {
  console.log('Animation ended at:', finalState)
})
```

### 带默认值的查找

```javascript
// 查找用户，未找到返回 null
users$.pipe(
  first(user => user.id === targetId, null)
).subscribe(user => {
  if (user) {
    console.log('Found:', user)
  } else {
    console.log('Not found')
  }
})
```

### 获取初始状态

```javascript
// 获取 store 的初始状态
store$.pipe(
  first()
).subscribe(initialState => {
  console.log('Initial state:', initialState)
})
```

## 类型守卫

```typescript
interface Success { type: 'success'; data: any }
interface Error { type: 'error'; message: string }
type Result = Success | Error

results$.pipe(
  first((r): r is Success => r.type === 'success')
).subscribe(success => {
  // TypeScript 知道 success 是 Success 类型
  console.log(success.data)
})
```

## TypeScript 类型

```typescript
// 无参数
function first<T>(): OperatorFunction<T, T>

// 带条件
function first<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, T>

// 带默认值
function first<T, D>(
  predicate: (value: T, index: number) => boolean,
  defaultValue: D
): OperatorFunction<T, T | D>

// 类似地 last 也有相同的重载
```

## 本章小结

- `first()` 取第一个值或第一个满足条件的值
- `last()` 取最后一个值或最后一个满足条件的值
- 空流或无匹配时报错，除非提供默认值
- 与 `take(1)`/`takeLast(1)` 的区别在于空流处理

下一章实现 `distinct` 和 `distinctUntilChanged` 去重操作符。
