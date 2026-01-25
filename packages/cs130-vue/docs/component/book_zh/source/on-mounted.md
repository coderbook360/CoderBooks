# onMounted 实现

onMounted 钩子在组件挂载完成后调用。此时组件的 DOM 已经渲染到页面上，可以进行 DOM 操作。

## 定义

```typescript
export const onMounted = createHook(LifecycleHooks.MOUNTED)
```

## 调用时机

在 setupRenderEffect 中：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 调用 beforeMount
    if (bm) {
      invokeArrayFns(bm)
    }
    
    // 渲染组件树
    const subTree = (instance.subTree = renderComponentRoot(instance))
    
    // 挂载到 DOM
    patch(null, subTree, container, anchor, instance, parentSuspense, isSVG)
    
    initialVNode.el = subTree.el
    
    // ⭐ 调用 mounted 钩子
    if (m) {
      queuePostRenderEffect(m, parentSuspense)
    }
    
    // 调用 VNode 的 onVnodeMounted 钩子
    if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeMounted)) {
      const scopedInitialVNode = initialVNode
      queuePostRenderEffect(
        () => invokeVNodeHook(vnodeHook!, parent, scopedInitialVNode),
        parentSuspense
      )
    }
    
    // 标记已挂载
    instance.isMounted = true
    
    // 清理引用
    initialVNode = container = anchor = null as any
  }
}
```

## queuePostRenderEffect

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb

export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(cb, cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex)
    ) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
```

mounted 钩子被放入 postFlushCbs 队列，在 DOM 更新后执行。

## 异步执行

```typescript
if (m) {
  queuePostRenderEffect(m, parentSuspense)  // 异步
}
```

与 beforeMount 的同步调用不同，mounted 是异步的，确保所有子组件都已挂载。

## flushPostFlushCbs

```typescript
export function flushPostFlushCbs(seen?: CountMap) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)]
    pendingPostFlushCbs.length = 0

    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped)
      return
    }

    activePostFlushCbs = deduped

    activePostFlushCbs.sort((a, b) => getId(a) - getId(b))

    for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
      activePostFlushCbs[postFlushIndex]()
    }
    
    activePostFlushCbs = null
    postFlushIndex = 0
  }
}
```

钩子按组件 ID 排序执行，保证父组件在子组件之后。

## 父子组件顺序

```
Parent beforeMount
  Child beforeMount
    Grandchild beforeMount
    Grandchild render + patch
    Grandchild mounted (queued)
  Child render + patch
  Child mounted (queued)
Parent render + patch
Parent mounted (queued)

// flushPostFlushCbs 执行
// 按 ID 排序后：Grandchild → Child → Parent
// 结果：子组件先 mounted，父组件后 mounted
```

## 可以访问 DOM

```typescript
import { ref, onMounted } from 'vue'

export default {
  setup() {
    const containerRef = ref<HTMLElement | null>(null)
    
    onMounted(() => {
      // 可以访问 DOM
      console.log(containerRef.value)  // <div>...</div>
      
      // 可以操作 DOM
      containerRef.value!.style.color = 'red'
      
      // 可以初始化第三方库
      new Chart(containerRef.value, { ... })
    })
    
    return { containerRef }
  }
}
```

## 模板 ref

```vue
<template>
  <div ref="containerRef">Content</div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const containerRef = ref(null)

onMounted(() => {
  // ref 已赋值
  console.log(containerRef.value)  // <div>Content</div>
})
</script>
```

## 异步操作

```typescript
onMounted(async () => {
  // 可以进行异步操作
  const data = await fetchData()
  
  // 使用数据
  state.value = data
})
```

## 多次注册

```typescript
onMounted(() => {
  console.log('first')
})

onMounted(() => {
  console.log('second')
})

// 输出：
// first
// second
```

## 在可组合函数中

```typescript
function useWindowSize() {
  const width = ref(0)
  const height = ref(0)
  
  const update = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }
  
  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })
  
  return { width, height }
}
```

## Suspense 下的行为

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb

function queueEffectWithSuspense(
  fn: Function | Function[],
  suspense: SuspenseBoundary | null
): void {
  if (suspense && suspense.pendingBranch && !suspense.isInFallback) {
    if (isArray(fn)) {
      suspense.effects.push(...fn)
    } else {
      suspense.effects.push(fn)
    }
  } else {
    queuePostFlushCb(fn)
  }
}
```

在 Suspense pending 状态下，mounted 钩子会延迟到 resolve 后执行。

## 与 watchEffect 的区别

```typescript
// watchEffect 立即执行
watchEffect(() => {
  console.log(containerRef.value)  // 可能是 null
})

// onMounted 保证 DOM 已存在
onMounted(() => {
  console.log(containerRef.value)  // 一定有值
})
```

## 错误处理

```typescript
onMounted(() => {
  throw new Error('Something went wrong')
})

// 错误会被 errorCaptured 捕获
```

由于钩子被包装：

```typescript
const wrappedHook = (...args) => {
  const res = callWithAsyncErrorHandling(hook, target, type, args)
  return res
}
```

## 小结

onMounted 的关键点：

1. **异步执行**：通过 queuePostRenderEffect 调度
2. **DOM 可用**：此时组件 DOM 已渲染
3. **子先父后**：按组件 ID 排序，子组件先执行
4. **适合初始化**：第三方库、DOM 操作
5. **Suspense 感知**：在 pending 状态下延迟执行

这是最常用的生命周期钩子之一。

下一章将分析 onBeforeUpdate 的实现。
