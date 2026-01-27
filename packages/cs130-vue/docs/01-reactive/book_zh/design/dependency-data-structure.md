# 依赖收集的数据结构设计

Vue3 响应式系统需要高效地存储和查询依赖关系。什么样的数据结构能够满足这些需求？这一章我们将深入探讨 Vue3 选择的数据结构，以及这些选择背后的考量。

## 依赖关系的本质

在设计数据结构之前，先明确我们要存储什么。依赖关系的本质是一个多对多的映射：一个 effect 可能依赖多个属性，一个属性也可能被多个 effect 依赖。

用更精确的方式描述：我们需要回答两个问题。第一，给定一个属性（由 target 和 key 唯一确定），有哪些 effect 依赖它？第二，给定一个 effect，它依赖哪些属性？

第一个问题是触发更新时需要回答的——当某个属性变化，需要快速找到所有依赖它的 effect。第二个问题是依赖清理时需要回答的——当 effect 重新执行前，需要清除它的所有旧依赖。

## targetMap → depsMap → dep

Vue3 使用三层嵌套的数据结构来存储依赖：

```
targetMap: WeakMap<target, depsMap>
    │
    └── depsMap: Map<key, dep>
            │
            └── dep: Set<ReactiveEffect>
```

**targetMap** 是最外层，一个 WeakMap，键是响应式对象的原始对象（target），值是这个对象的依赖映射（depsMap）。

**depsMap** 是中间层，一个 Map，键是属性名（key），值是这个属性的依赖集合（dep）。

**dep** 是最内层，一个 Set，包含所有依赖这个属性的 ReactiveEffect 实例。

让我们用具体的例子来说明这个结构：

```javascript
const user = reactive({ name: 'Alice', age: 25 })
const post = reactive({ title: 'Hello', likes: 0 })

effect(() => console.log(user.name))        // effect1
effect(() => console.log(user.name, user.age)) // effect2
effect(() => console.log(post.likes))       // effect3

// 此时 targetMap 的结构是：
// WeakMap {
//   [user 的原始对象] => Map {
//     'name' => Set { effect1, effect2 },
//     'age' => Set { effect2 }
//   },
//   [post 的原始对象] => Map {
//     'likes' => Set { effect3 }
//   }
// }
```

## 为什么用 WeakMap

外层使用 WeakMap 而不是普通 Map 是一个关键的设计决策。WeakMap 的特性是：键必须是对象，且是"弱引用"——当键对象没有其他引用时，键值对可以被垃圾回收。

这对响应式系统非常重要。想象一个场景：用户创建了一个响应式对象，使用一段时间后不再需要它。如果使用普通 Map，即使代码中没有任何变量引用这个对象，它仍然被 targetMap 持有，无法被垃圾回收，造成内存泄漏。

使用 WeakMap 后，当响应式对象不再被使用（没有任何强引用），它和对应的依赖信息都会被自动清理。开发者不需要手动调用任何清理方法。

```javascript
function createReactiveAndEffect() {
  const state = reactive({ count: 0 })
  effect(() => console.log(state.count))
  // 函数返回后，state 没有被外部引用
}

createReactiveAndEffect()
// 此时 state 对应的条目会从 targetMap 中被垃圾回收
// 无需手动清理
```

WeakMap 还有一个限制：不能遍历。但这对我们来说不是问题——我们只需要根据 target 查找对应的 depsMap，不需要遍历所有 target。

## 为什么 depsMap 用 Map

中间层使用普通 Map 而不是对象或 WeakMap。

不用对象的原因是：Map 可以使用任何类型作为键，包括 Symbol（如 `ITERATE_KEY`）。普通对象的键只能是字符串或 Symbol，虽然也能满足需求，但 Map 提供了更好的 API（`get`、`set`、`has`、`delete` 等方法，以及 `size` 属性）。

不用 WeakMap 的原因是：属性名（key）通常是字符串，而 WeakMap 的键必须是对象。即使所有 key 都用 Symbol，WeakMap 也不是好选择，因为我们需要在触发更新时遍历 depsMap 来找到某些特殊依赖（如 `ITERATE_KEY`）。

```javascript
// 在 trigger 中，有时需要遍历 depsMap
function trigger(target, type, key) {
  const depsMap = targetMap.get(target)
  
  // 如果是 CLEAR 操作，需要触发所有依赖
  if (type === TriggerOpTypes.CLEAR) {
    depsMap.forEach((dep, key) => {
      // 触发每个属性的依赖
    })
  }
  // ...
}
```

## 为什么 dep 用 Set

最内层使用 Set 是因为同一个 effect 不应该被同一个属性收集多次。如果 effect 在执行过程中多次读取同一个属性：

```javascript
effect(() => {
  // 多次读取 state.count
  const a = state.count
  const b = state.count
  const c = state.count
})
```

我们只需要记录一次依赖关系。Set 自动提供去重能力，避免了手动检查的开销。

Set 还提供了 O(1) 的 `add`、`has`、`delete` 操作，这对依赖收集和清理的性能很重要。

## effect.deps 的反向引用

除了"正向"的 targetMap → depsMap → dep 结构，Vue3 还维护了"反向"引用：每个 effect 都有一个 `deps` 数组，记录它被哪些 dep 收集了。

```javascript
class ReactiveEffect {
  deps = [] // 存储这个 effect 被添加到的所有 dep
  // ...
}
```

当 effect 被收集到某个 dep 时：

```javascript
function track(target, type, key) {
  // ...
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    // 反向引用：让 effect 也记住这个 dep
    activeEffect.deps.push(dep)
  }
}
```

这个反向引用在依赖清理时非常有用：

```javascript
function cleanupEffect(effect) {
  // 从所有收集了这个 effect 的 dep 中移除它
  for (const dep of effect.deps) {
    dep.delete(effect)
  }
  // 清空数组
  effect.deps.length = 0
}
```

没有这个反向引用，清理操作就需要遍历整个 targetMap，逐个检查每个 dep 是否包含这个 effect，效率会很低。

## ITERATE_KEY 的设计

当 effect 遍历对象时，它关心的是对象的"结构"而不是某个具体属性。Vue3 使用一个特殊的 Symbol 作为这种依赖的键：

```javascript
const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
```

当调用 `Object.keys(obj)` 或 `for...in obj` 时，ownKeys 拦截器会被触发，收集对 `ITERATE_KEY` 的依赖：

```javascript
function ownKeys(target) {
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

在 depsMap 中，`ITERATE_KEY` 就像一个普通的 key 一样被存储：

```javascript
// depsMap 可能看起来像这样：
// Map {
//   'name' => Set { effect1 },
//   'age' => Set { effect2 },
//   Symbol(iterate) => Set { effect3 }  // 遍历依赖
// }
```

当对象添加或删除属性时，除了触发具体属性的依赖，还会触发 `ITERATE_KEY` 的依赖：

```javascript
if (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) {
  add(depsMap.get(ITERATE_KEY))
}
```

这种设计让 Vue3 可以精确区分"值变化"和"结构变化"两种更新。

## 数组的 length 依赖

数组的 `length` 属性需要特殊处理。很多操作会隐式影响 length（如 push、pop），而 length 的变化也会影响数组元素的存在性。

Vue3 对数组维护了一个额外的依赖关系：当遍历数组时，除了收集 `ITERATE_KEY` 依赖，还会收集对 `length` 的依赖：

```javascript
function ownKeys(target) {
  // 数组使用 'length' 作为迭代 key
  track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

这样当数组的 length 变化时，遍历数组的 effect 会被正确触发。

## Vue 3.4 的优化：Dep 类

在 Vue 3.4 之前，dep 就是一个简单的 Set。Vue 3.4 引入了一个专门的 Dep 类来替代 Set，以实现更高效的依赖管理：

```javascript
class Dep {
  // 存储订阅的 effect
  subs = new Set()
  
  // 用于追踪和触发的版本号
  version = 0
  
  // 追踪时的版本号快照
  trackId = 0
}
```

这个 Dep 类支持基于版本号的依赖追踪优化。核心思想是：与其在每次 effect 执行前清理所有依赖然后重新收集，不如使用版本号来标记哪些依赖是"活跃的"。

每次 effect 执行时，会递增一个全局的 trackId。当依赖被收集时，dep 会记录这个 trackId。收集完成后，所有 trackId 不等于当前值的依赖关系就是"过期的"，可以被清理。

这种优化减少了 Set 操作的次数，尤其是在依赖关系基本稳定的场景下效果显著。

## 内存占用考量

响应式系统的数据结构会占用额外的内存。对于每个响应式对象，都需要一个 depsMap；对于每个被依赖的属性，都需要一个 dep Set；每个 effect 还需要维护自己的 deps 数组。

在大多数应用中，这个开销是可以接受的。但在数据量极大的场景下（如处理大型表格数据），可能需要考虑使用 `shallowReactive` 或 `markRaw` 来减少响应式开销。

```javascript
// 如果有一个很大的只读数据集
const bigData = markRaw(fetchLargeDataset())

const state = reactive({
  currentPage: 1,
  pageData: bigData // bigData 不会被响应式处理
})
```

## 与 Vue2 的对比

Vue2 使用了不同的依赖存储结构。每个属性都有一个 Dep 实例，Dep 是一个类，包含一个订阅者数组和各种方法。每个消费者是一个 Watcher 实例。

```javascript
// Vue2 的结构
class Dep {
  static target = null
  subs = [] // 订阅者数组
  
  addSub(sub) { this.subs.push(sub) }
  removeSub(sub) { remove(this.subs, sub) }
  depend() { if (Dep.target) { Dep.target.addDep(this) } }
  notify() { this.subs.forEach(sub => sub.update()) }
}

class Watcher {
  deps = []
  // ...
}
```

Vue3 的结构更加扁平和轻量：没有 Dep 类（3.4 之前），dep 就是一个简单的 Set。全局的 targetMap 统一管理所有依赖，而不是每个属性各自持有。

这种改变带来了几个好处：减少了类实例化的开销，使用原生 Set 代替数组提高了查找效率，统一的存储结构让调试和理解更加容易。

## 小结

Vue3 响应式系统的数据结构设计体现了对性能和内存的精心考量。WeakMap 作为最外层容器支持自动垃圾回收，Map 作为中间层提供灵活的键类型和高效的查找，Set 作为最内层自动去重并提供 O(1) 操作。反向引用（effect.deps）让依赖清理变得高效。特殊的 ITERATE_KEY 支持结构变化的精确追踪。

这些数据结构共同支撑了 Vue3 响应式系统的高效运作。在下一章中，我们将探讨调度器与批量更新的设计，了解 Vue3 是如何优化更新频率的。

