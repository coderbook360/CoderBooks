# readonly 与 shallowReadonly

readonly 创建一个只读的响应式代理，任何修改尝试都会被阻止并发出警告。shallowReadonly 只对顶层属性应用只读约束，嵌套对象保持原样。

## readonly 函数

readonly 的实现和 reactive 结构相似：

```typescript
export function readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>> {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  )
}
```

注意第二个参数是 true，表示这是只读模式。使用的是 readonlyHandlers 和 readonlyCollectionHandlers。

## readonlyHandlers

readonly 的拦截器在 baseHandlers.ts 中定义：

```typescript
export const readonlyHandlers: ProxyHandler<object> = {
  get: readonlyGet,
  set(target, key) {
    if (__DEV__) {
      warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
    }
    return true
  },
  deleteProperty(target, key) {
    if (__DEV__) {
      warn(`Delete operation on key "${String(key)}" failed: target is readonly.`)
    }
    return true
  }
}
```

和 mutableHandlers 相比，主要区别是：

使用 readonlyGet 替代普通的 get。

set 和 deleteProperty 变成警告函数。

没有 has 和 ownKeys——使用默认行为即可，因为这些是只读操作。

## readonlyGet

readonlyGet 通过 createGetter(true) 创建：

```typescript
const readonlyGet = createGetter(true)
```

在 createGetter 内部，isReadonly = true 会导致：

不调用 track 收集依赖（只读数据不会变化，不需要追踪）。

嵌套对象用 readonly 而不是 reactive 包装。

```typescript
if (!isReadonly) {
  track(target, TrackOpTypes.GET, key)
}

// ...

if (isObject(res)) {
  return isReadonly ? readonly(res) : reactive(res)
}
```

## 为什么 readonly 不追踪

这是一个重要的优化。如果数据是只读的，它永远不会变化，那么追踪它的依赖就没有意义：

```javascript
const original = { count: 0 }
const readonlyProxy = readonly(original)

effect(() => {
  console.log(readonlyProxy.count)
})
// 输出：0

// 即使原始对象变化，effect 也不会重新执行
// 因为没有建立依赖关系
original.count = 1
// 不会触发任何更新
```

但注意，如果原始对象本身是响应式的，情况就不同了：

```javascript
const reactiveProxy = reactive({ count: 0 })
const readonlyProxy = readonly(reactiveProxy)

effect(() => {
  console.log(readonlyProxy.count)
})

reactiveProxy.count = 1
// effect 会重新执行
```

这是因为 readonlyProxy 内部持有的是 reactiveProxy，访问属性时会穿透到 reactiveProxy 的 get，而 reactiveProxy 会进行依赖收集。

## readonly 嵌套 reactive

`readonly(reactive(obj))` 是一个常见的模式。它创建一个只读的外层，但原始的 reactive 能力保留。

```javascript
const state = reactive({ user: { name: 'Alice' } })
const readonlyState = readonly(state)

// 外部只能读取
console.log(readonlyState.user.name) // 'Alice'
readonlyState.user.name = 'Bob' // 警告：target is readonly

// 内部仍然可以修改
state.user.name = 'Bob' // 正常工作

// 外部的读取会反映变化
console.log(readonlyState.user.name) // 'Bob'
```

这种模式在组件暴露状态时很有用：内部保留修改能力，对外只提供只读接口。

## shallowReadonly

shallowReadonly 只让顶层属性变成只读：

```typescript
export function shallowReadonly<T extends object>(target: T): Readonly<T> {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  )
}
```

shallowReadonlyHandlers：

```typescript
export const shallowReadonlyHandlers: ProxyHandler<object> = {
  ...readonlyHandlers,
  get: shallowReadonlyGet
}
```

shallowReadonlyGet 通过 createGetter(true, true) 创建。isReadonly 和 shallow 都是 true。

这意味着：

顶层属性不能修改。

嵌套对象直接返回原值，不做任何包装。

```javascript
const obj = {
  top: 'value',
  nested: { inner: 'value' }
}

const proxy = shallowReadonly(obj)

proxy.top = 'new' // 警告，被阻止
proxy.nested.inner = 'new' // 可以修改！nested 不是只读的
```

## 使用场景

readonly 适用于：

暴露给外部的状态。不希望外部意外修改。

常量配置。确保运行时不会被修改。

性能敏感场景。不追踪依赖减少开销。

```javascript
// 组件暴露只读状态
const state = reactive({ ... })
return {
  state: readonly(state)
}

// 常量配置
const CONFIG = readonly({
  apiUrl: 'https://api.example.com',
  timeout: 5000
})
```

shallowReadonly 适用于：

大型对象。只保护顶层，减少代理开销。

与非响应式代码集成。嵌套对象保持原样。

```javascript
// 大型配置对象
const config = shallowReadonly(loadLargeConfig())
// config.xxx = 'new' // 阻止
// config.nested.xxx = 'new' // 允许（如果需要）
```

## isReadonly 检测

isReadonly 函数检查对象是否是只读代理：

```typescript
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target).__v_isReadonly)
}
```

它通过访问 `__v_isReadonly` 标记来判断。这个标记在 get 拦截器中返回 true：

```typescript
if (key === ReactiveFlags.IS_READONLY) {
  return isReadonly
}
```

## readonly 和 reactive 的关系

可以对 reactive 对象再调用 readonly：

```typescript
const reactiveProxy = reactive(obj)
const readonlyReactiveProxy = readonly(reactiveProxy)
```

结果是一个只读代理，包装着 reactive 代理，包装着原始对象。三层结构。

反过来，对 readonly 对象调用 reactive 会直接返回 readonly 本身：

```typescript
const readonlyProxy = readonly(obj)
const shouldBeReactive = reactive(readonlyProxy)
// shouldBeReactive === readonlyProxy
```

这是在 reactive 函数开头检查的：

```typescript
export function reactive(target: object) {
  if (isReadonly(target)) {
    return target
  }
  // ...
}
```

这个设计选择是合理的：如果一个对象被标记为只读，就不应该再变成可变的。

## toRaw 和 readonly

toRaw 可以获取 readonly 代理的原始对象：

```javascript
const original = { count: 0 }
const readonlyProxy = readonly(original)

console.log(toRaw(readonlyProxy) === original) // true
```

对于 `readonly(reactive(obj))` 的嵌套情况，toRaw 会递归解包：

```javascript
const original = { count: 0 }
const readonlyReactiveProxy = readonly(reactive(original))

console.log(toRaw(readonlyReactiveProxy) === original) // true
```

## 小结

readonly 创建深层只读代理，阻止任何修改，不收集依赖。shallowReadonly 只保护顶层，嵌套对象保持原样。两者都返回 true 表示只读状态，可以通过 isReadonly 检测。

readonly 经常和 reactive 结合使用，创建"内部可变、外部只读"的模式。这是一种很好的封装实践，防止状态被意外修改。

