# 响应式系统的性能权衡

任何技术设计都涉及权衡。Vue3 的响应式系统在追求便利性的同时，也需要考虑性能开销。理解这些权衡，有助于在实际项目中做出更好的决策。

## Proxy 的开销

Vue3 选择 Proxy 作为响应式的底层实现，相比 Vue2 的 `Object.defineProperty` 提供了更完整的拦截能力。但 Proxy 本身有性能成本。

每次访问响应式对象的属性，都会触发 Proxy 的 get 拦截器。拦截器中需要执行追踪逻辑：检查当前是否有活跃的 effect，如果有则建立依赖关系。

```javascript
// 简化的 get 拦截逻辑
function get(target, key, receiver) {
  const result = Reflect.get(target, key, receiver)
  track(target, key)  // 追踪依赖
  return result
}
```

对于深层嵌套的对象，每一层的访问都会触发一次拦截。如果在渲染函数中频繁访问深层属性，这个开销会累积。

```javascript
// 每次访问都触发多次拦截
state.user.profile.settings.theme
// 触发 4 次 get 拦截
```

Vue3 通过惰性代理来缓解这个问题。嵌套对象只有在第一次被访问时才创建 Proxy，而不是在 `reactive()` 调用时递归创建所有代理。

## 依赖追踪的内存开销

响应式系统需要存储依赖关系。每个响应式对象的每个属性都可能关联多个 effect。这些关系使用 WeakMap、Map、Set 组成的三层结构存储。

```javascript
// 依赖存储结构
targetMap: WeakMap<object, Map<string, Set<ReactiveEffect>>>
```

对于属性较多的对象，或者 effect 依赖较多的应用，这个结构会占用可观的内存。

Vue3 在每次 effect 执行前会清理旧的依赖。这确保了依赖关系的准确性，但也意味着每次更新都有清理和重建的开销。

```javascript
// effect 执行前
cleanupEffect(effect)

// 执行时重新收集依赖
effect.fn()
```

这种设计是为了处理条件依赖的场景：

```javascript
effect(() => {
  if (state.showDetails) {
    console.log(state.details)
  }
})
```

当 `showDetails` 为 false 时，effect 不应该依赖 `details`。如果不清理，`details` 变化时会错误地触发更新。

## 调度与批量更新

响应式系统的触发是同步的，但实际的更新通过调度器异步执行。这种设计避免了连续修改导致的多次渲染。

```javascript
state.a = 1
state.b = 2
state.c = 3
// 只触发一次渲染
```

调度器使用队列管理待执行的 effect。同一个 effect 在队列中只会出现一次，重复触发会被合并。

```javascript
// 简化的调度逻辑
const queue = new Set()

function queueJob(job) {
  queue.add(job)  // Set 自动去重
  if (!isFlushing) {
    queueMicrotask(flushJobs)
  }
}
```

这个设计的代价是更新有一个微任务的延迟。在极少数需要同步更新的场景，可以使用 `nextTick` 确保更新完成：

```javascript
state.value = newValue
await nextTick()
// 此时 DOM 已更新
```

## 大规模数据的处理

当响应式对象包含大量数据时，性能问题会更加明显。比如一个包含数千条记录的列表，每条记录都是响应式对象。

```javascript
// 不推荐：所有数据都是响应式的
const state = reactive({
  items: largeDataArray.map(item => reactive(item))
})
```

更好的做法是区分需要响应式的数据和只读数据：

```javascript
// 推荐：只对需要响应式的部分使用 reactive
const selectedIds = reactive(new Set())
const items = shallowRef(largeDataArray)  // 浅层响应式

// 只在修改选中状态时触发更新
function toggleItem(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id)
  } else {
    selectedIds.add(id)
  }
}
```

`shallowRef` 和 `shallowReactive` 提供浅层响应式，只追踪顶层属性的变化，不递归处理嵌套对象。这在处理大数据时可以显著减少开销。

## 不需要响应式的场景

有些数据天生不需要响应式。比如从 API 获取的只读数据、常量配置等。对这些数据使用响应式会带来不必要的开销。

```javascript
// 不需要响应式的数据
const config = markRaw({
  apiEndpoint: 'https://api.example.com',
  maxRetries: 3
})

// 或者在 reactive 之外保持
const staticData = { ... }  // 普通对象
```

`markRaw` 可以标记一个对象永远不会被转换为响应式。这在集成第三方库时特别有用，避免对库内部对象进行不必要的代理。

## 计算属性的缓存

computed 是一种重要的性能优化手段。它缓存计算结果，只在依赖变化时重新计算。

```javascript
// 每次访问都重新计算
function getFullName() {
  return state.firstName + ' ' + state.lastName
}

// 只在 firstName 或 lastName 变化时计算
const fullName = computed(() => state.firstName + ' ' + state.lastName)
```

但 computed 也有开销。它创建了一个内部的 effect，有自己的依赖追踪。如果计算非常简单，使用 computed 可能反而更慢。

```javascript
// 对于简单的属性访问，不需要 computed
const name = computed(() => state.name)  // 不必要
```

computed 的价值在于避免重复计算复杂逻辑，而不是简单地包装属性访问。

## watch 与 watchEffect

`watch` 和 `watchEffect` 提供了不同的权衡。

`watchEffect` 自动追踪回调中访问的所有响应式数据。它使用简单，但可能追踪不必要的依赖。

```javascript
watchEffect(() => {
  // 自动追踪 state.a 和 state.b
  console.log(state.a, state.b)
})
```

`watch` 显式指定监听的数据源。它需要更多的代码，但依赖关系更清晰，没有意外追踪的风险。

```javascript
watch(
  () => state.a,  // 只监听 a
  (newVal) => {
    console.log(newVal, state.b)  // 这里的 state.b 不会建立依赖
  }
)
```

在性能敏感的场景，推荐使用 `watch` 并明确指定依赖。

## 性能优化指南

基于以上分析，可以总结一些实践建议。

对于大型只读数据，使用 `shallowRef` 或 `markRaw` 避免深层代理。对于列表渲染，确保只有真正需要响应式的数据被代理。

避免在模板或渲染函数中进行复杂计算，使用 computed 缓存结果。但不要过度使用 computed，简单的属性访问不需要包装。

合理使用 `watch` 和 `watchEffect`。如果只关心特定数据的变化，使用 `watch` 明确指定。如果需要在多个数据变化时执行相同的逻辑，`watchEffect` 更简洁。

理解批量更新的工作方式。在同步代码中连续修改多个属性是安全的，它们会被合并为一次更新。但如果需要获取更新后的 DOM 状态，记得使用 `nextTick`。
