# onBeforeUpdate 实现

onBeforeUpdate 钩子在组件响应式数据变化触发重新渲染之前调用。此时可以访问更新前的 DOM 状态。

## 定义

```typescript
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
```

## 调用时机

在 componentUpdateFn 的更新分支中：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载...
  } else {
    // ⭐ 更新
    let { next, bu, u, parent, vnode } = instance
    let originNext = next
    let vnodeHook: VNodeHook | null | undefined
    
    toggleRecurse(instance, false)
    
    if (next) {
      next.el = vnode.el
      updateComponentPreRender(instance, next, optimized)
    } else {
      next = vnode
    }

    // ⭐ 调用 beforeUpdate 钩子
    if (bu) {
      invokeArrayFns(bu)
    }
    
    // 调用 VNode 的 onVnodeBeforeUpdate
    if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
      invokeVNodeHook(vnodeHook, parent, next, vnode)
    }
    
    toggleRecurse(instance, true)

    // 渲染新的子树
    const nextTree = renderComponentRoot(instance)
    const prevTree = instance.subTree
    instance.subTree = nextTree
    
    // patch 更新
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
    
    // 调用 updated...
  }
}
```

## 同步执行

```typescript
if (bu) {
  invokeArrayFns(bu)  // 同步调用
}
```

beforeUpdate 是同步的，在 patch 之前执行。

## 访问更新前的 DOM

```typescript
import { ref, onBeforeUpdate } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const divRef = ref<HTMLElement | null>(null)
    
    onBeforeUpdate(() => {
      // 此时 DOM 还是旧的
      console.log('Before update, DOM content:', divRef.value?.textContent)
      // 输出旧值
    })
    
    return { count, divRef }
  }
}
```

## updateComponentPreRender

```typescript
const updateComponentPreRender = (
  instance: ComponentInternalInstance,
  nextVNode: VNode,
  optimized: boolean
) => {
  nextVNode.component = instance
  const prevProps = instance.vnode.props
  instance.vnode = nextVNode
  instance.next = null
  
  // 更新 props
  updateProps(instance, nextVNode.props, prevProps, optimized)
  
  // 更新 slots
  updateSlots(instance, nextVNode.children, optimized)

  pauseTracking()
  // 执行 pre-flush watchers
  flushPreFlushCbs()
  resetTracking()
}
```

在 beforeUpdate 之前，props 和 slots 已经更新。

## 与 watch 的配合

```typescript
const count = ref(0)
const prevCount = ref(0)

onBeforeUpdate(() => {
  prevCount.value = count.value  // 保存更新前的值
})

watch(count, (newVal, oldVal) => {
  // watch 也可以获取新旧值
})
```

## 不会在首次挂载时调用

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载，不调用 beforeUpdate
  } else {
    // 更新时才调用 beforeUpdate
    if (bu) {
      invokeArrayFns(bu)
    }
  }
}
```

## 触发条件

只有当组件重新渲染时才会触发：

```typescript
const effect = new ReactiveEffect(
  componentUpdateFn,
  () => queueJob(update),  // 调度器
  instance.scope
)
```

响应式数据变化 → effect 重新运行 → beforeUpdate 被调用。

## 父子组件顺序

```
Parent 响应式数据变化
  ↓
Parent beforeUpdate
  ↓
Parent render
  ↓
  (如果子组件需要更新)
  Child beforeUpdate
    ↓
  Child render
    ↓
  Child patch
    ↓
  Child updated
  ↓
Parent patch
  ↓
Parent updated
```

## 可以修改响应式数据

```typescript
onBeforeUpdate(() => {
  // 可以修改响应式数据
  // 但这可能导致额外的更新周期
  if (someCondition.value) {
    anotherValue.value = 'changed'
  }
})
```

注意：在 beforeUpdate 中修改数据可能触发新的更新。

## 使用场景

```typescript
import { ref, onBeforeUpdate, onUpdated } from 'vue'

export default {
  setup() {
    const items = ref(['a', 'b', 'c'])
    const listRef = ref<HTMLElement | null>(null)
    let previousScrollHeight = 0
    
    onBeforeUpdate(() => {
      // 记录更新前的滚动高度
      if (listRef.value) {
        previousScrollHeight = listRef.value.scrollHeight
      }
    })
    
    onUpdated(() => {
      // 更新后恢复滚动位置
      if (listRef.value) {
        const newScrollHeight = listRef.value.scrollHeight
        listRef.value.scrollTop += newScrollHeight - previousScrollHeight
      }
    })
    
    return { items, listRef }
  }
}
```

## 与 watchEffect 对比

```typescript
// watchEffect 在依赖变化时立即执行
watchEffect(() => {
  console.log(count.value)
})

// onBeforeUpdate 在组件重新渲染前执行
onBeforeUpdate(() => {
  console.log('Component about to re-render')
})
```

区别：
- watchEffect 追踪特定依赖
- beforeUpdate 只在组件渲染时触发

## 异步注意事项

```typescript
onBeforeUpdate(async () => {
  // ⚠️ 异步代码在 patch 之后执行
  await someAsyncOperation()
  // 此时 DOM 已经更新了
})
```

如果需要异步操作，应该在 onUpdated 中进行。

## 小结

onBeforeUpdate 的关键点：

1. **时机**：props/slots 更新后，patch 之前
2. **同步执行**：在渲染前同步调用
3. **访问旧 DOM**：可以获取更新前的 DOM 状态
4. **不在首次挂载触发**：只在后续更新时调用
5. **适合保存状态**：记录更新前的滚动位置等

这是更新周期的第一个钩子。

下一章将分析 onUpdated 的实现。
