# watch 的设计思路

`watch` 是 Vue3 响应式系统中用于执行副作用的核心 API。与 `computed` 专注于派生状态不同，`watch` 专注于响应变化并执行操作。它的设计需要处理各种复杂场景：不同类型的数据源、新旧值的获取、清理机制、执行时机控制等。

## watch 的核心职责

`watch` 解决的核心问题是：当某些响应式数据变化时，执行指定的回调函数。这听起来简单，但实际需要考虑很多细节。

回调需要接收什么参数？最常见的需求是获取新值和旧值，以便比较变化或做相应处理。如何处理异步场景？如果回调发起了一个异步请求，而在请求完成前数据又变化了，如何处理这种竞态？回调应该在什么时机执行？在 DOM 更新前还是更新后？

Vue3 的 `watch` 设计全面地回答了这些问题。

## 基本用法与数据源类型

`watch` 可以观察多种类型的数据源：

```javascript
const count = ref(0)
const state = reactive({ name: 'Alice' })

// 观察 ref
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} → ${newVal}`)
})

// 观察 reactive 对象的属性（使用 getter 函数）
watch(
  () => state.name,
  (newVal, oldVal) => {
    console.log(`name: ${oldVal} → ${newVal}`)
  }
)

// 观察多个源
watch(
  [count, () => state.name],
  ([newCount, newName], [oldCount, oldName]) => {
    console.log(`count: ${oldCount} → ${newCount}`)
    console.log(`name: ${oldName} → ${newName}`)
  }
)
```

这种灵活性背后是统一的处理逻辑。Vue3 内部会将各种数据源规范化为一个 getter 函数，然后统一处理：

```javascript
function watch(source, cb, options) {
  let getter
  
  if (isRef(source)) {
    // ref：创建访问 .value 的 getter
    getter = () => source.value
  } else if (isReactive(source)) {
    // reactive 对象：深度遍历以收集所有依赖
    getter = () => traverse(source)
  } else if (isFunction(source)) {
    // getter 函数：直接使用
    getter = source
  } else if (isArray(source)) {
    // 数组：为每个元素创建 getter，然后组合
    getter = () => source.map(s => /* 递归处理 */)
  }
  
  // 后续使用统一的 getter
}
```

## 深度观察的设计

当观察一个 reactive 对象时，默认是深度观察的：

```javascript
const state = reactive({
  user: {
    profile: {
      name: 'Alice'
    }
  }
})

watch(state, () => {
  console.log('state changed')
})

state.user.profile.name = 'Bob' // 触发 watch
```

这是通过 `traverse` 函数实现的。它会递归访问对象的所有属性，从而收集所有层级的依赖：

```javascript
function traverse(value, seen = new Set()) {
  // 避免循环引用导致的无限递归
  if (!isObject(value) || seen.has(value)) {
    return value
  }
  
  seen.add(value)
  
  if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else {
    for (const key of Object.keys(value)) {
      traverse(value[key], seen)
    }
  }
  
  return value
}
```

深度观察的代价是需要遍历整个对象树，这在对象很大时可能有性能影响。可以通过 `deep: false` 来禁用深度观察，但此时只有根级别的变化会触发回调。

## 新旧值的获取

`watch` 的回调会接收新值和旧值作为参数。这需要在依赖变化时保存旧值，然后获取新值：

```javascript
function doWatch(source, cb, options) {
  let oldValue
  
  const job = () => {
    // 执行 getter 获取新值
    const newValue = effect.run()
    
    // 比较新旧值，如果有变化则调用回调
    if (hasChanged(newValue, oldValue)) {
      cb(newValue, oldValue, onCleanup)
      // 更新旧值
      oldValue = newValue
    }
  }
  
  const effect = new ReactiveEffect(getter, scheduler)
  
  // 首次执行，获取初始值作为旧值
  oldValue = effect.run()
}
```

对于对象类型，新旧值可能指向同一个对象（因为是原地修改），所以 `newValue === oldValue` 可能为 true：

```javascript
const state = reactive({ count: 0 })

watch(
  () => state,
  (newVal, oldVal) => {
    console.log(newVal === oldVal) // true，同一个对象
    console.log(newVal.count) // 新的 count 值
  }
)
```

如果需要获取变化前的深拷贝，需要自行处理：

```javascript
watch(
  () => JSON.parse(JSON.stringify(state)),
  (newVal, oldVal) => {
    // newVal 和 oldVal 是不同的对象
  }
)
```

## immediate 选项

默认情况下，`watch` 的回调在首次不会执行，只有当数据变化时才执行。`immediate: true` 选项可以改变这个行为：

```javascript
watch(
  count,
  (newVal, oldVal) => {
    console.log(`count: ${oldVal} → ${newVal}`)
  },
  { immediate: true }
)
// 立即输出: count: undefined → 0
```

首次执行时，oldVal 是 `undefined`，因为还没有"之前的值"。

实现上，就是在创建 effect 后立即执行一次回调：

```javascript
if (options.immediate) {
  job() // 立即执行
} else {
  oldValue = effect.run() // 只获取初始值，不执行回调
}
```

## flush 选项与执行时机

`flush` 选项控制回调的执行时机：

```javascript
// 在组件更新前执行（默认）
watch(source, cb, { flush: 'pre' })

// 在组件更新后执行
watch(source, cb, { flush: 'post' })

// 同步执行（每次数据变化立即执行）
watch(source, cb, { flush: 'sync' })
```

这三种时机有不同的适用场景。`pre` 适合在 DOM 更新前进行一些准备工作。`post` 适合需要访问更新后的 DOM 的场景。`sync` 适合需要立即响应的场景，但要注意性能。

实现上，是通过不同的 scheduler 将回调推入不同的队列：

```javascript
const scheduler = () => {
  if (flush === 'sync') {
    job()
  } else if (flush === 'post') {
    queuePostFlushCb(job)
  } else {
    queuePreFlushCb(job)
  }
}
```

## onCleanup 清理机制

异步场景下的竞态条件是一个常见问题。假设 watch 回调发起一个异步请求：

```javascript
watch(userId, async (id) => {
  const user = await fetchUser(id)
  userData.value = user
})
```

如果 `userId` 快速变化（比如用户快速切换），可能会发起多个请求。由于网络延迟不确定，后发起的请求可能先返回，导致最终显示的是旧的用户数据。

`onCleanup` 机制解决了这个问题：

```javascript
watch(userId, async (id, _, onCleanup) => {
  let cancelled = false
  
  onCleanup(() => {
    cancelled = true
  })
  
  const user = await fetchUser(id)
  
  if (!cancelled) {
    userData.value = user
  }
})
```

`onCleanup` 注册的函数会在下次回调执行前被调用。这样，当 `userId` 再次变化时，之前的清理函数会将 `cancelled` 设为 `true`，之前的异步操作即使完成也不会更新数据。

更优雅的方式是使用 AbortController：

```javascript
watch(userId, async (id, _, onCleanup) => {
  const controller = new AbortController()
  
  onCleanup(() => controller.abort())
  
  try {
    const user = await fetch(`/api/users/${id}`, {
      signal: controller.signal
    })
    userData.value = await user.json()
  } catch (e) {
    if (e.name !== 'AbortError') throw e
  }
})
```

## once 选项

Vue 3.4 引入了 `once` 选项，让 watch 只触发一次：

```javascript
watch(
  source,
  (newVal) => {
    console.log('This will only log once')
  },
  { once: true }
)
```

实现上，就是在回调执行后自动停止 watch：

```javascript
if (options.once) {
  const originalCb = cb
  cb = (...args) => {
    unwatch() // 停止 watch
    originalCb(...args)
  }
}
```

## watchEffect 与 watch 的关系

`watchEffect` 是 `watch` 的简化版本，它自动追踪依赖，不需要指定数据源：

```javascript
// watch：显式指定数据源
watch(count, (newVal) => {
  console.log(newVal)
})

// watchEffect：自动追踪
watchEffect(() => {
  console.log(count.value)
})
```

`watchEffect` 会立即执行一次（相当于 `immediate: true`），执行过程中访问的响应式数据会被追踪。当这些数据变化时，effect 会重新执行。

实际上，`watchEffect` 就是用特定配置调用 `watch`：

```javascript
function watchEffect(effect, options) {
  return watch(effect, null, {
    ...options,
    immediate: true
  })
}
```

## watchPostEffect 与 watchSyncEffect

Vue3 还提供了两个快捷方式：

```javascript
// 相当于 watchEffect with flush: 'post'
watchPostEffect(() => {
  // 在 DOM 更新后执行
})

// 相当于 watchEffect with flush: 'sync'
watchSyncEffect(() => {
  // 同步执行
})
```

这只是语法糖，让常用的配置更加简洁。

## 停止 watch

所有的 watch 函数都返回一个停止函数：

```javascript
const stop = watch(source, cb)

// 之后可以停止 watch
stop()
```

停止 watch 会清理内部的 effect，解除所有依赖关系。这对于手动管理生命周期很重要：

```javascript
// 在组件外创建的 watch 需要手动停止
const stop = watch(globalState, handler)

// 在适当的时机停止
onUnmounted(() => {
  stop()
})
```

如果 watch 是在组件的 setup 中创建的，Vue 会自动在组件卸载时停止它。

## 与 Vue2 的对比

Vue2 的 `watch` 选项与 Vue3 的 `watch` 函数有一些区别：

```javascript
// Vue2：watch 选项
export default {
  watch: {
    count(newVal, oldVal) {
      // ...
    },
    'user.name': {
      handler(newVal, oldVal) { /* ... */ },
      deep: true,
      immediate: true
    }
  }
}

// Vue3：watch 函数
watch(count, (newVal, oldVal) => { /* ... */ })
watch(
  () => user.name,
  (newVal, oldVal) => { /* ... */ },
  { deep: true, immediate: true }
)
```

Vue3 的函数式 API 更加灵活，可以在 setup 中的任何位置调用，也更容易进行逻辑复用（通过组合式函数）。

## 小结

`watch` 的设计体现了 Vue3 对副作用管理的全面考虑。通过统一的数据源处理，它支持 ref、reactive、getter 函数等多种类型。通过 scheduler 和队列机制，它支持不同的执行时机。onCleanup 机制解决了异步竞态问题。once 选项支持一次性监听。与 watchEffect 的关系让开发者可以根据场景选择最合适的 API。

在下一章中，我们将探讨 effectScope 的作用域管理设计，看看 Vue3 是如何统一管理副作用生命周期的。

