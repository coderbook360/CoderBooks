# shallowReactive 实现

shallowReactive 只对顶层属性创建响应式代理，嵌套对象保持原样。这在处理大型数据结构或与非响应式代码集成时很有用。

## 函数定义

shallowReactive 的定义：

```typescript
export function shallowReactive<T extends object>(target: T): ShallowReactive<T> {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  )
}
```

第二个参数 false 表示不是只读模式。使用 shallowReactiveHandlers 和 shallowCollectionHandlers。单独的 shallowReactiveMap 用于缓存。

## shallowReactiveHandlers

```typescript
export const shallowReactiveHandlers: ProxyHandler<object> = {
  ...mutableHandlers,
  get: shallowGet,
  set: shallowSet
}
```

继承 mutableHandlers，但替换了 get 和 set。

## shallowGet

shallowGet 通过 createGetter(false, true) 创建：

```typescript
const shallowGet = createGetter(false, true)
```

shallow = true 的效果在 createGetter 中体现：

```typescript
if (shallow) {
  return res
}

// 下面的代码不会执行
if (isRef(res)) {
  return targetIsArray && isIntegerKey(key) ? res : res.value
}

if (isObject(res)) {
  return isReadonly ? readonly(res) : reactive(res)
}
```

当 shallow 为 true 时，直接返回原始值，不进行 ref 解包和深层代理。

```javascript
const state = shallowReactive({
  count: 0,
  nested: { inner: 1 },
  refValue: ref(10)
})

console.log(state.count)       // 0 - 正常值
console.log(state.nested)      // { inner: 1 } - 原始对象，不是代理
console.log(state.refValue)    // RefImpl 对象，不自动解包
console.log(state.refValue.value) // 10
```

## shallowSet

shallowSet 通过 createSetter(true) 创建：

```typescript
const shallowSet = createSetter(true)
```

shallow = true 的效果在 createSetter 中：

```typescript
function createSetter(shallow = false) {
  return function set(...) {
    let oldValue = (target as any)[key]
    
    if (!shallow) {
      // 这些逻辑被跳过
      const isOldValueReadonly = isReadonly(oldValue)
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        // ref 自动设置逻辑被跳过
      }
    }
    
    // ... 正常的 set 逻辑
  }
}
```

浅层模式下：

不转换 oldValue 和 value 为原始值。

不自动设置 ref 的 value。

```javascript
const state = shallowReactive({
  refValue: ref(0)
})

// 浅层模式：替换整个 ref
state.refValue = 5
console.log(state.refValue) // 5（不是 ref 了）

// 深层模式的行为（对比）：
// state.refValue = 5 会变成 state.refValue.value = 5
```

## 依赖追踪

shallowReactive 只追踪顶层属性的变化：

```javascript
const state = shallowReactive({
  nested: { count: 0 }
})

effect(() => {
  console.log(state.nested.count)
})
// 输出：0

state.nested.count = 1 // 不会触发 effect
state.nested = { count: 2 } // 触发 effect
```

访问 `state.nested` 会触发 track（因为访问了顶层属性）。但 `state.nested.count` 的 `.count` 部分不会触发 track，因为 `state.nested` 返回的是普通对象，没有响应式能力。

只有当 `state.nested` 被重新赋值时，依赖才会被触发。

## 使用场景

shallowReactive 适用于：

大型不变的数据结构：

```javascript
const largeData = shallowReactive({
  items: loadLargeDataset(), // items 本身的变化可追踪
  metadata: { ... }          // 内部不需要响应式
})

// 只追踪 items 的替换
largeData.items = newItems // 触发更新
largeData.items[0].name = 'new' // 不触发更新
```

与第三方库集成：

```javascript
const chartState = shallowReactive({
  chartInstance: null,
  config: { ... }
})

// chartInstance 是第三方库创建的对象，不需要响应式
chartState.chartInstance = new Chart(...)
```

性能优化：

```javascript
// 深层对象，但只关心顶层变化
const state = shallowReactive({
  currentPage: 1,
  pageSize: 10,
  data: [] // 可能有大量嵌套数据
})

// 只在 currentPage、pageSize、data 被替换时触发更新
// data 内部的变化不追踪
```

## isShallow 检测

isShallow 函数检测对象是否是浅层代理：

```typescript
export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target).__v_isShallow)
}
```

它通过 `__v_isShallow` 标记判断，这个标记在 get 拦截器中返回：

```typescript
if (key === ReactiveFlags.IS_SHALLOW) {
  return shallow
}
```

## shallowReactive vs shallowRef

shallowReactive 和 shallowRef 都是"浅层"的，但有区别：

shallowReactive：用于对象，追踪顶层属性的变化。

shallowRef：用于任意值，只追踪 `.value` 的变化。

```javascript
const shallowReactiveObj = shallowReactive({ a: 1, b: 2 })
shallowReactiveObj.a = 10 // 触发更新

const shallowRefObj = shallowRef({ a: 1, b: 2 })
shallowRefObj.value.a = 10 // 不触发更新
shallowRefObj.value = { a: 10, b: 2 } // 触发更新
```

shallowRef 更"浅"——只有整个 value 被替换时才触发。shallowReactive 稍微"深"一点——顶层每个属性的变化都能触发。

## 与 readonly 的组合

可以对 shallowReactive 应用 readonly：

```javascript
const state = shallowReactive({ nested: { count: 0 } })
const readonlyState = readonly(state)

readonlyState.nested = {} // 警告，阻止
state.nested = {} // 正常工作
```

但注意 readonly 是深层的，它会使整个对象变成只读，即使原始是浅层响应式的。

如果只想要浅层只读，使用 shallowReadonly：

```javascript
const state = shallowReadonly({ nested: { count: 0 } })

state.nested = {} // 警告，阻止
state.nested.count = 1 // 可以修改（nested 不是只读的）
```

## 小结

shallowReactive 是 reactive 的轻量版本，只代理顶层属性。它不解包 ref，不深层代理嵌套对象。这在处理大型数据、与第三方库集成、或只关心顶层变化时很有用。

理解 shallow 和 deep 的区别，以及它们与 readonly 的组合，可以帮助我们为不同场景选择合适的响应式策略。

