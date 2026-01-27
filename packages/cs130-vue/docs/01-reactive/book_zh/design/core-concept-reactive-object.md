# 核心概念：响应式对象

响应式对象是 Vue3 响应式系统的基础。当我们调用 `reactive(obj)` 时，返回的是原对象的一个 Proxy 代理，这个代理会拦截所有对对象的操作，在读取时收集依赖，在修改时触发更新。理解响应式对象的工作原理，是掌握整个响应式系统的第一步。

## 什么是响应式对象

从使用者的角度看，响应式对象和普通对象几乎没有区别。你可以正常读取和设置属性，可以遍历、删除属性，可以传给任何接受对象的函数。唯一的区别是：当响应式对象的属性被修改时，所有依赖这个属性的"观察者"都会收到通知。

这种"透明性"正是 Vue 响应式系统追求的体验。开发者不需要学习新的数据操作方式，直接用熟悉的 JavaScript 语法就能享受响应式带来的便利。

让我们从一个简单的例子开始：

```javascript
import { reactive, effect } from '@vue/reactivity'

const state = reactive({
  count: 0,
  message: 'Hello'
})

// effect 会自动追踪它内部访问的响应式属性
effect(() => {
  console.log(`Count is: ${state.count}`)
})

// 修改 count，effect 自动重新执行
state.count++ // 输出: Count is: 1
state.count++ // 输出: Count is: 2

// 修改 message 不会触发这个 effect，因为 effect 没有访问 message
state.message = 'World' // 无输出
```

这段代码展示了响应式对象的核心行为：当 `effect` 函数执行时，它访问了 `state.count`，Vue 会记录下"这个 effect 依赖 state 的 count 属性"。之后当 `state.count` 被修改时，Vue 会重新执行这个 effect。而 `state.message` 的修改不会触发任何反应，因为没有 effect 依赖它。

## 响应式对象的内部结构

当调用 `reactive(target)` 时，Vue3 做了以下几件事：

首先，检查 `target` 是否适合被代理。只有普通对象和数组才会被代理，原始值（number、string 等）、已经被代理过的对象、被 `markRaw` 标记的对象都不会被处理。

然后，检查这个 `target` 是否已经有对应的代理。Vue3 维护了一个 WeakMap（叫做 `reactiveMap`），键是原对象，值是对应的代理对象。如果已经存在，直接返回缓存的代理。

如果需要创建新代理，Vue3 会用 Proxy 包装 `target`，配置一组拦截器（handler），然后把新创建的代理存入 `reactiveMap` 后返回。

用简化的代码表示这个流程：

```javascript
const reactiveMap = new WeakMap()

function reactive(target) {
  // 1. 检查是否可代理
  if (!isObject(target)) {
    console.warn(`value cannot be made reactive: ${String(target)}`)
    return target
  }
  
  // 2. 如果已经是代理，直接返回
  if (target.__v_isReactive) {
    return target
  }
  
  // 3. 检查缓存
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
  // 4. 创建新的 Proxy
  const proxy = new Proxy(target, baseHandlers)
  
  // 5. 缓存并返回
  reactiveMap.set(target, proxy)
  return proxy
}
```

这里有几个设计细节值得注意。使用 WeakMap 而不是普通 Map 是为了避免内存泄漏——当原对象没有其他引用时，它和对应的代理都可以被垃圾回收。`__v_isReactive` 是一个特殊属性，用于标识一个对象是否是响应式代理，这样当你把一个代理对象再次传给 `reactive` 时，它会直接返回而不是创建双重代理。

## 拦截器的工作机制

真正的"魔法"发生在 Proxy 的拦截器（handlers）中。Vue3 为普通对象定义了一组 `baseHandlers`，包括 `get`、`set`、`has`、`deleteProperty`、`ownKeys` 等拦截器。

**get 拦截器**是依赖收集的入口。每当访问响应式对象的属性时，get 拦截器会被触发。在这里，Vue3 会调用 `track` 函数记录"当前正在执行的 effect 依赖了这个属性"：

```javascript
function get(target, key, receiver) {
  // 处理特殊属性（如 __v_isReactive）
  if (key === '__v_isReactive') {
    return true
  }
  if (key === '__v_raw') {
    return target
  }
  
  // 获取属性值
  const result = Reflect.get(target, key, receiver)
  
  // 收集依赖
  track(target, 'get', key)
  
  // 如果属性值是对象，递归地将其转为响应式
  if (isObject(result)) {
    return reactive(result)
  }
  
  return result
}
```

这段代码有几个要点。对特殊属性的处理让外部可以检测一个对象是否是响应式的（`isReactive()`），以及获取代理背后的原对象（`toRaw()`）。`track` 调用是依赖收集的核心，我们会在后续章节详细讨论。返回值的递归响应式处理体现了"惰性代理"的策略——只有当嵌套对象被访问时，才会为它创建代理。

**set 拦截器**是触发更新的入口。每当设置响应式对象的属性时，set 拦截器会被触发。Vue3 会先执行实际的赋值操作，然后调用 `trigger` 函数通知所有依赖这个属性的 effect：

```javascript
function set(target, key, value, receiver) {
  // 获取旧值（用于判断是否真的发生了变化）
  const oldValue = target[key]
  
  // 判断是添加新属性还是修改已有属性
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  
  // 执行赋值操作
  const result = Reflect.set(target, key, value, receiver)
  
  // 只有当值真正改变时才触发更新
  if (!hadKey) {
    // 新增属性
    trigger(target, 'add', key, value)
  } else if (hasChanged(value, oldValue)) {
    // 修改属性
    trigger(target, 'set', key, value, oldValue)
  }
  
  return result
}
```

这里的设计也很精细。区分"添加"和"修改"是因为某些 effect 可能只关心对象的结构变化（如遍历对象的 keys），它们只需要在添加或删除属性时触发。`hasChanged` 函数会正确处理 NaN 的比较（`NaN !== NaN` 但我们认为它们是"相同"的），避免无意义的更新触发。

**deleteProperty 拦截器**处理属性删除：

```javascript
function deleteProperty(target, key) {
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const result = Reflect.deleteProperty(target, key)
  
  // 只有当属性确实存在并且被成功删除时才触发
  if (hadKey && result) {
    trigger(target, 'delete', key)
  }
  
  return result
}
```

**has 拦截器**处理 `in` 操作符：

```javascript
function has(target, key) {
  const result = Reflect.has(target, key)
  track(target, 'has', key)
  return result
}
```

**ownKeys 拦截器**处理属性遍历（如 `Object.keys`、`for...in`）：

```javascript
function ownKeys(target) {
  // 使用特殊的 ITERATE_KEY 来追踪迭代操作
  track(target, 'iterate', ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

这个设计值得多说两句。当你遍历对象时，你关心的是对象"有哪些属性"，而不是某个具体属性的值。所以 Vue3 使用一个特殊的 `ITERATE_KEY` 来表示"对整个对象结构的依赖"。当对象添加或删除属性时（结构变化），会触发所有依赖 `ITERATE_KEY` 的 effect。

## 不同类型的响应式对象

Vue3 提供了多种创建响应式对象的方式，每种都有其适用场景。

**reactive**创建深度响应式对象。嵌套的对象也会被递归地转换成响应式，这是最常用的方式：

```javascript
const state = reactive({
  user: {
    name: 'Alice',
    profile: {
      age: 25
    }
  }
})

// 嵌套属性也是响应式的
effect(() => {
  console.log(state.user.profile.age)
})

state.user.profile.age = 26 // 触发 effect
```

**shallowReactive**创建浅响应式对象。只有根级别的属性是响应式的，嵌套对象保持原样：

```javascript
const state = shallowReactive({
  user: {
    name: 'Alice',
    profile: {
      age: 25
    }
  }
})

// 根级别属性是响应式的
effect(() => {
  console.log(state.user)
})
state.user = { name: 'Bob' } // 触发 effect

// 但嵌套属性不是响应式的
effect(() => {
  console.log(state.user.profile.age)
})
state.user.profile.age = 30 // 不触发 effect！
```

`shallowReactive` 的使用场景包括：当你有一个很大的对象但只需要追踪根级别的变化时，或者当嵌套对象来自外部且你不希望它被修改时。

**readonly**创建只读的响应式对象。任何修改尝试都会被拒绝并在开发环境中发出警告：

```javascript
const state = readonly({
  count: 0
})

// 读取是正常的
console.log(state.count) // 0

// 修改会被拒绝
state.count++ // 警告: Set operation on key "count" failed: target is readonly.
```

`readonly` 常用于向子组件传递 props 时防止意外修改，或者创建真正不可变的配置对象。

**shallowReadonly**则是两者的结合——根级别只读，但嵌套对象可以修改：

```javascript
const state = shallowReadonly({
  config: { debug: true },
  version: '1.0'
})

state.version = '2.0' // 警告，被拒绝
state.config.debug = false // 允许！（嵌套对象不是只读的）
```

## 响应式对象的恒等性

一个经常被问到的问题是：同一个原对象多次调用 `reactive` 会返回相同的代理吗？答案是肯定的。

```javascript
const obj = { count: 0 }
const proxy1 = reactive(obj)
const proxy2 = reactive(obj)

console.log(proxy1 === proxy2) // true
```

这个设计是为了保证恒等性——如果每次调用都返回新的代理，那么 `reactive(obj) === reactive(obj)` 就会是 `false`，这会导致很多令人困惑的问题。

类似地，如果你把一个已经是响应式的对象再次传给 `reactive`，它会直接返回同一个代理：

```javascript
const proxy = reactive({ count: 0 })
const proxy2 = reactive(proxy)

console.log(proxy === proxy2) // true
```

## toRaw 和 markRaw

有时候你需要访问响应式对象背后的原始对象，或者标记某个对象永远不应该被转换成响应式。Vue3 提供了 `toRaw` 和 `markRaw` 两个工具函数。

**toRaw**返回响应式对象对应的原始对象：

```javascript
const original = { count: 0 }
const proxy = reactive(original)

console.log(toRaw(proxy) === original) // true

// 对原始对象的修改不会触发响应式更新
const raw = toRaw(proxy)
raw.count++ // 不触发任何 effect
```

`toRaw` 的使用场景包括：临时脱离响应式系统进行高性能操作，或者与外部库（期望普通对象）交互。

**markRaw**标记一个对象永远不应该被转换成响应式：

```javascript
const config = markRaw({
  apiUrl: 'https://api.example.com',
  timeout: 5000
})

const state = reactive({
  config // config 不会被转换成响应式
})

// state.config 仍然是原始对象，不是代理
console.log(isReactive(state.config)) // false
```

`markRaw` 常用于第三方库返回的对象（如类实例、不可变数据结构）、大型只读数据结构（如静态配置、缓存数据），这些对象被转换成响应式没有意义，反而会造成性能开销。

## 响应式对象的限制

尽管 Proxy 解决了 `Object.defineProperty` 的很多限制，响应式对象仍然有一些需要注意的边界情况。

**原始值无法被代理**。Proxy 只能代理对象，不能代理原始值（number、string、boolean 等）。这就是为什么 Vue3 提供了 `ref` API——它用一个对象包装原始值，使其可以被追踪：

```javascript
// 这样不行
const count = reactive(0) // 返回 0 本身，不是响应式的

// 需要使用 ref
const count = ref(0)
count.value++ // 通过 .value 访问和修改
```

**解构会丢失响应式**。当你解构一个响应式对象时，得到的是普通值的副本，不再是响应式的：

```javascript
const state = reactive({ count: 0, name: 'Alice' })

// 解构得到的是普通值
const { count, name } = state

// 修改这些变量不会影响原对象，也不会触发更新
count++ // state.count 仍然是 0
```

如果需要保持响应式，可以使用 `toRefs`：

```javascript
const { count, name } = toRefs(state)
// 现在 count 和 name 都是 ref
count.value++ // 这会修改 state.count 并触发更新
```

**某些内置对象需要特殊处理**。`Map`、`Set`、`WeakMap`、`WeakSet` 有自己的内部机制，Vue3 为它们提供了专门的拦截器（`collectionHandlers`）。而 `Date`、`RegExp` 等对象目前无法被完全响应式化——你可以把它们放在响应式对象中，但修改它们的内部状态不会触发更新：

```javascript
const state = reactive({
  date: new Date()
})

// 替换整个 Date 对象会触发更新
state.date = new Date() // 触发

// 但调用 Date 的方法不会触发更新
state.date.setFullYear(2025) // 不触发！
```

理解了响应式对象的工作原理后，我们接下来要探讨另一个核心概念：副作用函数（effect）。正是 effect 函数建立了数据和更新逻辑之间的桥梁。

