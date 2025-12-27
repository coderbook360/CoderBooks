# asyncScheduler：异步调度

`asyncScheduler` 使用 `setTimeout` 实现异步调度。

## 基本用法

```typescript
of(1, 2, 3, asyncScheduler).subscribe(console.log)

// 异步输出：1, 2, 3
```

## 实现

```typescript
class AsyncScheduler extends Scheduler {
  private actions: Map<number, any> = new Map()
  private idCounter = 0
  
  now(): number {
    return Date.now()
  }
  
  schedule<T>(work, delay = 0, state?: T): Subscription {
    const id = this.idCounter++
    
    const timerId = setTimeout(() => {
      work.call(null, state)
      this.actions.delete(id)
    }, delay)
    
    this.actions.set(id, timerId)
    
    return new Subscription(() => {
      clearTimeout(timerId)
      this.actions.delete(id)
    })
  }
}

export const asyncScheduler = new AsyncScheduler()
```

## 特点

- 使用 `setTimeout`
- 异步执行
- 支持延迟
- 最常用的调度器

## 使用场景

### 避免阻塞

```typescript
range(1, 10000, asyncScheduler).subscribe(console.log)
```

### 延迟执行

```typescript
of('delayed', asyncScheduler).subscribe(console.log)
console.log('immediate')

// 输出：
// immediate
// delayed
```

## 总结

- 基于 `setTimeout`
- 异步调度
- 支持延迟
- 默认的异步调度器
