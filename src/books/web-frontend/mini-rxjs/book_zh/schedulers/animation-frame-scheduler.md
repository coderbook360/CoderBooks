# animationFrameScheduler：动画帧调度

`animationFrameScheduler` 使用 `requestAnimationFrame` 实现动画帧调度。

## 基本用法

```typescript
interval(0, animationFrameScheduler).subscribe(frame => {
  updateAnimation(frame)
})
```

## 实现

```typescript
class AnimationFrameScheduler extends Scheduler {
  now(): number {
    return performance.now()
  }
  
  schedule<T>(work, delay = 0, state?: T): Subscription {
    let id: number
    
    if (delay > 0) {
      // 延迟后再使用 RAF
      const timerId = setTimeout(() => {
        id = requestAnimationFrame(() => {
          work.call(null, state)
        })
      }, delay)
      
      return new Subscription(() => {
        clearTimeout(timerId)
        if (id) cancelAnimationFrame(id)
      })
    } else {
      id = requestAnimationFrame(() => {
        work.call(null, state)
      })
      
      return new Subscription(() => {
        cancelAnimationFrame(id)
      })
    }
  }
}

export const animationFrameScheduler = new AnimationFrameScheduler()
```

## 特点

- 使用 `requestAnimationFrame`
- 与浏览器刷新同步
- 60fps（约16.67ms）
- 页面不可见时暂停

## 使用场景

### 动画

```typescript
animationData$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(renderFrame)
```

### 游戏循环

```typescript
interval(0, animationFrameScheduler).subscribe(frame => {
  updateGame(frame)
  renderGame()
})
```

### 流畅滚动

```typescript
scrollEvent$.pipe(
  observeOn(animationFrameScheduler)
).subscribe(updateScrollAnimation)
```

## 性能优化

```typescript
// 避免过度渲染
from(dataArray).pipe(
  observeOn(animationFrameScheduler)
).subscribe(data => {
  // 每帧只渲染一次
  renderData(data)
})
```

## 总结

- 基于 `requestAnimationFrame`
- 与浏览器刷新同步
- 适合动画和游戏
- 自动优化性能
