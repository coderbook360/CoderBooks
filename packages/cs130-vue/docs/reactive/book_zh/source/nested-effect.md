# 嵌套 effect：父子关系与执行顺序

在实际应用中，effect 常常嵌套执行。一个典型的例子是组件渲染：父组件的渲染函数是一个 effect，它在渲染过程中触发子组件渲染，子组件的渲染也是一个 effect。理解嵌套 effect 的工作原理，对于理解组件更新机制至关重要。

## 嵌套场景的复杂性

当 effect 嵌套执行时，有几个问题需要解决。

第一，依赖归属问题。嵌套执行过程中，内外层 effect 都可能访问响应式数据，这些访问应该正确归属到对应的 effect。内层 effect 访问的数据不应该成为外层的依赖。

第二，状态恢复问题。内层 effect 执行完成后，外层 effect 应该能够继续正常执行和收集依赖。全局状态（如 activeEffect）需要正确恢复。

第三，触发顺序问题。当数据变化时，嵌套的 effect 按什么顺序触发？是否需要特殊处理？

## activeEffect 的管理

Vue 通过在 run 方法中保存和恢复 activeEffect 来处理嵌套：

```typescript
run(): T {
  // ...
  let lastShouldTrack = shouldTrack
  let lastEffect = activeEffect
  try {
    shouldTrack = true
    activeEffect = this
    this._runnings++
    preCleanupEffect(this)
    return this.fn()
  } finally {
    postCleanupEffect(this)
    this._runnings--
    activeEffect = lastEffect
    shouldTrack = lastShouldTrack
  }
}
```

关键在于 `lastEffect = activeEffect` 这行。进入 run 之前，保存当前的 activeEffect 到局部变量。然后将自己设为 activeEffect。执行用户函数，此时任何响应式访问都会追踪到当前 effect。执行完成后，从局部变量恢复之前的 activeEffect。

这种方式利用了 JavaScript 的调用栈。每次函数调用都有自己的局部变量 lastEffect，自然形成了一个"逻辑栈"。即使多层嵌套，每层的恢复都是正确的。

## 嵌套执行示例

让我们跟踪一个具体的嵌套场景：

```typescript
const state = reactive({ outer: 1, inner: 2 })

effect(() => {
  console.log('outer:', state.outer)
  
  effect(() => {
    console.log('inner:', state.inner)
  })
})
```

执行流程如下：

1. 外层 effect 开始执行，`activeEffect = outerEffect`
2. 访问 `state.outer`，track 将 outerEffect 添加到 outer 的依赖
3. 内层 effect 创建并开始执行
4. 内层 run 保存 `lastEffect = outerEffect`，设置 `activeEffect = innerEffect`
5. 访问 `state.inner`，track 将 innerEffect 添加到 inner 的依赖
6. 内层 effect 执行完成，`activeEffect = outerEffect`（从 lastEffect 恢复）
7. 外层 effect 继续，如果后面还有响应式访问，会正确追踪到 outerEffect
8. 外层 effect 执行完成

这个过程中，outer 的依赖只有 outerEffect，inner 的依赖只有 innerEffect。依赖归属是正确的。

## 常见的陷阱

上面的例子有一个问题：每次外层 effect 执行都会创建新的内层 effect。如果 `state.outer` 变化多次，就会创建多个内层 effect，它们都依赖 `state.inner`。

这通常不是期望的行为。更好的模式是：

```typescript
const state = reactive({ outer: 1, inner: 2 })

// 分开创建
const innerRunner = effect(() => {
  console.log('inner:', state.inner)
})

effect(() => {
  console.log('outer:', state.outer)
  innerRunner()  // 手动调用，不创建新 effect
})
```

或者使用 EffectScope 来管理：

```typescript
const scope = effectScope()

scope.run(() => {
  effect(() => {
    console.log('outer:', state.outer)
  })
  
  effect(() => {
    console.log('inner:', state.inner)
  })
})

// 一起清理
scope.stop()
```

## 组件渲染中的嵌套

组件渲染是嵌套 effect 的典型应用。每个组件的渲染函数被包装在一个 effect 中。当父组件渲染时触发子组件渲染，就形成了嵌套。

Vue 的组件系统在这里做了特殊处理。子组件不是在父组件 effect 内部直接创建的 effect，而是有自己独立的更新调度。这避免了上述"重复创建"的问题。

```typescript
// 简化的组件更新逻辑
const componentUpdateEffect = effect(() => {
  render()  // 执行渲染函数
}, {
  scheduler: () => {
    // 使用调度器，不是立即执行
    queueJob(update)
  }
})
```

子组件的 effect 有自己的调度器，与父组件独立。父组件更新时会重新渲染模板，如果子组件的 props 变化，子组件会被单独调度更新，而不是在父组件 effect 内部直接执行。

## _runnings 计数器的作用

ReactiveEffect 有一个 `_runnings` 计数器：

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

这个计数器追踪当前 effect 正在执行的层数。正常情况下，一个 effect 同时只执行一次，`_runnings` 要么是 0 要么是 1。

但在某些边界情况下，可能出现递归。比如 effect 内部修改了自己依赖的数据，默认情况下会阻止递归触发。`_runnings > 0` 表示 effect 正在执行，此时触发应该被忽略或推迟。

```typescript
// 在 trigger 相关逻辑中
if (effect._runnings > 0 && !effect.allowRecurse) {
  // 阻止递归触发
  return
}
```

## 嵌套与递归的区别

嵌套和递归是不同的概念，容易混淆。

嵌套是不同的 effect 相互调用。A effect 执行时触发 B effect 执行，B 完成后 A 继续。activeEffect 在 A 和 B 之间切换。

递归是同一个 effect 触发自己。A effect 执行时修改了 A 依赖的数据，触发 A 再次执行。这会导致无限循环，默认被阻止。

```typescript
// 嵌套 - 正常
effect(() => {
  effect(() => {  // 不同的 effect
    //...
  })
})

// 递归 - 默认阻止
effect(() => {
  state.count++  // 修改自己依赖的数据
})
```

理解这个区别对于调试很重要。如果发现 effect 没有按预期触发，可能是被递归检查阻止了。

## 深度嵌套的性能考虑

虽然嵌套机制正确工作，但深度嵌套会带来性能开销。每层嵌套都需要保存和恢复状态，执行依赖清理，维护各自的依赖数组。

在设计应用时，应该避免不必要的深度嵌套。通常一两层嵌套是可接受的（如父子组件），但更深的嵌套应该考虑是否可以扁平化或使用其他模式。

## EffectScope 与嵌套

EffectScope 提供了另一种管理嵌套的方式。scope 可以嵌套，子 scope 中的 effect 可以被父 scope 一起管理：

```typescript
const parentScope = effectScope()

parentScope.run(() => {
  effect(() => { /* effect 1 */ })
  
  const childScope = effectScope()
  childScope.run(() => {
    effect(() => { /* effect 2 */ })
  })
})

// 停止父 scope 会连带停止子 scope 中的 effect
parentScope.stop()
```

这提供了比手动管理嵌套更好的抽象。effect 的创建和清理被 scope 统一管理，减少了泄漏的风险。

## 本章小结

嵌套 effect 是 Vue 响应式系统的重要场景。通过在 run 方法中保存和恢复 activeEffect，系统正确处理了依赖归属问题。通过 _runnings 计数器区分嵌套和递归，避免了无限循环。

理解嵌套机制对于理解组件更新流程很有帮助。父子组件的渲染关系本质上就是嵌套 effect 的关系，只是 Vue 通过调度器做了额外的优化和控制。

在实践中，应该合理使用嵌套，避免过深的层级。EffectScope 提供了更好的管理方式，特别是需要批量创建和清理 effect 的场景。
