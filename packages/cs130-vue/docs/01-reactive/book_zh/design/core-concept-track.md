# 核心概念：依赖收集

依赖收集（track）是响应式系统的核心机制之一。当副作用函数访问响应式数据时，系统需要记录下"谁依赖了什么"，这样当数据变化时才知道该通知谁。这个记录的过程就是依赖收集。

## 依赖收集的时机

依赖收集发生在响应式对象的属性被读取时。在 Proxy 的 get 拦截器中，Vue3 会调用 `track` 函数来记录当前 effect 对这个属性的依赖：

```javascript
function get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  
  // 依赖收集
  track(target, TrackOpTypes.GET, key)
  
  // 如果是对象，递归响应式处理
  if (isObject(result)) {
    return reactive(result)
  }
  
  return result
}
```

但并不是所有的属性访问都需要收集依赖。只有在副作用函数执行期间（`activeEffect` 存在时）的访问才需要收集。如果只是普通代码中的属性访问，没有 effect 在运行，就不需要记录依赖关系。

```javascript
const state = reactive({ count: 0 })

// 这里没有 effect 在运行，访问 count 不会收集依赖
console.log(state.count)

// 这里有 effect 在运行，访问 count 会收集依赖
effect(() => {
  console.log(state.count) // 此时 activeEffect 指向这个 effect
})
```

## 不同类型的依赖收集

Vue3 会根据不同的访问操作类型（`TrackOpTypes`）来区分依赖：

**GET** —— 读取属性值。这是最常见的依赖类型，当 effect 读取 `obj.key` 时产生。

**HAS** —— 检查属性是否存在。当 effect 使用 `'key' in obj` 时产生。

**ITERATE** —— 遍历对象。当 effect 使用 `Object.keys(obj)` 或 `for...in` 时产生。

区分这些类型很重要，因为不同的数据修改操作应该触发不同类型的依赖。比如添加新属性会影响 ITERATE 类型的依赖（因为遍历的结果会变），但不会影响已有属性的 HAS 依赖。

```javascript
const state = reactive({ name: 'Alice' })

// 这个 effect 有一个 GET 类型的依赖（对 name 属性）
effect(() => {
  console.log(state.name)
})

// 这个 effect 有一个 HAS 类型的依赖（检查 age 是否存在）
effect(() => {
  if ('age' in state) {
    console.log('Has age')
  }
})

// 这个 effect 有一个 ITERATE 类型的依赖（遍历所有 keys）
effect(() => {
  console.log(Object.keys(state))
})

// 添加 age 属性
state.age = 25
// - 不会触发第一个 effect（name 没变）
// - 会触发第二个 effect（'age' in state 的结果变了）
// - 会触发第三个 effect（keys 的结果变了）
```

## 依赖存储的数据结构

Vue3 使用一个嵌套的数据结构来存储依赖关系。最外层是一个 WeakMap（`targetMap`），键是响应式对象的原始对象，值是一个 Map（`depsMap`）。这个内层 Map 的键是属性名，值是一个 Set（`dep`），包含所有依赖这个属性的 effect。

```javascript
// 依赖存储结构
// targetMap: WeakMap<target, Map<key, Set<ReactiveEffect>>>

const targetMap = new WeakMap()

// 例如，对于以下代码：
const state = reactive({ count: 0, name: 'Alice' })
effect(() => console.log(state.count))
effect(() => console.log(state.name))

// 依赖结构会是这样：
// targetMap = WeakMap {
//   [state 的原始对象] => Map {
//     'count' => Set { effect1 },
//     'name' => Set { effect2 }
//   }
// }
```

这个设计有几个优点。使用 WeakMap 作为最外层容器，意味着当响应式对象不再被引用时，它的依赖关系可以被垃圾回收，避免内存泄漏。使用 Map 作为第二层，可以快速定位到特定属性的依赖集合。使用 Set 作为最内层，可以自动去重（同一个 effect 多次访问同一个属性只会被记录一次）并提供 O(1) 的添加和删除操作。

## track 函数的实现

理解了数据结构后，`track` 函数的实现就比较直观了：

```javascript
function track(target, type, key) {
  // 如果没有活跃的 effect，不需要收集
  if (!activeEffect) {
    return
  }
  
  // 获取这个 target 的依赖 Map
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  // 获取这个 key 的依赖 Set
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  
  // 将当前 effect 添加到依赖集合中
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 同时让 effect 记住这个 dep（用于后续清理）
    activeEffect.deps.push(dep)
  }
}
```

这段代码的逻辑是逐层查找或创建数据结构，最终将当前 effect 添加到对应属性的依赖集合中。同时，effect 也会记住自己被添加到了哪些 dep 中（`activeEffect.deps.push(dep)`），这是为了后续的依赖清理——当 effect 需要重新执行时，它需要从所有 dep 中移除自己。

## 双向关联的设计

Vue3 的依赖管理是双向的：dep 知道有哪些 effect 依赖它，effect 也知道自己被哪些 dep 收集了。这种双向关联虽然增加了一些内存开销，但让依赖清理变得非常高效。

为什么需要双向关联？考虑依赖清理的场景。当 effect 需要重新执行时，它的依赖可能会发生变化。为了保证正确性，需要先清除旧的依赖关系，再重新收集新的依赖。

如果只有 dep → effect 的单向关联，清理就会变得困难。我们需要遍历所有的 dep，检查每个 dep 中是否包含这个 effect，然后移除。这个操作的复杂度是 O(n*m)，其中 n 是 dep 的数量，m 是每个 dep 中 effect 的数量。

有了 effect → deps 的反向关联后，清理就变成了 O(k) 操作，其中 k 是这个 effect 依赖的 dep 数量：

```javascript
function cleanupEffect(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}
```

## ITERATE_KEY 的特殊处理

当 effect 遍历对象时（通过 `Object.keys`、`for...in` 等），它关心的是对象的"结构"而不是某个具体属性的值。Vue3 使用一个特殊的 symbol（`ITERATE_KEY`）来表示这种依赖：

```javascript
const ITERATE_KEY = Symbol('iterate')

function ownKeys(target) {
  // 使用特殊的 key 来追踪迭代依赖
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

当对象添加或删除属性时（结构发生变化），需要触发所有依赖 `ITERATE_KEY` 的 effect：

```javascript
function trigger(target, type, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const effects = new Set()
  
  // 根据操作类型收集需要触发的 effect
  if (key !== undefined) {
    // 添加依赖这个具体 key 的 effect
    addEffects(effects, depsMap.get(key))
  }
  
  // 如果是添加或删除属性，还需要触发迭代依赖
  if (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) {
    addEffects(effects, depsMap.get(ITERATE_KEY))
  }
  
  // 执行所有收集到的 effect
  effects.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}
```

这种设计让 Vue3 可以精确区分"值变化"和"结构变化"两种更新类型，实现更精准的更新触发。

## 数组的特殊依赖收集

数组的依赖收集有一些特殊情况需要处理。

当访问数组的索引时，会收集对这个索引的依赖。但更重要的是数组的 `length` 属性。很多数组操作都会影响 length——`push` 会增加 length，`pop` 会减少 length，通过索引设置超出当前长度的元素也会增加 length。

Vue3 对数组做了特殊处理。当数组的 `length` 发生变化时，需要触发两类依赖：一是对 `length` 本身的依赖，二是对所有索引 >= 新 length 的依赖（因为这些元素被"删除"了）。

```javascript
// 数组 set 的特殊处理
function set(target, key, value, receiver) {
  const oldValue = target[key]
  const hadKey = isArray(target) 
    ? Number(key) < target.length 
    : hasOwn(target, key)
  
  const result = Reflect.set(target, key, value, receiver)
  
  if (!hadKey) {
    // 新增元素
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    // 修改元素
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  
  return result
}
```

另外，数组的某些方法（如 `includes`、`indexOf`）需要遍历整个数组来查找元素。Vue3 对这些方法做了特殊重写，确保在调用时能正确收集对所有访问到的索引的依赖。

## 避免无限循环

依赖收集机制需要小心处理一个边界情况：如果 effect 在执行过程中既读取又修改同一个属性，可能会导致无限循环。

```javascript
const state = reactive({ count: 0 })

// 这个 effect 会无限循环
effect(() => {
  state.count++ // 先读取 count，然后修改 count
})
// 读取 count → 收集依赖 → 修改 count → 触发 effect → 读取 count → ...
```

Vue3 通过检查触发的 effect 是否就是当前正在执行的 effect 来避免这种情况：

```javascript
function trigger(target, type, key, newValue, oldValue) {
  // ... 收集 effects ...
  
  effects.forEach(effect => {
    // 避免无限循环：如果触发的 effect 就是当前正在执行的 effect，跳过它
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        effect.scheduler(effect)
      } else {
        effect.run()
      }
    }
  })
}
```

## Vue 3.4 的优化：位运算标记

在 Vue 3.4 之前，每次 effect 重新执行都会完全清理旧依赖，然后重新收集。这个过程涉及大量的 Set 操作（delete 和 add），在依赖数量很大时会有性能开销。

Vue 3.4 引入了一种基于位运算的优化策略。核心思想是用"标记"替代"删除+重新添加"。每个 dep 和 effect 都有一个标记位，在收集前标记为"新"，收集后根据标记决定是保留还是移除依赖关系。

这种优化将依赖清理的时间复杂度从 O(n)（n 是 dep 数量）降低到了接近 O(1)，对大型应用的性能有显著提升。具体的实现细节会在源码解析部分详细讨论。

## 调试依赖收集

Vue3 提供了 `onTrack` 钩子来调试依赖收集过程：

```javascript
effect(
  () => {
    console.log(state.count)
  },
  {
    onTrack(e) {
      console.log('Dependency tracked:')
      console.log('  target:', e.target)
      console.log('  type:', e.type)
      console.log('  key:', e.key)
    }
  }
)
// 输出:
// Dependency tracked:
//   target: { count: 0 }
//   type: get
//   key: count
```

这个钩子在调试复杂的响应式问题时非常有用。你可以看到 effect 到底依赖了哪些属性，帮助理解为什么某些数据变化会或不会触发更新。

## 小结

依赖收集是响应式系统"自动追踪"能力的基础。通过 Proxy 的 get 拦截器，Vue3 可以在 effect 执行期间自动记录它访问了哪些响应式属性。这些依赖关系被存储在一个 WeakMap → Map → Set 的嵌套结构中，既能快速查找，又支持垃圾回收。

不同类型的访问操作（GET、HAS、ITERATE）被区分对待，实现了精准的更新触发。双向关联（dep ↔ effect）的设计让依赖清理变得高效。这些精心的设计共同构成了 Vue3 响应式系统的核心机制。

下一章，我们将探讨触发更新（trigger）的实现，看看当数据变化时，Vue3 是如何找到并执行相关的 effect 的。

