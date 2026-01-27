# 核心概念：触发更新

触发更新（trigger）是依赖收集的"对偶"操作。当响应式数据被修改时，系统需要找到所有依赖这个数据的 effect，然后通知它们重新执行。这个通知的过程就是触发更新。

## 触发更新的时机

触发更新发生在响应式对象的属性被修改时。这包括三种情况：设置属性值（set）、删除属性（deleteProperty）、以及某些特殊操作（如清空 Map 或 Set）。

在 Proxy 的 set 拦截器中，Vue3 会在完成赋值操作后调用 `trigger` 函数：

```javascript
function set(target, key, value, receiver) {
  // 获取旧值，用于判断是否真的发生了变化
  const oldValue = target[key]
  
  // 判断是新增还是修改
  const hadKey = hasOwn(target, key)
  
  // 执行实际的赋值操作
  const result = Reflect.set(target, key, value, receiver)
  
  // 只有操作成功且值确实改变了才触发更新
  if (result) {
    if (!hadKey) {
      // 新增属性
      trigger(target, TriggerOpTypes.ADD, key, value)
    } else if (hasChanged(value, oldValue)) {
      // 修改属性
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
  }
  
  return result
}
```

这段代码有几个关键点值得注意。首先，只有当 `Reflect.set` 返回 `true`（操作成功）时才触发更新。其次，区分了"新增"和"修改"两种操作类型，这会影响后续需要触发哪些 effect。最后，使用 `hasChanged` 函数判断新旧值是否真的不同，避免不必要的更新。

## 不同操作类型的触发

Vue3 定义了几种触发操作类型（`TriggerOpTypes`）：

**SET** —— 修改已有属性的值。这会触发依赖这个属性的 effect。

**ADD** —— 添加新属性。除了触发对新属性的依赖外，还会触发 ITERATE 类型的依赖（因为对象的结构变了）。

**DELETE** —— 删除属性。同样会触发 ITERATE 依赖。

**CLEAR** —— 清空集合（用于 Map 和 Set）。会触发所有依赖。

这种分类让 Vue3 可以精准地只触发需要触发的 effect，避免不必要的更新。

```javascript
const state = reactive({ count: 0 })

// effect1 只依赖 count 属性
effect(() => {
  console.log('count:', state.count)
})

// effect2 依赖对象的结构（keys）
effect(() => {
  console.log('keys:', Object.keys(state))
})

// 修改 count：只触发 effect1
state.count = 1

// 添加新属性：触发 effect2（因为 keys 变了）
state.name = 'Alice'

// 删除属性：同样触发 effect2
delete state.name
```

## trigger 函数的实现

`trigger` 函数的职责是：根据修改的目标对象、操作类型和属性，找到所有需要触发的 effect，然后执行它们。

```javascript
function trigger(target, type, key, newValue, oldValue) {
  // 获取这个 target 的依赖 Map
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 这个对象没有被任何 effect 依赖，直接返回
    return
  }
  
  // 收集需要触发的 effect
  const effectsToRun = new Set()
  
  // 添加 effect 的辅助函数
  const add = (effects) => {
    if (effects) {
      effects.forEach(effect => {
        // 避免无限循环：不触发当前正在执行的 effect
        if (effect !== activeEffect) {
          effectsToRun.add(effect)
        }
      })
    }
  }
  
  // 根据不同的操作类型，收集对应的 effect
  if (type === TriggerOpTypes.CLEAR) {
    // 清空操作：触发所有依赖
    depsMap.forEach(add)
  } else {
    // 添加对这个具体 key 的依赖
    if (key !== undefined) {
      add(depsMap.get(key))
    }
    
    // 处理 ADD 和 DELETE 的额外触发
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!isArray(target)) {
          // 对象添加属性：触发 ITERATE 依赖
          add(depsMap.get(ITERATE_KEY))
        } else if (isIntegerKey(key)) {
          // 数组添加元素：触发 length 依赖
          add(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!isArray(target)) {
          // 对象删除属性：触发 ITERATE 依赖
          add(depsMap.get(ITERATE_KEY))
        }
        break
      case TriggerOpTypes.SET:
        if (isArray(target) && key === 'length') {
          // 数组 length 变化：触发所有索引 >= 新 length 的依赖
          depsMap.forEach((dep, key) => {
            if (key === 'length' || key >= newValue) {
              add(dep)
            }
          })
        }
        break
    }
  }
  
  // 执行收集到的 effect
  effectsToRun.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}
```

这段代码的核心逻辑是"收集"然后"执行"。先根据操作类型和属性，从 `depsMap` 中收集所有相关的 effect 到一个 Set 中（使用 Set 可以自动去重，避免同一个 effect 被执行多次）。然后遍历这个 Set，执行每个 effect。

## 数组的特殊触发逻辑

数组的触发更新有几个特殊情况需要处理。

**通过索引设置元素**：如果设置的索引大于等于当前数组长度，这实际上是一个 ADD 操作（添加新元素），需要触发对 `length` 的依赖。

```javascript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log('length:', arr.length)
})

// 设置超出长度的索引，触发 length 依赖
arr[10] = 'x' // 输出: length: 11
```

**修改 length 属性**：当 length 减小时，意味着部分元素被"删除"了。需要触发这些被删除索引的依赖。

```javascript
const arr = reactive([1, 2, 3, 4, 5])

effect(() => {
  console.log('arr[3]:', arr[3])
})

// 缩短数组长度，触发索引 3 的依赖
arr.length = 2 // 输出: arr[3]: undefined
```

**数组方法的触发**：`push`、`pop`、`shift` 等方法会隐式修改 `length`，Vue3 需要确保这些操作正确触发更新。但这里有一个微妙的问题：这些方法在执行时会先读取 `length`，这会建立对 `length` 的依赖；然后写入 `length`，这会触发依赖。如果处理不当，会导致无限循环。

Vue3 的解决方案是在执行这些数组方法时临时禁用依赖收集：

```javascript
const arrayInstrumentations = {}

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  arrayInstrumentations[method] = function(...args) {
    // 暂停依赖收集
    pauseTracking()
    // 执行原始方法
    const result = Array.prototype[method].apply(this, args)
    // 恢复依赖收集
    resetTracking()
    return result
  }
})
```

## scheduler 的作用

在 `trigger` 的最后一步，不是直接执行 effect，而是检查 effect 是否有 scheduler。如果有，就调用 scheduler 而不是 effect 本身：

```javascript
effectsToRun.forEach(effect => {
  if (effect.scheduler) {
    effect.scheduler(effect)
  } else {
    effect.run()
  }
})
```

scheduler 是一个强大的扩展点，让上层 API 可以控制 effect 的执行时机和方式。

**computed 的 scheduler** 不会重新计算，只是标记 computed 为"脏"（需要重新计算）。只有当 computed 的值被访问时，才会真正重新计算。这实现了惰性求值。

**watch 的 scheduler** 会将回调推入一个队列，在下一个微任务中统一执行。这实现了批量更新——即使依赖的数据变化了多次，回调也只会执行一次。

**组件渲染的 scheduler** 同样会将更新任务推入队列，然后在微任务中统一执行 DOM 更新。这避免了一个事件处理函数中多次数据修改导致多次 DOM 更新。

## 批量触发与去重

当多个数据同时变化时，可能会有多个 effect 需要触发，甚至同一个 effect 被多次触发。Vue3 的设计确保每个 effect 最多执行一次。

第一层去重发生在 `trigger` 函数内部：通过使用 Set 收集 effect，自动去除重复。

```javascript
const effectsToRun = new Set()

// 即使 add 被调用多次传入同一个 effect，Set 也只会保留一个
add(depsMap.get('a'))
add(depsMap.get('b')) // 如果依赖 a 和 b 的是同一个 effect，只会保留一份
```

第二层去重发生在调度层面：带 scheduler 的 effect 通常会被推入队列，而队列通常也会去重。

```javascript
const queue = new Set()

function queueJob(job) {
  if (!queue.has(job)) {
    queue.add(job)
  }
}
```

这种多层去重确保了即使数据变化很频繁，每个 effect 在一个更新周期中最多执行一次。

## 触发顺序的保证

在某些场景下，effect 的执行顺序很重要。比如父组件的渲染应该在子组件之前（这样子组件的 props 才是最新的）。Vue3 通过给 effect 分配 ID 并在执行前排序来保证顺序：

```javascript
effectsToRun.forEach(effect => {
  // 可以根据 effect.id 排序
})

// 或者在队列层面保证顺序
function flushJobs() {
  // 按 id 排序
  queue.sort((a, b) => a.id - b.id)
  // 然后依次执行
  queue.forEach(job => job())
}
```

组件在创建时会获得一个递增的 ID，父组件总是比子组件先创建，所以父组件的 ID 更小。按 ID 排序后执行，就保证了正确的更新顺序。

## 同步触发 vs 异步触发

默认情况下，effect 的触发是同步的——调用 `trigger` 后，所有相关的 effect 会在当前调用栈中执行。但通过 scheduler，可以实现异步触发。

Vue 组件更新使用异步触发。当你在一个事件处理函数中多次修改数据：

```javascript
function handleClick() {
  state.count++
  state.count++
  state.count++
  // DOM 不会在这里更新三次
}
// handleClick 执行完毕后，在下一个微任务中，DOM 只更新一次
```

这种设计的好处是显而易见的：避免中间状态的渲染，减少 DOM 操作，提升性能。代价是更新不是立即可见的，如果需要读取更新后的 DOM，需要使用 `nextTick`。

## onTrigger 调试钩子

与 `onTrack` 对应，`onTrigger` 钩子可以在 effect 被触发时调用，帮助调试更新来源：

```javascript
effect(
  () => {
    console.log(state.count)
  },
  {
    onTrigger(e) {
      console.log('Effect triggered:')
      console.log('  target:', e.target)
      console.log('  key:', e.key)
      console.log('  type:', e.type)
      console.log('  oldValue:', e.oldValue)
      console.log('  newValue:', e.newValue)
      // 在这里可以打断点，查看调用栈
      debugger
    }
  }
)

state.count = 5
// 输出:
// Effect triggered:
//   target: { count: 0 }
//   key: count
//   type: set
//   oldValue: 0
//   newValue: 5
```

这个钩子在调试"为什么这个 effect 被触发了"时特别有用。通过 `debugger` 暂停，你可以在调用栈中看到是哪段代码修改了数据。

## 触发更新的性能考量

触发更新是响应式系统中的热路径（hot path），需要特别关注性能。

**避免不必要的触发**：`hasChanged` 函数确保只有值真正改变时才触发更新。它使用 `Object.is` 来比较，正确处理 `NaN`（`NaN === NaN` 为 false，但我们认为它们是"相同"的）和 `+0`/`-0`（它们 `===` 相等，但 `Object.is` 认为它们不同）。

```javascript
function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue)
}
```

**使用 Set 去重**：Set 的 `add` 和 `has` 操作都是 O(1) 的，确保了收集 effect 的高效性。

**scheduler 延迟执行**：通过 scheduler 将执行推入队列，可以合并多次触发，减少实际执行次数。

## 小结

触发更新是响应式系统的"输出端"。当数据变化时，`trigger` 函数负责找到所有相关的 effect 并执行它们。不同的操作类型（SET、ADD、DELETE、CLEAR）会触发不同范围的依赖。数组有额外的特殊处理逻辑。scheduler 机制让上层 API 可以控制执行时机，实现惰性求值和批量更新。

至此，我们已经理解了响应式系统的四个核心概念：响应式对象、副作用函数、依赖收集和触发更新。它们共同构成了 Vue3 响应式系统的骨架。在下一章中，我们将探讨依赖收集的数据结构设计，深入了解 targetMap、depsMap 和 dep 的具体实现。

