# onBeforeUnmount 实现

onBeforeUnmount 钩子在组件卸载之前调用。此时组件仍然完全可用，是清理工作的好时机。

## 定义

```typescript
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
```

## 调用时机

在渲染器的 unmountComponent 函数中：

```typescript
const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: SuspenseBoundary | null,
  doRemove?: boolean
) => {
  const { bum, scope, update, subTree, um } = instance

  // ⭐ 调用 beforeUnmount 钩子
  if (bum) {
    invokeArrayFns(bum)
  }

  // 停止组件的 effect scope
  scope.stop()

  // 停止 update effect
  if (update) {
    update.active = false
    unmount(subTree, instance, parentSuspense, doRemove)
  }
  
  // 调用 unmounted（异步）
  if (um) {
    queuePostRenderEffect(um, parentSuspense)
  }
  
  // 标记已卸载
  queuePostRenderEffect(() => {
    instance.isUnmounted = true
  }, parentSuspense)

  // 处理 Suspense 相关逻辑
  if (
    __FEATURE_SUSPENSE__ &&
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

## 同步执行

```typescript
if (bum) {
  invokeArrayFns(bum)  // 同步调用
}
```

beforeUnmount 是同步的，在卸载流程开始时立即执行。

## DOM 仍然存在

```typescript
onBeforeUnmount(() => {
  // 此时 DOM 还在
  console.log(containerRef.value)  // <div>...</div>
  
  // 可以进行最后的 DOM 操作
  containerRef.value?.classList.add('leaving')
})
```

## effect scope 停止

```typescript
if (bum) {
  invokeArrayFns(bum)
}

// beforeUnmount 之后停止 scope
scope.stop()
```

scope.stop() 会停止组件内所有的 effect，包括 computed 和 watch。

## 清理工作

```typescript
import { ref, onMounted, onBeforeUnmount } from 'vue'

export default {
  setup() {
    const timer = ref<number | null>(null)
    
    onMounted(() => {
      timer.value = window.setInterval(() => {
        console.log('tick')
      }, 1000)
    })
    
    onBeforeUnmount(() => {
      // 清理定时器
      if (timer.value) {
        window.clearInterval(timer.value)
      }
    })
  }
}
```

## 事件监听器清理

```typescript
function useEventListener(target: EventTarget, event: string, handler: EventListener) {
  onMounted(() => {
    target.addEventListener(event, handler)
  })
  
  onBeforeUnmount(() => {
    target.removeEventListener(event, handler)
  })
}
```

## 父先子后

```
Parent beforeUnmount
  ↓
Parent 停止 scope
  ↓
Parent unmount subTree
  ↓
  Child beforeUnmount
    ↓
  Child 停止 scope
    ↓
  Child unmount subTree
    ↓
    Grandchild beforeUnmount
    ...
```

父组件先触发 beforeUnmount，然后递归卸载子组件。

## 取消异步操作

```typescript
import { ref, onMounted, onBeforeUnmount } from 'vue'

export default {
  setup() {
    const controller = new AbortController()
    const data = ref(null)
    
    onMounted(async () => {
      try {
        const response = await fetch('/api/data', {
          signal: controller.signal
        })
        data.value = await response.json()
      } catch (e) {
        if (e.name !== 'AbortError') {
          throw e
        }
      }
    })
    
    onBeforeUnmount(() => {
      // 取消进行中的请求
      controller.abort()
    })
    
    return { data }
  }
}
```

## 第三方库清理

```typescript
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js'

export default {
  setup() {
    const canvasRef = ref<HTMLCanvasElement | null>(null)
    let chart: Chart | null = null
    
    onMounted(() => {
      chart = new Chart(canvasRef.value!, {
        type: 'line',
        data: { /* ... */ }
      })
    })
    
    onBeforeUnmount(() => {
      // 销毁 Chart 实例
      chart?.destroy()
      chart = null
    })
    
    return { canvasRef }
  }
}
```

## 订阅清理

```typescript
import { onMounted, onBeforeUnmount } from 'vue'

export default {
  setup() {
    let unsubscribe: (() => void) | null = null
    
    onMounted(() => {
      unsubscribe = store.subscribe((state) => {
        // 处理状态变化
      })
    })
    
    onBeforeUnmount(() => {
      unsubscribe?.()
    })
  }
}
```

## WebSocket 清理

```typescript
import { ref, onMounted, onBeforeUnmount } from 'vue'

export default {
  setup() {
    const ws = ref<WebSocket | null>(null)
    
    onMounted(() => {
      ws.value = new WebSocket('wss://example.com')
      ws.value.onmessage = (event) => {
        // 处理消息
      }
    })
    
    onBeforeUnmount(() => {
      if (ws.value) {
        ws.value.close()
        ws.value = null
      }
    })
  }
}
```

## 与 unmounted 的区别

```typescript
onBeforeUnmount(() => {
  // DOM 存在，组件功能完整
  // 适合需要访问 DOM 的清理工作
})

onUnmounted(() => {
  // DOM 已移除，组件已完全卸载
  // 适合不需要 DOM 的清理工作
})
```

## 小结

onBeforeUnmount 的关键点：

1. **同步执行**：在卸载流程开始时立即调用
2. **DOM 可用**：此时 DOM 还未移除
3. **组件功能完整**：响应式、计算属性等仍可用
4. **父先子后**：父组件先于子组件触发
5. **清理时机**：适合清理定时器、事件、第三方库

这是卸载阶段的第一个钩子。

下一章将分析 onUnmounted 的实现。
