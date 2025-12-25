---
sidebar_position: 35
title: "pluck：属性提取"
---

# pluck：属性提取

`pluck` 从发射的对象中提取指定属性，支持嵌套路径。

## 基本用法

```javascript
const users$ = of(
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 }
)

users$.pipe(
  pluck('name')
).subscribe(console.log)
// 'Alice', 'Bob'
```

## 嵌套属性

```javascript
const data$ = of({
  user: {
    profile: {
      name: 'Alice'
    }
  }
})

data$.pipe(
  pluck('user', 'profile', 'name')
).subscribe(console.log)
// 'Alice'
```

## 实现 pluck

```javascript
function pluck(...properties) {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        let result = value
        
        for (const prop of properties) {
          if (result == null) {
            result = undefined
            break
          }
          result = result[prop]
        }
        
        subscriber.next(result)
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

或基于 map：

```javascript
function pluck(...properties) {
  return map(value => {
    let result = value
    for (const prop of properties) {
      result = result?.[prop]
    }
    return result
  })
}
```

## 处理缺失属性

当属性不存在时返回 undefined：

```javascript
of({ name: 'Alice' }).pipe(
  pluck('age')  // 不存在的属性
).subscribe(console.log)
// undefined

of(null).pipe(
  pluck('name')  // null 值
).subscribe(console.log)
// undefined
```

## 与 map 对比

```javascript
// pluck
users$.pipe(pluck('name'))

// map
users$.pipe(map(user => user.name))

// 嵌套 pluck
data$.pipe(pluck('user', 'profile', 'name'))

// 嵌套 map
data$.pipe(map(d => d.user.profile.name))
// 或安全版本
data$.pipe(map(d => d?.user?.profile?.name))
```

`pluck` 自动处理 null/undefined，`map` 需要手动处理。

## 常见用途

### DOM 事件处理

```javascript
fromEvent(input, 'input').pipe(
  pluck('target', 'value')
).subscribe(console.log)
// 等价于 map(e => e.target.value)
```

### API 响应提取

```javascript
ajax.getJSON('/api/users').pipe(
  pluck('data', 'users')
).subscribe(users => {
  console.log('Users:', users)
})
```

### 状态切片

```javascript
store$.pipe(
  pluck('user', 'preferences', 'theme')
).subscribe(theme => {
  console.log('Theme:', theme)
})
```

## 数组索引

也可以用数字索引：

```javascript
of({ items: ['a', 'b', 'c'] }).pipe(
  pluck('items', 0)
).subscribe(console.log)
// 'a'
```

## RxJS 7+ 废弃

`pluck` 在 RxJS 7+ 中废弃，推荐用 `map`：

```javascript
// 废弃
source$.pipe(pluck('user', 'name'))

// 推荐
source$.pipe(map(x => x?.user?.name))
```

原因是可选链操作符 `?.` 已经足够简洁。

## TypeScript 类型

```typescript
// 简化版本
function pluck<T, K extends keyof T>(key: K): OperatorFunction<T, T[K]>

// 嵌套版本较复杂
function pluck<T, K1 extends keyof T>(k1: K1): OperatorFunction<T, T[K1]>
function pluck<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  k1: K1, k2: K2
): OperatorFunction<T, T[K1][K2]>
// ... 更多重载
```

## 本章小结

- `pluck` 从对象中提取指定属性
- 支持多参数提取嵌套属性
- 自动处理 null/undefined，返回 undefined
- RxJS 7+ 推荐用 `map` 配合可选链替代

下一章实现 `scan` 累积器操作符。
