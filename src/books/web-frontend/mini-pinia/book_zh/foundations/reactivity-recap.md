---
sidebar_position: 2
title: Vue 3 响应式系统回顾
---

# Vue 3 响应式系统回顾

Pinia 的核心能力建立在 Vue 3 响应式系统之上。要深入理解 Pinia 的实现，我们必须先掌握 Vue 3 响应式系统的核心机制。

本章不是响应式系统的完整教程，而是聚焦于**与 Pinia 实现相关的关键概念**。

## 响应式的本质

首先问一个根本问题：什么是响应式？

响应式的核心是**自动追踪依赖和触发更新**。当数据变化时，依赖这份数据的代码自动重新执行。

```javascript
import { ref, watchEffect } from 'vue'

const count = ref(0)

// 当 count 变化时，这个函数自动重新执行
watchEffect(() => {
  console.log('count is:', count.value)
})

count.value = 1 // 控制台输出：count is: 1
count.value = 2 // 控制台输出：count is: 2
```

思考一下，Vue 是如何知道 `watchEffect` 回调依赖 `count` 的？

答案是**运行时依赖收集**。当 `watchEffect` 执行回调时，回调中访问了 `count.value`，这个访问操作被 Vue 拦截并记录下来。这样 Vue 就建立了 `count` 和回调之间的依赖关系。

## Proxy 与依赖追踪

Vue 3 使用 Proxy API 实现响应式。让我们看一个简化的实现：

```javascript
// 当前正在执行的副作用函数
let activeEffect = null

// 依赖关系映射：target -> key -> effects
const targetMap = new WeakMap()

function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 依赖收集
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      // 触发更新
      trigger(target, key)
      return result
    }
  })
}

function track(target, key) {
  if (!activeEffect) return
  
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  dep.add(activeEffect)
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => effect())
  }
}
```

这段代码展示了响应式系统的核心机制：

1. **get 拦截器**：当属性被访问时，调用 `track` 收集当前的 `activeEffect`
2. **set 拦截器**：当属性被修改时，调用 `trigger` 执行所有收集到的 effect

理解了这个机制，我们就能明白为什么 Pinia 的 Store 状态可以自动触发组件更新——Store 的状态是响应式的，组件的渲染函数在执行时会访问这些状态，从而被收集为依赖。

## ref 与 reactive 的区别

Vue 3 提供了两种创建响应式数据的方式：`ref` 和 `reactive`。理解它们的区别对实现 Pinia 至关重要。

### ref：包装原始值

```javascript
import { ref, isRef } from 'vue'

const count = ref(0)

console.log(count.value) // 0
console.log(isRef(count)) // true

count.value = 1
```

`ref` 用于包装任何类型的值，包括原始值（number、string 等）。访问和修改值需要通过 `.value` 属性。

为什么需要 `.value`？因为 JavaScript 无法对原始值进行 Proxy 包装，只能对对象进行代理。`ref` 创建一个包装对象，用 `.value` 属性持有实际值。

### reactive：深度代理对象

```javascript
import { reactive, isReactive } from 'vue'

const state = reactive({
  count: 0,
  nested: {
    value: 'hello'
  }
})

console.log(state.count) // 0
console.log(isReactive(state)) // true
console.log(isReactive(state.nested)) // true，嵌套对象也是响应式的

state.count = 1
state.nested.value = 'world'
```

`reactive` 对对象进行深度代理，嵌套属性也会被转换为响应式。访问属性不需要 `.value`。

### 关键区别

这两者有一个关键区别，在 Pinia 实现中非常重要：

```javascript
const refValue = ref({ count: 0 })
const reactiveValue = reactive({ count: 0 })

// ref 可以整体替换
refValue.value = { count: 1 } // ✅ 有效，触发更新

// reactive 不能整体替换
reactiveValue = { count: 1 } // ❌ 无效，丢失响应性
```

`ref` 可以整体替换 `.value`，而 `reactive` 对象不能直接赋值替换。这个特性影响了 Pinia 中 `$state` 属性和 `$reset` 方法的实现方式。

### 在 Pinia 中的应用

Pinia 的 Setup Store 需要识别返回值中的 `ref` 和 `reactive`：

```javascript
const useStore = defineStore('test', () => {
  const count = ref(0)           // 被识别为 state
  const obj = reactive({ x: 1 }) // 被识别为 state
  const doubled = computed(() => count.value * 2) // 被识别为 getter
  
  function increment() {         // 被识别为 action
    count.value++
  }
  
  return { count, obj, doubled, increment }
})
```

Pinia 如何区分它们？通过 Vue 提供的类型检查函数：

```javascript
import { isRef, isReactive, isComputed } from 'vue'

// 判断是否为 ref
isRef(count)        // true

// 判断是否为 reactive
isReactive(obj)     // true

// 判断是否为 computed（computed 也是一种特殊的 ref）
isComputed(doubled) // true
```

## computed：惰性计算属性

`computed` 是 Vue 响应式系统的重要组成部分，对应 Pinia 中的 getters。

```javascript
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

console.log(doubled.value) // 0
count.value = 5
console.log(doubled.value) // 10
```

`computed` 有两个关键特性：

**惰性求值**：只有当 `.value` 被访问时才计算。如果依赖没有变化，直接返回缓存值。

```javascript
const expensive = computed(() => {
  console.log('calculating...')
  return count.value * 2
})

// 第一次访问，执行计算
console.log(expensive.value) // 输出：calculating... 然后输出 0

// count 没变，再次访问不重新计算
console.log(expensive.value) // 直接输出 0，没有 calculating...

// count 改变
count.value = 1

// 下次访问时重新计算
console.log(expensive.value) // 输出：calculating... 然后输出 2
```

**依赖追踪**：`computed` 自动追踪其依赖。当依赖变化时，标记自己为"脏"（需要重新计算），但不立即计算。

这个惰性特性很重要。Pinia 的 getters 就是基于 `computed` 实现的，继承了这些优化特性。

### 可写的 computed

`computed` 也可以设置 setter：

```javascript
const count = ref(0)

const doubled = computed({
  get: () => count.value * 2,
  set: val => {
    count.value = val / 2
  }
})

doubled.value = 10
console.log(count.value) // 5
```

这在 Pinia 的 `mapWritableState` 实现中会用到。

## watch 与 watchEffect

Vue 3 提供了两种监听响应式数据的方式，Pinia 的订阅系统会用到类似的机制。

### watchEffect：自动依赖收集

```javascript
import { ref, watchEffect } from 'vue'

const count = ref(0)

const stop = watchEffect(() => {
  console.log('count:', count.value)
})

count.value = 1 // 自动触发回调

// 停止监听
stop()
count.value = 2 // 不再触发
```

`watchEffect` 的特点：
- 立即执行回调
- 自动追踪回调中访问的响应式依赖
- 返回停止函数

### watch：显式指定监听源

```javascript
import { ref, watch } from 'vue'

const count = ref(0)

watch(count, (newVal, oldVal) => {
  console.log(`count changed from ${oldVal} to ${newVal}`)
})

count.value = 1 // 输出：count changed from 0 to 1
```

`watch` 的特点：
- 默认不立即执行（可通过 `immediate: true` 改变）
- 显式指定监听源
- 回调接收新值和旧值

### flush 选项

`watch` 和 `watchEffect` 都支持 `flush` 选项，控制回调的执行时机：

```javascript
watchEffect(
  () => {
    console.log('count:', count.value)
  },
  {
    flush: 'sync' // 同步执行
    // flush: 'pre' // 组件更新前（默认）
    // flush: 'post' // 组件更新后
  }
)
```

Pinia 的 `$subscribe` 方法也支持类似的 `flush` 选项，用于控制订阅回调的执行时机。

## toRaw 与 markRaw

这两个函数在 Pinia 实现中会用到，用于处理响应式转换。

### toRaw：获取原始对象

```javascript
import { reactive, toRaw } from 'vue'

const original = { count: 0 }
const observed = reactive(original)

console.log(toRaw(observed) === original) // true
```

`toRaw` 返回响应式对象的原始对象。这在需要进行原始对象比较或序列化时很有用。

### markRaw：标记为不可响应

```javascript
import { reactive, markRaw } from 'vue'

const state = reactive({
  user: markRaw({
    id: 1,
    name: 'John'
  })
})

// user 不会被转换为响应式
console.log(isReactive(state.user)) // false
```

`markRaw` 标记一个对象，使其永远不会被转换为响应式。这用于优化性能（某些数据不需要响应式）或避免响应式转换带来的问题。

在 Pinia 中，某些内部属性会使用 `markRaw` 标记，避免不必要的响应式开销。

## toRef 与 toRefs

这两个函数在 Pinia 的 `storeToRefs` 实现中扮演核心角色。

### toRef：创建属性的 ref 引用

```javascript
import { reactive, toRef } from 'vue'

const state = reactive({ count: 0 })
const countRef = toRef(state, 'count')

// countRef 与 state.count 保持同步
countRef.value = 1
console.log(state.count) // 1

state.count = 2
console.log(countRef.value) // 2
```

`toRef` 创建一个 ref，它与源响应式对象的某个属性保持同步。修改 ref 会影响源对象，反之亦然。

### toRefs：将所有属性转换为 ref

```javascript
import { reactive, toRefs } from 'vue'

const state = reactive({
  count: 0,
  name: 'test'
})

const { count, name } = toRefs(state)

// 解构后仍保持响应性
count.value = 1
console.log(state.count) // 1
```

`toRefs` 将响应式对象的所有属性转换为 ref 对象，使得解构后仍然保持响应性。

这正是 Pinia 的 `storeToRefs` 所做的事情：

```javascript
const store = useCounterStore()

// 直接解构会丢失响应性
const { count } = store // ❌ count 不是响应式的

// 使用 storeToRefs 保持响应性
const { count } = storeToRefs(store) // ✅ count 是响应式的
```

## 副作用与清理

响应式系统中的副作用需要适当的清理机制，否则会导致内存泄漏。

### onScopeDispose

```javascript
import { effectScope, onScopeDispose, ref, watchEffect } from 'vue'

const scope = effectScope()

scope.run(() => {
  const count = ref(0)
  
  watchEffect(() => {
    console.log('count:', count.value)
  })
  
  // 注册清理函数
  onScopeDispose(() => {
    console.log('scope is being disposed')
  })
})

// 停止 scope 内的所有副作用
scope.stop() // 输出：scope is being disposed
```

`onScopeDispose` 注册一个清理函数，当所属的 effect scope 被停止时执行。这在 Pinia 的 Store 清理机制中会用到。

## 本章小结

本章回顾了与 Pinia 实现相关的 Vue 3 响应式系统核心概念：

1. **响应式原理**：通过 Proxy 拦截属性访问和修改，实现依赖收集和触发更新。

2. **ref 与 reactive**：`ref` 包装任何值需要 `.value` 访问，`reactive` 深度代理对象。Pinia 需要识别并区分它们。

3. **computed**：惰性计算属性，对应 Pinia 的 getters。

4. **watch 与 watchEffect**：监听响应式数据变化，Pinia 订阅系统基于类似机制。

5. **toRef 与 toRefs**：保持解构后的响应性，是 `storeToRefs` 的基础。

6. **副作用清理**：`onScopeDispose` 注册清理函数，确保资源正确释放。

下一章我们将深入 `effectScope`，这是理解 Pinia Store 生命周期管理的关键。

---

**下一章**：[effectScope 原理与应用](effect-scope.md)
