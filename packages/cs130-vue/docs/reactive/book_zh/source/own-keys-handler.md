# ownKeys 拦截器

ownKeys 拦截器处理对象键的枚举操作，包括 `Object.keys()`、`Object.getOwnPropertyNames()`、`for...in` 循环等。这个拦截器让迭代操作也变得可追踪。

## 触发 ownKeys 的操作

以下操作会触发 ownKeys 拦截器：

```javascript
const state = reactive({ a: 1, b: 2 })

Object.keys(state)           // 触发 ownKeys
Object.getOwnPropertyNames(state)  // 触发 ownKeys
Object.getOwnPropertySymbols(state) // 触发 ownKeys
Reflect.ownKeys(state)       // 触发 ownKeys

for (const key in state) {   // 触发 ownKeys
  console.log(key)
}
```

这些操作都需要获取对象的所有键，底层都会调用 `[[OwnPropertyKeys]]` 内部方法，被 ownKeys 拦截器拦截。

## 实现分析

ownKeys 拦截器的实现非常简洁：

```typescript
function ownKeys(target: object): (string | symbol)[] {
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

函数做了两件事：调用 track 收集依赖，然后返回 Reflect.ownKeys 的结果。

关键在于 track 的参数。它不是追踪某个具体的 key，而是追踪一个特殊的 ITERATE_KEY。

## ITERATE_KEY 的作用

ITERATE_KEY 是一个唯一标识符：

```typescript
export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
```

为什么需要这个特殊的 key？考虑这个场景：

```javascript
const state = reactive({ a: 1, b: 2 })

effect(() => {
  console.log(Object.keys(state))
})
// 输出：['a', 'b']

state.c = 3
// effect 应该重新执行，输出：['a', 'b', 'c']

state.a = 100
// effect 不应该重新执行，因为 keys 没变
```

Object.keys 的结果只和对象有哪些属性有关，与属性的值无关。我们需要区分两种更新：

修改已有属性的值（SET）：不影响 keys。

新增或删除属性（ADD/DELETE）：影响 keys。

ITERATE_KEY 就是用来区分这两种情况的。只有 ADD 和 DELETE 类型的更新会触发 ITERATE_KEY 的依赖，SET 类型不会。

## trigger 中的处理

让我们看 trigger 函数如何处理 ITERATE_KEY：

```typescript
function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  let deps: (Dep | undefined)[] = []
  
  // ... 省略部分代码 ...

  if (type === TriggerOpTypes.ADD) {
    if (!isArray(target)) {
      deps.push(depsMap.get(ITERATE_KEY))
    } else if (isIntegerKey(key)) {
      deps.push(depsMap.get('length'))
    }
  } else if (type === TriggerOpTypes.DELETE) {
    if (!isArray(target)) {
      deps.push(depsMap.get(ITERATE_KEY))
    }
  }
  
  // ... 省略部分代码 ...
}
```

当触发 ADD 或 DELETE 时，会额外获取 ITERATE_KEY 的依赖集合，通知依赖于迭代的 effect。

## 数组的特殊处理

对于数组，ownKeys 不用 ITERATE_KEY，而是用 'length'：

```typescript
track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
```

为什么？因为数组的"键列表"和 length 直接相关。`Object.keys(arr)` 返回 `['0', '1', ..., 'length-1']`，这些都取决于 length。

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log(Object.keys(arr))
})
// 输出：['0', '1', '2']

arr.push(4)
// effect 重新执行，输出：['0', '1', '2', '3']

arr.length = 2
// effect 重新执行，输出：['0', '1']
```

push 和直接设置 length 都会改变 length，从而触发依赖 'length' 的 effect。

## 与 for...in 的关系

for...in 循环也触发 ownKeys：

```javascript
const state = reactive({ a: 1 })

effect(() => {
  for (const key in state) {
    console.log(key)
  }
})

state.b = 2 // effect 重新执行
```

这意味着 for...in 循环是响应式的——当对象的键变化时，循环会重新执行。

但要注意，for...in 循环不追踪值的变化：

```javascript
effect(() => {
  for (const key in state) {
    console.log(key, state[key])  // 这里访问了 state[key]，会追踪这些值
  }
})
```

如果循环体内访问了属性值，那些值的变化也会触发 effect。但单纯的 `for (const key in state)` 只追踪键的变化。

## 实际应用场景

ownKeys 追踪在以下场景特别有用：

动态列表渲染：

```javascript
const items = reactive({})

// 模板中
// <div v-for="key in Object.keys(items)">{{ items[key] }}</div>

items.newItem = { name: 'New' }  // 列表自动更新
```

对象属性统计：

```javascript
const data = reactive({})

const count = computed(() => Object.keys(data).length)

data.a = 1 // count 变为 1
data.b = 2 // count 变为 2
delete data.a // count 变回 1
```

条件显示：

```javascript
const errors = reactive({})

const hasErrors = computed(() => Object.keys(errors).length > 0)

errors.name = 'Name is required' // hasErrors 变为 true
delete errors.name // hasErrors 变回 false
```

## 性能考量

ownKeys 的追踪粒度是"整个对象"，而不是具体的某个 key。这意味着任何属性的增删都会触发依赖于迭代的 effect，即使那个 effect 并不关心被增删的具体属性。

在大多数场景下这不是问题。但如果有一个 effect 频繁执行 Object.keys()，而对象又在不断增删属性，可能需要考虑优化。

一种优化方式是使用 computed 缓存 keys：

```javascript
const keys = computed(() => Object.keys(state))

effect(() => {
  // 使用 keys.value 而不是每次都调用 Object.keys
  keys.value.forEach(key => {
    // ...
  })
})
```

computed 会缓存结果，只有 keys 真正变化时才重新计算。

## Map 和 Set 的 ownKeys

对于 Map 和 Set，ownKeys 的行为有所不同。这些集合类型有自己的迭代方式（forEach、entries、values 等），通过 collectionHandlers 处理。

```javascript
const map = reactive(new Map())

effect(() => {
  map.forEach((value, key) => console.log(key, value))
})

map.set('a', 1) // effect 重新执行
```

集合的迭代追踪我们会在集合处理器的章节详细讨论。

## 小结

ownKeys 拦截器让对象的遍历操作变得可追踪。它使用 ITERATE_KEY（对象）或 'length'（数组）作为追踪标识，只有属性的增删会触发相关 effect，值的修改不会。这种设计在保持正确性的同时，避免了不必要的更新。

至此，我们已经分析了普通对象的所有 Proxy 拦截器：get、set、has、deleteProperty、ownKeys。下一章我们将转向集合类型的处理——collectionHandlers。

