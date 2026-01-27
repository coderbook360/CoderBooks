# computed 的脏检查机制

Vue 3.4 对 computed 的实现进行了重大优化，引入了多级脏检查机制。这个机制的核心思想是：依赖变化时，computed 不一定真的需要重新计算。通过精确的脏状态管理，Vue 避免了大量不必要的计算。

## 脏检查问题的背景

考虑这个场景：

```typescript
const source = ref(1)
const isPositive = computed(() => source.value > 0)
const message = computed(() => isPositive.value ? 'positive' : 'negative')
```

当 source 从 1 变为 2 时会发生什么？

1. source 变化，isPositive 的 effect 被通知
2. isPositive 需要重新计算：1 > 0 和 2 > 0 结果都是 true
3. message 依赖 isPositive，需要检查是否更新

在旧的实现中，即使 isPositive 的值没变（仍然是 true），message 也会被标记为需要更新。这导致不必要的计算。

新的多级脏检查机制解决了这个问题：只有当 isPositive 的值真的变化时，message 才需要重新计算。

## DirtyLevels 枚举

脏状态有多个级别：

```typescript
export enum DirtyLevels {
  NotDirty = 0,
  QueryingDirty = 1,
  MaybeDirty_ComputedSideEffect = 2,
  MaybeDirty = 3,
  Dirty = 4,
}
```

`NotDirty`：完全干净，缓存有效，不需要任何操作。

`Dirty`：确定脏了，直接依赖的普通响应式数据变化。需要重新计算。

`MaybeDirty`：可能脏，依赖的 computed 的依赖变化了。需要检查那个 computed 的值是否真的变了。

`MaybeDirty_ComputedSideEffect`：类似 MaybeDirty，但用于处理 computed 中有副作用的特殊情况。

`QueryingDirty`：临时状态，在检查脏状态的过程中使用，用于检测循环依赖。

## 脏状态的传播

当普通响应式数据变化时，使用 Dirty 级别：

```typescript
// 在 trigger 中
triggerEffects(dep, DirtyLevels.Dirty, ...)
```

当 computed 的依赖变化时，使用 MaybeDirty 级别：

```typescript
// 在 ComputedRefImpl 构造函数中
this.effect = new ReactiveEffect(
  () => getter(this._value),
  () => triggerRefValue(this, DirtyLevels.MaybeDirty_ComputedSideEffect),
  () => this.dep && triggerEffects(this.dep, DirtyLevels.MaybeDirty),
)
```

第二个参数（trigger 函数）处理 computed 自己被通知的情况，使用 MaybeDirty_ComputedSideEffect。

第三个参数（scheduler）处理通知依赖这个 computed 的 effect，使用 MaybeDirty。

这种分级确保了：
- 直接依赖变化：立即标记为 Dirty，需要重新计算
- 间接依赖变化：标记为 MaybeDirty，需要验证

## dirty getter 的验证逻辑

当访问 effect.dirty 时，如果是 MaybeDirty 状态，会触发验证：

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
```

验证过程：

1. 设置临时状态 QueryingDirty
2. 暂停追踪（避免在验证过程中建立新依赖）
3. 遍历所有依赖的 computed
4. 触发每个 computed 计算（triggerComputed）
5. 如果任何 computed 的值变了，会将当前 effect 标记为 Dirty
6. 如果遍历完仍是 QueryingDirty，说明没有真的变化，恢复为 NotDirty

## triggerComputed 函数

这个函数触发 computed 重新计算：

```typescript
function triggerComputed(computed: ComputedRefImpl<any>): void {
  return computed.effect.dirty
    ? computed.effect.run()
    : computed.value
}
```

如果 computed 是脏的，执行其 effect.run() 计算新值。否则只是读取当前值。

在 computed 的 getter 中：

```typescript
if (
  (!self._cacheable || self.effect.dirty) &&
  hasChanged(self._value, (self._value = self.effect.run()!))
) {
  triggerRefValue(self, DirtyLevels.Dirty)
}
```

如果计算后的值与之前不同，会触发 Dirty 级别的通知。这个通知会将依赖它的 effect 从 MaybeDirty 升级为 Dirty。

## 状态转换图

```
              dependency change (reactive)
NotDirty ────────────────────────────────────> Dirty
    │                                            │
    │                                            │
    │  computed dependency's dep changed         │ access .value, run()
    │                                            │
    ▼                                            ▼
MaybeDirty ──────────────────────────────────> Dirty
    │         (computed value actually changed)
    │
    │ query dirty, computed value unchanged
    ▼
NotDirty
```

## 实际例子

回到开头的例子：

```typescript
const source = ref(1)
const isPositive = computed(() => source.value > 0)
const message = computed(() => isPositive.value ? 'positive' : 'negative')
```

当 source 从 1 变为 2：

1. source 的 dep 触发 isPositive.effect，级别 Dirty
2. isPositive.effect 的 scheduler 触发 message.effect，级别 MaybeDirty
3. 某处访问 message.value
4. message.effect.dirty 被检查
5. 由于是 MaybeDirty，触发验证
6. 触发 isPositive 重新计算：(2 > 0) = true
7. isPositive 的值没变（还是 true），不触发 Dirty
8. message.effect 从 MaybeDirty 回到 NotDirty
9. message 不需要重新计算，返回缓存值

如果 source 从 1 变为 -1：

1-5 同上
6. 触发 isPositive 重新计算：(-1 > 0) = false
7. isPositive 的值变了（true → false），触发 Dirty
8. message.effect 升级为 Dirty
9. message 重新计算，返回 'negative'

## 循环依赖的检测

QueryingDirty 状态用于检测循环依赖：

```typescript
// 检查期间设置 QueryingDirty
this._dirtyLevel = DirtyLevels.QueryingDirty

// 如果在检查过程中又访问了自己
// dirty getter 会看到 QueryingDirty 状态
// 可以据此检测循环
```

虽然源码中没有显式的循环检测抛错，但 QueryingDirty 状态可以防止无限循环。

## 性能优势

多级脏检查带来显著的性能优势：

1. 避免不必要的计算。如果 computed 的值没变，依赖它的 effect 不会重新执行。

2. 懒验证。只有在真正需要值的时候才验证，不会预先计算。

3. 链式优化。多层 computed 嵌套时，变化会在最早的"没变"节点终止传播。

```typescript
const a = ref(1)
const b = computed(() => a.value * 2)
const c = computed(() => b.value > 0)
const d = computed(() => c.value ? 'yes' : 'no')
const e = computed(() => d.value.toUpperCase())

// a 从 1 变为 2
// b 变化：2 -> 4
// c 不变：true -> true
// d 和 e 不需要重新计算
```

## 本章小结

computed 的脏检查机制是 Vue 3.4 的重要优化。通过多级脏状态（NotDirty、MaybeDirty、Dirty），系统能够精确判断 computed 是否真的需要重新计算。

关键的设计是：普通响应式数据变化触发 Dirty，computed 变化触发 MaybeDirty。MaybeDirty 状态需要验证才能确定是否真的脏。这避免了仅因为依赖链上某处变化就重新计算的问题。

理解这个机制有助于理解 Vue 的性能特性，也有助于在设计 computed 时做出更好的选择。
