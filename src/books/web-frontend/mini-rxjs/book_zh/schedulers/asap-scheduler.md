# asapScheduler：微任务调度

`asapScheduler` 使用微任务队列（Promise）实现高优先级异步调度。

## 基本用法

```typescript
of(1, 2, 3, asapScheduler).subscribe(console.log)
```

## 实现

```typescript
class AsapScheduler extends Scheduler {
  now(): number {
    return Date.now()
  }
  
  schedule<T>(work, delay = 0, state?: T): Subscription {
    let cancelled = false
    
    Promise.resolve().then(() => {
      if (!cancelled) {
        work.call(null, state)
      }
    })
    
    return new Subscription(() => {
      cancelled = true
    })
  }
}

export const asapScheduler = new AsapScheduler()
```

## 特点

- 使用微任务（Promise）
- 比 setTimeout 更快
- 高优先级异步
- 在当前宏任务结束后立即执行

## 执行顺序

```typescript
console.log('1: 同步')

setTimeout(() => {
  console.log('4: setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('3: Promise/asapScheduler')
})

console.log('2: 同步')

// 输出顺序：
// 1: 同步
// 2: 同步
// 3: Promise/asapScheduler
// 4: setTimeout
```

## 使用场景

### 高优先级异步

```typescript
asapScheduler.schedule(() => {
  console.log('尽快执行')
})
```

### DOM 更新后执行

```typescript
updateDOM()

asapScheduler.schedule(() => {
  // DOM 已更新，可以读取布局
  const height = element.offsetHeight
})
```

## 总结

- 基于微任务（Promise）
- 高优先级异步
- 比 setTimeout 更快
- 适合需要尽快执行的任务
