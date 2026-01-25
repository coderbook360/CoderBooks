# ReactiveEffect 类：副作用的核心实现

上一章我们看到 effect 函数如何创建 ReactiveEffect 实例。现在让我们深入这个类的内部，理解它是如何实现依赖追踪和自动更新的。ReactiveEffect 是整个响应式系统中最复杂也最关键的类，理解它的工作原理，就能理解 Vue 响应式的核心机制。

## 类的整体结构

ReactiveEffect 类的定义相当庞大，包含多个属性和方法。我们先看一个简化的结构概览，然后逐个深入分析。

```typescript
export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  
  // 可选属性
  computed?: ComputedRefImpl<T>
  allowRecurse?: boolean
  onStop?: () => void
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void

  /**
   * @internal
   */
  _dirtyLevel = DirtyLevels.Dirty
  /**
   * @internal
   */
  _trackId = 0
  /**
   * @internal
   */
  _runnings = 0
  /**
   * @internal
   */
  _shouldSchedule = false
  /**
   * @internal
   */
  _depsLength = 0

  constructor(
    public fn: () => T,
    public trigger: () => void,
    public scheduler?: EffectScheduler,
    scope?: EffectScope,
  ) {
    recordEffectScope(this, scope)
  }

  // 核心方法
  public get dirty(): boolean { ... }
  public set dirty(v: boolean) { ... }
  run(): T { ... }
  stop(): void { ... }
}
```

这个类的设计反映了响应式系统的核心需求。`active` 标志表示 effect 是否处于激活状态，停止的 effect 不会响应数据变化。`deps` 数组存储了这个 effect 依赖的所有数据集合，这是依赖追踪的关键数据结构。

构造函数接收四个参数：`fn` 是要追踪的目标函数，`trigger` 是触发时调用的函数，`scheduler` 是可选的调度器，`scope` 是可选的 EffectScope。构造函数很简洁，主要工作就是调用 `recordEffectScope` 将自己注册到 scope 中。

## 脏检查机制

Vue 3.4 引入了一个重要的优化：脏检查（dirty checking）。这个机制用于避免不必要的重复计算，特别是对 computed 的优化效果显著。

```typescript
public get dirty(): boolean {
  if (
    this._dirtyLevel === DirtyLevels.MaybeDirty_ComputedSideEffect ||
    this._dirtyLevel === DirtyLevels.MaybeDirty
  ) {
    this._dirtyLevel = DirtyLevels.QueryingDirty
    pauseTracking()
    for (let i = 0; i < this._depsLength; i++) {
      const dep = this.deps[i]
      if (dep.computed) {
        triggerComputed(dep.computed)
        if (this._dirtyLevel >= DirtyLevels.Dirty) {
          break
        }
      }
    }
    if (this._dirtyLevel === DirtyLevels.QueryingDirty) {
      this._dirtyLevel = DirtyLevels.NotDirty
    }
    resetTracking()
  }
  return this._dirtyLevel >= DirtyLevels.Dirty
}

public set dirty(v: boolean) {
  this._dirtyLevel = v ? DirtyLevels.Dirty : DirtyLevels.NotDirty
}
```

脏检查的核心思想是：不要急于重新计算，先检查是否真的需要。`_dirtyLevel` 属性有多个级别，从 `NotDirty`（完全干净，不需要更新）到 `Dirty`（确定需要更新），中间还有 `MaybeDirty`（可能需要更新，需要进一步检查）。

当 getter 被调用时，如果当前状态是"可能脏"，系统会遍历所有依赖的 computed，触发它们的计算。如果任何一个 computed 的值发生了变化，当前 effect 就会被标记为"确定脏"。这种懒惰求值的策略避免了不必要的计算——只有在真正需要值的时候才去检查和计算。

`pauseTracking` 和 `resetTracking` 的调用确保在检查过程中不会意外建立新的依赖关系。这是一个重要的细节：脏检查只是为了决定是否需要更新，不应该影响依赖图。

## run 方法：执行与追踪

`run` 方法是 ReactiveEffect 的核心，它执行用户函数并完成依赖收集。这个方法的实现相当复杂，因为它需要处理多种边界情况。

```typescript
run(): T {
  this._dirtyLevel = DirtyLevels.NotDirty
  if (!this.active) {
    return this.fn()
  }
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

方法开始先将 `_dirtyLevel` 重置为 `NotDirty`，表示即将执行的是最新状态。然后检查 `active` 标志，如果 effect 已经被停止，就直接执行函数但不进行依赖追踪——这允许停止的 effect 仍然可以手动执行，但不会建立响应式关联。

接下来是核心的追踪逻辑。首先保存当前的全局状态（`shouldTrack` 和 `activeEffect`），然后设置新的状态：启用追踪，并将自己设为当前活跃的 effect。`_runnings` 计数器增加，用于检测递归调用。

`preCleanupEffect` 在执行前调用，用于准备依赖清理。然后执行用户函数 `this.fn()`，在执行过程中，访问响应式数据会触发 Proxy 的 get 拦截，进而调用 track 函数，track 函数会从全局的 `activeEffect` 获取当前 effect，建立依赖关系。

finally 块确保无论函数执行成功还是抛出异常，都会正确恢复状态。`postCleanupEffect` 完成依赖清理的后处理，`_runnings` 计数器减少，然后恢复之前保存的全局状态。

## 依赖清理的细节

依赖清理是响应式系统中一个容易被忽视但非常重要的机制。考虑这样一个场景：一个 effect 根据条件访问不同的数据。

```typescript
const state = reactive({ show: true, a: 1, b: 2 })

effect(() => {
  if (state.show) {
    console.log(state.a)
  } else {
    console.log(state.b)
  }
})
```

当 `show` 为 true 时，effect 依赖 `show` 和 `a`；当 `show` 变为 false 后重新执行，effect 应该依赖 `show` 和 `b`，不再依赖 `a`。如果不清理旧的依赖，修改 `a` 仍然会触发 effect，这是不正确的行为。

Vue 的解决方案是在每次执行前清理旧依赖，执行后建立新依赖。`preCleanupEffect` 和 `postCleanupEffect` 配合 `_trackId` 和 `_depsLength` 实现了高效的清理机制。

```typescript
function preCleanupEffect(effect: ReactiveEffect) {
  effect._trackId++
  effect._depsLength = 0
}

function postCleanupEffect(effect: ReactiveEffect) {
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanupDepEffect(effect.deps[i], effect)
    }
    effect.deps.length = effect._depsLength
  }
}
```

这个机制很巧妙。每次执行前，`_trackId` 递增，`_depsLength` 归零。在执行过程中，track 函数会检查每个 dep 是否已经用新的 `_trackId` 追踪过——如果是，说明这次执行也访问了这个数据，保留依赖；如果不是，这是新的依赖，添加到数组中。

执行结束后，`deps` 数组前 `_depsLength` 个元素是这次执行真正需要的依赖，后面的元素是旧的不再需要的依赖。`postCleanupEffect` 遍历这些过期的依赖，从对应的 dep 中移除当前 effect，然后截断数组。

这种基于版本号（`_trackId`）的清理方式比每次完全重建依赖数组更高效，特别是当大部分依赖保持不变时。

## stop 方法

`stop` 方法用于停止一个 effect，使其不再响应数据变化。

```typescript
stop(): void {
  if (this.active) {
    preCleanupEffect(this)
    postCleanupEffect(this)
    this.onStop?.()
    this.active = false
  }
}
```

停止的过程首先检查是否已经停止（避免重复操作），然后执行依赖清理——这会从所有相关的 dep 中移除这个 effect，确保数据变化不会再触发它。接着调用 `onStop` 回调（如果有的话），最后将 `active` 标志设为 false。

停止后的 effect 有两个特点：一是不会响应数据变化，因为它已经从所有 dep 中移除；二是仍然可以通过 runner 手动执行，但不会建立新的依赖关系（参考 run 方法中对 `active` 的检查）。

## 内部属性的作用

ReactiveEffect 有多个以下划线开头的内部属性，它们各司其职：

`_dirtyLevel` 用于脏检查，取值范围在 DirtyLevels 枚举中定义。它决定了 effect 是否需要重新执行，是优化计算属性的关键。

`_trackId` 是追踪版本号，每次执行递增。它用于高效地区分新依赖和旧依赖，避免完全重建依赖数组的开销。

`_runnings` 是执行计数器，记录当前 effect 正在执行的层数。这用于检测和处理递归调用——一个 effect 在执行过程中可能触发自己（直接或间接）。

`_shouldSchedule` 用于控制是否应该调度执行。在某些情况下，即使 effect 被标记为脏，也不应该立即调度，这个标志帮助做出正确的决策。

`_depsLength` 记录本次执行收集到的依赖数量，配合依赖清理机制使用。

## 与其他组件的协作

ReactiveEffect 不是孤立工作的，它与响应式系统的其他部分紧密协作。

与 Proxy handler 的协作：Proxy 的 get 拦截器调用 track 函数，track 函数读取全局的 `activeEffect` 来获取当前正在执行的 effect，然后将 effect 添加到对应属性的依赖集合中。Proxy 的 set 拦截器调用 trigger 函数，trigger 函数遍历依赖集合，标记相关 effect 为脏并调用它们的 scheduler。

与 EffectScope 的协作：构造函数中调用 `recordEffectScope` 将 effect 注册到 scope。当 scope 停止时，会调用所有注册 effect 的 `stop` 方法。这种机制让批量管理 effect 成为可能。

与 computed 的协作：computed 内部创建的 ReactiveEffect 有特殊配置。它的 `computed` 属性指向 ComputedRefImpl 实例，脏检查时会特殊处理这类 effect，实现计算属性的缓存和懒计算。

## 本章小结

ReactiveEffect 类是 Vue3 响应式系统的核心，它实现了副作用追踪和自动更新的完整机制。通过 `run` 方法执行用户函数并收集依赖，通过脏检查机制优化不必要的重复计算，通过 `stop` 方法支持手动停止。

这个类的设计体现了多个工程考量：使用版本号（`_trackId`）实现高效的依赖清理；使用多级脏检查（`_dirtyLevel`）支持懒计算优化；通过全局变量（`activeEffect`）在 Proxy handler 和 effect 之间建立通信。

理解 ReactiveEffect 的工作原理，就能理解 computed、watch、组件更新等上层功能是如何实现的——它们本质上都是配置了不同选项的 ReactiveEffect。
