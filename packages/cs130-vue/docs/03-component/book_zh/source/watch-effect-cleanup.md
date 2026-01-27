# watchEffect 清理机制

`watchEffect` 的回调可能涉及异步操作或副作用。`onCleanup` 机制让我们能在 effect 重新执行或停止时清理这些副作用。

## 问题背景

```javascript
watchEffect(async () => {
  const data = await fetch(`/api/${id.value}`)
  result.value = await data.json()
})
```

问题：如果 `id` 快速变化，多个请求可能同时进行，结果顺序不可预期。

## onCleanup 参数

```javascript
watchEffect((onCleanup) => {
  const controller = new AbortController()
  
  fetch(`/api/${id.value}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => {
      result.value = data
    })
  
  onCleanup(() => {
    controller.abort()  // 取消之前的请求
  })
})
```

## 工作原理

```
第一次执行:
  effect() → 注册 cleanup1

id.value 变化:
  执行 cleanup1 → effect() → 注册 cleanup2

id.value 再次变化:
  执行 cleanup2 → effect() → 注册 cleanup3

effect 停止:
  执行 cleanup3
```

## 源码分析

在 `doWatch` 中：

```typescript
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  // ...
) {
  let cleanup: () => void
  let onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {
      callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
    }
  }
  
  const job: SchedulerJob = () => {
    // ...
    
    if (cb) {
      // watch 回调
      const newValue = effect.run()
      // 执行清理
      if (cleanup) {
        cleanup()
      }
      callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
        newValue,
        oldValue,
        onCleanup
      ])
    } else {
      // watchEffect
      effect.run()
    }
  }
  
  // watchEffect 直接执行
  if (!cb) {
    // getter 中接收 onCleanup
    const getter = () => {
      if (instance && instance.isUnmounted) return
      if (cleanup) {
        cleanup()
      }
      return callWithAsyncErrorHandling(
        source as WatchEffect,
        instance,
        ErrorCodes.WATCH_CALLBACK,
        [onCleanup]
      )
    }
  }
}
```

## cleanup 的注册

```typescript
let onCleanup: OnCleanup = (fn: () => void) => {
  cleanup = effect.onStop = () => {
    callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
  }
}
```

`onCleanup` 注册的函数会：
1. 存储在 `cleanup` 变量
2. 同时设为 `effect.onStop`

## cleanup 的执行时机

1. **重新执行前**：

```typescript
if (cleanup) {
  cleanup()
}
return callWithAsyncErrorHandling(source, ...)
```

2. **effect 停止时**（组件卸载或手动停止）：

```typescript
effect.onStop = cleanup
```

## 使用场景

### 取消网络请求

```javascript
watchEffect((onCleanup) => {
  const controller = new AbortController()
  
  fetchData(id.value, { signal: controller.signal })
    .then(handleData)
  
  onCleanup(() => {
    controller.abort()
  })
})
```

### 清除定时器

```javascript
watchEffect((onCleanup) => {
  const timer = setTimeout(() => {
    doSomething(value.value)
  }, delay.value)
  
  onCleanup(() => {
    clearTimeout(timer)
  })
})
```

### 取消订阅

```javascript
watchEffect((onCleanup) => {
  const unsubscribe = eventBus.on(eventName.value, handler)
  
  onCleanup(() => {
    unsubscribe()
  })
})
```

### DOM 事件

```javascript
watchEffect((onCleanup) => {
  const el = elementRef.value
  if (!el) return
  
  el.addEventListener('click', handler)
  
  onCleanup(() => {
    el.removeEventListener('click', handler)
  })
})
```

## watch 中的 onCleanup

`watch` 回调的第三个参数：

```javascript
watch(source, (newVal, oldVal, onCleanup) => {
  const controller = new AbortController()
  
  fetchData(newVal, { signal: controller.signal })
  
  onCleanup(() => {
    controller.abort()
  })
})
```

## 竞态条件处理

```javascript
watchEffect(async (onCleanup) => {
  let cancelled = false
  
  onCleanup(() => {
    cancelled = true
  })
  
  const data = await fetchData(id.value)
  
  // 检查是否已取消
  if (!cancelled) {
    result.value = data
  }
})
```

## 与 onUnmounted 对比

```javascript
// onUnmounted：只在组件卸载时执行
onUnmounted(() => {
  cleanup()
})

// onCleanup：每次 effect 重新执行前都会执行
watchEffect((onCleanup) => {
  setup()
  onCleanup(() => cleanup())
})
```

onCleanup 更适合需要随数据变化清理的场景。

## 错误处理

cleanup 函数的错误会被捕获：

```typescript
callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
```

错误不会阻止 effect 继续执行。

## 手动停止

```javascript
const stop = watchEffect((onCleanup) => {
  // ...
  onCleanup(() => {
    console.log('清理')
  })
})

// 手动停止会触发 cleanup
stop()
```

## 组件卸载

组件卸载时自动停止所有 effect：

```javascript
setup() {
  watchEffect((onCleanup) => {
    // 监听
    onCleanup(() => {
      // 组件卸载时自动执行
    })
  })
}
```

无需手动处理。

## 异步 cleanup

cleanup 应该是同步的：

```javascript
// 不推荐
onCleanup(async () => {
  await asyncCleanup()
})

// 推荐
onCleanup(() => {
  // 同步取消
  controller.abort()
})
```

异步 cleanup 可能在新 effect 执行后才完成。

## watchPostEffect

后置 effect 的 cleanup 同样工作：

```javascript
watchPostEffect((onCleanup) => {
  // DOM 更新后执行
  onCleanup(() => {
    // 清理
  })
})
```

## 小结

watchEffect 清理机制的要点：

1. **onCleanup 参数**：注册清理函数
2. **执行时机**：重新执行前 + 停止时
3. **典型用途**：取消请求、清除定时器、取消订阅
4. **自动处理**：组件卸载时自动清理

这个机制解决了响应式副作用的清理问题，避免内存泄漏和竞态条件。

下一章将进入内置组件部分，分析 KeepAlive 的实现。
