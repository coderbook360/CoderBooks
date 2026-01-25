# proxyRefs：自动解包 ref 的代理

在 Vue 组件中，setup 返回的 ref 在模板中可以直接访问而不需要 .value。这种自动解包的能力由 proxyRefs 实现。理解 proxyRefs 有助于理解 Vue 组件如何处理响应式数据。

## proxyRefs 的作用

proxyRefs 创建一个代理，自动解包对象中的 ref 属性：

```typescript
const state = {
  count: ref(0),
  name: ref('Vue')
}

const proxied = proxyRefs(state)

// 访问时自动解包
console.log(proxied.count)  // 0，不是 Ref<number>
console.log(proxied.name)   // 'Vue'

// 设置时自动处理
proxied.count = 5  // 相当于 state.count.value = 5
```

## 实现源码

```typescript
export function proxyRefs<T extends object>(
  objectWithRefs: T,
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}
```

首先检查对象是否已经是 reactive。如果是，直接返回——因为 reactive 的 Proxy 已经处理了 ref 解包。如果不是，创建一个使用 shallowUnwrapHandlers 的新 Proxy。

## shallowUnwrapHandlers

这个 handler 定义了 get 和 set 行为：

```typescript
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  },
}
```

get 拦截器很简单：获取属性值后用 unref 解包。如果值是 ref，返回 .value；如果不是，直接返回。

set 拦截器更有趣。它检查现有值是否是 ref，而新值不是 ref。如果是这种情况，将新值赋给 ref 的 .value，而不是替换整个 ref。这保持了响应式连接。

```typescript
const state = { count: ref(0) }
const proxied = proxyRefs(state)

proxied.count = 5
// 实际执行的是 state.count.value = 5
// state.count 仍然是同一个 ref 对象
```

如果新值也是 ref，则直接替换：

```typescript
proxied.count = ref(10)
// 实际执行的是 state.count = ref(10)
// state.count 变成了新的 ref
```

## ShallowUnwrapRef 类型

proxyRefs 的返回类型使用 ShallowUnwrapRef：

```typescript
export type ShallowUnwrapRef<T> = {
  [K in keyof T]: T[K] extends Ref<infer V>
    ? V
    : T[K] extends Ref<infer V> | undefined
      ? V | undefined
      : T[K]
}
```

这个类型将对象中的 Ref\<T\> 属性转换为 T，表示解包后的类型。"Shallow"表示只解包顶层属性，不递归处理嵌套对象。

## 在 Vue 组件中的应用

Vue 的 setup 函数返回值会经过 proxyRefs 处理：

```typescript
// 简化的组件处理逻辑
const setupResult = setup(props, context)
const proxiedResult = proxyRefs(setupResult)
// 模板中使用 proxiedResult
```

这就是为什么模板中可以直接用 `{{ count }}` 而不是 `{{ count.value }}`：

```vue
<template>
  <div>{{ count }}</div>  <!-- 自动解包 -->
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

在 script setup 语法中，编译器会自动处理，让返回的 ref 被正确代理。

## 为什么 reactive 对象直接返回

proxyRefs 检测到 reactive 对象时直接返回。这是因为 reactive 的 Proxy 已经在 getter 中处理了 ref 解包：

```typescript
// 在 reactive 的 get handler 中
const res = Reflect.get(target, key, receiver)
if (isRef(res)) {
  // 自动解包（除了数组的整数索引）
  return res.value
}
return res
```

所以 reactive 对象已经具备 ref 解包能力，不需要再包一层 proxyRefs。

## 数组的特殊处理

对于数组中的 ref，行为有所不同：

```typescript
const arr = reactive([ref(1), ref(2)])
console.log(arr[0])  // Ref<number>，不会自动解包

const obj = reactive({ list: [ref(1)] })
console.log(obj.list[0])  // Ref<number>，不会自动解包
```

数组中的 ref 不会自动解包。这是设计决策——数组元素通常通过索引访问，自动解包可能导致困惑和性能问题。

## unref 与 proxyRefs 的关系

proxyRefs 内部使用 unref 进行解包。unref 的实现：

```typescript
export function unref<T>(ref: MaybeRef<T>): T {
  return isRef(ref) ? ref.value : ref
}
```

每次通过 proxyRefs 访问属性，都会调用 unref。这是惰性解包，只在访问时发生。

## 嵌套对象的处理

proxyRefs 只处理顶层属性，不递归：

```typescript
const state = {
  count: ref(0),
  nested: {
    value: ref('hello')
  }
}

const proxied = proxyRefs(state)

console.log(proxied.count)         // 0，解包了
console.log(proxied.nested.value)  // Ref<string>，没有解包
```

如果需要深层解包，可以使用 reactive 包装整个对象：

```typescript
const state = reactive({
  count: ref(0),
  nested: {
    value: ref('hello')
  }
})

console.log(state.nested.value)  // 'hello'，reactive 会深层解包
```

## 与 reactive 自动解包的对比

reactive 对象内的 ref 自动解包：

```typescript
const state = reactive({
  count: ref(0)
})

console.log(state.count)  // 0
state.count = 10          // 自动赋值给 ref.value
console.log(isRef(state.count))  // false（表面上）
// 实际上底层仍是 ref，只是访问时自动解包
```

proxyRefs 对普通对象提供类似能力：

```typescript
const state = {
  count: ref(0)
}
const proxied = proxyRefs(state)

console.log(proxied.count)  // 0
proxied.count = 10
console.log(isRef(state.count))  // true，原对象中仍是 ref
```

主要区别是 reactive 会深层转换对象，而 proxyRefs 只做浅层代理。

## 性能考虑

proxyRefs 创建的 Proxy 开销较小，因为：

1. 每个对象只创建一个 Proxy
2. handler 逻辑简单（只是 unref 和条件赋值）
3. 不需要依赖追踪相关的复杂逻辑

在组件中，setup 返回值只 proxyRefs 一次，之后的访问都通过同一个 Proxy，性能影响很小。

## 本章小结

proxyRefs 是 Vue 组件模板自动解包 ref 的底层机制。它创建一个 Proxy，在 get 时自动调用 unref 解包，在 set 时智能地决定是赋值给 ref.value 还是替换整个属性。

这个机制让开发者在模板中可以直接使用 ref 而不需要 .value，提升了开发体验。同时它与 reactive 的自动解包机制协调工作，确保两者的行为一致。

理解 proxyRefs 有助于理解 Vue 组件的响应式处理流程，以及为什么有时候需要手动使用 .value 而有时候不需要。
