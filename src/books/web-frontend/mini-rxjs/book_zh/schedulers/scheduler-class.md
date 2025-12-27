# 实现 Scheduler 基类

本章实现 Scheduler 基类，为各种调度器提供基础。

## Scheduler 接口

```typescript
interface Scheduler {
  now(): number
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription
}
```

## Action 接口

```typescript
interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription
}
```

## 基础实现

```typescript
abstract class Scheduler {
  /**
   * 当前时间
   */
  abstract now(): number
  
  /**
   * 调度任务
   */
  abstract schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription
}

class Action<T> extends Subscription {
  constructor(
    protected scheduler: Scheduler,
    protected work: (this: Action<T>, state?: T) => void
  ) {
    super()
  }
  
  schedule(state?: T, delay: number = 0): Subscription {
    if (this.closed) {
      return this
    }
    
    this._state = state
    
    const id = this.scheduler.scheduleAction(this, delay)
    this.add(() => this.scheduler.cancelAction(id))
    
    return this
  }
  
  execute(state: T): void {
    try {
      this.work.call(this, state)
    } catch (err) {
      this.unsubscribe()
      throw err
    }
  }
  
  protected _state: T | undefined
}
```

## 使用示例

```typescript
class MyScheduler extends Scheduler {
  now(): number {
    return Date.now()
  }
  
  schedule<T>(work, delay = 0, state?: T): Subscription {
    const action = new Action(this, work)
    return action.schedule(state, delay)
  }
}
```

## 总结

- Scheduler 基类定义调度接口
- Action 封装待执行的工作
- 子类实现具体的调度策略
