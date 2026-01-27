# deep 选项：深度监听的实现

deep 选项控制 watch 是否递归监听对象的嵌套属性。本章分析 deep 的实现机制和 Vue 3.5 引入的深度控制增强。

## 基本用法

```typescript
const state = reactive({
  user: {
    profile: {
      name: 'Vue'
    }
  }
})

// 不使用 deep（默认）
watch(() => state.user, (val) => {
  console.log('user changed')
})
state.user.profile.name = 'React'  // 不触发

// 使用 deep
watch(() => state.user, (val) => {
  console.log('user changed')
}, { deep: true })
state.user.profile.name = 'React'  // 触发
```

## reactive 对象自动深度监听

监听 reactive 对象时自动开启 deep：

```typescript
if (isReactive(source)) {
  getter = () => reactiveGetter(source)
  deep = true  // 自动设置
}
```

这是合理的设计——监听整个 reactive 对象，通常希望任何变化都能触发。

```typescript
// 这两种写法效果相同
watch(state, callback)
watch(state, callback, { deep: true })
```

## traverse 函数

deep 监听的核心是 traverse 函数：

```typescript
export function traverse(
  value: unknown,
  depth: number = Infinity,
  seen?: Set<unknown>,
): unknown {
  if (depth <= 0 || !isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)

  depth--

  if (isRef(value)) {
    traverse(value.value, depth, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, depth, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen)
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        traverse(value[key as any], depth, seen)
      }
    }
  }

  return value
}
```

traverse 递归访问对象的所有属性，触发它们的 getter，从而建立依赖追踪。

## 循环引用处理

seen Set 防止循环引用导致无限递归：

```typescript
seen = seen || new Set()
if (seen.has(value)) {
  return value
}
seen.add(value)
```

遇到已访问过的对象直接返回，不再深入。

## 包装 getter

```typescript
const baseGetter = getter
if (deep) {
  if (deep === true) {
    getter = () => traverse(baseGetter())
  } else {
    const depth = deep
    getter = () => traverse(baseGetter(), depth)
  }
}
```

如果 deep 有效，在原 getter 外包装 traverse 调用。这样每次执行 getter 都会遍历整个对象。

## Vue 3.5 深度控制增强

Vue 3.5 增加了数字深度支持：

```typescript
// 无限深度
watch(source, callback, { deep: true })

// 指定深度
watch(source, callback, { deep: 2 })

// 禁用深度
watch(source, callback, { deep: false })
watch(source, callback, { deep: 0 })
```

数字值表示遍历的层数：

```typescript
const state = reactive({
  level1: {              // 深度 1
    level2: {            // 深度 2
      level3: {          // 深度 3
        value: 1
      }
    }
  }
})

watch(state, callback, { deep: 2 })

state.level1 = {}            // 触发（深度 1）
state.level1.level2 = {}     // 触发（深度 2）
state.level1.level2.level3 = {}  // 不触发（深度 3）
```

## reactiveGetter 的深度处理

```typescript
function reactiveGetter(source: object) {
  if (deep) {
    return source  // 后面统一处理
  }
  if (isShallow(source) || deep === false || deep === 0) {
    return traverse(source, 1)  // 只遍历一层
  }
  return traverse(source)
}
```

当 deep 明确为 false 或 0 时，只遍历一层。这覆盖了 reactive 对象的自动深度监听。

```typescript
// reactive 对象默认深度监听
watch(state, callback)  // deep = true

// 显式禁用
watch(state, callback, { deep: false })  // 只监听一层
```

## 性能考虑

深度监听会遍历整个对象树，有性能开销：

```typescript
const bigObject = reactive({
  // 大量嵌套属性
})

// 不推荐：遍历整个对象
watch(bigObject, callback, { deep: true })

// 推荐：只监听需要的部分
watch(() => bigObject.specific.property, callback)

// 或者限制深度
watch(bigObject, callback, { deep: 2 })
```

## 与 shallowReactive 的关系

shallowReactive 只让顶层属性是响应式的：

```typescript
const state = shallowReactive({
  nested: { value: 1 }
})

// shallowReactive + deep: true
watch(state, callback, { deep: true })
state.nested.value = 2  // 不触发！
// 因为 nested.value 不是响应式的

// 正确方式：监听顶层变化
watch(state, callback)
state.nested = { value: 2 }  // 触发
```

deep 只影响遍历深度，不会让非响应式数据变成响应式。

## 数组的深度监听

```typescript
const list = reactive([{ name: 'a' }, { name: 'b' }])

watch(list, callback, { deep: true })

list[0].name = 'c'  // 触发
list.push({ name: 'd' })  // 触发
```

traverse 会遍历数组的每个元素，建立对元素属性的追踪。

## 支持的数据结构

traverse 支持多种数据结构：

```typescript
// 普通对象
const obj = reactive({ a: 1 })

// 数组
const arr = reactive([1, 2, 3])

// Map
const map = reactive(new Map([['key', { value: 1 }]]))

// Set
const set = reactive(new Set([{ value: 1 }]))

// 混合
const mixed = reactive({
  arr: [1, 2],
  map: new Map(),
  nested: { deep: { value: 1 } }
})
```

所有这些结构在 deep 模式下都会被正确遍历。

## Symbol 键的处理

traverse 会处理 Symbol 键：

```typescript
const sym = Symbol('key')
const obj = reactive({
  [sym]: { value: 1 }
})

watch(obj, callback, { deep: true })
obj[sym].value = 2  // 触发
```

使用 Object.getOwnPropertySymbols 获取 Symbol 键，然后检查是否可枚举。

## 与 immediate 的组合

```typescript
watch(source, callback, {
  deep: true,
  immediate: true
})
```

immediate 决定是否立即执行回调，deep 决定监听深度。两者是独立的选项。

## 本章小结

deep 选项通过 traverse 函数实现深度遍历，建立对嵌套属性的依赖追踪。Vue 3.5 增加了数字深度支持，提供更精细的控制。

理解 deep 的工作原理有助于优化性能——对于大对象，限制深度或直接监听特定属性比全量深度监听更高效。
