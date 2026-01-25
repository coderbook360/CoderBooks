# proxyRefs 自动解包

在模板中使用 ref 不需要 `.value`，这是 `proxyRefs` 的功劳。它创建一个代理，自动解包 ref 值。

## 问题背景

没有自动解包，模板会很繁琐：

```vue
<!-- 如果没有自动解包 -->
<template>
  {{ count.value }}
  <button @click="count.value++">+</button>
</template>
```

有了自动解包：

```vue
<!-- 实际使用 -->
<template>
  {{ count }}
  <button @click="count++">+</button>
</template>
```

## 源码分析

```typescript
export function proxyRefs<T extends object>(
  objectWithRefs: T
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}
```

如果对象已经是响应式的，直接返回；否则创建代理。

## shallowUnwrapHandlers

代理处理器：

```typescript
const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      // 原值是 ref，新值不是 ref
      oldValue.value = value
      return true
    } else {
      // 其他情况直接设置
      return Reflect.set(target, key, value, receiver)
    }
  }
}
```

## get 处理

读取时自动解包：

```typescript
get: (target, key, receiver) => unref(Reflect.get(target, key, receiver))
```

`unref` 的实现：

```typescript
export function unref<T>(ref: T | Ref<T>): T {
  return isRef(ref) ? (ref.value as any) : ref
}
```

如果是 ref，返回 `.value`；否则原样返回。

## set 处理

设置时智能处理：

```typescript
set: (target, key, value, receiver) => {
  const oldValue = target[key]
  if (isRef(oldValue) && !isRef(value)) {
    oldValue.value = value
    return true
  } else {
    return Reflect.set(target, key, value, receiver)
  }
}
```

两种情况：
1. 原值是 ref，新值不是：设置到 ref 的 `.value`
2. 其他情况：直接设置

示例：

```javascript
const state = proxyRefs({
  count: ref(0)
})

state.count = 5  // 实际执行 ref.value = 5
```

## 浅解包

`proxyRefs` 只做浅层解包：

```javascript
const state = proxyRefs({
  nested: {
    count: ref(0)
  }
})

state.nested.count  // 这是 Ref，不会自动解包
```

只有第一层的 ref 会被解包。

## 与 reactive 的区别

`reactive` 会深度解包：

```javascript
const state = reactive({
  count: ref(0),
  nested: {
    value: ref(1)
  }
})

state.count      // 0（自动解包）
state.nested.value  // 1（深度解包）
```

`proxyRefs` 只解包第一层：

```javascript
const state = proxyRefs({
  count: ref(0),
  nested: {
    value: ref(1)
  }
})

state.count      // 0（解包）
state.nested.value  // Ref（不解包）
```

## 为什么用浅解包

setup 返回值使用浅解包，原因是：

1. **性能**：不需要递归代理嵌套对象
2. **语义清晰**：顶层属性直接使用，嵌套保持原样
3. **灵活性**：嵌套对象可以是任意类型

## 类型定义

```typescript
export type ShallowUnwrapRef<T> = {
  [K in keyof T]: T[K] extends Ref<infer V>
    ? V
    : T[K] extends Ref<infer V> | undefined
    ? unknown extends V
      ? undefined
      : V | undefined
    : T[K]
}
```

类型系统自动推导解包后的类型。

## 实际应用

setup 返回值包装：

```typescript
// handleSetupResult 中
instance.setupState = proxyRefs(setupResult)
```

然后在模板渲染时：

```javascript
// 访问 setupState.count
// 自动变成 setupState.count.value（如果是 ref）
```

## 手动使用

也可以手动使用：

```javascript
import { ref, proxyRefs } from 'vue'

const original = {
  count: ref(0),
  name: ref('Vue')
}

const proxied = proxyRefs(original)

console.log(proxied.count)  // 0
console.log(proxied.name)   // 'Vue'

proxied.count = 5
console.log(original.count.value)  // 5
```

## toRefs 配合

`toRefs` 常与 `proxyRefs` 配合：

```javascript
const state = reactive({ count: 0, name: 'Vue' })
const refs = toRefs(state)  // { count: Ref, name: Ref }
const proxied = proxyRefs(refs)

proxied.count  // 0
proxied.count = 5  // 修改原始 state.count
```

## 条件判断

`isReactive` 检查避免重复代理：

```typescript
return isReactive(objectWithRefs)
  ? objectWithRefs
  : new Proxy(objectWithRefs, shallowUnwrapHandlers)
```

reactive 对象已经有解包行为，不需要额外代理。

## 边界情况

**数组中的 ref**：

```javascript
const state = proxyRefs({
  items: [ref(1), ref(2), ref(3)]
})

state.items  // [Ref, Ref, Ref]，数组内的 ref 不解包
state.items[0].value  // 需要手动 .value
```

**null 和 undefined**：

```javascript
const state = proxyRefs({
  maybe: null,
  optional: undefined
})

state.maybe     // null
state.optional  // undefined
```

## 性能考虑

`proxyRefs` 是轻量级的：

- 只代理顶层属性
- 不追踪依赖（不是响应式代理）
- get/set 操作简单

它只是一个便利层，让模板使用更简洁。

## 与渲染的关系

模板渲染时通过 proxy 访问：

```javascript
// 模板编译后
_ctx.count
// 实际访问 instance.setupState.count
// proxyRefs 自动解包为 count.value
```

## 小结

`proxyRefs` 的作用：

1. **get**：自动解包 ref，返回 `.value`
2. **set**：智能设置，ref 类型设置到 `.value`
3. **浅层**：只处理第一层属性

这个简单的代理让 Composition API 的使用体验更好，模板中不需要到处写 `.value`。

下一章将分析 `getCurrentInstance`——获取当前组件实例的机制。
