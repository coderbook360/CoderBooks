# Scheduler 在操作符中的应用

Scheduler 可以在多个操作符中使用，控制执行时机和性能。

## 创建操作符

### of

```typescript
of(1, 2, 3, asyncScheduler)
```

### range

```typescript
range(1, 1000, queueScheduler)
```

### interval

```typescript
interval(1000, asyncScheduler)
```

### timer

```typescript
timer(1000, asyncScheduler)
```

## observeOn

控制下游操作符的执行上下文：

```typescript
source$.pipe(
  observeOn(asyncScheduler),
  map(heavyComputation)
)
```

## subscribeOn

控制订阅的执行上下文：

```typescript
source$.pipe(
  subscribeOn(asyncScheduler)
)
```

## 实战场景

### 避免阻塞UI

```typescript
// 大数据处理
range(1, 100000).pipe(
  observeOn(asyncScheduler), // 异步处理
  map(processData)
).subscribe()
```

### 优化动画

```typescript
animationData$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(updateAnimation)
```

### 批量处理

```typescript
hugeArray$.pipe(
  observeOn(queueScheduler),
  map(transform)
).subscribe()
```

### 高优先级任务

```typescript
criticalData$.pipe(
  observeOn(asapScheduler)
).subscribe(handleCriticalData)
```

## 选择 Scheduler

| 场景 | Scheduler | 原因 |
|------|-----------|------|
| 动画 | animationFrameScheduler | 与浏览器刷新同步 |
| 大数据 | asyncScheduler | 避免阻塞 |
| 迭代 | queueScheduler | 避免栈溢出 |
| 高优先级 | asapScheduler | 尽快执行 |

## 性能对比

```typescript
// 同步：可能阻塞
range(1, 100000).pipe(
  map(heavyComputation)
).subscribe()

// 异步：不阻塞
range(1, 100000, asyncScheduler).pipe(
  map(heavyComputation)
).subscribe()

// 队列：避免栈溢出
range(1, 100000, queueScheduler).pipe(
  map(heavyComputation)
).subscribe()
```

## 组合使用

```typescript
source$.pipe(
  subscribeOn(asyncScheduler), // 异步订阅
  observeOn(queueScheduler),   // 队列处理
  observeOn(animationFrameScheduler) // 动画帧渲染
).subscribe()
```

## 总结

- Scheduler 可以在多个操作符中使用
- observeOn 控制下游执行
- subscribeOn 控制订阅执行
- 根据场景选择合适的 Scheduler
- 组合使用优化性能
