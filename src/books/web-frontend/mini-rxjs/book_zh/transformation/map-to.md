---
sidebar_position: 34
title: "mapTo：映射为常量"
---

# mapTo：映射为常量

`mapTo` 将每个发射值映射为固定的常量值，忽略源值。

## 基本用法

```javascript
of(1, 2, 3).pipe(
  mapTo('X')
).subscribe(console.log)
// 'X', 'X', 'X'
```

## 实现 mapTo

```javascript
function mapTo(value) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next() {
        subscriber.next(value)
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

或者基于 map 实现：

```javascript
function mapTo(value) {
  return map(() => value)
}
```

## mapTo vs map

```javascript
// mapTo
source$.pipe(mapTo('clicked'))

// 等价的 map
source$.pipe(map(() => 'clicked'))
```

`mapTo` 更简洁、意图更明确。

## 常见用途

### 事件转信号

```javascript
const clicks$ = fromEvent(button, 'click')

// 不关心事件对象，只关心发生了点击
clicks$.pipe(
  mapTo('CLICK')
).subscribe(console.log)
```

### 计数器

```javascript
const increment$ = fromEvent(incBtn, 'click').pipe(mapTo(1))
const decrement$ = fromEvent(decBtn, 'click').pipe(mapTo(-1))

merge(increment$, decrement$).pipe(
  scan((acc, delta) => acc + delta, 0)
).subscribe(count => console.log('Count:', count))
```

### 状态标记

```javascript
const loading$ = merge(
  requestStart$.pipe(mapTo(true)),
  requestEnd$.pipe(mapTo(false))
)

loading$.subscribe(isLoading => {
  console.log('Loading:', isLoading)
})
```

### 布尔切换

```javascript
const focus$ = fromEvent(input, 'focus').pipe(mapTo(true))
const blur$ = fromEvent(input, 'blur').pipe(mapTo(false))

merge(focus$, blur$).subscribe(isFocused => {
  console.log('Focused:', isFocused)
})
```

## 注意：对象引用

`mapTo` 发射的是同一个引用：

```javascript
of(1, 2, 3).pipe(
  mapTo({ value: 'X' })
).subscribe(obj => {
  console.log(obj)
  obj.modified = true
})
// 每次发射的是同一个对象！
```

如果需要每次发射新对象，用 `map`：

```javascript
of(1, 2, 3).pipe(
  map(() => ({ value: 'X' }))
).subscribe(console.log)
// 每次发射新对象
```

## RxJS 7+ 废弃

在 RxJS 7+ 中，`mapTo` 被标记为废弃，推荐使用 `map`：

```javascript
// 废弃
source$.pipe(mapTo('value'))

// 推荐
source$.pipe(map(() => 'value'))
```

原因是 `map(() => value)` 足够简洁，不需要单独的操作符。

## TypeScript 类型

```typescript
function mapTo<T, R>(value: R): OperatorFunction<T, R> {
  return map(() => value)
}
```

类型推导：

```typescript
of(1, 2, 3).pipe(
  mapTo('x')  // Observable<string>
)

of('a', 'b').pipe(
  mapTo(42)   // Observable<number>
)
```

## 本章小结

- `mapTo` 将所有值映射为同一个常量
- 适合事件转信号、状态标记等场景
- 注意对象引用问题
- RxJS 7+ 推荐用 `map(() => value)` 替代

下一章实现 `pluck` 属性提取操作符。
