# ComputedRefImpl 类：计算属性的核心实现

上一章我们看到 computed 函数如何创建 ComputedRefImpl 实例。本章深入分析这个类的实现，理解计算属性如何实现懒计算、缓存和依赖追踪。

## 类的完整结构

```typescript
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined
  
  private _value!: T
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY]: boolean

  public _cacheable: boolean

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean,
  ) {
    this.effect = new ReactiveEffect(
      () => getter(this._value),
      () => triggerRefValue(this, DirtyLevels.MaybeDirty_ComputedSideEffect),
      () => this.dep && triggerEffects(this.dep, DirtyLevels.MaybeDirty),
    )
    this.effect.computed = this
    this.effect.active = this._cacheable = !isSSR
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  get value() {
    const self = toRaw(this)
    if (
      (!self._cacheable || self.effect.dirty) &&
      hasChanged(self._value, (self._value = self.effect.run()!))
    ) {
      triggerRefValue(self, DirtyLevels.Dirty)
    }
    trackRefValue(self)
    if (self.effect._dirtyLevel >= DirtyLevels.MaybeDirty_ComputedSideEffect) {
      triggerRefValue(self, DirtyLevels.MaybeDirty_ComputedSideEffect)
    }
    return self._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}
```

这个类比 RefImpl 复杂得多，因为它需要处理懒计算、缓存验证和级联更新。

## 构造函数分析

构造函数创建内部的 ReactiveEffect：

```typescript
this.effect = new ReactiveEffect(
  () => getter(this._value),
  () => triggerRefValue(this, DirtyLevels.MaybeDirty_ComputedSideEffect),
  () => this.dep && triggerEffects(this.dep, DirtyLevels.MaybeDirty),
)
```

三个参数分别是：

1. fn：执行 getter 函数，传入当前值作为参数（用于某些高级场景）
2. trigger：当 effect 的依赖变化时调用，将 computed 标记为"可能脏"
3. scheduler：调度器，当需要更新时通知依赖这个 computed 的 effect

注意触发时使用的是 MaybeDirty 级别，而不是 Dirty。这是关键的优化——依赖变化时，computed 可能脏，但不确定值是否真的变化。

```typescript
this.effect.computed = this
this.effect.active = this._cacheable = !isSSR
```

将 effect 的 computed 属性指向自己，形成双向引用。这让 effect 系统可以识别这是一个 computed 的 effect。

`_cacheable` 和 `active` 在 SSR 模式下为 false，意味着每次都重新计算，不缓存。

## getter 的实现

getter 是 ComputedRefImpl 最复杂的部分：

```typescript
get value() {
  const self = toRaw(this)
  if (
    (!self._cacheable || self.effect.dirty) &&
    hasChanged(self._value, (self._value = self.effect.run()!))
  ) {
    triggerRefValue(self, DirtyLevels.Dirty)
  }
  trackRefValue(self)
  if (self.effect._dirtyLevel >= DirtyLevels.MaybeDirty_ComputedSideEffect) {
    triggerRefValue(self, DirtyLevels.MaybeDirty_ComputedSideEffect)
  }
  return self._value
}
```

让我们分解这段代码。

首先 `toRaw(this)` 确保操作原始对象，以防 computed 本身被 reactive 包装。

然后检查是否需要重新计算：

```typescript
if (!self._cacheable || self.effect.dirty)
```

两种情况会重新计算：不可缓存（SSR 模式）或 effect 是脏的。

如果需要计算，执行 getter 并比较新旧值：

```typescript
hasChanged(self._value, (self._value = self.effect.run()!))
```

这里有一个精妙的写法：赋值发生在比较的第二个参数中。`self.effect.run()` 执行 getter 得到新值，同时赋值给 `self._value`。然后比较新旧值。

如果值真的变化了，触发 Dirty 级别的更新：

```typescript
triggerRefValue(self, DirtyLevels.Dirty)
```

这会通知所有依赖这个 computed 的 effect。

接下来进行依赖追踪：

```typescript
trackRefValue(self)
```

这让当前正在执行的 effect（如果有）依赖这个 computed。

最后处理一个边界情况：

```typescript
if (self.effect._dirtyLevel >= DirtyLevels.MaybeDirty_ComputedSideEffect) {
  triggerRefValue(self, DirtyLevels.MaybeDirty_ComputedSideEffect)
}
```

如果 effect 仍然有副作用级别的脏状态，传播这个状态。这处理了某些复杂的嵌套 computed 场景。

## dirty 检查的含义

`self.effect.dirty` 是一个 getter，它的实现很重要：

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

当 effect 处于 MaybeDirty 状态时，dirty getter 会触发所有依赖的 computed 重新计算。只有当某个 computed 的值真的变化时，才会将当前 effect 标记为 Dirty。

这就是"懒验证"的实现：不直接假设脏，而是检查依赖的 computed 是否真的变化。

## setter 的实现

setter 很简单，只是调用用户提供的 setter：

```typescript
set value(newValue: T) {
  this._setter(newValue)
}
```

如果是只读 computed，_setter 是一个空函数或警告函数。

## 缓存机制

computed 的缓存机制由以下部分组成：

1. `_value` 存储计算结果
2. `_cacheable` 标志决定是否启用缓存
3. `effect._dirtyLevel` 记录是否需要重新计算

当依赖变化时：
- effect 被标记为 MaybeDirty
- 下次访问 .value 时，dirty getter 检查是否真的脏
- 如果真的脏，执行 getter 更新 _value
- 如果不脏，直接返回 _value

这种机制确保了：
- 不必要的计算被跳过
- 值的变化被正确检测
- 依赖链正确传播

## dep 属性

computed 像 ref 一样有 dep 属性：

```typescript
public dep?: Dep = undefined
```

这个 dep 存储依赖这个 computed 的 effect。与 ref 的 dep 用途相同，但 computed 的 dep 有一个额外的特性：

```typescript
// 在 createDep 时
dep.computed = this
```

dep 上记录了关联的 computed 引用。这让 dirty 检查时可以触发 computed 重新计算。

## 与 ReactiveEffect 的协作

ComputedRefImpl 和 ReactiveEffect 紧密协作：

1. computed 创建 effect，effect 追踪 getter 的依赖
2. 依赖变化时，effect 的 trigger 被调用，标记 computed 为 MaybeDirty
3. effect 的 scheduler 通知依赖 computed 的 effect
4. 访问 computed.value 时，检查 effect.dirty 决定是否重新计算
5. 重新计算时调用 effect.run() 执行 getter

这种双向关系让 computed 既是响应式的源（可以被其他 effect 依赖）也是响应式的消费者（依赖其他响应式数据）。

## SSR 模式的处理

在 SSR 模式下，`_cacheable` 为 false：

```typescript
this.effect.active = this._cacheable = !isSSR
```

这导致：
- 每次访问都重新计算（`!self._cacheable` 为 true）
- 不进行依赖追踪（effect.active 为 false）

这是因为 SSR 只需要一次性渲染，不需要响应式更新，禁用这些机制可以减少开销。

## 本章小结

ComputedRefImpl 是计算属性的核心实现。它通过内部的 ReactiveEffect 追踪 getter 的依赖，通过 dirty 检查实现懒计算和缓存验证。

关键的设计点包括：MaybeDirty 级别实现"可能脏"的状态，避免不必要的计算；双向引用让 computed 同时作为源和消费者；hasChanged 比较确保只有值真的变化才触发更新。

理解 ComputedRefImpl 的实现，有助于理解 computed 为什么高效，以及在什么情况下会重新计算。这对于性能优化和调试都很有帮助。
