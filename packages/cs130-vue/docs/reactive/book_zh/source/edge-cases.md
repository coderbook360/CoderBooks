# 边界情况处理：响应式系统的鲁棒性

响应式系统需要处理各种边界情况，包括循环引用、自我赋值、极深嵌套等。本章分析 Vue 如何处理这些边界情况。

## 循环引用

对象之间可能存在循环引用：

```typescript
const a = reactive({ b: null })
const b = reactive({ a: null })
a.b = b
b.a = a
```

Vue 通过 WeakMap 缓存处理：

```typescript
export const reactiveMap: WeakMap<Target, any> = new WeakMap()

function createReactiveObject(target, ...) {
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy  // 返回已存在的代理
  }
  // ...
}
```

同一个对象只会创建一个代理，不会无限递归。

## 深度监听的循环引用

traverse 函数用 seen Set 防止无限递归：

```typescript
export function traverse(
  value: unknown,
  depth: number = Infinity,
  seen?: Set<unknown>,
): unknown {
  seen = seen || new Set()
  if (seen.has(value)) {
    return value  // 已访问过，直接返回
  }
  seen.add(value)
  // 递归遍历...
}
```

遇到已访问的对象立即返回。

## 自我赋值

设置相同的值不应触发更新：

```typescript
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)
})

state.count = 0  // 值相同，不触发
```

在 set handler 中检查：

```typescript
set(target, key, value, receiver) {
  const oldValue = target[key]
  // ...
  const result = Reflect.set(target, key, value, receiver)
  if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return result
}
```

hasChanged 使用 Object.is 比较：

```typescript
export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)
```

## NaN 的特殊处理

NaN !== NaN，但不应因此触发更新：

```typescript
const state = reactive({ value: NaN })

state.value = NaN  // 不应触发更新
```

Object.is(NaN, NaN) 返回 true，正确处理了这个情况。

## 原型链上的属性

代理需要正确处理原型链：

```typescript
const parent = { inherited: 1 }
const child = reactive(Object.create(parent))

console.log(child.inherited)  // 1，从原型继承
```

get handler 中使用 Reflect.get 正确处理原型链。

## 数组长度变化

修改数组长度是特殊情况：

```typescript
const arr = reactive([1, 2, 3, 4, 5])

effect(() => {
  console.log(arr.length)
})

arr.length = 2  // 触发更新，删除了元素
```

数组的 set handler 特殊处理长度变化：

```typescript
if (isArray(target) && key === 'length') {
  const oldLength = Number(oldValue)
  // 对于被删除的索引触发 trigger
}
```

## 稀疏数组

数组可能有空洞：

```typescript
const arr = reactive([1, , 3])  // 索引 1 是空的

console.log(arr[1])  // undefined
arr[1] = 2  // 填充空洞
```

Vue 正确处理稀疏数组，不会因为空洞而出错。

## 特殊对象类型

某些对象不应被代理：

```typescript
const markRaw = <T extends object>(value: T): T => {
  def(value, ReactiveFlags.SKIP, true)
  return value
}
```

SKIP 标记的对象被跳过：

```typescript
function createReactiveObject(target, ...) {
  if (target[ReactiveFlags.SKIP]) {
    return target  // 不代理
  }
  // ...
}
```

## 内置对象处理

Date、RegExp 等内置对象有特殊处理：

```typescript
const getTargetType = (value: Target) => {
  if (value[ReactiveFlags.SKIP] || !Object.isExtensible(value)) {
    return TargetType.INVALID
  }
  switch (toRawType(value)) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}
```

不支持的类型返回 INVALID，不会被代理。

## 冻结对象

Object.freeze 的对象不可扩展：

```typescript
const frozen = Object.freeze({ value: 1 })
const state = reactive(frozen)

console.log(state === frozen)  // true，不代理
```

在 getTargetType 中检查 Object.isExtensible。

## 多层代理防护

避免代理已代理的对象：

```typescript
const state = reactive({ count: 0 })
const double = reactive(state)  // 返回 state，不重复代理
```

通过 IS_REACTIVE 标记检测：

```typescript
function createReactiveObject(target, ...) {
  if (target[ReactiveFlags.RAW] && 
      !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target
  }
  // ...
}
```

## ref 循环引用

ref 可能包含循环引用的对象：

```typescript
const obj: any = {}
obj.self = obj

const state = ref(obj)
// 内部使用 reactive，循环引用被处理
```

## computed 的无限循环

computed 可能意外造成无限循环：

```typescript
const count = ref(0)

// 危险：读取时修改依赖
const bad = computed(() => {
  count.value++  // 这会再次触发 computed
  return count.value
})
```

Vue 会检测并在开发模式警告这种情况。

## effect 递归限制

effect 可能触发自己：

```typescript
const count = ref(0)

effect(() => {
  count.value++  // 修改会触发自己
})
// 可能导致无限循环
```

Vue 有递归深度限制和检测机制。

## 大量依赖

一个 effect 可能依赖大量数据：

```typescript
const list = reactive(Array(10000).fill(0).map((_, i) => ({ id: i })))

effect(() => {
  list.forEach(item => console.log(item.id))
})
// 追踪 10000 个依赖
```

Vue 使用高效的数据结构（Set、Map）处理大量依赖。

## 极深嵌套

对象可能嵌套很深：

```typescript
let obj = { value: 0 }
for (let i = 0; i < 1000; i++) {
  obj = { nested: obj }
}

const state = reactive(obj)
```

响应式系统按需创建代理，只有访问到的层级才会代理。

## Symbol 作为键

Symbol 键需要特殊处理：

```typescript
const key = Symbol('key')
const state = reactive({ [key]: 'value' })

effect(() => {
  console.log(state[key])
})

state[key] = 'new value'  // 触发更新
```

Vue 正确追踪 Symbol 键的访问和修改。

## 本章小结

Vue 响应式系统通过多种机制处理边界情况：WeakMap 缓存防止重复代理，seen Set 防止循环递归，hasChanged 使用 Object.is 正确比较值，类型检查跳过不支持的对象。

这些处理使响应式系统在各种极端情况下都能稳定工作，是系统鲁棒性的重要保证。
