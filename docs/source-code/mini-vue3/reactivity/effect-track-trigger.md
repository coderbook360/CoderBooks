# effect 与依赖收集：track 和 trigger 的实现

有了 `reactive`，我们可以拦截数据的读写。**但还缺少关键的一环：Vue 是如何知道哪些函数需要在数据变化时重新执行的？**

这就是本章要解决的核心问题。

## 首先要问的问题

**先思考一下**：假设你是 Vue 框架的设计者，当用户写下这样的代码：

```javascript
effect(() => {
  console.log(state.count)
})
```

你如何知道这个函数依赖了 `state.count`？

可能很多人会想到"静态分析"——分析函数的源代码，找出所有访问的变量。**但这条路走不通**：

1. 函数可能有条件分支，不同情况访问不同的数据
2. 可能动态拼接属性名 `state[key]`
3. 可能调用其他函数，其他函数又访问数据...

**正确的思路是"运行时收集"**：执行函数，观察它实际访问了哪些数据。这就是 `effect` 的核心思想。

## effect 的作用

`effect` 用于注册一个**副作用函数**。这个函数会立即执行一次，在执行过程中访问的所有响应式数据都会被自动追踪。之后，当这些数据变化时，函数会自动重新执行。

```javascript
const state = reactive({ count: 0 })

effect(() => {
  console.log('count is', state.count)
})
// 立即输出：count is 0

state.count = 1
// 自动输出：count is 1
```

**有没有很神奇的感觉？** 我们没有告诉 Vue"这个函数依赖 count"，它自己就知道了！

## 最简单的 effect

让我们从最简单的版本开始，理解核心原理：

```javascript
// 版本一：最简实现
let activeEffect = null  // 全局变量，记录"当前正在执行的 effect"

function effect(fn) {
  activeEffect = fn  // 标记当前正在执行的 effect
  fn()               // 执行函数，触发依赖收集
  activeEffect = null  // 执行完毕，清除标记
}
```

**这里的关键是 `activeEffect` 这个全局变量**。在 `fn` 执行期间，如果访问了响应式数据，`track` 函数就能通过 `activeEffect` 知道"是谁在读取"。

```javascript
// track 伪代码
function track(target, key) {
  if (activeEffect) {
    // 把 activeEffect 记录到 target[key] 的依赖列表
  }
}
```

**但这个版本过于简单**，没有返回值，不能控制执行，也不支持嵌套。我们需要一个更完善的设计。

## ReactiveEffect 类

用类来封装 effect 的逻辑，这样可以添加更多功能：

```javascript
// 版本二：用类封装
class ReactiveEffect {
  constructor(fn) {
    this.fn = fn
    this.deps = []  // 新增：存储该 effect 依赖的所有 deps 集合
  }
  
  run() {
    activeEffect = this
    const result = this.fn()
    activeEffect = null
    return result
  }
}

function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
  return _effect  // 返回 effect 实例，方便后续操作
}
```

**你可能会问：`deps` 属性是干什么用的？**

它记录了这个 effect 被哪些依赖集合收集。这个信息在依赖清理时会用到——下一章我们会详细讨论。现在先记住：**这是一个"反向引用"，effect 需要知道自己被谁收集了**。

## 依赖存储结构

**现在要问第二个问题**：依赖关系存在哪里？

假设有多个 effect 都依赖了 `state.count`，我们需要一个数据结构来记录这种关系。当 `state.count` 变化时，能找到所有相关的 effect。

Vue 3 使用三层嵌套结构：

```
targetMap: WeakMap<target, depsMap>
  └── depsMap: Map<key, deps>
        └── deps: Set<ReactiveEffect>
```

用具体例子说明：

```javascript
// 假设有这样的代码
const state = reactive({ count: 0, name: 'Vue' })

effect1: () => console.log(state.count)      // 依赖 count
effect2: () => console.log(state.count, state.name)  // 依赖 count 和 name

// 则 targetMap 的结构是：
targetMap = {
  state对象: {
    'count': Set([effect1, effect2]),  // count 被两个 effect 依赖
    'name': Set([effect2])              // name 只被一个 effect 依赖
  }
}
```

**为什么这样设计？每一层都有其道理**：

- **WeakMap**：key 是弱引用。当 target 对象被销毁时，对应的依赖信息会自动被垃圾回收，避免内存泄漏。
- **Map**：支持任意类型的 key（包括 Symbol），比普通对象更灵活。
- **Set**：自动去重，同一个 effect 不会被重复收集。

## track 实现

理解了数据结构，`track` 的实现就水到渠成了：

```javascript
const targetMap = new WeakMap()

function track(target, key) {
  // 没有 effect 在执行，不需要收集
  if (!activeEffect) return
  
  // 第一层：获取 target 对应的 depsMap
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  
  // 第二层：获取 key 对应的 deps
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  
  // 第三层：添加当前 effect 到 deps
  if (!deps.has(activeEffect)) {
    deps.add(activeEffect)
    // 新增：反向记录——effect 也记住自己被哪些 deps 收集了
    activeEffect.deps.push(deps)
  }
}
```

**注意最后的"反向记录"**。这里可能有点绕，让我解释一下：

- **正向**：`deps` 记录了依赖某个属性的所有 effect（"谁依赖了这个属性"）
- **反向**：`effect.deps` 记录了这个 effect 被哪些 deps 收集（"我被收集到了哪些地方"）

**为什么需要反向记录？** 这是一个很重要的设计决策。答案在下一章揭晓——依赖清理时，我们需要从所有相关的 deps 中移除某个 effect，这就需要知道"这个 effect 在哪些 deps 里"。先记住这个设计，后面你就会明白它的精妙之处。

## trigger 实现

**接下来要问：数据变化时怎么通知所有依赖的 effect？**

```javascript
function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  const deps = depsMap.get(key)
  if (!deps) return
  
  // 重要：创建新的 Set 执行，避免无限循环
  const effectsToRun = new Set()
  
  deps.forEach(effect => {
    // 避免 effect 触发自己
    if (effect !== activeEffect) {
      effectsToRun.add(effect)
    }
  })
  
  effectsToRun.forEach(effect => {
    effect.run()
  })
}
```

**这里有两个关键细节，很多人第一次看会忽略**：

### 细节一：为什么要创建新的 Set？

假设 effect 内部修改了同一个属性：

```javascript
effect(() => {
  state.count = state.count + 1  // 既读又写
})
```

执行这个 effect 时会发生什么？

1. 读取 `state.count`，触发 `track`，effect 被添加到 deps
2. 写入 `state.count`，触发 `trigger`
3. `trigger` 遍历 deps，执行 effect
4. effect 执行时又读写 `state.count`...

**如果直接遍历原始 deps，会导致无限循环**——遍历的同时在添加/删除元素，遍历永远不会结束。创建新 Set 可以避免这个问题。

### 细节二：为什么要检查 `effect !== activeEffect`？

这是为了防止 **effect 在自己执行过程中触发自己**。上面的例子中，如果没有这个检查，effect 会不断触发自己执行，同样导致无限循环。

**这两个保护缺一不可**。

## 完整流程图解

让我们用一个例子走一遍完整流程，**你可以在脑中跟着模拟**：

```javascript
// 1. 创建响应式对象
const state = reactive({ count: 0 })

// 2. 注册 effect
effect(() => {
  console.log('count is:', state.count)
})
```

执行流程：

```
effect(() => { ... })
  ↓
创建 ReactiveEffect 实例
  ↓
调用 _effect.run()
  ↓
activeEffect = _effect
  ↓
执行 fn()，访问 state.count
  ↓
触发 proxy.get
  ↓
调用 track(state, 'count')
  ↓
将 _effect 添加到 state.count 的 deps
  ↓
activeEffect = null
```

之后修改数据：

```javascript
state.count = 1
```

执行流程：

```
state.count = 1
  ↓
触发 proxy.set
  ↓
调用 trigger(state, 'count')
  ↓
找到 state.count 的所有 deps
  ↓
遍历执行每个 effect.run()
  ↓
输出 "count is: 1"
```

## 操作类型

**再深入一步**：Vue 3 还区分了不同的操作类型，这在处理复杂场景时很有用：

```javascript
const TrackOpTypes = {
  GET: 'get',        // 普通属性读取
  HAS: 'has',        // in 操作符
  ITERATE: 'iterate' // for...in 循环
}

const TriggerOpTypes = {
  SET: 'set',        // 修改已有属性
  ADD: 'add',        // 新增属性
  DELETE: 'delete'   // 删除属性
}
```

**为什么要区分操作类型？** 举个例子：当你给对象新增一个属性时，可能需要触发 `for...in` 循环的依赖（因为属性列表变了）；但修改已有属性时不需要。操作类型让 trigger 能更精确地知道"该通知谁"。

## 与 Vue 3 源码对比

Vue 3 源码位于 `packages/reactivity/src/effect.ts`。核心结构和我们的实现一致，但增加了：

- 调度器支持（scheduler）——控制 effect 何时执行
- 停止 effect（stop）——手动停止追踪
- 作用域管理（effectScope）——批量管理 effect 的生命周期
- 更细致的性能优化

我们会在后续章节逐步添加这些功能。**理解了核心原理，这些扩展功能就容易理解了。**

## 本章小结

这一章我们回答了一个核心问题：**Vue 是如何知道哪些函数需要在数据变化时重新执行的？**

答案是"运行时收集"：

1. **effect** 执行函数时，设置全局标记 `activeEffect`
2. **track** 在数据被读取时，把 `activeEffect` 记录到依赖列表
3. **trigger** 在数据被修改时，执行依赖列表中的所有 effect

数据结构设计：

```
targetMap (WeakMap)
  └── depsMap (Map)
        └── deps (Set)
```

**但是，这个实现还有两个严重问题**：分支切换时旧依赖没有被清理，嵌套 effect 会导致 `activeEffect` 被覆盖。下一章我们来解决它们。

---

## 练习与思考

1. 实现一个完整的最小响应式系统，包括 `reactive`、`effect`、`track`、`trigger`：

```javascript
const state = reactive({ count: 0, text: 'hello' })

effect(() => {
  console.log(state.count, state.text)
})

state.count++      // 应该触发更新
state.text = 'hi'  // 应该触发更新
```

2. **思考这个问题**：如果一个 effect 依赖 `state.a` 和 `state.b`，修改 `state.a` 后立即修改 `state.b`，effect 会执行几次？这合理吗？如何优化？（提示：这就是调度器要解决的问题）

3. 为什么 `activeEffect.deps.push(deps)` 这个"反向记录"是必要的？思考一下：如果一个 effect 不再依赖某个属性了，如何"退订"？

3. 为什么 `activeEffect.deps.push(deps)` 是必要的？它在什么场景下会用到？
