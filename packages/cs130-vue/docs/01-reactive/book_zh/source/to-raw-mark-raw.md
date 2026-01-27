# toRaw 与 markRaw

toRaw 和 markRaw 是两个与"原始对象"相关的工具函数。toRaw 获取代理背后的原始对象，markRaw 标记对象使其永远不被代理。

## toRaw

toRaw 返回响应式代理的原始对象：

```typescript
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

实现非常简洁：访问 `__v_raw` 属性，如果存在就递归调用 toRaw（处理嵌套代理），否则返回原值。

`__v_raw` 在 get 拦截器中处理：

```typescript
if (key === ReactiveFlags.RAW) {
  if (/* 验证逻辑 */) {
    return target
  }
  return
}
```

只有通过验证的访问才能获取原始对象，这是一种安全措施。

## toRaw 的使用场景

读取不触发追踪：

```javascript
const state = reactive({ count: 0 })

effect(() => {
  // 访问 state.count 会触发追踪
  console.log(state.count)
})

// 使用 toRaw 可以读取而不触发追踪
const raw = toRaw(state)
console.log(raw.count) // 不建立依赖
```

传递给不需要响应式的 API：

```javascript
const data = reactive(fetchedData)

// 某些库期望普通对象
thirdPartyLib.process(toRaw(data))
```

性能优化：

```javascript
const largeList = reactive([...items])

// 大量读取操作时，避免响应式开销
const raw = toRaw(largeList)
const result = raw.reduce((sum, item) => sum + item.value, 0)
```

深度比较：

```javascript
function deepEqual(a, b) {
  // 比较原始对象，而不是代理
  return isEqual(toRaw(a), toRaw(b))
}
```

## 嵌套代理的 toRaw

对于嵌套代理，toRaw 会递归解包：

```javascript
const original = { count: 0 }
const r = reactive(original)
const ro = readonly(r)

// ro 包装着 r，r 包装着 original
console.log(toRaw(ro) === original) // true
```

递归调用确保最终返回的是最内层的原始对象。

## markRaw

markRaw 标记对象使其永远不会被转换为响应式代理：

```typescript
export function markRaw<T extends object>(value: T): Raw<T> {
  if (Object.isExtensible(value)) {
    def(value, ReactiveFlags.SKIP, true)
  }
  return value
}
```

它在对象上设置 `__v_skip` 标记。createReactiveObject 会检查这个标记：

```typescript
function getTargetType(value: Target) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value))
}
```

如果有 `__v_skip` 标记，对象类型被判定为 INVALID，createReactiveObject 直接返回原对象而不创建代理。

## markRaw 的使用场景

第三方库的实例：

```javascript
class Chart {
  // 复杂的内部状态，不需要响应式
}

const state = reactive({
  chartInstance: markRaw(new Chart())
})

// chartInstance 不会被代理
console.log(isReactive(state.chartInstance)) // false
```

不可变数据：

```javascript
const CONSTANTS = markRaw({
  API_URL: 'https://api.example.com',
  TIMEOUT: 5000
})

const state = reactive({
  config: CONSTANTS
})

// CONSTANTS 不会被代理
```

性能优化：

```javascript
const hugeObject = markRaw(loadHugeDataset())

const state = reactive({
  data: hugeObject
})

// hugeObject 内部不会递归创建代理
```

避免循环引用问题：

```javascript
class Node {
  constructor() {
    this.parent = null
    this.children = []
  }
}

// 标记为 raw 避免复杂的循环代理
const root = markRaw(new Node())
```

## markRaw 的注意事项

markRaw 会修改原对象：

```javascript
const obj = { count: 0 }
markRaw(obj)

console.log(obj.__v_skip) // true
```

这意味着标记是永久的。即使后来想让这个对象变成响应式，也无法做到（除非删除 `__v_skip` 属性，但不推荐这样做）。

标记只对对象本身有效：

```javascript
const obj = markRaw({
  nested: { count: 0 }
})

const state = reactive({ data: obj })

// obj 本身不会被代理
console.log(isReactive(state.data)) // false

// 但如果单独对 nested 调用 reactive...
const r = reactive(obj.nested)
console.log(isReactive(r)) // true - nested 没有被标记
```

如果需要整个对象树都不被代理，需要递归标记或使用 shallowReactive。

## Raw 类型

TypeScript 中，markRaw 返回 `Raw<T>` 类型：

```typescript
export type Raw<T> = T & { [RawSymbol]?: true }
```

这是一个类型标记，帮助 TypeScript 理解这个对象不应该被用在期望响应式对象的地方。

## toRaw 和 markRaw 的关系

这两个函数解决不同的问题：

toRaw：从代理获取原始对象。已经有了代理，想要访问原始对象。

markRaw：阻止对象被代理。还没有创建代理，想要阻止将来创建。

它们经常一起使用：

```javascript
const proxy = reactive(data)

// 获取原始对象
const raw = toRaw(proxy)

// 标记为不可代理
markRaw(raw)

// 再次调用 reactive 不会创建新代理
const shouldBeRaw = reactive(raw)
console.log(isReactive(shouldBeRaw)) // false
```

但通常不需要这样——如果一开始就不想要响应式，直接用 markRaw。如果已经有了代理想访问原始对象，用 toRaw。

## 小结

toRaw 获取代理背后的原始对象，适用于需要绕过响应式系统的场景。markRaw 标记对象使其永远不被代理，适用于第三方库实例、大型不变数据、性能敏感场景。

理解这两个函数可以帮助我们更好地控制响应式系统的边界，在需要时"逃逸"出响应式世界。

