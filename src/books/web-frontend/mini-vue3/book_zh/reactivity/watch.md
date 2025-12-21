# watch 与 watchEffect：侦听器的完整实现

假设你想在某个数据变化时发起网络请求，如何优雅地实现？

这就是 `watch` 的用武之地。

## 首先要问的问题

**先思考一下**：watch 和 computed 有什么区别？都是"响应数据变化"，为什么需要两个不同的 API？

```javascript
// computed：派生一个新值
const doubled = computed(() => count.value * 2)

// watch：数据变化时执行副作用
watch(count, (newVal) => {
  fetchData(newVal)  // 发请求
})
```

**关键区别**：
- computed 是"计算新值"——有返回值，强调缓存
- watch 是"执行副作用"——没有返回值，强调"当...变化时，做..."

**理解了这个区别，就明白为什么两者都需要了。**

## watch 的基本用法

```javascript
const count = ref(0)

// 观察 ref
watch(count, (newValue, oldValue) => {
  console.log(`count 从 ${oldValue} 变成了 ${newValue}`)
})

count.value = 1
// 输出：count 从 0 变成了 1
```

也可以观察一个 getter 函数：

```javascript
watch(
  () => count.value * 2,
  (newValue, oldValue) => {
    console.log(`doubled 从 ${oldValue} 变成了 ${newValue}`)
  }
)
```

## watch 的核心原理

**思考一下**：watch 的本质是什么？

答案是：**effect + scheduler**。

1. 用 effect 追踪数据的依赖
2. 依赖变化时，不是重新执行 getter，而是通过 scheduler 执行回调

**是不是和 computed 很像？** computed 的 scheduler 是"标记 dirty"，watch 的 scheduler 是"执行回调"。它们都是 effect 的变体，只是 scheduler 的行为不同。

**这就是 Vue 3 响应式系统设计的精妙之处**——通过 scheduler 这个扩展点，一套核心机制可以实现多种不同的功能。

## 最简实现

```javascript
// 版本一：最简实现
function watch(source, callback) {
  // 第一步：确定 getter（要追踪什么）
  let getter
  if (typeof source === 'function') {
    getter = source
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => traverse(source)  // 深度遍历，触发所有属性的追踪
  }
  
  let oldValue
  
  // 第二步：创建 effect，用 scheduler 执行回调
  const effectFn = effect(getter, {
    lazy: true,  // 不立即执行
    scheduler() {
      const newValue = effectFn()  // 获取新值
      callback(newValue, oldValue)  // 执行回调
      oldValue = newValue  // 更新旧值
    }
  })
  
  // 第三步：获取初始值
  oldValue = effectFn()
}
```

**关键点**：

- `lazy: true`：手动控制首次执行
- `scheduler`：依赖变化时执行回调，而不是重新执行 getter
- `oldValue`：保存旧值，这样回调就能拿到新旧值对比

## immediate 选项

**有时候你希望创建 watch 时就立即执行一次回调**：

```javascript
watch(count, (n, o) => {
  console.log(n, o)
}, { immediate: true })
// 立即输出：0 undefined
```

实现：

```javascript
// 版本二：支持 immediate
function watch(source, callback, options = {}) {
  let getter = /* 同上 */
  let oldValue
  
  // 把执行回调封装成 job
  const job = () => {
    const newValue = effectFn()
    callback(newValue, oldValue)
    oldValue = newValue
  }
  
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: job
  })
  
  // 新增：根据 immediate 决定是否立即执行
  if (options.immediate) {
    job()  // 立即执行回调
  } else {
    oldValue = effectFn()  // 只获取初始值，不执行回调
  }
}
```

## deep 深度监听

**监听 reactive 对象时，默认是深度监听**：

```javascript
const state = reactive({ nested: { count: 0 } })

watch(state, () => {
  console.log('state changed')
})

state.nested.count = 1  // 触发回调！
```

**思考一下**：怎么实现深度监听？

答案是：**遍历对象的所有属性，触发每个属性的依赖收集**。

```javascript
function traverse(value, seen = new Set()) {
  // 原始值直接返回
  if (typeof value !== 'object' || value === null) {
    return value
  }
  
  // 避免循环引用
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  
  // 递归遍历所有属性——这会触发每个属性的 get，从而收集依赖
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else {
    for (const key in value) {
      traverse(value[key], seen)
    }
  }
  
  return value
}
```

在 watch 中使用：

```javascript
function watch(source, callback, options = {}) {
  let getter
  
  if (typeof source === 'function') {
    getter = source
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    // reactive 对象默认深度监听
    getter = () => traverse(source)
  }
  
  // 如果指定 deep，包装 getter
  if (options.deep) {
    const originalGetter = getter
    getter = () => traverse(originalGetter())
  }
  
  // ... 后续逻辑
}
```

## flush 执行时机

**现在要思考另一个重要问题：回调什么时候执行？**

你可能觉得"数据变了就执行呗"，但实际上这里面大有学问。

```javascript
watch(count, () => {
  console.log('count changed')
  console.log(document.querySelector('#count').textContent)  // DOM 内容是新的还是旧的？
}, { flush: 'post' })  // DOM 更新后执行
```

**思考一下**：如果你想在回调里读取最新的 DOM，应该什么时候执行回调？

Vue 3 提供了三种执行时机：

| flush | 执行时机 | 典型场景 |
|-------|----------|----------|
| `sync` | 同步执行，数据变化后**立即**执行 | 需要最快响应 |
| `pre` | DOM 更新**前**执行（默认） | 一般的副作用操作 |
| `post` | DOM 更新**后**执行 | 需要访问更新后的 DOM |

实现并不复杂——不同的 flush 选项，使用不同的调度策略：

```javascript
function watch(source, callback, options = {}) {
  // ... getter 处理
  
  const job = () => {
    const newValue = effectFn()
    callback(newValue, oldValue)
    oldValue = newValue
  }
  
  // 新增：根据 flush 选项决定调度方式
  let scheduler
  
  if (options.flush === 'sync') {
    // sync：直接执行，不走队列
    scheduler = job
  } else if (options.flush === 'post') {
    // post：放入"后置队列"，DOM 更新后执行
    scheduler = () => queuePostFlushCb(job)
  } else {
    // pre（默认）：放入"前置队列"，DOM 更新前执行
    scheduler = () => queuePreFlushCb(job)
  }
  
  const effectFn = effect(getter, {
    lazy: true,
    scheduler
  })
  
  // ... immediate 处理
}
```

**有没有发现**：flush 的本质就是控制 job 是直接执行还是放入队列！

`queuePostFlushCb` 和 `queuePreFlushCb` 是调度器系统的一部分，我们会在调度器章节详细讲解。现在你只需要知道：它们把回调放入不同的队列，在不同的时机批量执行。

**权衡思考**：

- `sync` 最快响应，但如果连续触发多次变化，回调也会执行多次
- `pre`/`post` 会批量处理，性能更好，但响应稍慢

## 停止监听

**自然要问**：监听开始了，怎么停止？

watch 返回一个停止函数，这是一个非常优雅的设计：

```javascript
const stop = watch(count, () => {
  console.log('count changed')
})

count.value = 1  // 触发回调

stop()  // 停止监听

count.value = 2  // 不再触发！
```

**可能你会问**：停止监听到底做了什么？

答案很简单：**清理依赖关系，标记为失效**。

```javascript
function watch(source, callback, options = {}) {
  // ... 
  
  const effectFn = effect(getter, {
    lazy: true,
    scheduler
  })
  
  // ...
  
  // 返回停止函数
  return () => {
    stop(effectFn)
  }
}

function stop(effect) {
  // 从所有 deps 中移除这个 effect
  cleanup(effect)
  // 标记为已停止，后续不再执行
  effect.active = false
}
```

## onCleanup 清理函数

**这是 watch 中最精妙的设计之一。**

看这个场景：

```javascript
watch(id, async (newId) => {
  const data = await fetch(`/api/${newId}`)
  // 使用 data 更新界面
})
```

**思考一下**：如果 id 快速变化了 3 次（1 → 2 → 3），会发生什么？

答案是：**3 个请求会同时发出！** 而且它们的返回顺序是不确定的。如果请求 1 最后返回，界面显示的就是错误的数据！

**这就是典型的竞态问题。**

Vue 3 的解决方案非常优雅——让回调能够清理自己：

```javascript
watch(id, async (newId, oldId, onCleanup) => {
  // 新增：用一个标志来标记这次回调是否"过期"
  let cancelled = false
  
  // onCleanup 注册一个清理函数，在下次执行前会被调用
  onCleanup(() => {
    cancelled = true  // 标记为已取消
  })
  
  const data = await fetch(`/api/${newId}`)
  
  // 只有没被取消时才处理结果
  if (!cancelled) {
    // 安全地使用 data
  }
})
```

**这里的设计非常精妙**。每次回调执行前，都会先执行上一次的清理函数！让我们看看实现：

```javascript
function watch(source, callback, options = {}) {
  // ...
  
  // 保存清理函数
  let cleanup
  
  function onCleanup(fn) {
    cleanup = fn  // 注册清理函数
  }
  
  const job = () => {
    const newValue = effectFn()
    
    // 新增：执行上一次的清理函数
    if (cleanup) {
      cleanup()  // 这会把上一次的 cancelled 设为 true
    }
    
    // 把 onCleanup 传给回调，让回调可以注册清理函数
    callback(newValue, oldValue, onCleanup)
    oldValue = newValue
  }
  
  // ...
}
```

**别担心，让我画一个时序图**：

```
id = 1 → 发起请求 A，注册 cleanup A
    ↓
id = 2 → 执行 cleanup A（cancelled = true）→ 发起请求 B，注册 cleanup B
    ↓
id = 3 → 执行 cleanup B（cancelled = true）→ 发起请求 C，注册 cleanup C
    ↓
请求 A 返回 → cancelled = true → 忽略
请求 C 返回 → cancelled = false → 使用！
请求 B 返回 → cancelled = true → 忽略
```

**有没有发现**：通过 cleanup 链，只有最后一次的结果会被使用！
```

## watchEffect

**现在回答开头的问题**：既然有了 watch，为什么还要 watchEffect？

看对比：

```javascript
// watch：需要明确指定监听的数据
watch(count, (newVal) => {
  console.log(newVal)
})

// watchEffect：自动追踪回调中用到的数据
watchEffect(() => {
  console.log(count.value)  // 自动追踪 count！
})
```

**watchEffect 更像是"写什么依赖什么"**——你在回调里读取了什么数据，就自动监听什么数据。

**它的实现出乎意料地简单**：

```javascript
function watchEffect(effect, options) {
  // watchEffect 就是没有回调的 watch！
  return watch(effect, null, options)
}

// 在 watch 中判断
function watch(source, callback, options = {}) {
  let getter
  
  if (typeof source === 'function') {
    if (callback) {
      // watch(getter, callback) —— 标准 watch
      getter = source
    } else {
      // watchEffect(effect) —— 没有回调，effect 本身就是要执行的函数
      getter = source
      callback = () => {}  // 空回调
    }
  }
  
  // ...
}
```

**有没有发现**：watchEffect 本质就是 `watch(effect, null)`！

实际上 Vue 3 的 watchEffect 更进一步——它会把 effect 函数作为回调执行，所以数据变化时会重新运行整个 effect。

**什么时候用 watch，什么时候用 watchEffect？**

| 场景 | 推荐 |
|------|------|
| 需要访问新旧值 | watch |
| 需要监听特定数据 | watch |
| 只关心副作用，不关心具体值 | watchEffect |
| 依赖很多，懒得一个个列出 | watchEffect |

## 完整实现

经过层层深入，让我们把所有概念整合成完整版：

```javascript
function watch(source, cb, options = {}) {
  let getter
  let deep = false
  
  // 第一步：统一数据源——不管传什么，都变成 getter 函数
  if (typeof source === 'function') {
    getter = source
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => source
    deep = true  // reactive 对象默认深度监听
  } else if (Array.isArray(source)) {
    // 支持监听多个数据源
    getter = () => source.map(s => {
      if (isRef(s)) return s.value
      if (isReactive(s)) return traverse(s)
      if (typeof s === 'function') return s()
    })
  }
  
  // 第二步：处理 deep 选项
  if (options.deep || deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }
  
  // 第三步：清理函数支持
  let cleanup
  const onCleanup = (fn) => { cleanup = fn }
  
  let oldValue
  
  // 第四步：定义 job——这就是真正执行的回调
  const job = () => {
    if (!effectFn.active) return  // 已停止就不执行
    
    const newValue = effectFn.run()
    
    if (cleanup) cleanup()  // 先清理上一次
    
    if (cb) {
      cb(newValue, oldValue, onCleanup)
    }
    
    oldValue = newValue
  }
  
  // 第五步：根据 flush 选项决定调度策略
  let scheduler
  if (options.flush === 'sync') {
    scheduler = job  // 同步执行
  } else if (options.flush === 'post') {
    scheduler = () => queuePostFlushCb(job)  // DOM 后执行
  } else {
    scheduler = () => queueJob(job)  // 默认：队列执行
  }
  
  // 第六步：创建 effect，用 scheduler 控制触发行为
  const effectFn = new ReactiveEffect(getter, scheduler)
  
  // 第七步：根据 immediate 决定初始行为
  if (options.immediate) {
    job()  // 立即执行
  } else {
    oldValue = effectFn.run()  // 只收集依赖，不执行回调
  }
  
  // 第八步：返回停止函数
  return () => {
    effectFn.stop()
  }
}
```

**回顾整个设计**：

```
watch = effect + scheduler + 控制选项
        ↓         ↓           ↓
      追踪依赖   控制执行    immediate/deep/flush/onCleanup
```

## 本章小结

回到开头的问题：**computed 也能响应数据变化，为什么还需要 watch？**

现在你应该明白了：

- **computed** 是为了**计算派生值**——它返回一个新值
- **watch** 是为了**执行副作用**——它执行一个操作

watch 是基于 effect + scheduler 实现的观察器，它的每个设计都有明确的目的：

| 功能 | 解决的问题 |
|------|-----------|
| **scheduler** | 不直接执行，而是控制何时执行 |
| **immediate** | 不想等第一次变化，创建时就执行 |
| **deep** | 想监听嵌套对象的变化 |
| **flush** | 控制回调在 DOM 更新前还是后执行 |
| **onCleanup** | 解决异步操作的竞态问题 |
| **stop** | 不再需要监听时清理资源 |

**watchEffect 是 watch 的简化版**：自动追踪依赖，不关心新旧值。

至此，响应式系统核心部分完成。下一部分我们将进入调度器系统，了解 Vue 3 如何批量处理更新，避免重复渲染。

---

## 练习与思考

1. **实现监听多个数据源**：

```javascript
watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
  console.log('changed')
})
```

提示：在完整实现中已经处理了数组情况，思考一下 oldValue 应该怎么存储？

2. **深度思考**：`watch` 和 `computed` 都能响应数据变化，给出一个只能用 `watch` 不能用 `computed` 的场景。

3. **场景分析**：`watchEffect` 的 `flush: 'post'` 在什么场景下有用？

提示：想想需要访问 DOM 的情况。

4. **进阶挑战**：如果 watch 的回调里又修改了被监听的数据，会发生什么？Vue 是如何防止无限循环的？
