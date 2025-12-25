---
sidebar_position: 31
title: "range：数值范围发射"
---

# range：数值范围发射

`range` 发射指定范围内的连续整数序列。

## 基本用法

```javascript
range(1, 5).subscribe(console.log)
// 1, 2, 3, 4, 5

range(0, 3).subscribe(console.log)
// 0, 1, 2
```

## 参数说明

```javascript
range(start, count)
// start: 起始值
// count: 发射数量
```

注意：第二个参数是**数量**，不是结束值：

```javascript
range(5, 3).subscribe(console.log)
// 5, 6, 7（从5开始，发射3个）
```

## 实现 range

```javascript
function range(start, count) {
  return new Observable(subscriber => {
    for (let i = 0; i < count; i++) {
      if (subscriber.closed) return
      subscriber.next(start + i)
    }
    subscriber.complete()
  })
}
```

## 边界情况

### count 为 0

```javascript
range(0, 0).subscribe({
  next: v => console.log('Next:', v),
  complete: () => console.log('Complete')
})
// Complete（直接完成，不发射任何值）
```

### 负数

```javascript
// 负起始值
range(-3, 4).subscribe(console.log)
// -3, -2, -1, 0

// 负 count 应该处理
function range(start, count) {
  return new Observable(subscriber => {
    if (count < 0) {
      subscriber.error(new Error('count must be non-negative'))
      return
    }
    // ...
  })
}
```

### 非整数

```javascript
// 非整数起始值
range(1.5, 3).subscribe(console.log)
// 1.5, 2.5, 3.5
```

## 配合其他操作符

### 生成测试数据

```javascript
range(1, 100).pipe(
  map(i => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`
  }))
).subscribe(console.log)
```

### 批量请求

```javascript
range(1, 10).pipe(
  mergeMap(page => fetchPage(page), 3)  // 并发3个
).subscribe(console.log)
```

### 与 interval 对比

```javascript
// interval 是异步的，无限的
interval(1000).pipe(take(5))
// 0, 1, 2, 3, 4（每秒一个）

// range 是同步的，有限的
range(0, 5)
// 0, 1, 2, 3, 4（立即全部发射）
```

## 实现 range（带 Scheduler）

支持异步发射：

```javascript
function range(start, count, scheduler) {
  return new Observable(subscriber => {
    if (!scheduler) {
      // 同步发射
      for (let i = 0; i < count; i++) {
        if (subscriber.closed) return
        subscriber.next(start + i)
      }
      subscriber.complete()
      return
    }

    // 异步发射
    let index = 0
    return scheduler.schedule(function() {
      if (index < count) {
        subscriber.next(start + index++)
        this.schedule()  // 递归调度
      } else {
        subscriber.complete()
      }
    })
  })
}
```

使用：

```javascript
import { asyncScheduler } from 'rxjs'

range(1, 5, asyncScheduler).subscribe(console.log)
// 异步发射：1, 2, 3, 4, 5
```

## 与其他语言对比

```javascript
// Python
list(range(5))  // [0, 1, 2, 3, 4]
list(range(1, 5))  // [1, 2, 3, 4]（不包含结束值）

// RxJS
range(0, 5)  // 0, 1, 2, 3, 4（第二个参数是数量）
range(1, 4)  // 1, 2, 3, 4（从1开始，4个数）
```

## TypeScript 类型

```typescript
function range(
  start: number, 
  count: number, 
  scheduler?: SchedulerLike
): Observable<number> {
  return new Observable(subscriber => {
    // ...
  })
}
```

## 本章小结

- `range(start, count)` 发射从 start 开始的 count 个整数
- 同步完成，适合生成有限数字序列
- 第二个参数是数量，不是结束值
- 可配合 Scheduler 实现异步发射

下一章实现 `throwError` 和 `EMPTY` 特殊操作符。
