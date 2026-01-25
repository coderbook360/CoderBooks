# watch cleanup：清理函数机制

watch 的清理函数机制用于处理副作用的清理工作，如取消请求、清除定时器等。本章深入分析 onCleanup 的实现原理。

## 基本用法

```typescript
watch(source, (value, oldValue, onCleanup) => {
  const controller = new AbortController()
  
  fetch(`/api/data/${value}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      // 处理数据
    })
  
  onCleanup(() => {
    controller.abort()  // 取消请求
  })
})
```

onCleanup 注册的函数会在下次回调执行前或 watcher 停止时调用。

## 清理函数的定义

```typescript
let cleanup: (() => void) | undefined
let onCleanup: OnCleanup = (fn: () => void) => {
  cleanup = effect.onStop = () => {
    callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
    cleanup = effect.onStop = undefined
  }
}
```

onCleanup 做两件事：

1. 设置 cleanup 变量供下次执行前调用
2. 设置 effect.onStop 供停止时调用

## OnCleanup 类型

```typescript
export type OnCleanup = (cleanupFn: () => void) => void
```

onCleanup 接收一个无参函数，这个函数会在适当时机被调用。

## 调用时机

清理函数在两种情况下调用：

**情况一：下次回调执行前**

```typescript
const job: SchedulerJob = (immediateFirstRun?: boolean) => {
  // ...
  if (cb) {
    const newValue = effect.run()
    if (/* 有变化 */) {
      // 清理旧的副作用
      if (cleanup) {
        cleanup()
      }
      callWithAsyncErrorHandling(cb, ...)
      oldValue = newValue
    }
  }
  // ...
}
```

在调用新的回调之前，先执行上一次注册的清理函数。

**情况二：watcher 停止时**

```typescript
const unwatch = () => {
  effect.stop()  // 这会调用 effect.onStop
  // ...
}
```

effect.stop() 内部会调用 onStop：

```typescript
stop(): void {
  if (this.active) {
    // ...
    if (this.onStop) {
      this.onStop()
    }
    this.active = false
  }
}
```

## 解决竞态问题

清理函数的主要用途是解决竞态条件：

```typescript
const id = ref(1)

watch(id, async (newId) => {
  const data = await fetchData(newId)
  result.value = data  // 可能过时
})

// 快速切换 id
id.value = 2
id.value = 3
// 最终 result 可能是 id=2 的数据
```

使用清理函数解决：

```typescript
watch(id, async (newId, _, onCleanup) => {
  let cancelled = false
  
  onCleanup(() => {
    cancelled = true
  })
  
  const data = await fetchData(newId)
  if (!cancelled) {
    result.value = data
  }
})
```

或使用 AbortController：

```typescript
watch(id, async (newId, _, onCleanup) => {
  const controller = new AbortController()
  
  onCleanup(() => {
    controller.abort()
  })
  
  try {
    const data = await fetchData(newId, { signal: controller.signal })
    result.value = data
  } catch (e) {
    if (e.name !== 'AbortError') {
      throw e
    }
  }
})
```

## watchEffect 中的 onCleanup

watchEffect 也支持 onCleanup：

```typescript
watchEffect((onCleanup) => {
  const timer = setInterval(() => {
    console.log('tick')
  }, 1000)
  
  onCleanup(() => {
    clearInterval(timer)
  })
})
```

在 watchEffect 的 getter 中，onCleanup 作为参数传入：

```typescript
getter = () => {
  if (cleanup) {
    cleanup()  // 先执行旧的清理
  }
  return callWithAsyncErrorHandling(
    source,
    instance,
    ErrorCodes.WATCH_CALLBACK,
    [onCleanup],  // 传入 onCleanup
  )
}
```

## 清理函数只执行一次

```typescript
cleanup = effect.onStop = () => {
  callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
  cleanup = effect.onStop = undefined  // 执行后清除
}
```

执行后 cleanup 和 effect.onStop 都被设为 undefined，确保不会重复执行。

## 每次回调可注册新的清理函数

```typescript
watch(source, (val, _, onCleanup) => {
  // 每次回调都可以注册新的清理函数
  const resource = createResource(val)
  
  onCleanup(() => {
    resource.dispose()
  })
})
```

新注册的清理函数会覆盖旧的。这是合理的——每次回调创建的资源需要对应的清理。

## 错误处理

```typescript
cleanup = effect.onStop = () => {
  callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
  // ...
}
```

清理函数通过 callWithErrorHandling 调用，错误会被捕获并报告，不会影响其他逻辑。

## 使用模式

**模式一：取消异步操作**

```typescript
watch(query, async (q, _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  
  const results = await search(q, { signal: controller.signal })
  searchResults.value = results
})
```

**模式二：清除定时器**

```typescript
watch(enabled, (on, _, onCleanup) => {
  if (on) {
    const timer = setInterval(tick, 1000)
    onCleanup(() => clearInterval(timer))
  }
})
```

**模式三：移除事件监听**

```typescript
watch(element, (el, _, onCleanup) => {
  if (el) {
    const handler = (e) => { /* ... */ }
    el.addEventListener('click', handler)
    onCleanup(() => el.removeEventListener('click', handler))
  }
})
```

**模式四：取消订阅**

```typescript
watch(channel, (ch, _, onCleanup) => {
  const subscription = subscribe(ch, handleMessage)
  onCleanup(() => subscription.unsubscribe())
})
```

## 与 Vue 2 的对比

Vue 2 的 $watch 没有内置的 onCleanup，需要手动处理：

```javascript
// Vue 2
this.$watch('source', function (val) {
  // 需要自己管理清理
})
```

Vue 3 的 onCleanup 使清理逻辑与创建逻辑放在一起，更易维护。

## 本章小结

onCleanup 机制让 watch 能够安全地处理副作用的清理。通过将清理函数同时赋给 cleanup 变量和 effect.onStop，确保在回调重新执行或 watcher 停止时都能正确清理。

这个机制解决了异步操作的竞态问题，是编写健壮的响应式代码的重要工具。
