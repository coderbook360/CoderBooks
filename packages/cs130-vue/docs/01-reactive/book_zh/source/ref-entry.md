# ref 函数入口：从基本类型到响应式

到目前为止，我们深入分析了 reactive 和 effect 的实现。现在让我们转向 ref——Vue 响应式系统的另一个核心 API。ref 用于创建包装基本类型值的响应式引用，是 Composition API 中使用最频繁的函数之一。

## 为什么需要 ref

reactive 使用 Proxy 实现响应式，但 Proxy 只能代理对象，无法代理基本类型（number、string、boolean 等）。如果你想让一个数字变得响应式，直接用 reactive 是不行的。

ref 的解决方案是"包装"。它创建一个对象，将基本类型值存储在对象的 value 属性中。访问和修改都通过 .value 进行，这样就可以追踪变化了。

```typescript
const count = ref(0)
console.log(count.value)  // 0
count.value++             // 触发更新
```

ref 也可以包装对象。当传入对象时，ref 内部会使用 reactive 处理这个对象，所以 ref 可以看作是一个统一的响应式入口。

## ref 函数的实现

让我们看看 ref 函数的源码：

```typescript
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return createRef(value, false)
}
```

函数签名有重载，支持传入初始值或不传（创建一个 undefined 的 ref）。实际实现直接调用 `createRef`，第二个参数 false 表示不是浅层 ref。

## createRef 函数

createRef 是创建 ref 的核心函数：

```typescript
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
```

逻辑很简单。首先检查传入的值是否已经是 ref，如果是就直接返回，避免重复包装。否则创建一个 RefImpl 实例。

这种防重复包装的设计很重要。在组合式函数中，参数可能是普通值也可能是 ref，createRef 确保输出始终是一个（且仅一个）ref。

## RefImpl 类

RefImpl 是 ref 的核心实现类：

```typescript
class RefImpl<T> {
  private _value: T
  private _rawValue: T
  
  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue = this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, DirtyLevels.Dirty)
    }
  }
}
```

类有几个关键属性。`_value` 存储实际使用的值，对于对象会是 reactive 包装后的版本。`_rawValue` 存储原始值，用于比较是否变化。`dep` 是依赖集合，存储所有依赖这个 ref 的 effect。`__v_isRef` 是类型标记，用于 isRef 检测。

构造函数根据是否浅层 ref 做不同处理。普通 ref 会调用 `toRaw` 获取原始值，调用 `toReactive` 对对象值进行响应式处理。浅层 ref 则直接使用传入的值。

## toReactive 函数

toReactive 是一个条件转换函数：

```typescript
export const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value
```

如果值是对象，用 reactive 包装；如果是基本类型，直接返回。这确保了 ref 内部对象的响应式处理。

```typescript
const user = ref({ name: 'Alice' })
// user._value 是 reactive({ name: 'Alice' })
// user.value.name 的访问会被追踪
```

## getter 的追踪逻辑

value getter 调用 trackRefValue 进行依赖追踪：

```typescript
get value() {
  trackRefValue(this)
  return this._value
}
```

trackRefValue 的实现：

```typescript
export function trackRefValue(ref: RefBase<any>) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    trackEffect(
      activeEffect,
      ref.dep ||
        (ref.dep = createDep(
          () => (ref.dep = undefined),
          ref instanceof ComputedRefImpl ? ref : undefined,
        )),
      __DEV__
        ? {
            target: ref,
            type: TrackOpTypes.GET,
            key: 'value',
          }
        : void 0,
    )
  }
}
```

与 reactive 的 track 不同，ref 的依赖直接存在实例的 dep 属性上，而不是全局的 targetMap。这是因为 ref 只有一个 value 属性需要追踪，不需要键值映射的复杂结构。

如果 dep 不存在，会创建一个新的。createDep 的清理函数会将 dep 设为 undefined，当 dep 变空时自动清理。

## setter 的触发逻辑

value setter 在值变化时触发更新：

```typescript
set value(newVal) {
  const useDirectValue = 
    this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
  newVal = useDirectValue ? newVal : toRaw(newVal)
  if (hasChanged(newVal, this._rawValue)) {
    this._rawValue = newVal
    this._value = useDirectValue ? newVal : toReactive(newVal)
    triggerRefValue(this, DirtyLevels.Dirty)
  }
}
```

首先决定是否直接使用新值。浅层 ref 或新值本身是 shallow/readonly 的，直接使用。否则获取原始值进行比较。

使用 hasChanged 比较新旧值。hasChanged 使用 Object.is 判断，能正确处理 NaN 和 +0/-0。只有值真的变化了才更新和触发。

更新 `_rawValue` 和 `_value`，然后调用 triggerRefValue 触发依赖的 effect。

## triggerRefValue 函数

```typescript
export function triggerRefValue(
  ref: RefBase<any>,
  dirtyLevel: DirtyLevels = DirtyLevels.Dirty,
  newVal?: unknown,
) {
  ref = toRaw(ref)
  const dep = ref.dep
  if (dep) {
    triggerEffects(
      dep,
      dirtyLevel,
      __DEV__
        ? {
            target: ref,
            type: TriggerOpTypes.SET,
            key: 'value',
            newValue: newVal,
          }
        : void 0,
    )
  }
}
```

这个函数很直接：如果 ref 有依赖集合，调用 triggerEffects 触发所有依赖的 effect。这与 reactive 的 trigger 殊途同归，最终都到达 triggerEffects。

## Ref 类型

ref 的类型定义：

```typescript
export interface Ref<T = any> {
  value: T
  [RefSymbol]: true
}
```

Ref 是一个有 value 属性和特殊标记符号的接口。UnwrapRef 类型用于递归解包嵌套的 ref：

```typescript
export type UnwrapRef<T> = T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>
```

这确保了 `ref(ref(1))` 不会创建嵌套的 ref，类型系统也能正确推断。

## 与 reactive 的对比

ref 和 reactive 各有适用场景：

ref 适合基本类型值。它也适合需要替换整个对象的场景，因为可以直接赋值 `myRef.value = newObject`。

reactive 适合对象，访问属性时不需要 .value。但不能直接替换整个对象，只能修改属性。

```typescript
// ref 可以替换整个对象
const state = ref({ count: 0 })
state.value = { count: 1 }  // 正确

// reactive 不能替换
const state2 = reactive({ count: 0 })
state2 = { count: 1 }  // 错误：state2 是 const
```

在模板中，ref 会自动解包，不需要写 .value。在 Composition API 中，很多开发者偏好用 ref 处理所有响应式数据，保持一致的 .value 访问模式。

## 本章小结

ref 函数是处理基本类型响应式的核心 API。它通过 RefImpl 类将值包装在对象中，通过 getter 和 setter 实现依赖追踪和更新触发。

与 reactive 相比，ref 的实现更简单——只有一个属性需要追踪，不需要 Proxy。但它与 reactive 可以协同工作：ref 内部的对象值会被 reactive 处理。

理解 ref 的实现，特别是它与 effect 系统的交互（通过 trackRefValue 和 triggerRefValue），有助于在实际开发中正确选择和使用这两个 API。
