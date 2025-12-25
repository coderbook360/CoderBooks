---
sidebar_position: 25
title: "of：同步值发射"
---

# of：同步值发射

`of` 是最简单的创建操作符，将一组值转换为 Observable 同步发射。

## 基本用法

```javascript
of(1, 2, 3).subscribe({
  next: value => console.log(value),
  complete: () => console.log('Complete')
})
// 1
// 2
// 3
// Complete
```

## 实现 of

```javascript
function of(...values) {
  return new Observable(subscriber => {
    for (const value of values) {
      // 同步发射每个值
      subscriber.next(value)
    }
    // 所有值发射完毕，发送完成信号
    subscriber.complete()
  })
}
```

## 处理空参数

没有参数时立即完成：

```javascript
of().subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（没有 next 输出）
```

实现已经覆盖：空数组 for 循环不执行，直接 complete。

## 支持提前取消

虽然 `of` 是同步的，但仍应支持取消：

```javascript
function of(...values) {
  return new Observable(subscriber => {
    for (const value of values) {
      // 检查是否已取消
      if (subscriber.closed) {
        return
      }
      subscriber.next(value)
    }
    subscriber.complete()
  })
}
```

验证：

```javascript
const subscription = of(1, 2, 3, 4, 5).subscribe({
  next(value) {
    console.log(value)
    if (value === 2) {
      subscription.unsubscribe()
    }
  }
})
// 1
// 2
```

## 与数组的区别

| 特性 | 数组 | of |
|------|------|-----|
| 数据 | 已存在 | 按需创建 |
| 获取 | 一次全部 | 一个一个 |
| 惰性 | 否 | 是 |

```javascript
// 数组
const arr = [1, 2, 3]
arr.forEach(console.log)  // 同步遍历

// of
of(1, 2, 3).subscribe(console.log)  // 也是同步，但走 Observable 协议
```

## 常见用途

### 测试和模拟

```javascript
function fetchUser(id) {
  if (process.env.NODE_ENV === 'test') {
    return of({ id, name: 'Test User' })
  }
  return fromFetch(`/api/users/${id}`)
}
```

### 默认值

```javascript
function getConfig() {
  return configFromServer$.pipe(
    catchError(() => of({ theme: 'light', lang: 'en' }))
  )
}
```

### 与其他操作符配合

```javascript
// startWith
source$.pipe(startWith(0))
// 内部实现类似 concat(of(0), source$)

// merge 中提供初始值
merge(
  of('initial'),
  event$
).subscribe(console.log)
```

## TypeScript 类型

```typescript
function of<T>(...values: T[]): Observable<T> {
  return new Observable(subscriber => {
    for (const value of values) {
      if (subscriber.closed) return
      subscriber.next(value)
    }
    subscriber.complete()
  })
}
```

类型推导：

```typescript
of(1, 2, 3)  // Observable<number>
of('a', 'b')  // Observable<string>
of(1, 'a', true)  // Observable<string | number | boolean>
```

## 本章小结

- `of` 将参数同步转换为 Observable 发射
- 发射完所有值后自动 complete
- 即使同步也应支持取消订阅检查
- 常用于测试、默认值和与其他操作符配合

下一章我们实现 `from`，处理可迭代对象和 Promise。
