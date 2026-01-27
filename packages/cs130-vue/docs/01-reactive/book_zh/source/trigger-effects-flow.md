# triggerEffects 流程：从触发到执行

上一章我们看到 trigger 函数如何收集需要通知的依赖集合，最后调用 triggerEffects 进行实际触发。本章深入分析 triggerEffects 的完整流程，理解 effect 从被标记为脏到实际执行的整个过程。

## 流程概览

当响应式数据变化时，更新流程大致如下：Proxy 拦截器检测到变化，调用 trigger 函数。trigger 根据操作类型收集相关的 dep（依赖集合），对每个 dep 调用 triggerEffects。triggerEffects 遍历 dep 中的 effect，更新它们的脏级别并触发调度。最终，effect 的 run 方法被调用，执行用户函数。

这个流程中有几个关键节点值得深入理解：脏级别的状态转换、调度器的介入、以及执行时机的控制。

## 脏级别状态机

Vue 3.4 引入的脏级别机制是一个状态机，有以下几个状态：

```typescript
export enum DirtyLevels {
  NotDirty = 0,
  QueryingDirty = 1,
  MaybeDirty_ComputedSideEffect = 2,
  MaybeDirty = 3,
  Dirty = 4,
}
```

`NotDirty` 表示 effect 是干净的，不需要更新。`Dirty` 表示 effect 确定需要更新，因为依赖的数据发生了变化。中间的状态用于处理计算属性的特殊情况。

`MaybeDirty` 表示 effect 可能需要更新。这发生在 effect 依赖了计算属性，而计算属性的依赖发生了变化。此时不确定计算属性的值是否真的变了，需要重新计算才能知道。

`QueryingDirty` 是一个临时状态，在查询脏级别的过程中使用，用于检测循环依赖。

这个状态机的转换规则是：当依赖变化时，从 NotDirty 向更脏的方向转换。当 effect 执行后，回到 NotDirty。查询脏级别时可能从 MaybeDirty 转换到 Dirty 或 NotDirty。

## triggerEffects 的详细逻辑

让我们再看一次 triggerEffects 的完整实现，这次关注细节：

```typescript
export function triggerEffects(
  dep: Dep,
  dirtyLevel: DirtyLevels,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo,
): void {
  pauseScheduling()
  for (const effect of dep.keys()) {
    // 条件 1: 新的脏级别比当前高
    // 条件 2: 依赖关系是当前有效的
    if (
      effect._dirtyLevel < dirtyLevel &&
      dep.get(effect) === effect._trackId
    ) {
      const lastDirtyLevel = effect._dirtyLevel
      effect._dirtyLevel = dirtyLevel
      
      // 只有从 NotDirty 变化时才需要调度
      if (lastDirtyLevel === DirtyLevels.NotDirty) {
        effect._shouldSchedule = true
        if (__DEV__) {
          effect.onTrigger?.(extend({ effect }, debuggerEventExtraInfo))
        }
        effect.trigger()
      }
    }
  }
  resetScheduling()
}
```

第一个检查 `effect._dirtyLevel < dirtyLevel` 确保只向更脏的方向转换。如果 effect 已经是 Dirty，传入 MaybeDirty 不会有任何效果。这避免了降级覆盖——一旦确定脏了，不会因为后续的"可能脏"信号而改变。

第二个检查 `dep.get(effect) === effect._trackId` 验证依赖的有效性。每次 effect 执行时 trackId 会增加，如果 dep 中记录的 trackId 与当前不匹配，说明这是上次执行遗留的旧依赖，已经不应该触发了。

## 调度的控制

`effect.trigger()` 调用的是构造 ReactiveEffect 时传入的触发函数。对于通过 effect() 函数创建的 effect，这个函数是：

```typescript
() => {
  if (_effect.dirty) {
    _effect.run()
  }
}
```

这里又有一层检查：只有当 dirty 为 true 时才执行。这看起来冗余，因为刚才已经设置了脏级别。但 dirty getter 不只是检查级别，它还会处理 MaybeDirty 的情况：

```typescript
public get dirty(): boolean {
  if (
    this._dirtyLevel === DirtyLevels.MaybeDirty_ComputedSideEffect ||
    this._dirtyLevel === DirtyLevels.MaybeDirty
  ) {
    // 检查依赖的计算属性是否真的变了
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
```

当 effect 处于 MaybeDirty 状态时，dirty getter 会触发所有依赖的计算属性重新计算。如果计算属性的值没有变化，effect 会从 MaybeDirty 回到 NotDirty，避免不必要的执行。

## scheduler 的介入

许多 effect 配置了 scheduler，这时 trigger 流程会调用 scheduler 而不是直接执行：

```typescript
// 创建 effect 时
const _effect = new ReactiveEffect(fn, NOOP, () => {
  if (_effect.dirty) {
    _effect.run()
  }
})
```

第三个参数是默认的调度逻辑。但 effect 可以配置自定义 scheduler：

```typescript
effect(() => {
  console.log(state.count)
}, {
  scheduler: (job) => {
    // 自定义调度逻辑
    requestAnimationFrame(() => job())
  }
})
```

有了 scheduler，effect 的触发和执行就解耦了。trigger 只负责通知 effect 需要更新，具体何时执行由 scheduler 决定。这个机制被广泛用于：

组件更新使用 scheduler 实现异步批量更新。多个状态变化只触发一次组件渲染。

watchEffect 使用 scheduler 控制 flush 时机。`flush: 'post'` 会将回调推迟到 DOM 更新后执行。

computed 使用 scheduler 标记脏状态，延迟到真正访问时才重新计算。

## 批量处理机制

trigger 和 triggerEffects 都使用了 pauseScheduling/resetScheduling：

```typescript
pauseScheduling()
for (const dep of deps) {
  if (dep) {
    triggerEffects(dep, DirtyLevels.Dirty, debuggerEventExtraInfo)
  }
}
resetScheduling()
```

当 pauseScheduleStack 大于 0 时，scheduler 调用被收集到队列中而不是立即执行。只有当 resetScheduling 使计数器归零时，队列中的 scheduler 才会依次执行。

这实现了批量处理。假设一次操作触发了多个 dep，每个 dep 中的 effect 都会被标记为脏并收集到调度队列。最后统一执行，避免中间状态导致的多次无效更新。

```typescript
export function resetScheduling(): void {
  pauseScheduleStack--
  while (!pauseScheduleStack && queueEffectSchedulers.length) {
    queueEffectSchedulers.shift()!()
  }
}
```

这里用 while 循环是因为执行一个 scheduler 可能导致新的 scheduler 入队。循环确保所有 scheduler 都被处理，直到队列清空。

## 执行时序

理解 effect 的执行时序对于调试很重要。一个典型的流程：

1. 用户代码修改响应式数据：`state.count++`
2. Proxy 的 set 拦截器被调用
3. 拦截器调用 trigger(target, 'set', 'count', newValue, oldValue)
4. trigger 收集 count 属性的依赖，调用 triggerEffects
5. triggerEffects 遍历依赖的 effect，更新脏级别，调用 effect.trigger()
6. 如果有 scheduler，scheduler 被调用（可能是同步或异步）
7. 最终 effect.run() 被调用，执行用户函数
8. 执行过程中重新收集依赖

如果没有 scheduler，步骤 6-7 是同步的。如果有异步 scheduler（如组件更新），步骤 7 会延迟到微任务队列或下一帧。

## 递归触发的处理

effect 执行过程中可能修改自己依赖的数据，导致递归触发。默认情况下，递归触发被阻止：

```typescript
// 在 triggerEffects 或相关逻辑中
if (effect !== activeEffect || effect.allowRecurse) {
  effect.scheduler ? effect.scheduler() : effect.run()
}
```

当前正在执行的 effect（activeEffect）不会被再次触发，除非它设置了 `allowRecurse: true`。这避免了无限循环。

但要注意，这只阻止立即的递归触发。如果使用了异步 scheduler，effect 执行完后（activeEffect 恢复），之前积累的触发请求可能生效，形成多轮更新。

## computed 的特殊处理

计算属性的 effect 有特殊的触发逻辑。当计算属性依赖的数据变化时：

```typescript
export function triggerComputed(computed: ComputedRefImpl<any>): void {
  return computed.effect.dirty
    ? computed.effect.run()
    : computed.value
}
```

这个函数检查计算属性的 effect 是否脏。如果脏，执行计算获取新值；如果不脏，直接返回缓存的值。

这被 dirty getter 调用，用于判断依赖计算属性的 effect 是否真的需要更新。只有当计算属性的值实际变化时，依赖它的 effect 才会被标记为 Dirty。

## 本章小结

triggerEffects 流程是响应式更新的执行阶段。它通过脏级别状态机精确控制更新，通过 scheduler 机制支持灵活的调度策略，通过批量处理避免冗余更新。

关键的设计点包括：脏级别只向上转换保证不会遗漏更新；trackId 验证确保只触发有效依赖；pauseScheduling 实现批量处理；scheduler 解耦触发与执行。

这套机制确保了响应式系统既正确又高效。正确性体现在依赖变化必定触发更新，高效性体现在不必要的更新被尽可能避免。
