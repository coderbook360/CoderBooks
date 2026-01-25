# scheduler 调度器：控制执行时机

在前面的章节中，我们实现的 effect 有一个特点：每当依赖数据变化，effect 就立即重新执行。这种"同步执行"的策略在很多场景下是合理的，但也带来了一些问题。假设用户在一个函数中连续修改了三个响应式属性，按照当前的实现，effect 会被触发三次——即使这三次修改完成后的最终结果才是我们真正需要的。这不仅浪费了计算资源，还可能导致中间状态被渲染到界面上，造成闪烁等问题。

scheduler（调度器）正是为了解决这类问题而设计的。它允许我们自定义 effect 被触发后的执行时机，而不是总是立即执行。这个机制看似简单，却是实现 computed 惰性求值、watch 异步回调、组件批量更新等核心功能的基础。

## 从问题出发理解 scheduler 的价值

让我们先用一个具体的例子来理解为什么需要 scheduler。考虑这样一个场景：

```typescript
const state = reactive({ firstName: 'John', lastName: 'Doe' })

effect(() => {
  // 假设这里是一个昂贵的计算或 DOM 更新操作
  console.log(`Full name: ${state.firstName} ${state.lastName}`)
})

// 用户在表单中修改了名字
state.firstName = 'Jane'
state.lastName = 'Smith'
```

按照当前的实现，这段代码会输出两次：先是 "Jane Doe"（firstName 改变后），然后是 "Jane Smith"（lastName 改变后）。但实际上，用户看到 "Jane Doe" 这个中间状态是没有意义的，我们只需要最终的 "Jane Smith"。

如果 effect 支持 scheduler，我们就可以这样做：不是每次触发都立即执行，而是把执行任务放入一个队列，等当前同步代码执行完毕后再统一处理。这样，无论在一次同步操作中修改了多少次数据，effect 都只会执行一次，使用的是最终的数据状态。

## scheduler 的设计思路

scheduler 的核心思想是"拦截触发，延迟执行"。当 trigger 检测到数据变化需要触发 effect 时，不是直接调用 effect 的 run 方法，而是调用 scheduler 函数，让 scheduler 来决定何时、如何执行。

这种设计遵循了"控制反转"的原则：effect 不再控制自己的执行时机，而是把这个权力交给外部的 scheduler。这带来了极大的灵活性。你可以让 effect 立即同步执行（不传 scheduler 或 scheduler 直接调用 run），可以让它在微任务中异步执行（scheduler 用 Promise.resolve().then 包装），可以让它延迟到下一帧（scheduler 用 requestAnimationFrame），甚至可以完全不执行而只是标记一个脏标志（computed 就是这么做的）。

## 实现 scheduler 支持

理解了设计意图，实现就比较直接了。我们需要修改两个地方：ReactiveEffect 类需要接收 scheduler 参数，trigger 函数需要在触发时检查是否有 scheduler。

首先，扩展 ReactiveEffect 类，让它能够持有一个可选的 scheduler 函数。这个 scheduler 将在触发时被调用，接收当前的 effect 实例作为参数，这样 scheduler 内部可以在合适的时机调用 effect.run()。

```typescript
class ReactiveEffect {
  active = true
  deps: Set<ReactiveEffect>[] = []
  
  constructor(
    public fn: Function,
    public scheduler?: (effect: ReactiveEffect) => void  // 新增
  ) {}
  
  run() {
    if (!this.active) {
      return this.fn()
    }
    // ... 依赖收集逻辑
  }
  
  stop() {
    // ... 停止逻辑
  }
}
```

这里 scheduler 被定义为一个可选属性。当它存在时，trigger 应该调用它而不是直接调用 run。注意 scheduler 接收 effect 实例作为参数，这样它就可以在需要时调用 effect.run()，或者存储这个 effect 留待稍后处理。

接下来修改 effect 函数，让它能够接收 scheduler 配置：

```typescript
interface EffectOptions {
  lazy?: boolean
  scheduler?: (effect: ReactiveEffect) => void
}

export function effect(fn: Function, options?: EffectOptions) {
  const _effect = new ReactiveEffect(fn, options?.scheduler)
  
  if (!options?.lazy) {
    _effect.run()
  }
  
  const runner = _effect.run.bind(_effect) as any
  runner.effect = _effect
  return runner
}
```

这个修改很简单：从 options 中取出 scheduler，传给 ReactiveEffect 构造函数。同时我们也支持了 lazy 选项，当 lazy 为 true 时，effect 创建后不会立即执行，而是等待手动调用或被触发。

最关键的修改在 trigger 函数中：

```typescript
export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (!dep) return
  
  // 收集需要执行的 effects
  const effectsToRun = new Set<ReactiveEffect>()
  dep.forEach(effect => {
    // 避免无限递归：不触发当前正在执行的 effect
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  // 执行收集到的 effects
  effectsToRun.forEach(effect => {
    if (effect.scheduler) {
      // 如果有 scheduler，调用 scheduler 而不是直接执行
      effect.scheduler(effect)
    } else {
      // 没有 scheduler，直接执行
      effect.run()
    }
  })
}
```

这里的关键逻辑是：遍历需要触发的 effects，对每个 effect 检查它是否有 scheduler。如果有，调用 scheduler 并把 effect 传进去；如果没有，就保持原来的行为，直接调用 run。

## scheduler 的典型应用场景

现在我们的 scheduler 机制已经实现了，让我们看看它在实际中是如何被使用的。

### 场景一：computed 的惰性求值

computed 是 scheduler 最经典的应用。computed 的特点是：依赖变化时不立即重新计算，而是标记为"脏"，等到下次访问 value 时才重新计算。这正是通过 scheduler 实现的：

```typescript
class ComputedRefImpl<T> {
  private _value!: T
  private _dirty = true
  private _effect: ReactiveEffect
  
  constructor(getter: () => T) {
    // scheduler 不执行 getter，而是标记为脏
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        // 通知依赖 computed 的 effects
        trigger(this, 'value')
      }
    })
  }
  
  get value() {
    track(this, 'value')
    // 只在脏的时候才重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this._effect.run()
    }
    return this._value
  }
}
```

注意 scheduler 做了什么：它没有调用 `this._effect.run()`，而只是把 `_dirty` 设为 true，然后调用 trigger 通知那些依赖这个 computed 的 effects。真正的计算推迟到了 value 被访问时。这就是"惰性求值"——只有真正需要值的时候才计算。

这种设计的好处显而易见：如果一个 computed 的依赖变化了很多次，但这期间没有人访问它的值，那么 getter 函数一次都不会执行。而如果没有 scheduler 机制，每次依赖变化都会触发 getter 执行，造成浪费。

### 场景二：watch 的回调执行

watch 使用 scheduler 来控制回调的执行时机。与 computed 不同，watch 的 scheduler 会真正执行一些逻辑——获取新值，比较新旧值，调用用户回调：

```typescript
function watch(source: any, callback: Function) {
  let oldValue: any
  
  const getter = () => source.value  // 简化：假设 source 是 ref
  
  // 这个 job 就是 scheduler 的工作内容
  const job = () => {
    const newValue = effectFn()
    if (newValue !== oldValue) {
      callback(newValue, oldValue)
      oldValue = newValue
    }
  }
  
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: job  // 依赖变化时执行 job 而不是 getter
  })
  
  // 首次执行获取 oldValue
  oldValue = effectFn()
}
```

这个 scheduler（也就是 job 函数）的逻辑是：重新运行 getter 获取新值，与旧值比较，如果不同就调用用户回调。这样，用户的回调只在值真正变化时才被调用，避免了不必要的回调执行。

## 实现批量更新

scheduler 最强大的应用之一是实现批量更新。思路是：不立即执行 effect，而是把它加入一个队列，然后在微任务中统一执行：

```typescript
// 待执行的 effect 队列
const queue = new Set<ReactiveEffect>()
let isFlushing = false

function queueJob(effect: ReactiveEffect) {
  // Set 自动去重：同一个 effect 不会被加入多次
  queue.add(effect)
  
  if (!isFlushing) {
    isFlushing = true
    // 在微任务中执行队列
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  try {
    queue.forEach(effect => effect.run())
  } finally {
    queue.clear()
    isFlushing = false
  }
}
```

这个队列系统有几个关键设计。首先，使用 Set 而不是数组，这样同一个 effect 被触发多次时只会被加入队列一次。其次，使用 `isFlushing` 标志确保 `flushJobs` 只被调度一次，避免重复调度。最后，使用 `Promise.resolve().then()` 把执行推迟到微任务，这样当前同步代码中的所有修改都会先完成，然后再统一执行 effects。

使用这个批量调度器的 effect：

```typescript
effect(() => {
  console.log(`name: ${state.firstName} ${state.lastName}`)
}, {
  scheduler: (effect) => queueJob(effect)
})

// 现在，连续修改只会触发一次 effect 执行
state.firstName = 'Jane'
state.lastName = 'Smith'
// 只输出一次："name: Jane Smith"
```

批量更新的收益在复杂应用中尤其明显。Vue 组件的更新就是通过类似的机制实现的：组件内无论修改多少次响应式数据，组件的重新渲染都会被推迟到微任务中，并且只执行一次。

## flush 选项的实现

Vue 的 watch API 支持 `flush` 选项，控制回调在不同时机执行。基于我们的 scheduler 机制，实现这个功能就很直接了：

```typescript
type FlushMode = 'sync' | 'pre' | 'post'

function createScheduler(flush: FlushMode) {
  switch (flush) {
    case 'sync':
      // 同步执行，不使用 scheduler（或直接调用 run）
      return undefined
      
    case 'pre':
      // 在组件更新前执行（这里简化为微任务）
      return (effect: ReactiveEffect) => {
        queueJob(effect)
      }
      
    case 'post':
      // 在组件更新后执行（这里用 setTimeout 模拟）
      return (effect: ReactiveEffect) => {
        setTimeout(() => effect.run(), 0)
      }
  }
}
```

在真实的 Vue 实现中，`pre` 和 `post` 的区别更加细微，涉及到组件更新队列的处理。但核心思想是一样的：通过不同的 scheduler 实现，控制 effect 在事件循环的不同阶段执行。

## scheduler 与递归调用

使用 scheduler 时需要注意递归调用的问题。考虑这个场景：

```typescript
effect(() => {
  state.count = state.count + 1
}, {
  scheduler: (effect) => effect.run()
})
```

这个 effect 在执行时会修改自己的依赖，如果没有保护机制，就会无限递归。我们之前在 trigger 中添加了 `effect !== activeEffect` 的检查来避免这个问题，但使用 scheduler 时情况会变得复杂——当 scheduler 调用 `effect.run()` 时，run 已经结束，activeEffect 已经不是当前 effect 了。

解决方案是在 trigger 收集 effects 时就进行过滤，或者在 scheduler 中添加额外的保护逻辑。Vue 源码中使用了 `allowRecurse` 选项来控制是否允许递归触发。

## 本章小结

scheduler 是响应式系统中一个精巧的扩展点，它通过"拦截触发、延迟执行"的机制，将 effect 的执行时机从系统控制转交给用户控制。这种设计带来了极大的灵活性：

computed 用它实现惰性求值，只在值被访问时才计算；watch 用它控制回调时机，支持 sync、pre、post 等模式；组件更新用它实现批量处理，避免重复渲染；用户也可以自定义 scheduler 来满足特殊需求。

从更高的角度看，scheduler 体现了一个重要的设计原则：核心机制保持简单，通过扩展点提供灵活性。effect 的核心逻辑（依赖收集和触发更新）不需要关心具体的执行时机，这个责任被清晰地分离到了 scheduler 中。这种关注点分离让系统既容易理解，又足够强大。

在下一章中，我们将实现 readonly，看看如何在响应式系统中加入只读保护机制。
