# scheduler 选项：自定义调度逻辑

effect 默认在依赖变化时同步执行用户函数，但这并不总是最佳策略。考虑一个场景：一次操作修改了多个响应式属性，每个修改都触发 effect，导致多次重复执行。scheduler 选项允许自定义触发后的行为，实现延迟执行、批量更新等高级模式。

## scheduler 的基本概念

scheduler 是 effect 配置的一个可选函数，当 effect 需要被触发时，系统会调用 scheduler 而不是直接执行 run：

```typescript
effect(() => {
  console.log(state.count)
}, {
  scheduler: () => {
    console.log('effect 需要更新，但我们可以决定何时执行')
  }
})
```

上面的例子中，当 state.count 变化时，不会立即打印新值，而是执行 scheduler 函数。scheduler 函数可以决定何时、如何触发真正的执行。

## 与 trigger 的关系

让我们看看 scheduler 在触发流程中的位置。在 ReactiveEffect 构造时：

```typescript
const _effect = new ReactiveEffect(fn, NOOP, () => {
  if (_effect.dirty) {
    _effect.run()
  }
})
```

第三个参数是默认的触发函数。当依赖变化时，triggerEffects 会调用 `effect.trigger()`，这个 trigger 就是构造时传入的函数。

如果用户提供了 scheduler，触发逻辑会变成：

```typescript
// 在 triggerEffects 或相关逻辑中
if (effect.scheduler) {
  effect.scheduler()
} else {
  effect.run()
}
```

scheduler 拦截了触发到执行之间的环节，给用户插入自定义逻辑的机会。

## 实现异步更新

scheduler 最常见的用途是实现异步更新。Vue 的组件更新就是这样工作的：

```typescript
const queue: ReactiveEffectRunner[] = []
let isFlushing = false

function queueJob(runner: ReactiveEffectRunner) {
  if (!queue.includes(runner)) {
    queue.push(runner)
  }
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  for (const job of queue) {
    job()
  }
  queue.length = 0
  isFlushing = false
}

// 使用
const runner = effect(() => {
  render()
}, {
  scheduler: () => queueJob(runner)
})
```

这个模式实现了几个目标：

1. 多次触发只执行一次。queue 使用 includes 检查防止重复入队。
2. 延迟到微任务执行。Promise.resolve().then 将执行推迟到当前同步代码完成后。
3. 批量处理。所有同步修改完成后，一次性处理队列中的所有 effect。

## 去重与防抖

scheduler 可以实现去重和防抖模式：

```typescript
// 去重：多次触发只执行最后一次
let pending = false

effect(() => {
  heavyComputation(state.data)
}, {
  scheduler: () => {
    if (!pending) {
      pending = true
      requestAnimationFrame(() => {
        pending = false
        runner()
      })
    }
  }
})
```

```typescript
// 防抖：等待一段时间没有新触发才执行
let timeout: number | null = null

effect(() => {
  saveToServer(state.form)
}, {
  scheduler: () => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      runner()
    }, 300)
  }
})
```

这些模式在处理高频更新或昂贵操作时很有用。

## 控制执行顺序

scheduler 可以控制多个 effect 的执行顺序：

```typescript
const queue: { runner: Function; priority: number }[] = []

function scheduleWithPriority(runner: Function, priority: number) {
  queue.push({ runner, priority })
  queue.sort((a, b) => a.priority - b.priority)
  // 安排执行...
}

// 高优先级 effect
effect(() => {
  validateForm(state.form)
}, {
  scheduler: () => scheduleWithPriority(runner, 1)
})

// 低优先级 effect
effect(() => {
  updateAnalytics(state.form)
}, {
  scheduler: () => scheduleWithPriority(runner, 10)
})
```

通过优先级排序，可以确保重要的 effect 先执行。

## 条件执行

scheduler 可以添加条件判断，决定是否真的需要执行：

```typescript
effect(() => {
  syncWithServer(state.data)
}, {
  scheduler: () => {
    // 只有在线时才同步
    if (navigator.onLine) {
      runner()
    }
  }
})
```

这种模式在需要外部条件满足时才执行 effect 的场景很有用。

## computed 中的 scheduler

computed 内部使用了特殊的 scheduler 配置：

```typescript
// 简化的 computed 实现
class ComputedRefImpl<T> {
  private _effect: ReactiveEffect<T>
  
  constructor(getter: () => T) {
    this._effect = new ReactiveEffect(getter, () => {
      // 这是 trigger 函数
      triggerRefValue(this)
    })
  }
}
```

computed 的 scheduler 不直接执行计算，而是标记自己为脏并通知依赖者。这实现了懒计算——只有当 computed 被访问时才重新计算。

## watch 中的 scheduler

watch 和 watchEffect 的 flush 选项背后就是 scheduler：

```typescript
// flush: 'sync' - 同步执行，无 scheduler
// flush: 'pre' - 组件更新前执行
// flush: 'post' - 组件更新后执行

watchEffect(() => {
  console.log(state.count)
}, { flush: 'post' })
```

不同的 flush 值会配置不同的 scheduler，将回调放入不同的队列，在不同时机执行。

## 与 _shouldSchedule 的关系

ReactiveEffect 有一个 `_shouldSchedule` 属性：

```typescript
if (lastDirtyLevel === DirtyLevels.NotDirty) {
  effect._shouldSchedule = true
  // ...
  effect.trigger()
}
```

`_shouldSchedule` 标记 effect 是否应该被调度。只有从 NotDirty 变化时才设置为 true。这避免了已经在调度队列中的 effect 被重复调度。

在 scheduler 实现中可以检查这个标志：

```typescript
scheduler: () => {
  if (effect._shouldSchedule) {
    queueJob(runner)
    effect._shouldSchedule = false
  }
}
```

## 实现节流

除了防抖，还可以实现节流（throttle）：

```typescript
let lastRun = 0
const interval = 100  // 最小间隔 100ms

effect(() => {
  updateProgress(state.progress)
}, {
  scheduler: () => {
    const now = Date.now()
    if (now - lastRun >= interval) {
      lastRun = now
      runner()
    }
  }
})
```

节流确保 effect 最多每隔一定时间执行一次，适合处理高频事件如滚动、拖拽。

## scheduler 的限制

scheduler 给了很大的灵活性，但也有一些注意事项：

1. scheduler 被调用时，effect 已经被标记为脏。如果 scheduler 决定不执行，effect 会保持脏状态直到下次被触发或手动执行。

2. scheduler 中应该避免访问响应式数据，这可能导致意外的依赖收集或触发。

3. 异步 scheduler 需要注意 effect 可能已经被 stop。执行前应该检查 `runner.effect.active`。

4. 复杂的 scheduler 逻辑可能影响调试。依赖变化和实际执行之间的延迟可能让问题定位变困难。

## 本章小结

scheduler 选项是 effect 系统的重要扩展点。它允许自定义触发后的行为，实现异步更新、批量处理、去重、防抖、节流等模式。

Vue 内部广泛使用 scheduler 来优化性能。组件更新使用异步队列，computed 使用懒计算，watch 的 flush 选项使用不同的调度时机。

理解 scheduler 的工作原理，有助于在需要精细控制更新时机的场景下正确使用响应式系统。它也是理解 Vue 内部优化策略的关键。
