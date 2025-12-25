---
sidebar_position: 41
title: "filter：条件过滤"
---

# filter：条件过滤

`filter` 根据条件函数过滤发射值，只有满足条件的值才会通过。

## 基本用法

```javascript
of(1, 2, 3, 4, 5, 6).pipe(
  filter(x => x % 2 === 0)
).subscribe(console.log)
// 2, 4, 6
```

## 实现 filter

```javascript
function filter(predicate) {
  return (source) => new Observable(subscriber => {
    let index = 0

    return source.subscribe({
      next(value) {
        try {
          if (predicate(value, index++)) {
            subscriber.next(value)
          }
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

## 谓词函数参数

```javascript
of('a', 'b', 'c').pipe(
  filter((value, index) => index > 0)
).subscribe(console.log)
// 'b', 'c'（跳过索引0）
```

## 与 Array.filter 对比

| 特性 | Array.filter | Observable.filter |
|------|--------------|-------------------|
| 返回值 | 新数组 | 新 Observable |
| 执行时机 | 立即 | 订阅时 |
| 异步值 | 不支持 | 支持 |

```javascript
// Array
[1, 2, 3, 4].filter(x => x > 2)  // [3, 4]

// Observable
of(1, 2, 3, 4).pipe(filter(x => x > 2))  // Observable 发射 3, 4
```

## 常见用途

### 过滤空值

```javascript
source$.pipe(
  filter(value => value != null)
)

// 或
source$.pipe(
  filter(Boolean)
)
```

### 类型过滤

```javascript
const events$ = merge(
  clicks$.pipe(map(() => ({ type: 'click' }))),
  keydowns$.pipe(map(() => ({ type: 'keydown' })))
)

events$.pipe(
  filter(event => event.type === 'click')
)
```

### 状态过滤

```javascript
state$.pipe(
  filter(state => state.isReady)
).subscribe(() => {
  console.log('Ready!')
})
```

### 去除重复请求

```javascript
requests$.pipe(
  filter(req => !pendingRequests.has(req.id))
)
```

## 类型守卫

TypeScript 中，filter 可以配合类型守卫收窄类型：

```typescript
interface Cat { type: 'cat'; meow(): void }
interface Dog { type: 'dog'; bark(): void }
type Animal = Cat | Dog

const animals$: Observable<Animal> = ...

animals$.pipe(
  filter((animal): animal is Cat => animal.type === 'cat')
).subscribe(cat => {
  cat.meow()  // TypeScript 知道这是 Cat
})
```

## 组合使用

### 多条件

```javascript
source$.pipe(
  filter(x => x > 0),
  filter(x => x < 100),
  filter(x => x % 2 === 0)
)

// 或合并为一个
source$.pipe(
  filter(x => x > 0 && x < 100 && x % 2 === 0)
)
```

### 配合 map

```javascript
source$.pipe(
  filter(user => user.active),
  map(user => user.name)
)
```

## 全部过滤掉的情况

如果没有值通过过滤，Observable 仍会正常完成：

```javascript
of(1, 2, 3).pipe(
  filter(x => x > 10)  // 没有值大于10
).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（没有 next）
```

## 错误处理

谓词函数抛出的错误会传递：

```javascript
of(1, 2, 3).pipe(
  filter(x => {
    if (x === 2) throw new Error('Two!')
    return true
  })
).subscribe({
  error: err => console.error(err.message)
})
// Two!
```

## TypeScript 类型

```typescript
// 普通过滤
function filter<T>(
  predicate: (value: T, index: number) => boolean
): OperatorFunction<T, T>

// 类型守卫
function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S
): OperatorFunction<T, S>
```

## 本章小结

- `filter` 根据条件过滤值
- 谓词函数接收值和索引
- 配合类型守卫可收窄 TypeScript 类型
- 全部过滤掉时 Observable 正常完成

下一章实现 `take` 和 `takeLast` 取值限制操作符。
