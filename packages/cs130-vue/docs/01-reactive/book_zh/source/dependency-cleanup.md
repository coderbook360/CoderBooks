# 依赖清理机制：保持依赖图的准确性

依赖清理是响应式系统中容易被忽视但至关重要的机制。没有正确的清理，依赖图会随着时间推移变得臃肿，包含大量过时的关系，导致不必要的更新和内存泄漏。Vue 的依赖清理机制确保了依赖关系始终反映代码的实际执行路径。

## 为什么需要依赖清理

考虑一个常见的条件渲染场景：

```typescript
const state = reactive({ show: true, a: 1, b: 2 })

effect(() => {
  if (state.show) {
    console.log('a:', state.a)
  } else {
    console.log('b:', state.b)
  }
})
```

第一次执行时，`show` 为 true，effect 访问了 `show` 和 `a`，建立了与这两个属性的依赖关系。现在假设 `show` 变为 false，effect 重新执行，这次访问了 `show` 和 `b`。

如果没有依赖清理，effect 现在依赖 `show`、`a` 和 `b` 三个属性。当 `a` 变化时，effect 会被触发，尽管当前条件下根本不会读取 `a`。这不仅是性能浪费，在某些情况下还可能导致逻辑错误。

正确的行为是：每次执行后，依赖关系应该精确反映本次执行访问的属性。`show` 为 false 时，依赖应该只有 `show` 和 `b`。

## 清理的时机

Vue 的依赖清理发生在 effect 执行的前后。在 run 方法中：

```typescript
run(): T {
  // ...
  try {
    shouldTrack = true
    activeEffect = this
    this._runnings++
    preCleanupEffect(this)  // 执行前的准备
    return this.fn()
  } finally {
    postCleanupEffect(this)  // 执行后的清理
    this._runnings--
    // ...
  }
}
```

`preCleanupEffect` 在用户函数执行前调用，做准备工作。`postCleanupEffect` 在执行后调用，完成实际的清理。这种前后配合的设计允许在执行过程中动态判断哪些依赖需要保留。

## preCleanupEffect 的实现

```typescript
function preCleanupEffect(effect: ReactiveEffect) {
  effect._trackId++
  effect._depsLength = 0
}
```

这个函数做了两件事。首先将 `_trackId` 递增，这个版本号用于区分"这次执行收集的依赖"和"之前执行遗留的依赖"。其次将 `_depsLength` 重置为 0，表示本次执行还没有收集任何依赖。

`_trackId` 的递增很关键。在 track 过程中，每个 dep 会记录收集它的 effect 及其 trackId。通过比较 trackId，可以判断这个依赖关系是新的还是旧的。

## 执行过程中的依赖记录

在用户函数执行过程中，每次访问响应式数据都会调用 track，最终到达 trackEffect：

```typescript
export function trackEffect(
  effect: ReactiveEffect,
  dep: Dep,
): void {
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackId)
    const oldDep = effect.deps[effect._depsLength]
    if (oldDep !== dep) {
      if (oldDep) {
        cleanupDepEffect(oldDep, effect)
      }
      effect.deps[effect._depsLength++] = dep
    } else {
      effect._depsLength++
    }
  }
}
```

这段代码的逻辑需要仔细理解。首先检查 `dep.get(effect) !== effect._trackId`，如果相等，说明这个依赖在本次执行中已经收集过（同一属性被多次访问），直接跳过。

如果不相等，说明这是一个新的依赖关系或上次遗留的旧关系。更新 dep 中的记录为当前 trackId。

然后检查 `effect.deps` 数组的对应位置。`_depsLength` 是本次执行已收集的依赖数量，`deps[_depsLength]` 是即将填入的位置。如果这个位置之前有其他 dep，需要清理旧的依赖关系。如果位置上是同一个 dep（说明依赖顺序没变），只需增加长度计数。

## postCleanupEffect 的实现

```typescript
function postCleanupEffect(effect: ReactiveEffect) {
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanupDepEffect(effect.deps[i], effect)
    }
    effect.deps.length = effect._depsLength
  }
}
```

执行结束后，`deps` 数组的前 `_depsLength` 个元素是本次执行真正需要的依赖。数组剩余的元素是上次执行遗留的、本次没有访问的依赖。

函数遍历这些过期的依赖，调用 `cleanupDepEffect` 从对应的 dep 中移除当前 effect。最后截断数组，丢弃过期元素。

## cleanupDepEffect 的实现

```typescript
function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
  const trackId = dep.get(effect)
  if (trackId !== undefined && effect._trackId !== trackId) {
    dep.delete(effect)
    if (dep.size === 0) {
      dep.cleanup()
    }
  }
}
```

这个函数从 dep 中移除 effect。首先检查 trackId 是否匹配当前——如果匹配，说明这是本次执行刚收集的依赖，不应该清理。只有当 trackId 不匹配时才执行删除。

删除后检查 dep 是否为空。如果为空，调用 dep 的 cleanup 函数，将 dep 从上级的 depsMap 中移除。这保持了整个数据结构的整洁，避免了空 dep 的堆积。

## 依赖复用的优化

这套机制有一个精妙的优化：如果依赖的顺序和内容没有变化，几乎不需要额外操作。

假设一个 effect 依赖 a、b、c 三个属性，每次执行都按相同顺序访问。执行时：

1. 访问 a，`deps[0]` 正好是 a 的 dep，trackId 更新，`_depsLength` 变为 1
2. 访问 b，`deps[1]` 正好是 b 的 dep，trackId 更新，`_depsLength` 变为 2  
3. 访问 c，`deps[2]` 正好是 c 的 dep，trackId 更新，`_depsLength` 变为 3
4. 执行结束，`deps.length === _depsLength`，无需清理

这种情况下，依赖收集几乎只是更新版本号，没有数组操作和对象创建。这是最常见的场景，得到了高度优化。

## 依赖变化时的处理

当依赖发生变化时，机制会正确处理。假设上述 effect 因为条件变化，本次只访问 a 和 c：

1. 访问 a，`deps[0]` 是 a 的 dep，匹配，`_depsLength` 变为 1
2. 访问 c，`deps[1]` 是 b 的 dep，不匹配，清理 b 的依赖，放入 c 的 dep，`_depsLength` 变为 2
3. 执行结束，`deps.length` 是 3，`_depsLength` 是 2
4. postCleanupEffect 清理 `deps[2]`（原来的 c，现在是旧的），截断数组

这个过程确保了：b 从依赖中移除，c 的位置从 2 变为 1，依赖数组准确反映本次执行。

## 与 stop 的配合

当 effect 被停止时，也需要清理依赖：

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

stop 调用 preCleanupEffect 和 postCleanupEffect，但中间没有执行用户函数。这意味着 `_trackId` 增加但 `_depsLength` 保持为 0，postCleanupEffect 会清理所有依赖。

这正是期望的行为：停止的 effect 不应该再响应任何数据变化，所以需要从所有 dep 中移除自己。

## 内存管理

依赖清理对内存管理很重要。没有清理，过时的依赖关系会导致：

1. dep 持有 effect 的引用，effect 无法被回收
2. effect 持有 dep 的引用，dep 无法被回收
3. dep 膨胀，包含大量已停止或不再相关的 effect

清理机制确保了引用关系的及时解除。当 effect 停止或依赖变化时，双向的引用都会被移除。dep 变空时会从 depsMap 中删除，depsMap 变空时会从 targetMap 中删除（通过 WeakMap 的特性）。

## 边界情况

清理机制正确处理了多种边界情况。

同一属性多次访问：trackEffect 中的 trackId 检查确保只记录一次。

空的用户函数：preCleanupEffect 后直接 postCleanupEffect，清理所有旧依赖。

执行过程中抛出异常：finally 块确保 postCleanupEffect 被调用，即使出错也能正确清理。

嵌套 effect：每个 effect 有独立的 `_trackId` 和 `_depsLength`，互不干扰。

## 本章小结

依赖清理机制确保了响应式系统依赖图的准确性。通过 preCleanupEffect 准备、执行过程中的增量记录、postCleanupEffect 清理过期依赖，系统能够精确维护每个 effect 的依赖关系。

这套机制的设计目标是正确性和效率并重。正确性体现在依赖关系始终准确反映代码执行路径。效率体现在常见情况下几乎零开销，只有当依赖真正变化时才执行清理操作。

理解依赖清理机制，有助于理解为什么 Vue 的响应式系统既准确又高效。它是响应式"魔法"背后的重要组成部分。
