# RefImpl 类深入解析

上一章我们概览了 ref 函数和 RefImpl 类的结构。本章将深入 RefImpl 的实现细节，理解它如何管理值、如何与响应式系统交互，以及一些设计上的精妙之处。

## 类的完整结构

让我们看一下 RefImpl 的完整定义：

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
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, DirtyLevels.Dirty)
    }
  }
}
```

类使用 TypeScript 的泛型，让 ref 可以包装任意类型的值。构造函数使用参数属性简写 `public readonly __v_isShallow`，既声明了属性又完成了赋值。

## _value 与 _rawValue 的区别

RefImpl 维护两个内部值，它们的作用不同：

`_rawValue` 存储原始的、未经响应式处理的值。对于对象，这是传入的原始对象或调用 toRaw 后的结果。它的主要用途是比较——判断新值是否与旧值不同。

`_value` 存储实际返回给用户的值。对于普通 ref，如果值是对象，`_value` 是 reactive 包装后的版本。对于 shallowRef，`_value` 就等于 `_rawValue`。

```typescript
const obj = { count: 0 }
const myRef = ref(obj)

// myRef._rawValue === obj（原始对象）
// myRef._value 是 reactive(obj)
// myRef.value === myRef._value

myRef.value.count++  // 这个修改是响应式的
```

为什么需要两个值？因为比较需要用原始值。如果用 reactive 后的值比较，每次比较的都是同一个 Proxy 对象，无法判断内部是否变化。用原始值比较，可以正确检测对象引用的变化。

## __v_isRef 标记

`__v_isRef` 是一个只读的布尔值，始终为 true。它用于快速判断一个对象是否是 ref：

```typescript
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}
```

这种基于属性标记的检测比 instanceof 更可靠。在某些场景下（如跨 iframe、多个 Vue 实例），instanceof 可能失效，但属性检测始终有效。

## dep 属性的懒初始化

dep 是依赖集合，但它初始化为 undefined：

```typescript
public dep?: Dep = undefined
```

只有当 ref 被 effect 访问时，dep 才会被创建：

```typescript
// 在 trackRefValue 中
ref.dep || (ref.dep = createDep(...))
```

这是一个性能优化。很多 ref 可能从未在 effect 中被访问（比如只用于本地状态），为它们创建 dep 是浪费。懒初始化确保只有真正需要追踪的 ref 才会有 dep。

## 构造函数的处理逻辑

构造函数根据 `__v_isShallow` 标志做不同处理：

```typescript
constructor(value: T, public readonly __v_isShallow: boolean) {
  this._rawValue = __v_isShallow ? value : toRaw(value)
  this._value = __v_isShallow ? value : toReactive(value)
}
```

对于普通 ref（`__v_isShallow` 为 false）：
- `_rawValue` 是 `toRaw(value)`，确保存储的是原始值，即使传入的是已 reactive 的对象
- `_value` 是 `toReactive(value)`，如果值是对象则进行响应式处理

对于 shallowRef（`__v_isShallow` 为 true）：
- 两者都直接使用传入的值，不进行任何转换

这种设计让 ref 和 shallowRef 可以共用同一个类，通过标志区分行为。

## getter 的实现细节

getter 看起来简单，但有几个细节值得注意：

```typescript
get value() {
  trackRefValue(this)
  return this._value
}
```

首先调用 trackRefValue 收集依赖，然后返回值。trackRefValue 内部会检查 shouldTrack 和 activeEffect，只有在 effect 执行上下文中才会真正收集依赖。

返回的是 `_value` 而不是 `_rawValue`。这意味着如果 ref 包装的是对象，用户拿到的是 reactive 版本，可以继续追踪内部属性的变化。

## setter 的实现细节

setter 的逻辑更复杂：

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

首先决定是否"直接使用"新值。三种情况会直接使用：当前是 shallowRef、新值本身是 shallow 的、新值是 readonly 的。否则需要调用 toRaw 获取原始值。

然后用 hasChanged 比较。hasChanged 使用 Object.is，正确处理 NaN（NaN === NaN 为 false，但 Object.is(NaN, NaN) 为 true）和 +0/-0。

只有值真的变化了，才更新内部状态并触发。这避免了赋值相同值时的无谓更新。

更新时，`_rawValue` 存储新的原始值，`_value` 可能需要 toReactive 处理（如果是普通 ref 且新值是对象）。

## hasChanged 函数

hasChanged 是一个简单但重要的工具函数：

```typescript
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)
```

使用 Object.is 而不是 === 的原因：

```typescript
NaN === NaN           // false
Object.is(NaN, NaN)   // true

+0 === -0             // true
Object.is(+0, -0)     // false
```

在响应式系统中，如果用户设置 `ref.value = NaN`，再设置一次相同的 NaN，不应该触发更新。Object.is 提供了更正确的相等性判断。

## 与 Proxy 的对比

RefImpl 不使用 Proxy，而是通过 getter/setter 实现响应式。这种方式的优缺点：

优点：
- 实现简单，只需要一个 getter 和一个 setter
- 性能可能略好，没有 Proxy 的间接层
- 可以处理基本类型

缺点：
- 必须通过 .value 访问，不如 Proxy 透明
- 只能追踪 value 属性，内部对象的追踪需要配合 reactive

Vue 的解决方案是组合使用：RefImpl 处理外层包装，内部对象用 reactive/Proxy 处理。

## 边界情况处理

RefImpl 正确处理了多种边界情况：

传入已是 ref 的值：在 createRef 中拦截，直接返回，不会重复包装。

传入 reactive 对象：toRaw 会获取原始对象，_rawValue 存储原始对象而不是 Proxy。

传入 readonly 对象：setter 中检测并直接使用，不会尝试再次包装。

传入 undefined/null：正常工作，_value 就是 undefined/null。

## 本章小结

RefImpl 是 ref 函数的核心实现。它维护 _value 和 _rawValue 两个内部值，前者用于返回给用户（可能经过 reactive 处理），后者用于变化检测。

通过 getter 和 setter，RefImpl 实现了依赖追踪（trackRefValue）和更新触发（triggerRefValue）。__v_isShallow 标志让它可以同时服务于 ref 和 shallowRef。

设计上的精妙之处包括：dep 的懒初始化节省内存、toRaw/toReactive 确保正确处理已响应式的值、hasChanged 使用 Object.is 进行精确比较。这些细节确保了 ref 在各种场景下都能正确工作。
