---
sidebar_position: 33
title: "map：值映射"
---

# map：值映射

`map` 是最常用的转换操作符，将每个发射值通过投影函数转换为新值。

## 基本用法

```javascript
of(1, 2, 3).pipe(
  map(x => x * 2)
).subscribe(console.log)
// 2, 4, 6
```

## 实现 map

```javascript
function map(project) {
  return (source) => new Observable(subscriber => {
    let index = 0

    return source.subscribe({
      next(value) {
        try {
          const result = project(value, index++)
          subscriber.next(result)
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

## 投影函数参数

投影函数接收值和索引：

```javascript
of('a', 'b', 'c').pipe(
  map((value, index) => `${index}: ${value}`)
).subscribe(console.log)
// '0: a'
// '1: b'
// '2: c'
```

## 错误处理

投影函数抛出的错误会传递给 error 回调：

```javascript
of(1, 2, 3).pipe(
  map(x => {
    if (x === 2) throw new Error('Two is not allowed')
    return x * 2
  })
).subscribe({
  next: v => console.log('Next:', v),
  error: err => console.error('Error:', err.message)
})
// Next: 2
// Error: Two is not allowed
```

## 与 Array.map 对比

| 特性 | Array.map | Observable.map |
|------|-----------|----------------|
| 执行时机 | 立即 | 订阅时 |
| 异步值 | 不支持 | 支持 |
| 取消 | 不支持 | 支持 |

```javascript
// Array
[1, 2, 3].map(x => x * 2)  // [2, 4, 6] 立即返回

// Observable
of(1, 2, 3).pipe(map(x => x * 2))  // 返回新 Observable，订阅时执行
```

## 实战示例

### 提取属性

```javascript
const users$ = of(
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
)

users$.pipe(
  map(user => user.name)
).subscribe(console.log)
// 'Alice', 'Bob'
```

### 格式转换

```javascript
const events$ = fromEvent(input, 'input')

events$.pipe(
  map(e => e.target.value),
  map(value => value.trim()),
  map(value => value.toUpperCase())
).subscribe(console.log)
```

### API 响应处理

```javascript
fetch('/api/users').then(r => r.json())
// 变成
from(fetch('/api/users')).pipe(
  map(response => response.json()),
  mergeMap(jsonPromise => from(jsonPromise))
)

// 或者更简洁
defer(() => fetch('/api/users')).pipe(
  switchMap(r => r.json())
)
```

## 链式 map

多个 map 可以链式调用：

```javascript
source$.pipe(
  map(x => x * 2),
  map(x => x + 1),
  map(x => `Value: ${x}`)
)
```

也可以合并为一个：

```javascript
source$.pipe(
  map(x => `Value: ${x * 2 + 1}`)
)
```

权衡：
- 多个 map：更清晰，易于调试
- 单个 map：性能略好（减少函数调用）

## TypeScript 类型

```typescript
function map<T, R>(
  project: (value: T, index: number) => R
): OperatorFunction<T, R> {
  return (source: Observable<T>): Observable<R> => {
    return new Observable(subscriber => {
      let index = 0
      return source.subscribe({
        next(value) {
          try {
            subscriber.next(project(value, index++))
          } catch (err) {
            subscriber.error(err)
          }
        },
        error(err) { subscriber.error(err) },
        complete() { subscriber.complete() }
      })
    })
  }
}
```

类型推导：

```typescript
of(1, 2, 3).pipe(
  map(x => x.toString())  // Observable<string>
)

of({ name: 'Alice' }).pipe(
  map(user => user.name)  // Observable<string>
)
```

## 本章小结

- `map` 将每个值通过投影函数转换
- 投影函数接收值和索引两个参数
- 投影函数中的错误会传递给 error 回调
- 是最基础且最常用的转换操作符

下一章实现 `mapTo`，映射为固定常量。
