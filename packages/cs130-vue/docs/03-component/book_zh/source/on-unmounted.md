# onUnmounted 实现

onUnmounted 钩子在组件完全卸载后调用。此时组件的 DOM 已从页面移除，所有 effect 已停止。

## 定义

```typescript
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
```

## 调用时机

在 unmountComponent 函数中：

```typescript
const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: SuspenseBoundary | null,
  doRemove?: boolean
) => {
  const { bum, scope, update, subTree, um } = instance

  // 调用 beforeUnmount
  if (bum) {
    invokeArrayFns(bum)
  }

  // 停止 effect scope
  scope.stop()

  // 停止 update effect 并卸载子树
  if (update) {
    update.active = false
    unmount(subTree, instance, parentSuspense, doRemove)
  }
  
  // ⭐ 调用 unmounted（异步）
  if (um) {
    queuePostRenderEffect(um, parentSuspense)
  }
  
  // 标记已卸载
  queuePostRenderEffect(() => {
    instance.isUnmounted = true
  }, parentSuspense)
}
```

## 异步执行

```typescript
if (um) {
  queuePostRenderEffect(um, parentSuspense)  // 异步
}
```

unmounted 通过 queuePostRenderEffect 异步调用，在 DOM 移除后执行。

## 子先父后

```typescript
// flushPostFlushCbs 按 ID 排序执行
activePostFlushCbs.sort((a, b) => getId(a) - getId(b))
```

与 mounted 类似，unmounted 也是子组件先执行，父组件后执行。

```
Parent unmount 开始
  Parent beforeUnmount
  Parent scope.stop()
  Parent unmount subTree
    Child unmount 开始
      Child beforeUnmount
      Child scope.stop()
      Child unmount subTree
      Child queue unmounted
    Child unmount 结束
  Parent queue unmounted

// 执行队列（按 ID 排序）：
// Child unmounted → Parent unmounted
```

## DOM 已移除

```typescript
onUnmounted(() => {
  // 此时 DOM 已被移除
  console.log(containerRef.value)  // null 或已分离的节点
})
```

## 所有 effect 已停止

```typescript
// 在 unmounted 之前
scope.stop()  // 停止所有 effect

// 在 unmounted 中
onUnmounted(() => {
  // computed、watch 等已经不再响应
})
```

## 组件标记为已卸载

```typescript
queuePostRenderEffect(() => {
  instance.isUnmounted = true
}, parentSuspense)
```

isUnmounted 标记在 unmounted 钩子之后设置。

## 最终清理

```typescript
import { onUnmounted } from 'vue'

export default {
  setup() {
    onUnmounted(() => {
      // 最终清理工作
      console.log('Component fully unmounted')
      
      // 释放资源
      largeDataRef = null
      
      // 记录日志
      analytics.track('component_unmounted')
    })
  }
}
```

## 与 beforeUnmount 配合

```typescript
import { ref, onBeforeUnmount, onUnmounted } from 'vue'

export default {
  setup() {
    const ws = ref<WebSocket | null>(null)
    
    onBeforeUnmount(() => {
      // DOM 还在，可以获取最后状态
      const finalPosition = element.value?.getBoundingClientRect()
      savePosition(finalPosition)
    })
    
    onUnmounted(() => {
      // 完全清理
      ws.value = null
    })
  }
}
```

## 错误不影响卸载

```typescript
onUnmounted(() => {
  throw new Error('Something went wrong')
})

// 错误会被捕获，但不会阻止卸载
```

由于钩子被包装：

```typescript
const wrappedHook = (...args) => {
  const res = callWithAsyncErrorHandling(hook, target, type, args)
  return res
}
```

## 内存释放

```typescript
let cachedData: LargeObject | null = null

onMounted(() => {
  cachedData = fetchLargeData()
})

onUnmounted(() => {
  // 帮助垃圾回收
  cachedData = null
})
```

## 在可组合函数中

```typescript
function useResource() {
  const resource = ref(null)
  
  onMounted(async () => {
    resource.value = await acquireResource()
  })
  
  onUnmounted(() => {
    if (resource.value) {
      releaseResource(resource.value)
      resource.value = null
    }
  })
  
  return { resource }
}
```

## 全局状态清理

```typescript
import { onMounted, onUnmounted } from 'vue'
import { useGlobalStore } from './store'

export default {
  setup() {
    const store = useGlobalStore()
    
    onMounted(() => {
      store.registerComponent('myComponent')
    })
    
    onUnmounted(() => {
      store.unregisterComponent('myComponent')
    })
  }
}
```

## 调试用途

```typescript
if (__DEV__) {
  onUnmounted(() => {
    console.log(`[DEBUG] Component ${componentName} unmounted`)
    console.log(`[DEBUG] Total mount time: ${Date.now() - mountTime}ms`)
  })
}
```

## 异步清理

```typescript
onUnmounted(async () => {
  // 可以进行异步清理
  await saveStateToServer()
  
  // 但要注意：组件已经卸载
  // 不应该再修改响应式状态
})
```

## KeepAlive 中的行为

```typescript
// 在 KeepAlive 中
onDeactivated(() => {
  // 组件被缓存时调用
})

// unmounted 只在真正卸载时调用
onUnmounted(() => {
  // 从缓存中移除时调用
})
```

## 完整生命周期示例

```typescript
import {
  ref,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted
} from 'vue'

export default {
  setup() {
    console.log('setup')
    
    onBeforeMount(() => console.log('beforeMount'))
    onMounted(() => console.log('mounted'))
    onBeforeUpdate(() => console.log('beforeUpdate'))
    onUpdated(() => console.log('updated'))
    onBeforeUnmount(() => console.log('beforeUnmount'))
    onUnmounted(() => console.log('unmounted'))
    
    // 输出顺序：
    // setup
    // beforeMount
    // mounted
    // (数据变化时)
    // beforeUpdate
    // updated
    // (卸载时)
    // beforeUnmount
    // unmounted
  }
}
```

## 小结

onUnmounted 的关键点：

1. **异步执行**：通过 queuePostRenderEffect 调度
2. **DOM 已移除**：无法再访问 DOM
3. **effect 已停止**：响应式系统不再工作
4. **子先父后**：按组件 ID 排序执行
5. **最终清理**：适合释放资源、取消订阅

这是组件生命周期的最后一个钩子。

下一章将分析 onErrorCaptured 错误捕获钩子。
