# Day 7: effect 选项和优化

你好，我是你的技术导师。

经过前几天的努力，我们已经拥有了一个功能完备的响应式系统：
- `reactive` 负责拦截。
- `effect` 负责执行。
- `track` 和 `trigger` 负责连接它们。
- `Parent` 指针解决了嵌套问题。

现在的 `effect` 就像一个尽职尽责的士兵：一旦收到命令（依赖变化），就立即执行任务（运行函数）。

但是，在复杂的战场上，"立即执行"并不总是最好的策略。

有时候，我们需要：
- **延迟执行**：比如 `computed`，只有在被访问时才计算。
- **调度执行**：比如 Vue 的异步更新队列，多次修改数据只更新一次视图。
- **清理工作**：比如在 `effect` 停止时清除定时器。

今天，我们要给这位士兵配上"战术背包"——**Effect Options**，让它能够应对各种复杂的战术需求。

## 1. 掌控时间：Scheduler（调度器）

### 1.1 为什么需要调度器？

想象一下这个场景：

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log('更新了:', state.count)
})

state.count++
state.count++
state.count++
```

按照目前的实现，控制台会输出三次更新日志。

但在实际开发中，如果我们连续修改了 100 次数据，难道要让组件重新渲染 100 次吗？那浏览器肯定卡死了。

我们希望的是：**无论修改多少次，只在最后更新一次。**

这就需要把"依赖变化"和"执行任务"解耦。

- **依赖变化**：通知我数据变了。
- **执行任务**：由我来决定什么时候执行，怎么执行。

这就是 **Scheduler（调度器）** 的作用。

### 1.2 实现 Scheduler

我们在 `ReactiveEffect` 类中增加一个 `scheduler` 属性。

```typescript
class ReactiveEffect {
  constructor(
    public fn: () => any,
    public scheduler: EffectScheduler | null = null // 新增
  ) {}
}
```

然后修改 `trigger` 逻辑：

```typescript
function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      // 如果有调度器，交给调度器处理
      effect.scheduler(effect)
    } else {
      // 否则直接执行
      effect.run()
    }
  }
}
```

就这么简单！现在，控制权交到了用户手中。

### 1.3 实战：实现异步更新队列

让我们利用 `scheduler` 来实现一个简单的异步更新队列（类似 Vue 的 `nextTick` 机制）。

```javascript
const queue = new Set()
let isFlushing = false
const p = Promise.resolve()

function queueJob(job) {
  queue.add(job)
  if (!isFlushing) {
    isFlushing = true
    p.then(() => {
      queue.forEach(job => job.run())
      queue.clear()
      isFlushing = false
    })
  }
}

effect(() => {
  console.log(state.count)
}, {
  scheduler: queueJob // 传入调度器
})

state.count = 1
state.count = 2
state.count = 3
```

现在，无论你修改多少次 `count`，`effect` 都只会进入队列一次，并在微任务中统一执行。这就是 Vue 高性能渲染的秘密武器。

## 2. 懒惰的美德：Lazy（延迟执行）

### 2.1 为什么需要 Lazy？

有些 `effect` 比较昂贵，我们不希望它一上来就执行。

最典型的例子就是 `computed`。

```javascript
const double = computed(() => state.count * 2)
```

定义 `double` 时，我们并不想立即计算 `state.count * 2`。只有当你真正用到 `double.value` 时，才需要计算。

### 2.2 实现 Lazy

我们在 `effect` 函数中增加一个 `lazy` 选项。

```typescript
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)
  
  // 处理选项
  Object.assign(_effect, options)
  
  // 如果不是 lazy，才立即执行
  if (!options.lazy) {
    _effect.run()
  }
  
  const runner = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}
```

现在，我们可以创建一个"懒"的 effect 了：

```javascript
const runner = effect(
  () => console.log('执行了'),
  { lazy: true }
)
// 控制台无输出

runner() // 手动调用
// 控制台输出: 执行了
```

## 3. 善后工作：onStop

### 3.1 为什么需要 onStop？

当一个 `effect` 被停止（stop）时，我们可能需要做一些清理工作。

比如，如果 `effect` 内部注册了一个定时器，或者监听了 DOM 事件。如果不清理，就会导致内存泄漏。

```javascript
effect(() => {
  const timer = setInterval(() => {
    console.log(state.count)
  }, 1000)
  
  // 问题：当 effect 被 stop 时，怎么清除这个 timer？
})
```

### 3.2 实现 onStop

我们在 `ReactiveEffect` 中增加 `onStop` 回调。

```typescript
class ReactiveEffect {
  onStop?: () => void
  
  stop() {
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop() // 调用回调
      }
      this.active = false
    }
  }
}
```

现在我们可以优雅地清理副作用了：

```javascript
effect(() => {
  const timer = setInterval(...)
}, {
  onStop: () => clearInterval(timer)
})
```

## 4. 总结与预告

今天，我们通过给 `effect` 增加选项，极大地扩展了它的能力。

我们学到了：
1.  **Scheduler**：将"触发"和"执行"分离，实现了异步更新和批量处理。
2.  **Lazy**：支持延迟执行，是实现 `computed` 的基础。
3.  **onStop**：提供了生命周期钩子，用于资源清理。

至此，我们的响应式系统底层（Reactive + Effect）已经基本完工。

你可能会问："这和 Vue 的 `ref`、`computed` 有什么关系？"

其实，`ref` 和 `computed` 只是基于我们现有系统之上的**封装**。

- `ref` 是为了解决基本类型（number, string）无法被 Proxy 代理的问题。
- `computed` 是一个带有 `lazy` 和 `scheduler` 的特殊 `effect`。

明天，我们将利用今天学到的知识，亲手实现 `track` 和 `trigger` 的完整逻辑（如果之前还没完善的话），并开始向 `ref` 和 `computed` 进军。

准备好用这些积木搭建摩天大楼了吗？我们明天见！
