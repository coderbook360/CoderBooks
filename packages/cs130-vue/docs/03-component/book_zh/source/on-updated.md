# onUpdated 实现

onUpdated 钩子在组件 DOM 更新完成后调用。此时可以访问更新后的 DOM 状态。

## 定义

```typescript
export const onUpdated = createHook(LifecycleHooks.UPDATED)
```

## 调用时机

在 componentUpdateFn 的更新分支末尾：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载...
  } else {
    // 更新
    let { next, bu, u, parent, vnode } = instance
    
    // 调用 beforeUpdate
    if (bu) {
      invokeArrayFns(bu)
    }
    
    // 渲染新的子树
    const nextTree = renderComponentRoot(instance)
    const prevTree = instance.subTree
    instance.subTree = nextTree
    
    // patch 更新 DOM
    patch(
      prevTree,
      nextTree,
      hostParentNode(prevTree.el!)!,
      getNextHostNode(prevTree),
      instance,
      parentSuspense,
      isSVG
    )
    
    next.el = nextTree.el
    
    // ⭐ 调用 updated 钩子
    if (u) {
      queuePostRenderEffect(u, parentSuspense)
    }
    
    // 调用 VNode 的 onVnodeUpdated
    if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
      queuePostRenderEffect(
        () => invokeVNodeHook(vnodeHook!, parent, next!, vnode),
        parentSuspense
      )
    }
  }
}
```

## 异步执行

```typescript
if (u) {
  queuePostRenderEffect(u, parentSuspense)  // 异步
}
```

与 mounted 类似，updated 也是通过 queuePostRenderEffect 异步调用的。

## 访问更新后的 DOM

```typescript
import { ref, onUpdated } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const divRef = ref<HTMLElement | null>(null)
    
    onUpdated(() => {
      // 此时 DOM 已更新
      console.log('After update, DOM content:', divRef.value?.textContent)
      // 输出新值
    })
    
    return { count, divRef }
  }
}
```

## 子先父后

```typescript
// flushPostFlushCbs 按 ID 排序执行
activePostFlushCbs.sort((a, b) => getId(a) - getId(b))
```

ID 小的组件先执行，子组件 ID 小于父组件，所以子组件的 updated 先执行。

```
Parent update
  Child update
    Grandchild patch
    // queue: [grandchild.updated]
  Child patch
  // queue: [grandchild.updated, child.updated]
Parent patch
// queue: [grandchild.updated, child.updated, parent.updated]

// 执行顺序（按 ID 排序）：
// Grandchild updated → Child updated → Parent updated
```

## 不在首次挂载触发

```typescript
if (!instance.isMounted) {
  // 首次挂载，调用 mounted
  if (m) {
    queuePostRenderEffect(m, parentSuspense)
  }
} else {
  // 更新，调用 updated
  if (u) {
    queuePostRenderEffect(u, parentSuspense)
  }
}
```

首次挂载触发 mounted，后续更新触发 updated。

## 使用场景

```typescript
import { ref, onUpdated, nextTick } from 'vue'

export default {
  setup() {
    const messages = ref<string[]>([])
    const containerRef = ref<HTMLElement | null>(null)
    
    onUpdated(() => {
      // 新消息添加后自动滚动到底部
      if (containerRef.value) {
        containerRef.value.scrollTop = containerRef.value.scrollHeight
      }
    })
    
    const addMessage = (msg: string) => {
      messages.value.push(msg)
    }
    
    return { messages, containerRef, addMessage }
  }
}
```

## 与 nextTick 的关系

```typescript
import { ref, nextTick, onUpdated } from 'vue'

const count = ref(0)

// 方式 1：使用 nextTick
count.value++
await nextTick()
// DOM 已更新

// 方式 2：使用 onUpdated
onUpdated(() => {
  // 每次更新后都会调用
})
```

nextTick 是一次性的，onUpdated 是每次更新都调用。

## 避免无限循环

```typescript
onUpdated(() => {
  // ⚠️ 危险：可能导致无限循环
  count.value++  // 修改响应式数据 → 触发更新 → 再次触发 onUpdated
})

// 安全的做法
onUpdated(() => {
  if (someCondition && !hasUpdated) {
    hasUpdated = true
    count.value++
  }
})
```

## 配合 beforeUpdate

```typescript
let prevScrollHeight = 0

onBeforeUpdate(() => {
  prevScrollHeight = container.value?.scrollHeight ?? 0
})

onUpdated(() => {
  const newScrollHeight = container.value?.scrollHeight ?? 0
  if (newScrollHeight > prevScrollHeight) {
    // 内容增加，滚动到新内容
    container.value?.scrollTo(0, newScrollHeight)
  }
})
```

## 调试用途

```typescript
onUpdated(() => {
  console.log('Component updated at:', new Date().toISOString())
  console.log('Current state:', state.value)
})
```

## 与 watch 的区别

```typescript
// watch：监听特定数据变化
watch(count, () => {
  console.log('count changed')
})

// onUpdated：组件任何更新都会触发
onUpdated(() => {
  console.log('component updated')
})
```

watch 更精确，onUpdated 更通用。

## 错误处理

```typescript
onUpdated(() => {
  throw new Error('Something went wrong')
})

// 错误会被 errorCaptured 捕获
```

## 异步操作

```typescript
onUpdated(async () => {
  // 可以进行异步操作
  await saveToServer(data.value)
})
```

## 多个 updated 钩子

```typescript
onUpdated(() => {
  console.log('first')
})

onUpdated(() => {
  console.log('second')
})

// 按注册顺序执行
```

## 小结

onUpdated 的关键点：

1. **异步执行**：通过 queuePostRenderEffect 调度
2. **DOM 已更新**：可以访问最新的 DOM 状态
3. **子先父后**：按组件 ID 排序执行
4. **不在首次触发**：只在后续更新时调用
5. **避免无限循环**：谨慎在钩子中修改响应式数据

这是更新周期的最后一个钩子。

下一章将分析 onBeforeUnmount 的实现。
