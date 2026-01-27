# shallowRef：浅层响应式引用

shallowRef 是 ref 的变体，它创建的引用只在 .value 层面是响应式的，不会对内部对象进行深层响应式转换。理解 shallowRef 的实现和使用场景，有助于在需要精细控制响应式粒度时做出正确选择。

## shallowRef 的基本用法

```typescript
import { shallowRef } from 'vue'

const state = shallowRef({ count: 0 })

// 这会触发更新：整体替换 value
state.value = { count: 1 }

// 这不会触发更新：修改内部属性
state.value.count = 2  // 不会触发依赖更新
```

shallowRef 只追踪 .value 本身的变化，不追踪 value 内部对象的属性变化。这与普通 ref 形成对比——普通 ref 会将对象值转换为 reactive，内部属性变化也会触发更新。

## 实现源码

shallowRef 的实现很简单：

```typescript
export function shallowRef<T extends object>(
  value: T,
): T extends Ref ? T : ShallowRef<T>
export function shallowRef<T>(value: T): ShallowRef<T>
export function shallowRef<T = any>(): ShallowRef<T | undefined>
export function shallowRef(value?: unknown) {
  return createRef(value, true)
}
```

与 ref 的区别只在于 createRef 的第二个参数。ref 传 false，shallowRef 传 true。这个参数控制 RefImpl 的 __v_isShallow 标志。

## RefImpl 中的处理

在 RefImpl 构造函数中：

```typescript
constructor(value: T, public readonly __v_isShallow: boolean) {
  this._rawValue = __v_isShallow ? value : toRaw(value)
  this._value = __v_isShallow ? value : toReactive(value)
}
```

当 __v_isShallow 为 true 时，_rawValue 和 _value 都直接使用传入的值，不调用 toRaw 或 toReactive。这意味着即使传入对象，也不会被 reactive 包装。

在 setter 中：

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

当 __v_isShallow 为 true 时，useDirectValue 为 true，新值直接使用，不做任何转换。

## 与 ref 的区别

让我们对比两者的行为：

```typescript
// 普通 ref
const refState = ref({ nested: { value: 1 } })
refState.value.nested.value = 2  // 触发更新
console.log(isReactive(refState.value))  // true

// shallowRef  
const shallowState = shallowRef({ nested: { value: 1 } })
shallowState.value.nested.value = 2  // 不触发更新
console.log(isReactive(shallowState.value))  // false
```

普通 ref 的 value 是 reactive 对象，修改其内部属性会触发追踪这个 ref 的 effect。shallowRef 的 value 就是原始对象，修改内部属性没有响应式效果。

要触发 shallowRef 的更新，必须替换整个 value：

```typescript
// 触发更新
shallowState.value = { nested: { value: 2 } }

// 或者使用 triggerRef 强制触发
shallowState.value.nested.value = 3
triggerRef(shallowState)  // 手动触发
```

## triggerRef 函数

triggerRef 用于手动触发 shallowRef 的更新：

```typescript
export function triggerRef(ref: Ref): void {
  triggerRefValue(ref, DirtyLevels.Dirty, __DEV__ ? ref.value : void 0)
}
```

它直接调用 triggerRefValue，跳过了正常 setter 中的值比较。即使值没有变化，也会触发所有依赖的 effect。

这在使用 shallowRef 时很有用。当你修改了内部对象的属性，想要触发更新时，可以调用 triggerRef：

```typescript
const state = shallowRef({ items: [] })

function addItem(item) {
  state.value.items.push(item)  // 修改内部数组
  triggerRef(state)              // 手动触发更新
}
```

## 使用场景

shallowRef 在以下场景很有用：

大型不可变数据结构。如果你使用不可变更新模式（每次都创建新对象而不是修改），深层响应式转换是浪费：

```typescript
// 不可变更新模式
const state = shallowRef(initialState)

function update(newState) {
  state.value = newState  // 每次都是新对象
}
```

外部类实例。如果 ref 包装的是类实例（如第三方库的对象），你可能不希望 Vue 将其转换为 Proxy：

```typescript
const chart = shallowRef(new Chart(options))

// Chart 实例保持原样，不被 Proxy 包装
// 调用 chart.value.update() 等方法正常工作
```

性能敏感场景。深层响应式转换是递归的，对于大型嵌套对象会有性能开销。如果只需要在顶层检测变化，shallowRef 更高效：

```typescript
// 大型数据，频繁更新
const data = shallowRef(largeDataset)

// 只在整体替换时触发更新
data.value = newLargeDataset
```

## ShallowRef 类型

shallowRef 的返回类型是 ShallowRef：

```typescript
export type ShallowRef<T = any> = Ref<T> & { [ShallowRefMarker]?: true }
```

ShallowRef 继承自 Ref，额外有一个标记符号。这让类型系统可以区分普通 ref 和 shallow ref，但在运行时两者都是 RefImpl 实例。

isShallow 函数可以检测 shallowRef：

```typescript
export function isShallow(value: unknown): boolean {
  return !!(value && (value as any).__v_isShallow)
}

const r = shallowRef({})
console.log(isShallow(r))  // true

const r2 = ref({})
console.log(isShallow(r2))  // false
```

## 与 shallowReactive 的关系

shallowRef 和 shallowReactive 是不同的概念：

shallowReactive 创建一个对象，只有顶层属性是响应式的：

```typescript
const state = shallowReactive({ 
  nested: { value: 1 } 
})
state.nested = { value: 2 }  // 触发更新（顶层属性）
state.nested.value = 3       // 不触发更新（嵌套属性）
```

shallowRef 创建一个 ref，只有 .value 替换是响应式的：

```typescript
const state = shallowRef({ 
  nested: { value: 1 } 
})
state.value = { nested: { value: 2 } }  // 触发更新
state.value.nested = { value: 3 }       // 不触发更新
```

两者都是"浅层"的，但 shallowReactive 是对象层面的浅，shallowRef 是引用层面的浅。

## 与 reactive 内部属性的比较

使用普通 ref 包装对象时，内部对象变成 reactive：

```typescript
const r = ref({ a: 1 })
console.log(isReactive(r.value))  // true

const s = shallowRef({ a: 1 })
console.log(isReactive(s.value))  // false
```

这个区别在某些场景下很重要。如果你需要内部对象保持原样（不被 Proxy 包装），使用 shallowRef。

## 本章小结

shallowRef 是 ref 的浅层版本，只在 .value 层面响应式，不对内部对象进行深层转换。它的实现简单——只是 createRef 的第二个参数不同，但行为差异显著。

适合使用 shallowRef 的场景包括：不可变数据模式、外部类实例、性能敏感的大型数据。配合 triggerRef 可以在需要时手动触发更新。

理解 shallowRef 与 ref、shallowReactive 的区别，有助于在不同场景下选择正确的响应式 API，在保证功能的同时获得最佳性能。
