# Suspense 组件源码

Suspense 是 Vue 3 的内置组件，用于处理异步依赖，提供优雅的加载状态管理。本章分析 Suspense 的核心实现。

## 组件定义

```typescript
// packages/runtime-core/src/components/Suspense.ts
export const SuspenseImpl = {
  name: 'Suspense',
  __isSuspense: true,
  process(
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean,
    rendererInternals: RendererInternals
  ) {
    if (n1 == null) {
      mountSuspense(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized,
        rendererInternals
      )
    } else {
      patchSuspense(
        n1,
        n2,
        container,
        anchor,
        parentComponent,
        isSVG,
        slotScopeIds,
        optimized,
        rendererInternals
      )
    }
  },
  hydrate: hydrateSuspense,
  create: createSuspenseBoundary,
  normalize: normalizeSuspenseChildren
}

export const Suspense = SuspenseImpl as unknown as {
  __isSuspense: true
  new (): {
    $props: VNodeProps & SuspenseProps
  }
}
```

## SuspenseProps 定义

```typescript
export interface SuspenseProps {
  onResolve?: () => void
  onPending?: () => void
  onFallback?: () => void
  timeout?: string | number
}
```

## SuspenseBoundary 边界

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
  resolve(force?: boolean): void
  fallback(fallbackVNode: VNode): void
  move(
    container: RendererElement,
    anchor: RendererNode | null,
    type: MoveType
  ): void
  next(): RendererNode | null
  registerDep(
    instance: ComponentInternalInstance,
    setupRenderEffect: SetupRenderEffectFn
  ): void
  unmount(parentSuspense: SuspenseBoundary | null, doRemove?: boolean): void
}
```

## createSuspenseBoundary 创建边界

```typescript
function createSuspenseBoundary(
  vnode: VNode,
  parent: SuspenseBoundary | null,
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

  const timeout = toNumber(vnode.props && vnode.props.timeout)
  
  const suspense: SuspenseBoundary = {
    vnode,
    parent,
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

    resolve(force = false) {
      // 解析逻辑
    },

    fallback(fallbackVNode) {
      // 回退逻辑
    },

    move(container, anchor, type) {
      // 移动逻辑
    },

    next() {
      return suspense.activeBranch && next(suspense.activeBranch)
    },

    registerDep(instance, setupRenderEffect) {
      // 注册异步依赖
    },

    unmount(parentSuspense, doRemove) {
      // 卸载逻辑
    }
  }

  return suspense
}
```

## mountSuspense 挂载

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
  const {
    p: patch,
    o: { createElement }
  } = rendererInternals

  // 创建隐藏容器
  const hiddenContainer = createElement('div')
  
  // 创建 Suspense 边界
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

  // 在隐藏容器中挂载 default 内容
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

  if (suspense.deps > 0) {
    // 有异步依赖，触发 onPending
    triggerEvent(vnode, 'onPending')
    triggerEvent(vnode, 'onFallback')
    
    // 挂载 fallback
    patch(
      null,
      vnode.ssFallback!,
      container,
      anchor,
      parentComponent,
      null,  // fallback 不在 suspense 边界内
      isSVG,
      slotScopeIds
    )
    setActiveBranch(suspense, vnode.ssFallback!)
  } else {
    // 没有异步依赖，直接 resolve
    suspense.resolve()
  }
}
```

## normalizeSuspenseChildren 子节点规范化

```typescript
export function normalizeSuspenseChildren(vnode: VNode) {
  const { shapeFlag, children } = vnode
  const isSlotChildren = shapeFlag & ShapeFlags.SLOTS_CHILDREN
  
  vnode.ssContent = normalizeSuspenseSlot(
    isSlotChildren ? (children as Slots).default : children
  )
  vnode.ssFallback = isSlotChildren
    ? normalizeSuspenseSlot((children as Slots).fallback)
    : createVNode(Comment)
}

function normalizeSuspenseSlot(s: any) {
  let block: VNode[] | null | undefined
  if (isFunction(s)) {
    const trackBlock = isBlockTreeEnabled && s._c
    if (trackBlock) {
      s._d = false
      openBlock()
    }
    s = s()
    if (trackBlock) {
      s._d = true
      block = currentBlock
      closeBlock()
    }
  }
  if (isArray(s)) {
    const singleChild = filterSingleRoot(s)
    s = singleChild
  }
  s = normalizeVNode(s)
  if (block && !s.dynamicChildren) {
    s.dynamicChildren = block.filter(c => c !== s)
  }
  return s
}
```

## registerDep 注册依赖

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
      if (
        instance.isUnmounted ||
        suspense.isUnmounted ||
        suspense.pendingId !== instance.suspenseId
      ) {
        return
      }

      instance.asyncResolved = true
      const { vnode } = instance

      // 处理 async setup 返回值
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

      if (isInPendingSuspense && --suspense.deps === 0) {
        suspense.resolve()
      }
    })
}
```

## resolve 解析

```typescript
resolve(force = false) {
  const {
    vnode,
    activeBranch,
    pendingBranch,
    pendingId,
    effects,
    parentComponent,
    container
  } = suspense

  if (suspense.isHydrating) {
    suspense.isHydrating = false
  } else if (!force) {
    // 检查是否有新的 pending
    if (activeBranch && hasMove && pendingBranch!.transition!.mode === 'out-in') {
      // out-in 模式处理
      activeBranch.transition!.afterLeave = () => {
        if (pendingId === suspense.pendingId) {
          move(pendingBranch!, container, anchor, MoveType.ENTER)
        }
      }
    }
    
    // 卸载当前 active
    if (activeBranch) {
      if (parentNode(activeBranch.el!) !== container) {
        anchor = next(activeBranch)
      }
      unmount(activeBranch, parentComponent, suspense, true)
    }
    
    // 移动 pending 到 container
    if (!hasMove) {
      move(pendingBranch!, container, anchor, MoveType.ENTER)
    }
  }

  // 设置新的 active
  setActiveBranch(suspense, pendingBranch!)
  suspense.pendingBranch = null
  suspense.isInFallback = false

  // 查找父 Suspense
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

  // 执行 effects
  if (!hasUnresolvedAncestor) {
    queuePostFlushCb(effects)
  }
  suspense.effects = []

  // 触发 onResolve
  triggerEvent(vnode, 'onResolve')
}
```

## 使用示例

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>Loading...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent(() => 
  import('./AsyncComponent.vue')
)
</script>
```

## 小结

Suspense 组件源码的核心要点：

1. **SuspenseBoundary**：管理异步状态的边界对象
2. **deps 计数**：追踪异步依赖数量
3. **双分支**：activeBranch 和 pendingBranch
4. **隐藏容器**：在隐藏容器中渲染 pending 内容
5. **resolve 机制**：所有依赖完成后切换显示

下一章将分析 Suspense 的异步处理逻辑。
