# Suspense 组件实现

Suspense 用于处理异步依赖的组件。它在异步内容加载时显示后备内容，加载完成后切换到主内容。

## 基本用法

```html
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

## 异步依赖

Suspense 处理两种异步依赖：

1. **异步组件**：`defineAsyncComponent`
2. **async setup**：返回 Promise 的 setup

```javascript
// async setup
export default {
  async setup() {
    const data = await fetchData()
    return { data }
  }
}
```

## SuspenseBoundary

核心数据结构：

```typescript
export interface SuspenseBoundary {
  vnode: VNode<RendererNode, RendererElement, SuspenseProps>
  parent: SuspenseBoundary | null
  parentComponent: ComponentInternalInstance | null
  isSVG: boolean
  container: RendererElement
  hiddenContainer: RendererElement
  anchor: RendererNode | null
  activeBranch: VNode | null
  pendingBranch: VNode | null
  deps: number
  pendingId: number
  timeout: number
  isInFallback: boolean
  isHydrating: boolean
  isUnmounted: boolean
  effects: Function[]
  resolve(force?: boolean, sync?: boolean): void
  fallback(fallbackVNode: VNode): void
  move(container: RendererElement, anchor: RendererNode | null, type: MoveType): void
  next(): RendererNode | null
  registerDep(
    instance: ComponentInternalInstance,
    setupRenderEffect: SetupRenderEffectFn
  ): void
  unmount(parentSuspense: SuspenseBoundary | null, doRemove?: boolean): void
}
```

## createSuspenseBoundary

创建 Suspense 边界：

```typescript
function createSuspenseBoundary(
  vnode: VNode,
  parentSuspense: SuspenseBoundary | null,
  parentComponent: ComponentInternalInstance | null,
  container: RendererElement,
  hiddenContainer: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  rendererInternals: RendererInternals,
  isHydrating = false
): SuspenseBoundary {
  const {
    p: patch,
    m: move,
    um: unmount,
    n: next,
    o: { parentNode, remove }
  } = rendererInternals

  const timeout = vnode.props ? toNumber(vnode.props.timeout) : undefined

  const suspense: SuspenseBoundary = {
    vnode,
    parent: parentSuspense,
    parentComponent,
    isSVG,
    container,
    hiddenContainer,
    anchor,
    deps: 0,
    pendingId: 0,
    timeout: typeof timeout === 'number' ? timeout : -1,
    activeBranch: null,
    pendingBranch: null,
    isInFallback: true,
    isHydrating,
    isUnmounted: false,
    effects: [],

    resolve(force = false, sync = false) {
      // 解析逻辑
    },

    fallback(fallbackVNode) {
      // 回退逻辑
    },

    move(container, anchor, type) {
      // 移动逻辑
    },

    next() {
      return next(suspense.activeBranch!)
    },

    registerDep(instance, setupRenderEffect) {
      // 注册依赖
    },

    unmount(parentSuspense, doRemove) {
      // 卸载逻辑
    }
  }

  return suspense
}
```

## 处理流程

```typescript
function process(
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  // ...
) {
  if (n1 == null) {
    // 挂载
    mountSuspense(n2, container, anchor, ...)
  } else {
    // 更新
    patchSuspense(n1, n2, container, anchor, ...)
  }
}
```

## mountSuspense

挂载 Suspense：

```typescript
function mountSuspense(
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  rendererInternals: RendererInternals
) {
  const { p: patch, o: { createElement } } = rendererInternals

  // 隐藏容器
  const hiddenContainer = createElement('div')

  // 创建边界
  const suspense = (vnode.suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    container,
    hiddenContainer,
    anchor,
    isSVG,
    slotScopeIds,
    optimized,
    rendererInternals
  ))

  // 渲染默认内容到隐藏容器
  patch(
    null,
    (suspense.pendingBranch = vnode.ssContent!),
    hiddenContainer,
    null,
    parentComponent,
    suspense,
    isSVG,
    slotScopeIds
  )

  // 检查是否有异步依赖
  if (suspense.deps > 0) {
    // 有异步依赖，触发 onPending
    triggerEvent(vnode, 'onPending')
    suspense.isInFallback = true
    
    // 渲染 fallback
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
  } else {
    // 无异步依赖，直接 resolve
    suspense.resolve(false, true)
  }
}
```

## registerDep

注册异步依赖：

```typescript
registerDep(instance, setupRenderEffect) {
  const isInPendingSuspense = !!suspense.pendingBranch
  if (isInPendingSuspense) {
    suspense.deps++
  }
  
  const hydratedEl = instance.vnode.el
  instance
    .asyncDep!.catch(err => {
      handleError(err, instance, ErrorCodes.SETUP_FUNCTION)
    })
    .then(asyncSetupResult => {
      if (instance.isUnmounted || suspense.isUnmounted) {
        return
      }
      
      // 异步完成，减少依赖计数
      suspense.deps--
      
      // 处理结果
      if (asyncSetupResult) {
        handleSetupResult(instance, asyncSetupResult, false)
      }
      
      // 设置渲染 effect
      setupRenderEffect(
        instance,
        instance.vnode,
        suspense.hiddenContainer!,
        null,
        suspense,
        isSVG,
        optimized
      )
      
      // 所有依赖完成，resolve
      if (suspense.deps === 0) {
        suspense.resolve()
      }
    })
}
```

## resolve

解析完成：

```typescript
resolve(force = false, sync = false) {
  const {
    vnode,
    activeBranch,
    pendingBranch,
    pendingId,
    effects,
    parentComponent,
    container
  } = suspense

  // 正在 hydrate
  if (suspense.isHydrating) {
    suspense.isHydrating = false
  } else if (!force) {
    // 检查 pending id
    const delayEnter = activeBranch && pendingBranch!.transition
    
    // 处理过渡
    if (delayEnter) {
      // 有过渡，延迟显示
    }
    
    // 卸载 fallback
    if (activeBranch) {
      unmount(activeBranch, parentComponent, suspense, true)
    }
    
    // 移动 pending 到真实容器
    move(pendingBranch!, container, next(activeBranch!), MoveType.ENTER)
  }
  
  // 设置活动分支
  setActiveBranch(suspense, pendingBranch!)
  suspense.pendingBranch = null
  suspense.isInFallback = false

  // 触发 onResolve
  triggerEvent(vnode, 'onResolve')

  // 执行暂存的 effects
  let parent = suspense.parent
  let hasUnresolvedAncestor = false
  while (parent) {
    if (parent.pendingBranch) {
      parent.effects.push(...effects)
      hasUnresolvedAncestor = true
      break
    }
    parent = parent.parent
  }
  if (!hasUnresolvedAncestor) {
    queuePostFlushCb(effects)
  }
  suspense.effects = []
}
```

## fallback

显示后备内容：

```typescript
fallback(fallbackVNode) {
  if (!suspense.pendingBranch) {
    return
  }

  const { vnode, activeBranch, parentComponent, container, isSVG } = suspense

  // 触发 onFallback
  triggerEvent(vnode, 'onFallback')

  // 卸载当前活动分支
  if (activeBranch) {
    unmount(activeBranch, parentComponent, null, true)
  }

  // 渲染 fallback
  patch(
    null,
    fallbackVNode,
    container,
    anchor,
    parentComponent,
    null,
    isSVG,
    slotScopeIds
  )

  setActiveBranch(suspense, fallbackVNode)
  suspense.isInFallback = true
}
```

## 超时处理

```typescript
const timeout = vnode.props ? toNumber(vnode.props.timeout) : undefined

if (timeout != null) {
  suspense.timeout = timeout
}

// 在 mountSuspense 中
if (suspense.timeout > 0) {
  setTimeout(() => {
    if (!suspense.isResolved) {
      suspense.fallback(vnode.ssFallback!)
    }
  }, suspense.timeout)
}
```

## 事件钩子

```html
<Suspense
  @pending="onPending"
  @resolve="onResolve"
  @fallback="onFallback"
>
  ...
</Suspense>
```

```typescript
function triggerEvent(
  vnode: VNode,
  name: 'onResolve' | 'onPending' | 'onFallback'
) {
  const eventListener = vnode.props && vnode.props[name]
  if (isFunction(eventListener)) {
    eventListener()
  }
}
```

## 嵌套 Suspense

Suspense 可以嵌套：

```html
<Suspense>
  <template #default>
    <Suspense>
      <AsyncChild />
      <template #fallback>内层 Loading</template>
    </Suspense>
  </template>
  <template #fallback>外层 Loading</template>
</Suspense>
```

内层解析后，如果外层还有未解析的依赖，effects 会暂存。

## 错误处理

配合 onErrorCaptured：

```html
<script setup>
import { onErrorCaptured } from 'vue'

const error = ref(null)

onErrorCaptured((e) => {
  error.value = e
  return false
})
</script>

<template>
  <div v-if="error">加载失败</div>
  <Suspense v-else>
    <AsyncComponent />
    <template #fallback>加载中...</template>
  </Suspense>
</template>
```

## 小结

Suspense 的实现要点：

1. **边界对象**：跟踪依赖计数和分支状态
2. **隐藏容器**：异步内容先渲染到隐藏容器
3. **依赖注册**：组件通过 registerDep 注册异步依赖
4. **resolve**：所有依赖完成后切换到主内容
5. **effects 暂存**：嵌套时 effects 正确处理

Suspense 让异步组件的加载状态管理变得声明式。

下一章将分析 Transition 的实现。
