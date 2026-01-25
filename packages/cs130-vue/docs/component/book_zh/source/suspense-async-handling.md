# Suspense 异步处理

本章分析 Suspense 组件的异步处理逻辑，包括 async setup、多个异步依赖的协调以及状态切换。

## async setup 触发 Suspense

```typescript
// setupStatefulComponent 中
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions
  
  const { setup } = Component
  if (setup) {
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)

    setCurrentInstance(instance)
    pauseTracking()
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [instance.props, setupContext]
    )
    resetTracking()
    unsetCurrentInstance()

    // ⭐ 检测 async setup
    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
      
      if (isSSR) {
        // SSR 等待 promise
        return setupResult
          .then((resolvedResult: unknown) => {
            handleSetupResult(instance, resolvedResult, isSSR)
          })
          .catch(e => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
          })
      } else if (__FEATURE_SUSPENSE__) {
        // 存储异步依赖
        instance.asyncDep = setupResult
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  }
}
```

## deps 计数机制

```typescript
// mountComponent 中
function mountComponent(
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
) {
  // 创建实例
  const instance = (initialVNode.component = createComponentInstance(
    initialVNode,
    parentComponent,
    parentSuspense
  ))

  // 设置组件
  setupComponent(instance)

  // ⭐ 检查 async setup
  if (__FEATURE_SUSPENSE__ && instance.asyncDep) {
    parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect)

    // 没有初始内容时创建占位符
    if (!initialVNode.el) {
      const placeholder = (instance.subTree = createVNode(Comment))
      processCommentNode(null, placeholder, container, anchor)
    }
    return
  }

  // 正常设置渲染 effect
  setupRenderEffect(
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    isSVG,
    optimized
  )
}
```

## registerDep 详解

```typescript
registerDep(instance, setupRenderEffect) {
  const isInPendingSuspense = !!suspense.pendingBranch
  
  // ⭐ 增加依赖计数
  if (isInPendingSuspense) {
    suspense.deps++
  }

  const hydratedEl = instance.vnode.el
  
  instance
    .asyncDep!
    .catch(err => {
      handleError(err, instance, ErrorCodes.SETUP_FUNCTION)
    })
    .then(asyncSetupResult => {
      // ⭐ 检查是否已卸载
      if (
        instance.isUnmounted ||
        suspense.isUnmounted ||
        suspense.pendingId !== instance.suspenseId
      ) {
        return
      }

      instance.asyncResolved = true
      const { vnode } = instance

      // 处理返回值
      handleSetupResult(instance, asyncSetupResult, false)

      if (hydratedEl) {
        vnode.el = hydratedEl
      }
      
      const placeholder = !hydratedEl && instance.subTree.el
      
      // 设置渲染 effect
      setupRenderEffect(
        instance,
        vnode,
        parentNode(hydratedEl || instance.subTree.el!)!,
        hydratedEl ? null : next(instance.subTree),
        suspense,
        isSVG,
        optimized
      )

      if (placeholder) {
        remove(placeholder)
      }
      
      updateHOCHostEl(instance, vnode.el)

      // ⭐ 减少依赖计数，检查是否全部完成
      if (isInPendingSuspense && --suspense.deps === 0) {
        suspense.resolve()
      }
    })
}
```

## 多个异步组件

```vue
<template>
  <Suspense>
    <template #default>
      <div>
        <AsyncA />  <!-- 异步组件 1 -->
        <AsyncB />  <!-- 异步组件 2 -->
        <AsyncC />  <!-- 异步组件 3 -->
      </div>
    </template>
    <template #fallback>
      <div>Loading all components...</div>
    </template>
  </Suspense>
</template>
```

工作流程：
1. 挂载时 deps 初始化为 0
2. 每个异步组件注册时 deps++
3. 每个组件完成时 deps--
4. 当 deps === 0 时调用 resolve()

## fallback 切换

```typescript
fallback(fallbackVNode) {
  if (!suspense.pendingBranch) {
    return
  }

  const { vnode, activeBranch, parentComponent, container, isSVG } = suspense

  // 触发 onFallback
  triggerEvent(vnode, 'onFallback')

  const anchor = next(activeBranch!)
  
  const mountFallback = () => {
    if (!suspense.isInFallback) {
      return
    }
    // 挂载 fallback
    patch(
      null,
      fallbackVNode,
      container,
      anchor,
      parentComponent,
      null,
      isSVG,
      slotScopeIds,
      optimized
    )
    setActiveBranch(suspense, fallbackVNode)
  }

  const delayEnter =
    fallbackVNode.transition && fallbackVNode.transition.mode === 'out-in'
  if (delayEnter) {
    activeBranch!.transition!.afterLeave = mountFallback
  }

  suspense.isInFallback = true
  
  // 卸载当前 active
  unmount(
    activeBranch!,
    parentComponent,
    null,
    true
  )

  if (!delayEnter) {
    mountFallback()
  }
}
```

## timeout 超时处理

```typescript
// mountSuspense 中
if (suspense.deps > 0) {
  triggerEvent(vnode, 'onPending')
  triggerEvent(vnode, 'onFallback')
  
  patch(
    null,
    vnode.ssFallback!,
    container,
    anchor,
    parentComponent,
    null,
    isSVG,
    slotScopeIds
  )
  setActiveBranch(suspense, vnode.ssFallback!)
  
  // ⭐ 设置超时
  if (suspense.timeout > 0) {
    setTimeout(() => {
      if (suspense.isInFallback) {
        suspense.fallback(vnode.ssFallback!)
      }
    }, suspense.timeout)
  }
}
```

## patchSuspense 更新

```typescript
function patchSuspense(
  n1: VNode,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  { p: patch, um: unmount, o: { createElement } }: RendererInternals
) {
  const suspense = (n2.suspense = n1.suspense)!
  suspense.vnode = n2
  n2.el = n1.el

  const newBranch = n2.ssContent!
  const newFallback = n2.ssFallback!

  const { activeBranch, pendingBranch, isInFallback, isHydrating } = suspense
  
  if (pendingBranch) {
    suspense.pendingBranch = newBranch
    if (isSameVNodeType(newBranch, pendingBranch)) {
      // 更新 pending
      patch(
        pendingBranch,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      if (suspense.deps <= 0) {
        suspense.resolve()
      } else if (isInFallback) {
        patch(
          activeBranch,
          newFallback,
          container,
          anchor,
          parentComponent,
          null,
          isSVG,
          slotScopeIds,
          optimized
        )
        setActiveBranch(suspense, newFallback)
      }
    } else {
      // 新的 pending 分支
      suspense.pendingId++
      
      // 卸载旧的 pending
      unmount(pendingBranch, parentComponent, suspense)
      
      // 挂载新的 pending
      patch(
        null,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      
      if (suspense.deps <= 0) {
        suspense.resolve()
      }
    }
  } else {
    if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
      // 更新 active
      patch(
        activeBranch,
        newBranch,
        container,
        anchor,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      setActiveBranch(suspense, newBranch)
    } else {
      // 新的异步分支
      triggerEvent(n2, 'onPending')
      suspense.pendingBranch = newBranch
      suspense.pendingId++
      
      patch(
        null,
        newBranch,
        suspense.hiddenContainer,
        null,
        parentComponent,
        suspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      
      if (suspense.deps <= 0) {
        suspense.resolve()
      } else {
        const { timeout, pendingId } = suspense
        if (timeout > 0) {
          setTimeout(() => {
            if (suspense.pendingId === pendingId) {
              suspense.fallback(newFallback)
            }
          }, timeout)
        } else if (timeout === 0) {
          suspense.fallback(newFallback)
        }
      }
    }
  }
}
```

## effects 队列

```typescript
// Suspense 内的 effect 会被收集
resolve(force = false) {
  // ...
  
  // 查找父 Suspense
  let parent = suspense.parent
  let hasUnresolvedAncestor = false
  while (parent) {
    if (parent.pendingBranch) {
      // 父级还未 resolve，将 effects 提交给父级
      parent.effects.push(...effects)
      hasUnresolvedAncestor = true
      break
    }
    parent = parent.parent
  }

  // 没有未 resolve 的父级，直接执行
  if (!hasUnresolvedAncestor) {
    queuePostFlushCb(effects)
  }
  
  suspense.effects = []
}
```

## 错误处理

```typescript
instance
  .asyncDep!
  .catch(err => {
    // ⭐ async setup 错误会被捕获
    handleError(err, instance, ErrorCodes.SETUP_FUNCTION)
  })
  .then(asyncSetupResult => {
    // ...
  })
```

## 使用示例

### async setup

```vue
<script setup>
const data = await fetchData()  // async setup
</script>
```

### 配合 onErrorCaptured

```vue
<template>
  <Suspense @pending="onPending" @resolve="onResolve">
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
import { onErrorCaptured, ref } from 'vue'

const error = ref(null)

onErrorCaptured((err) => {
  error.value = err
  return false
})
</script>
```

## 小结

Suspense 异步处理的核心要点：

1. **async setup**：返回 Promise 时存储到 asyncDep
2. **deps 计数**：追踪所有异步依赖
3. **registerDep**：注册并监听异步完成
4. **resolve 时机**：deps 归零时触发
5. **嵌套 Suspense**：effects 向上传递

下一章将分析 defineAsyncComponent 异步组件。
