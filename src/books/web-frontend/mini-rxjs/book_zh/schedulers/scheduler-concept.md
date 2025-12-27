# Scheduler 核心概念

Scheduler（调度器）控制 Observable 何时开始执行以及通知何时发送。

## 什么是 Scheduler？

Scheduler 是一个数据结构，它知道如何根据优先级或其他标准来存储和排队任务。

**三个组件**：
1. **数据结构**：存储和排队任务
2. **执行上下文**：何时何地执行任务
3. **虚拟时钟**：提供时间概念

## 为什么需要 Scheduler？

```typescript
// 同步执行
of(1, 2, 3).subscribe(console.log)

// 异步执行
of(1, 2, 3, asyncScheduler).subscribe(console.log)
```

**好处**：
- 控制执行时机
- 优化性能
- 测试时控制时间

## 内置 Scheduler

| Scheduler | 描述 | 用途 |
|-----------|------|------|
| null/undefined | 同步递归 | 默认行为 |
| asyncScheduler | setTimeout | 异步任务 |
| queueScheduler | 队列 | 迭代操作 |
| asapScheduler | 微任务 | 高优先级异步 |
| animationFrameScheduler | requestAnimationFrame | 动画 |

## 使用方式

### 创建操作符中使用

```typescript
of(1, 2, 3, asyncScheduler)
interval(1000, asyncScheduler)
```

### observeOn 中使用

```typescript
source$.pipe(
  observeOn(asyncScheduler)
)
```

### subscribeOn 中使用

```typescript
source$.pipe(
  subscribeOn(asyncScheduler)
)
```

## 实战场景

### 避免阻塞

```typescript
// 同步执行，可能阻塞
range(1, 10000).pipe(
  map(heavyComputation)
).subscribe()

// 异步执行，不阻塞
range(1, 10000, asyncScheduler).pipe(
  map(heavyComputation)
).subscribe()
```

### 动画优化

```typescript
animationData$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(updateAnimation)
```

### 测试

```typescript
const scheduler = new TestScheduler()
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--b--|')
  expectObservable(source).toBe('--a--b--|')
})
```

## 总结

- Scheduler 控制 Observable 的执行时机
- 提供不同的调度策略
- 用于性能优化和测试
- 通过 observeOn/subscribeOn 使用
