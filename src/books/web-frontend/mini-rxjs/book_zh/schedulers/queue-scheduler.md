# queueScheduler：队列调度

`queueScheduler` 使用队列结构，按顺序同步执行任务。

## 基本用法

```typescript
of(1, 2, 3, queueScheduler).subscribe(console.log)

// 同步输出：1, 2, 3
```

## 实现

```typescript
class QueueScheduler extends Scheduler {
  private queue: Array<() => void> = []
  private active = false
  
  now(): number {
    return Date.now()
  }
  
  schedule<T>(work, delay = 0, state?: T): Subscription {
    const task = () => work.call(null, state)
    
    this.queue.push(task)
    
    if (!this.active) {
      this.flush()
    }
    
    return new Subscription(() => {
      const index = this.queue.indexOf(task)
      if (index > -1) {
        this.queue.splice(index, 1)
      }
    })
  }
  
  private flush(): void {
    this.active = true
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      task()
    }
    
    this.active = false
  }
}

export const queueScheduler = new QueueScheduler()
```

## 特点

- 队列结构
- 同步执行
- 按顺序处理
- 避免递归栈溢出

## 使用场景

### 迭代操作

```typescript
range(1, 10000, queueScheduler).subscribe(console.log)
```

### 避免栈溢出

```typescript
// 使用 queueScheduler 避免递归栈溢出
repeat(100000, queueScheduler).subscribe()
```

## 总结

- 队列调度
- 同步执行
- 按顺序处理任务
- 适合迭代操作
