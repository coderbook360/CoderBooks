# onBeforeUnmount 与 onUnmounted

卸载钩子在组件从 DOM 移除时调用。这是清理资源、取消订阅的正确时机。

## 调用时机

```javascript
setup() {
  onBeforeUnmount(() => {
    console.log('即将卸载，DOM 还在')
  })
  
  onUnmounted(() => {
    console.log('已卸载，DOM 已移除')
  })
}
```

## 源码位置

在 `unmountComponent` 中：

```typescript
const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: SuspenseBoundary | null,
  doRemove?: boolean
) => {
  const { bum, scope, update, subTree, um } = instance
  
  // 1. beforeUnmount 钩子
  if (bum) {
    invokeArrayFns(bum)
  }
  
  // 2. 停止响应式 effect scope
  scope.stop()
  
  // 3. 停止组件的更新 effect
  if (update) {
    update.active = false
    unmount(subTree, instance, parentSuspense, doRemove)
  }
  
  // 4. unmounted 钩子（异步）
  if (um) {
    queuePostRenderEffect(um, parentSuspense)
  }
  
  // 5. 标记已卸载
  queuePostRenderEffect(() => {
    instance.isUnmounted = true
  }, parentSuspense)
  
  // 6. 清理 Suspense 相关
  if (
    parentSuspense &&
    parentSuspense.pendingBranch &&
    !parentSuspense.isUnmounted &&
    instance.asyncDep &&
    !instance.asyncResolved &&
    instance.suspenseId === parentSuspense.pendingId
  ) {
    parentSuspense.deps--
    if (parentSuspense.deps === 0) {
      parentSuspense.resolve()
    }
  }
}
```

## onBeforeUnmount

同步执行，DOM 还存在：

```javascript
onBeforeUnmount(() => {
  // DOM 还在，可以做最后的 DOM 操作
  const el = document.querySelector('#my-element')
  console.log(el)  // 仍然存在
})
```

## onUnmounted

异步执行，DOM 已移除：

```javascript
onUnmounted(() => {
  // 组件已完全卸载
  // 适合做最终的清理工作
})
```

## 典型使用场景

### 清理事件监听

```javascript
setup() {
  const handleResize = () => {
    // 处理窗口大小变化
  }
  
  onMounted(() => {
    window.addEventListener('resize', handleResize)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
}
```

### 清理定时器

```javascript
setup() {
  let timer = null
  
  onMounted(() => {
    timer = setInterval(() => {
      // 定期任务
    }, 1000)
  })
  
  onUnmounted(() => {
    clearInterval(timer)
  })
}
```

### 销毁第三方库实例

```javascript
setup() {
  let chart = null
  const canvasRef = ref(null)
  
  onMounted(() => {
    chart = new Chart(canvasRef.value, { /* ... */ })
  })
  
  onUnmounted(() => {
    chart?.destroy()
    chart = null
  })
  
  return { canvasRef }
}
```

### 取消网络请求

```javascript
setup() {
  const controller = new AbortController()
  
  onMounted(async () => {
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal
      })
      // 处理响应
    } catch (e) {
      if (e.name !== 'AbortError') throw e
    }
  })
  
  onUnmounted(() => {
    controller.abort()
  })
}
```

### WebSocket 连接

```javascript
setup() {
  let ws = null
  
  onMounted(() => {
    ws = new WebSocket('wss://example.com')
    ws.onmessage = handleMessage
  })
  
  onUnmounted(() => {
    ws?.close()
  })
}
```

## effectScope 的自动清理

组件卸载时，其 effectScope 自动停止：

```typescript
scope.stop()
```

这意味着组件内的 effect 会自动清理：

```javascript
setup() {
  // 这些会自动清理，无需手动
  const count = ref(0)
  const double = computed(() => count.value * 2)
  watch(count, () => {})
  watchEffect(() => {})
}
```

但外部资源需要手动清理。

## 父子组件顺序

```
Parent beforeUnmount
  Child beforeUnmount
  Child unmounted
Parent unmounted
```

子组件先完成卸载。

## 条件渲染

v-if 切换触发卸载：

```vue
<template>
  <Child v-if="show" />
</template>
```

`show` 变为 false 时，Child 的卸载钩子会被调用。

## KeepAlive 的情况

KeepAlive 内的组件不触发卸载钩子：

```vue
<KeepAlive>
  <Component :is="currentComp" />
</KeepAlive>
```

切换组件时：
- 不触发 onBeforeUnmount/onUnmounted
- 触发 onDeactivated

```javascript
setup() {
  onDeactivated(() => {
    console.log('组件被缓存（停用）')
  })
  
  onActivated(() => {
    console.log('组件被激活')
  })
  
  onUnmounted(() => {
    // KeepAlive 内不会触发
    // 除非 KeepAlive 本身被卸载
  })
}
```

## 组合函数中的清理

```javascript
// useEventListener.js
export function useEventListener(target, event, handler) {
  onMounted(() => {
    target.addEventListener(event, handler)
  })
  
  onUnmounted(() => {
    target.removeEventListener(event, handler)
  })
}
```

使用：

```javascript
setup() {
  useEventListener(window, 'scroll', handleScroll)
  // 自动在卸载时清理
}
```

## 闭包陷阱

注意闭包捕获的值：

```javascript
setup() {
  const data = ref(null)
  
  onUnmounted(() => {
    // 这里的 data 是最新的值
    console.log(data.value)
  })
}
```

## 异步清理

```javascript
setup() {
  onUnmounted(async () => {
    // 可以是异步的
    await saveDataToServer()
    await cleanupRemoteResources()
  })
}
```

但要注意：异步操作可能在组件已完全销毁后执行。

## isUnmounted 标记

异步操作中检查组件状态：

```javascript
setup() {
  const instance = getCurrentInstance()
  
  async function fetchData() {
    const data = await api.getData()
    
    // 检查组件是否已卸载
    if (!instance?.isUnmounted) {
      // 安全地更新状态
      state.value = data
    }
  }
}
```

## 小结

卸载钩子的要点：

| 特性 | onBeforeUnmount | onUnmounted |
|------|-----------------|-------------|
| 执行时机 | 卸载开始前 | 卸载完成后 |
| DOM 状态 | 存在 | 已移除 |
| 同步/异步 | 同步 | 异步 |
| 使用场景 | 最后的 DOM 操作 | 资源清理 |

核心原则：在 onMounted 中添加的资源，在 onUnmounted 中清理。

下一章将分析 KeepAlive 相关的激活/停用钩子。
