# isReactive/isReadonly/isProxy

Vue3 提供了一组工具函数来检测对象的响应式状态。这些函数在调试、类型守卫和条件逻辑中非常有用。

## isReactive

isReactive 检查一个值是否是 reactive 创建的响应式代理：

```typescript
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}
```

实现分两部分：

如果值是 readonly 代理，获取其原始对象再递归检查。这处理了 `readonly(reactive(obj))` 的情况。

否则，检查 `__v_isReactive` 标记。

`__v_isReactive` 是一个虚拟属性，在 Proxy 的 get 拦截器中返回：

```typescript
if (key === ReactiveFlags.IS_REACTIVE) {
  return !isReadonly
}
```

注意返回的是 `!isReadonly`。这意味着 reactive 代理返回 true，readonly 代理返回 false。

测试用例：

```javascript
const plain = { count: 0 }
const reactiveProxy = reactive(plain)
const readonlyProxy = readonly(plain)
const readonlyReactiveProxy = readonly(reactive(plain))

console.log(isReactive(plain))                // false
console.log(isReactive(reactiveProxy))        // true
console.log(isReactive(readonlyProxy))        // false
console.log(isReactive(readonlyReactiveProxy)) // true - 穿透 readonly 检查
```

最后一个例子说明了递归检查的作用。`readonly(reactive(obj))` 的外层是 readonly，但内层是 reactive，isReactive 会穿透外层检查内层。

## isReadonly

isReadonly 检查一个值是否是只读代理：

```typescript
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}
```

实现更简单，直接检查 `__v_isReadonly` 标记：

```typescript
if (key === ReactiveFlags.IS_READONLY) {
  return isReadonly
}
```

readonly 和 shallowReadonly 创建的代理都会返回 true。

测试用例：

```javascript
const plain = { count: 0 }
const reactiveProxy = reactive(plain)
const readonlyProxy = readonly(plain)
const shallowReadonlyProxy = shallowReadonly(plain)

console.log(isReadonly(plain))               // false
console.log(isReadonly(reactiveProxy))       // false
console.log(isReadonly(readonlyProxy))       // true
console.log(isReadonly(shallowReadonlyProxy)) // true
```

## isProxy

isProxy 检查一个值是否是任意类型的响应式代理：

```typescript
export function isProxy(value: unknown): boolean {
  return isReactive(value) || isReadonly(value)
}
```

只要是 reactive、readonly、shallowReactive、shallowReadonly 创建的代理，都返回 true。

```javascript
console.log(isProxy(reactive({})))        // true
console.log(isProxy(readonly({})))        // true
console.log(isProxy(shallowReactive({}))) // true
console.log(isProxy(shallowReadonly({}))) // true
console.log(isProxy(ref(0)))              // false - ref 不是 Proxy
console.log(isProxy({}))                  // false
```

注意 ref 返回 false，因为 ref 不是通过 Proxy 实现的，而是使用 getter/setter。

## isShallow

isShallow 检查是否是浅层代理：

```typescript
export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}
```

shallowReactive 和 shallowReadonly 返回 true，reactive 和 readonly 返回 false。

```javascript
console.log(isShallow(shallowReactive({})))  // true
console.log(isShallow(shallowReadonly({})))  // true
console.log(isShallow(reactive({})))         // false
console.log(isShallow(readonly({})))         // false
```

## 实际应用

这些检测函数在多种场景下有用。

类型守卫：

```typescript
function processValue(value: unknown) {
  if (isReactive(value)) {
    // TypeScript 知道 value 是响应式对象
    // 可以安全地进行响应式相关操作
  }
}
```

条件处理：

```javascript
function safeMutate(target, key, value) {
  if (isReadonly(target)) {
    console.warn('Cannot mutate readonly object')
    return
  }
  target[key] = value
}
```

调试：

```javascript
function logState(state) {
  console.log('Is Proxy:', isProxy(state))
  console.log('Is Reactive:', isReactive(state))
  console.log('Is Readonly:', isReadonly(state))
  console.log('Is Shallow:', isShallow(state))
}
```

避免重复代理：

```javascript
function ensureReactive(value) {
  if (isReactive(value)) {
    return value // 已经是响应式，直接返回
  }
  return reactive(value)
}
```

## 边缘情况

嵌套代理：

```javascript
const original = { count: 0 }
const r = reactive(original)
const ro = readonly(r)

isReactive(ro) // true - 穿透 readonly 检查内层
isReadonly(ro) // true - 外层是 readonly
isProxy(ro)    // true
```

解包后的原始对象：

```javascript
const r = reactive({ count: 0 })
const raw = toRaw(r)

isReactive(raw) // false - 原始对象不是代理
isProxy(raw)    // false
```

shallowReactive 的嵌套对象：

```javascript
const state = shallowReactive({
  nested: { count: 0 }
})

isReactive(state)        // true
isReactive(state.nested) // false - nested 没有被代理
```

## 性能考量

这些检测函数的开销很小——它们只是访问一个属性并进行布尔检查。在热路径中使用是安全的。

但要注意，每次调用都会访问 Proxy 的 get 拦截器。如果需要频繁检测同一个对象，可以缓存结果：

```javascript
const isStateReactive = isReactive(state)
// 后续使用 isStateReactive 而不是重复调用 isReactive(state)
```

## 小结

isReactive、isReadonly、isProxy、isShallow 是一组用于检测响应式状态的工具函数。它们通过访问特殊的虚拟属性实现，这些属性在 Proxy 的 get 拦截器中动态返回。

理解这些函数的行为，特别是在嵌套代理和各种组合情况下的表现，可以帮助我们正确地判断和处理响应式对象。

