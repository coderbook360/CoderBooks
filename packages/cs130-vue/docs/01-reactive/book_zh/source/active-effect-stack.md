# activeEffect 与 effect 栈：追踪上下文管理

在前两章中，我们多次提到"当前活跃的 effect"这个概念。Proxy 的 get 拦截器需要知道是哪个 effect 在访问数据，才能建立正确的依赖关系。这就引出了一个关键问题：如何在全局范围内追踪当前正在执行的 effect？Vue 通过 `activeEffect` 全局变量和嵌套执行机制来解决这个问题。

## 全局追踪变量

响应式系统使用几个全局变量来管理追踪上下文：

```typescript
export let activeEffect: ReactiveEffect | undefined

export let shouldTrack = true

const trackStack: boolean[] = []
```

`activeEffect` 是当前正在执行的 effect。当一个 effect 开始执行时，它会被设置为 `activeEffect`；执行完成后，会恢复之前的值。track 函数通过读取这个变量来知道应该将依赖添加给谁。

`shouldTrack` 控制是否应该进行依赖追踪。某些情况下我们需要临时禁用追踪，比如在执行数组的变异方法时，这时会将 `shouldTrack` 设为 false，防止收集到不必要的依赖。

`trackStack` 是一个栈结构，用于保存 `shouldTrack` 的历史值。当需要嵌套地暂停和恢复追踪时，这个栈确保状态能够正确地层层恢复。

## 嵌套 effect 的挑战

effect 嵌套执行是一个常见场景。考虑一个组件渲染另一个组件的情况：父组件的渲染函数是一个 effect，它在渲染过程中触发了子组件的渲染，子组件的渲染也是一个 effect。这就形成了 effect 的嵌套。

如果只用一个简单的全局变量来记录当前 effect，嵌套就会出问题。内层 effect 执行时会覆盖 `activeEffect`，执行完后需要恢复到外层 effect。早期的实现使用一个栈来管理这个过程。

在当前版本的 Vue 中，这个问题通过在 `run` 方法中保存和恢复状态来解决：

```typescript
run(): T {
  // ...
  let lastShouldTrack = shouldTrack
  let lastEffect = activeEffect
  try {
    shouldTrack = true
    activeEffect = this
    // 执行用户函数
    return this.fn()
  } finally {
    activeEffect = lastEffect
    shouldTrack = lastShouldTrack
  }
}
```

每个 effect 在执行前保存当前的 `activeEffect` 到局部变量 `lastEffect`，然后将自己设为 `activeEffect`。执行完成后，无论成功还是异常，finally 块都会将 `activeEffect` 恢复为之前保存的值。

这种方式利用了 JavaScript 的调用栈——每次函数调用都有自己的局部变量，自动形成了一个"逻辑栈"。当内层 effect 执行完返回时，外层的 `lastEffect` 变量自然保存着正确的值可以恢复。

## 暂停与恢复追踪

有时候我们需要在 effect 执行过程中临时禁用追踪。最典型的例子是数组变异方法的处理。当调用 `array.push(item)` 时，push 方法内部会读取 length 属性、设置新元素、更新 length。如果这些操作都被追踪，会产生大量无用的依赖和循环触发的风险。

Vue 提供了 `pauseTracking` 和 `resetTracking` 函数来控制追踪状态：

```typescript
export function pauseTracking(): void {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function enableTracking(): void {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

export function resetTracking(): void {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}
```

`pauseTracking` 将当前的 `shouldTrack` 值压入栈中保存，然后设为 false。`enableTracking` 类似，但设为 true——这在某些需要强制启用追踪的场景使用。`resetTracking` 从栈中弹出之前保存的值并恢复。

栈的使用确保了嵌套调用的正确性。假设代码中先调用 `pauseTracking`，然后在某个回调中又调用 `pauseTracking`，最后连续两次 `resetTracking`，栈机制保证每次恢复的都是正确的上一个状态。

## pauseScheduling 与 resetScheduling

除了追踪控制，还有调度控制：

```typescript
let pauseScheduleStack = 0

export function pauseScheduling(): void {
  pauseScheduleStack++
}

export function resetScheduling(): void {
  pauseScheduleStack--
  while (!pauseScheduleStack && queueEffectSchedulers.length) {
    queueEffectSchedulers.shift()!()
  }
}
```

`pauseScheduling` 和 `resetScheduling` 用于控制 effect 的调度时机。在某些批量操作中，我们希望先完成所有数据修改，最后再统一执行 effect 调度。这对性能很重要——避免中间状态触发不必要的更新。

这里使用计数器而不是布尔值，是因为暂停可能嵌套。只有当计数器归零时，才真正恢复调度并执行积累的调度器。`queueEffectSchedulers` 是一个队列，暂停期间触发的调度器被添加到这个队列中，恢复时依次执行。

## track 函数中的上下文检查

现在我们可以理解 track 函数开头的检查逻辑了：

```typescript
export function track(target: object, type: TrackOpTypes, key: unknown): void {
  if (shouldTrack && activeEffect) {
    // 执行依赖收集...
  }
}
```

这两个条件缺一不可。`shouldTrack` 为 true 确保当前没有禁用追踪。`activeEffect` 存在确保当前有 effect 正在执行。只有两个条件都满足，才进行依赖收集。

这种设计的好处是简洁高效。track 函数被调用得非常频繁（每次访问响应式属性都会调用），开头的简单检查能够快速过滤掉不需要处理的情况，避免后续更重的逻辑。

## 递归执行的处理

一个 effect 在执行过程中可能触发自己。比如一个 effect 读取某个属性，在副作用函数中又修改了这个属性，这会导致递归触发。

ReactiveEffect 使用 `_runnings` 计数器来检测和处理这种情况：

```typescript
run(): T {
  // ...
  this._runnings++
  try {
    return this.fn()
  } finally {
    this._runnings--
    // ...
  }
}
```

在 trigger 阶段，系统会检查这个计数器。如果一个 effect 正在执行（`_runnings > 0`），默认不会再次触发它——这避免了无限循环。但如果 effect 配置了 `allowRecurse: true`，则允许递归触发。

```typescript
// 在 trigger 逻辑中
if (
  effect !== activeEffect ||
  effect.allowRecurse
) {
  // 可以触发这个 effect
}
```

这种机制确保了安全的默认行为，同时保留了灵活性。大多数情况下禁止递归是正确的；少数需要递归的场景可以通过选项显式开启。

## 调试钩子的上下文

ReactiveEffect 支持调试钩子 `onTrack` 和 `onTrigger`，它们也依赖当前的执行上下文：

```typescript
if (__DEV__ && activeEffect.onTrack) {
  activeEffect.onTrack({
    effect: activeEffect,
    target,
    type,
    key,
  })
}
```

这些钩子在开发模式下调用，让开发者可以观察依赖收集和触发更新的过程。钩子接收一个事件对象，包含当前 effect、目标对象、操作类型、键名等信息。通过 `activeEffect` 可以准确地传递当前正在执行的 effect。

## 设计权衡

使用全局变量来管理执行上下文是一个经过权衡的设计决策。

这种方案的优点是简单高效。Proxy 的 get 拦截器和 track 函数之间没有直接的调用关系，通过全局变量实现了隐式的通信。不需要修改 Proxy handler 的签名来传递 effect 参数，保持了代码的简洁。

潜在的缺点是全局状态带来的复杂性。在多线程环境中，全局变量会导致竞争条件（但 JavaScript 是单线程的，不存在这个问题）。调试时需要理解隐式的状态传递，不如显式参数直观。

另一个考虑是栈与链表的选择。早期实现使用显式的 effect 栈来管理嵌套，现在改为利用调用栈（通过局部变量保存恢复）。后者更简洁，也避免了维护额外数据结构的开销。

## 本章小结

`activeEffect` 和相关的追踪控制机制是连接 Proxy handler 和 ReactiveEffect 的桥梁。通过全局变量，track 函数可以知道当前是哪个 effect 在访问数据；通过 `shouldTrack` 和 `pauseTracking`/`resetTracking`，可以精确控制何时进行追踪。

嵌套执行通过保存和恢复局部变量来处理，利用 JavaScript 的调用栈自动管理。递归执行通过 `_runnings` 计数器检测，默认禁止以避免无限循环。调度控制通过 `pauseScheduling`/`resetScheduling` 实现批量操作的优化。

这套机制看似简单，实际上精心设计。它在保持代码简洁的同时，正确处理了各种边界情况，是 Vue 响应式系统可靠运行的基础。
