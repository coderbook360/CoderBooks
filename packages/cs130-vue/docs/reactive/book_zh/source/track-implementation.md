# track 实现：依赖收集的细节

依赖收集是响应式系统的核心机制之一。当一个 effect 执行时，它访问的每一个响应式属性都需要被记录下来，这样当这些属性变化时，系统才知道要通知哪些 effect。track 函数就是完成这个记录工作的核心函数。

## track 函数的职责

track 函数被 Proxy 的 get、has、iterate 等拦截器调用。每当响应式数据被读取，拦截器就会调用 track，告诉系统"当前 effect 依赖了这个数据"。track 的工作是将当前的 activeEffect 与被访问的属性关联起来。

这个关联关系存储在一个两层的 Map 结构中：第一层以目标对象为键，第二层以属性名为键。最终的值是一个 Dep（依赖集合），包含所有依赖这个属性的 effect。

## 源码解析

让我们看看 track 函数的完整实现：

```typescript
export function track(target: object, type: TrackOpTypes, key: unknown): void {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep(() => depsMap!.delete(key))))
    }
    trackEffect(
      activeEffect,
      dep,
      __DEV__
        ? {
            target,
            type,
            key,
          }
        : void 0,
    )
  }
}
```

函数开头检查两个条件：`shouldTrack` 表示当前是否允许追踪，`activeEffect` 表示是否有正在执行的 effect。两个条件都满足才进行后续逻辑。这个检查非常高效，能快速过滤掉不需要处理的调用。

接下来是获取或创建依赖映射。`targetMap` 是一个全局的 WeakMap，以响应式对象为键。使用 WeakMap 是为了避免内存泄漏——当响应式对象不再被引用时，对应的依赖映射也会被垃圾回收。

对于每个目标对象，有一个 `depsMap`（普通 Map），以属性键为索引。如果目标对象是首次被追踪，会创建一个新的 Map。

对于每个属性，有一个 `dep`（依赖集合）。如果属性是首次被追踪，会通过 `createDep` 创建。注意 createDep 接收一个清理函数，当 dep 变空时会从 depsMap 中删除自己，保持数据结构的整洁。

## trackEffect 函数

实际的依赖关联在 `trackEffect` 函数中完成：

```typescript
export function trackEffect(
  effect: ReactiveEffect,
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo,
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
    if (__DEV__) {
      effect.onTrack?.(
        extend({ effect }, debuggerEventExtraInfo!),
      )
    }
  }
}
```

这个函数的逻辑需要仔细理解。`dep` 实际上是一个 Map 结构，它的键是 effect，值是这个 effect 的 `_trackId`。`_trackId` 在每次 effect 执行开始时递增，用于区分"这次执行收集的依赖"和"之前执行收集的依赖"。

函数首先检查 `dep.get(effect) !== effect._trackId`。如果相等，说明这个依赖在当前执行中已经收集过（同一次执行中多次访问同一属性），直接跳过。如果不相等，说明这是新的依赖关系或上次执行遗留的旧关系。

然后更新 dep 中的记录：`dep.set(effect, effect._trackId)`，将当前 effect 与其 trackId 关联。

接下来处理 effect 侧的依赖数组。`effect.deps` 数组存储了这个 effect 依赖的所有 dep。`effect._depsLength` 记录当前执行已收集的依赖数量。

检查 `oldDep !== dep` 是为了处理依赖位置变化的情况。如果位置上有旧的 dep 且不是当前 dep，需要清理旧的依赖关系。然后将当前 dep 放到数组对应位置。如果位置上已经是当前 dep（依赖顺序没变），只需增加长度计数器。

这种基于位置和版本号的机制非常高效，避免了每次都完全重建依赖数组。

## TrackOpTypes 操作类型

track 函数的第二个参数是操作类型：

```typescript
export enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate',
}
```

不同的读取操作对应不同的类型。`GET` 对应普通属性访问，`HAS` 对应 `in` 操作符检查，`ITERATE` 对应遍历操作（如 `for...in`、`Object.keys()` 等）。

这些类型主要用于调试。在开发模式下，`onTrack` 回调会收到包含类型的事件对象，帮助开发者理解依赖是如何建立的。在生产模式下，类型信息不会影响运行时行为。

## ITERATE_KEY 的特殊处理

对于遍历操作，使用一个特殊的键 `ITERATE_KEY`：

```typescript
export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
```

当代码遍历对象的键或数组的元素时，不是依赖某个具体的属性，而是依赖"对象结构"。当对象添加或删除属性时，需要重新触发遍历相关的 effect。`ITERATE_KEY` 就是代表这种结构依赖的特殊键。

在 Proxy 的 ownKeys 拦截器中：

```typescript
function ownKeys(target: object): (string | symbol)[] {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

对于数组，遍历依赖 `length` 属性（因为数组长度变化意味着结构变化）。对于普通对象，遍历依赖 `ITERATE_KEY` 这个符号键。

## 依赖去重

track 机制自动处理依赖去重。考虑这样的代码：

```typescript
effect(() => {
  console.log(state.a + state.a + state.a)
})
```

这里访问 `state.a` 三次，但只应该建立一个依赖关系。`trackEffect` 函数中的检查 `dep.get(effect) !== effect._trackId` 实现了这个去重。第一次访问时，dep 中没有当前 effect 或 trackId 不匹配，会添加依赖。后续访问时，dep 中已经有了正确的 trackId，直接跳过。

这种去重是基于单次执行的。如果同一个 effect 在不同的执行周期访问同一个属性，不算重复——因为每次执行 trackId 都会变化。

## 条件分支中的依赖

track 机制与依赖清理配合，正确处理条件分支：

```typescript
effect(() => {
  if (state.show) {
    console.log(state.a)
  } else {
    console.log(state.b)
  }
})
```

每次执行时，effect 会建立与本次访问的属性的依赖。第一次执行如果 `show` 为 true，依赖 `show` 和 `a`。当 `show` 变为 false 后重新执行，依赖 `show` 和 `b`。

关键在于 `effect._trackId` 和 `effect._depsLength` 的配合。执行开始时 `_depsLength` 归零，执行过程中收集新依赖，执行结束后清理超出 `_depsLength` 的旧依赖。这确保了只有本次真正访问的属性会保留依赖关系。

## 数据结构的演进

Vue 3 的依赖存储结构经历过演进。早期版本 dep 是简单的 Set，只存储 effect。现在 dep 是 Map，同时存储 effect 和它的 trackId。

这个变化带来了两个好处。一是更高效的去重检查：Map 的 get 操作可以同时判断是否存在和版本是否匹配。二是更准确的依赖状态：可以区分"这次执行收集的"和"上次执行遗留的"依赖。

```typescript
export type Dep = Map<ReactiveEffect, number> & {
  cleanup: () => void
  computed?: ComputedRefImpl<any>
}
```

dep 还扩展了 `cleanup` 函数和可选的 `computed` 引用。cleanup 在 dep 变空时调用，从父级 Map 中删除自己。computed 引用用于支持计算属性的特殊处理逻辑。

## 性能考量

track 是高频调用的函数，其实现经过精心优化。

开头的条件检查 `if (shouldTrack && activeEffect)` 非常高效，大多数情况下可以快速返回。当没有 effect 执行或追踪被暂停时，不会执行任何其他逻辑。

使用 WeakMap 作为顶层存储，不仅避免内存泄漏，其查找性能也非常好。内层的 Map 操作（get、set）都是 O(1) 时间复杂度。

基于 trackId 的去重避免了每次都遍历检查是否已存在依赖。单个数值比较比 Set 的 has 操作更快。

依赖数组的复用（不是每次创建新数组）减少了内存分配和 GC 压力。

## 本章小结

track 函数是依赖收集的核心入口，它将当前执行的 effect 与被访问的响应式属性关联起来。通过两层 Map 结构（targetMap → depsMap → dep）组织依赖关系，通过 trackId 实现高效的去重和清理。

这套机制的设计目标是正确性和性能并重。正确性方面，它准确处理重复访问、条件分支、嵌套执行等场景。性能方面，通过快速路径检查、O(1) 数据结构操作、基于版本号的去重等手段优化。

理解 track 的实现，对于理解整个响应式系统至关重要。它是 Proxy 拦截器和 effect 执行之间的桥梁，是"响应式魔法"背后的核心机制。
