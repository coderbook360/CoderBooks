# trigger 实现：触发更新的机制

与 track 对应，trigger 是响应式系统的另一个核心函数。当响应式数据发生变化时，Proxy 的 set、deleteProperty 等拦截器调用 trigger，通知所有依赖这个数据的 effect 重新执行。trigger 的实现比 track 更复杂，因为它需要处理多种变更类型和触发策略。

## trigger 函数的结构

trigger 函数接收目标对象、操作类型、变更的键，以及可选的新值和旧值信息。它的主要工作是找出所有需要通知的 effect，然后按策略触发它们。

```typescript
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>,
): void {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 从未被追踪过，直接返回
    return
  }

  let deps: (Dep | undefined)[] = []
  
  // 根据操作类型收集需要触发的 dep
  if (type === TriggerOpTypes.CLEAR) {
    // 集合被清空，触发所有依赖
    deps = [...depsMap.values()]
  } else if (key === 'length' && isArray(target)) {
    // 数组 length 变化的特殊处理
    const newLength = Number(newValue)
    depsMap.forEach((dep, key) => {
      if (key === 'length' || (!isSymbol(key) && key >= newLength)) {
        deps.push(dep)
      }
    })
  } else {
    // 普通情况：收集指定 key 的依赖
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

    // 根据操作类型添加额外的依赖
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        } else if (isIntegerKey(key)) {
          deps.push(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
          if (isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
          }
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY))
        }
        break
    }
  }

  // 暂停调度，批量处理
  pauseScheduling()
  for (const dep of deps) {
    if (dep) {
      triggerEffects(dep, DirtyLevels.Dirty, debuggerEventExtraInfo)
    }
  }
  resetScheduling()
}
```

这段代码的结构清晰：先检查是否有依赖，然后根据操作类型收集需要触发的 dep，最后批量触发。让我们逐个部分深入分析。

## TriggerOpTypes 操作类型

trigger 支持的操作类型比 track 更多：

```typescript
export enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear',
}
```

`SET` 表示修改现有属性的值，这是最常见的操作。`ADD` 表示添加新属性，这会影响遍历操作。`DELETE` 表示删除属性，同样影响遍历。`CLEAR` 是 Map 和 Set 特有的清空操作，会触发所有相关依赖。

不同类型需要触发不同范围的依赖，这是 trigger 逻辑复杂性的主要来源。

## CLEAR 操作的处理

当集合被清空时，处理最简单也最彻底——触发所有依赖：

```typescript
if (type === TriggerOpTypes.CLEAR) {
  deps = [...depsMap.values()]
}
```

这是因为 clear 操作影响了集合的所有元素。无论 effect 依赖的是集合的哪个部分（某个元素、size 属性、遍历结果），都需要重新执行。

## 数组 length 的特殊处理

数组的 length 属性比较特殊，它的变化可能影响多个元素的依赖：

```typescript
if (key === 'length' && isArray(target)) {
  const newLength = Number(newValue)
  depsMap.forEach((dep, key) => {
    if (key === 'length' || (!isSymbol(key) && key >= newLength)) {
      deps.push(dep)
    }
  })
}
```

当通过设置 length 来缩短数组时（如 `array.length = 2`），被删除的元素索引对应的依赖也需要触发。代码遍历所有依赖，收集 length 本身的依赖，以及索引大于等于新长度的依赖。

这解释了为什么 `array.length = 0` 能正确触发所有元素相关的 effect：索引 0、1、2... 都大于等于新长度 0，它们的依赖都会被收集。

## ADD 操作的依赖收集

添加新属性时，除了这个属性本身的依赖，还需要触发遍历相关的依赖：

```typescript
case TriggerOpTypes.ADD:
  if (!isArray(target)) {
    deps.push(depsMap.get(ITERATE_KEY))
    if (isMap(target)) {
      deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  } else if (isIntegerKey(key)) {
    deps.push(depsMap.get('length'))
  }
  break
```

对于普通对象，添加属性会触发 `ITERATE_KEY` 的依赖——使用 `for...in` 或 `Object.keys()` 遍历对象的 effect 需要重新执行。对于 Map，还需要额外触发 `MAP_KEY_ITERATE_KEY`，这是 `map.keys()` 遍历使用的键。

对于数组，添加新元素（通过整数索引）会触发 length 的依赖。这是因为数组添加元素会导致 length 增加，依赖 length 的代码需要知道这个变化。

## DELETE 操作的依赖收集

删除属性与添加类似，也需要触发遍历相关依赖：

```typescript
case TriggerOpTypes.DELETE:
  if (!isArray(target)) {
    deps.push(depsMap.get(ITERATE_KEY))
    if (isMap(target)) {
      deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  }
  break
```

注意数组的删除（通过 delete 操作符）不会触发 length 依赖。这是因为 JavaScript 中 delete 数组元素不会改变 length，只是将那个位置变成 empty slot。

## SET 操作的特殊情况

普通的 SET 操作只触发被修改属性的依赖。但对于 Map，修改值也会触发遍历依赖：

```typescript
case TriggerOpTypes.SET:
  if (isMap(target)) {
    deps.push(depsMap.get(ITERATE_KEY))
  }
  break
```

这是因为 `map.entries()` 和 `map.values()` 遍历的结果会因为值的变化而变化。普通对象的 `for...in` 只遍历键，不受值变化影响，所以不需要这个处理。

## triggerEffects 函数

收集完所有需要触发的 dep 后，调用 triggerEffects 进行实际触发：

```typescript
export function triggerEffects(
  dep: Dep,
  dirtyLevel: DirtyLevels,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo,
): void {
  pauseScheduling()
  for (const effect of dep.keys()) {
    if (
      effect._dirtyLevel < dirtyLevel &&
      dep.get(effect) === effect._trackId
    ) {
      const lastDirtyLevel = effect._dirtyLevel
      effect._dirtyLevel = dirtyLevel
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

这个函数遍历 dep 中的所有 effect，对每个 effect 执行触发逻辑。首先检查 `dep.get(effect) === effect._trackId`，确保这个依赖关系是当前有效的（不是上次执行遗留的旧依赖）。

然后更新 effect 的脏级别。只有当 effect 之前是 NotDirty（完全干净）时，才需要真正调度执行。如果 effect 已经是脏的（之前已经被标记需要更新），只更新脏级别，不重复调度。

`effect.trigger()` 调用 effect 构造时传入的触发函数。对于普通 effect，这会调用 scheduler（如果有）或直接执行 run。

## pauseScheduling 的作用

注意 trigger 和 triggerEffects 都使用了 `pauseScheduling`/`resetScheduling`：

```typescript
pauseScheduling()
for (const dep of deps) {
  if (dep) {
    triggerEffects(dep, DirtyLevels.Dirty, debuggerEventExtraInfo)
  }
}
resetScheduling()
```

这确保在处理所有 dep 期间，调度被暂停。只有当 resetScheduling 调用且计数器归零时，积累的调度器才会执行。这实现了批量更新——一次数据变更可能触发多个 dep，它们的 effect 会被一起处理，避免中间状态的不必要更新。

## 脏级别的传递

trigger 使用脏级别来精确控制更新：

```typescript
triggerEffects(dep, DirtyLevels.Dirty, debuggerEventExtraInfo)
```

直接的数据变更传递 `DirtyLevels.Dirty`，表示确定需要更新。对于计算属性的变更，可能传递 `DirtyLevels.MaybeDirty`，表示依赖的计算值可能变化，需要检查。

这种分级机制是 Vue 3.4 优化的核心。通过区分"确定脏"和"可能脏"，避免了不必要的计算属性重算。

## 调试事件

开发模式下，triggerEffects 会触发 `onTrigger` 回调：

```typescript
if (__DEV__) {
  effect.onTrigger?.(extend({ effect }, debuggerEventExtraInfo))
}
```

这给开发者提供了观察更新触发的能力。事件对象包含 effect 信息、目标对象、操作类型、键名、新值、旧值等详细数据，对于调试响应式问题非常有帮助。

## 防止重复触发

trigger 机制内建了防止重复触发的逻辑。同一个 effect 可能通过多个依赖路径被触发（比如一次操作影响了多个属性），但只会被调度一次。

这通过脏级别检查实现。当 effect 第一次被触发时，从 NotDirty 变为 Dirty，并设置 `_shouldSchedule = true`。后续的触发检查到 `_dirtyLevel >= dirtyLevel`，就不会再次调度。

## 本章小结

trigger 函数是响应式系统触发更新的核心。它根据操作类型（SET、ADD、DELETE、CLEAR）收集需要触发的依赖，然后通过 triggerEffects 批量触发。

这个过程涉及多个精心设计的机制：操作类型决定需要触发的依赖范围，暂停调度确保批量处理，脏级别控制更新的精确程度，trackId 验证确保只触发有效依赖。

trigger 与 track 构成了响应式系统的核心循环：track 在读取时收集依赖，trigger 在写入时触发更新。理解这两个函数的实现，就理解了 Vue 响应式的核心工作原理。
