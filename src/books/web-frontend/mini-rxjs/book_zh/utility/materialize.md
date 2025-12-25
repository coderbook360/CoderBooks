---
sidebar_position: 76
title: "materialize 与 dematerialize"
---

# materialize 与 dematerialize

`materialize` 将通知转为值，`dematerialize` 将值转回通知。

## materialize

将 next/error/complete 通知转为 Notification 对象：

```javascript
of(1, 2, 3).pipe(
  materialize()
).subscribe(console.log)
// Notification { kind: 'N', value: 1 }
// Notification { kind: 'N', value: 2 }
// Notification { kind: 'N', value: 3 }
// Notification { kind: 'C' }
```

错误也变成值：

```javascript
throwError(() => new Error('oops')).pipe(
  materialize()
).subscribe(console.log)
// Notification { kind: 'E', error: Error('oops') }
```

### Notification 类型

```javascript
// Next 通知
{ kind: 'N', value: any, hasValue: true }

// Error 通知
{ kind: 'E', error: any, hasValue: false }

// Complete 通知
{ kind: 'C', hasValue: false }
```

### 实现 materialize

```javascript
function materialize() {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(value) {
        subscriber.next({ kind: 'N', value, hasValue: true })
      },
      error(err) {
        subscriber.next({ kind: 'E', error: err, hasValue: false })
        subscriber.complete()
      },
      complete() {
        subscriber.next({ kind: 'C', hasValue: false })
        subscriber.complete()
      }
    })
  })
}
```

## dematerialize

将 Notification 对象转回通知：

```javascript
of(
  { kind: 'N', value: 1 },
  { kind: 'N', value: 2 },
  { kind: 'C' }
).pipe(
  dematerialize()
).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Next: 1
// Next: 2
// Complete
```

### 实现 dematerialize

```javascript
function dematerialize() {
  return (source) => new Observable(subscriber => {
    return source.subscribe({
      next(notification) {
        switch (notification.kind) {
          case 'N':
            subscriber.next(notification.value)
            break
          case 'E':
            subscriber.error(notification.error)
            break
          case 'C':
            subscriber.complete()
            break
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

## 实战示例

### 延迟错误

```javascript
// 错误通常立即终止流，但 materialize 让错误变成普通值
source$.pipe(
  materialize(),
  delay(1000),  // 所有通知（包括错误）都延迟
  dematerialize()
)
```

### 错误重排序

```javascript
// 把错误移到最后
source$.pipe(
  materialize(),
  toArray(),
  map(notifications => {
    const errors = notifications.filter(n => n.kind === 'E')
    const others = notifications.filter(n => n.kind !== 'E')
    return [...others, ...errors]
  }),
  mergeMap(notifications => from(notifications)),
  dematerialize()
)
```

### 记录完整执行历史

```javascript
const history = []

source$.pipe(
  materialize(),
  tap(notification => {
    history.push({
      time: Date.now(),
      notification
    })
  }),
  dematerialize()
).subscribe({
  complete: () => {
    console.log('Execution history:', history)
  }
})
```

### 条件处理错误

```javascript
source$.pipe(
  materialize(),
  map(notification => {
    if (notification.kind === 'E') {
      // 某些错误转为默认值
      if (notification.error.code === 'NOT_FOUND') {
        return { kind: 'N', value: null }
      }
    }
    return notification
  }),
  dematerialize()
)
```

### 流序列化

```javascript
// 将流序列化为 JSON
function serializeStream(source$) {
  return source$.pipe(
    materialize(),
    toArray(),
    map(notifications => JSON.stringify(notifications))
  )
}

// 从 JSON 恢复流
function deserializeStream(json) {
  const notifications = JSON.parse(json)
  return from(notifications).pipe(
    dematerialize()
  )
}
```

### 测试辅助

```javascript
// 收集所有通知用于断言
function collectNotifications(source$) {
  return source$.pipe(
    materialize(),
    toArray()
  )
}

// 测试
collectNotifications(myStream$).subscribe(notifications => {
  expect(notifications).toEqual([
    { kind: 'N', value: 1, hasValue: true },
    { kind: 'N', value: 2, hasValue: true },
    { kind: 'C', hasValue: false }
  ])
})
```

## Notification 工厂函数

```javascript
// 创建 Notification 对象
const Notification = {
  createNext(value) {
    return { kind: 'N', value, hasValue: true }
  },
  createError(error) {
    return { kind: 'E', error, hasValue: false }
  },
  createComplete() {
    return { kind: 'C', hasValue: false }
  }
}

// 使用
of(
  Notification.createNext(1),
  Notification.createNext(2),
  Notification.createComplete()
).pipe(
  dematerialize()
)
```

## 与 catchError 对比

```javascript
// catchError: 直接处理错误
source$.pipe(
  catchError(err => {
    if (err.code === 'RETRY') {
      return source$  // 重试
    }
    return throwError(() => err)
  })
)

// materialize: 把错误当作数据处理
source$.pipe(
  materialize(),
  // 可以用 filter, map 等操作符处理错误
  filter(n => !(n.kind === 'E' && n.error.code === 'IGNORE')),
  dematerialize()
)
```

## 常见陷阱

### dematerialize 后的 complete

```javascript
// 注意：dematerialize 收到 Complete 通知会触发 complete
// 但外层的 complete 不会再触发

of(
  { kind: 'N', value: 1 },
  { kind: 'C' },  // 这里触发 complete
  { kind: 'N', value: 2 }  // 永远不会执行
).pipe(
  dematerialize()
).subscribe({
  next: console.log,
  complete: () => console.log('Done')
})
// 1, Done
```

### Error 通知也终止流

```javascript
of(
  { kind: 'N', value: 1 },
  { kind: 'E', error: 'oops' },  // 这里触发 error
  { kind: 'N', value: 2 }  // 永远不会执行
).pipe(
  dematerialize()
).subscribe({
  next: console.log,
  error: console.error
})
// 1, oops
```

## TypeScript 类型

```typescript
interface NextNotification<T> {
  kind: 'N'
  value: T
  hasValue: true
}

interface ErrorNotification {
  kind: 'E'
  error: any
  hasValue: false
}

interface CompleteNotification {
  kind: 'C'
  hasValue: false
}

type Notification<T> = 
  | NextNotification<T> 
  | ErrorNotification 
  | CompleteNotification

function materialize<T>(): OperatorFunction<T, Notification<T>>

function dematerialize<T>(): OperatorFunction<Notification<T>, T>
```

## 本章小结

- `materialize` 将通知转为 Notification 对象
- `dematerialize` 将 Notification 转回通知
- 适合延迟错误、重排序、记录历史
- 主要用于高级场景和测试

下一章实现更多实用操作符：`defaultIfEmpty` 和 `throwIfEmpty`。
