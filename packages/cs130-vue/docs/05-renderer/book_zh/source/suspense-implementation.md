# Suspense 源码解析

Suspense 是 Vue 3 引入的内置组件，用于处理异步依赖的加载状态。它能够在等待异步组件或异步 setup 函数完成时显示后备内容，完成后自动切换到实际内容。这个机制让异步数据加载的用户体验变得优雅而可控。

## 核心数据结构

Suspense 的实现依赖 SuspenseBoundary 这个核心数据结构，它管理着异步依赖的追踪和状态转换：

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

这个接口定义了 Suspense 边界的完整状态。`activeBranch` 表示当前显示的内容（可能是 fallback 或实际内容），`pendingBranch` 表示正在等待的内容。`deps` 计数器追踪未完成的异步依赖数量，当它降为零时触发 resolve。`hiddenContainer` 是一个离屏容器，用于在后台渲染待定内容而不影响用户界面。

## 组件定义

Suspense 组件的定义与普通组件不同，它使用特殊的 `__isSuspense` 标记：

```typescript
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

export const Suspense = (__FEATURE_SUSPENSE__
  ? SuspenseImpl
  : null) as unknown as {
  __isSuspense: true
  new (): { $props: VNodeProps & SuspenseProps }
}
```

`__isSuspense` 标记让渲染器能够识别 Suspense 并调用其专用的处理逻辑，而非走普通组件的流程。process 方法是入口，根据旧节点是否存在分发到挂载或更新流程。

## 挂载流程

首次渲染 Suspense 时，需要创建边界、在隐藏容器中渲染内容、并根据是否有异步依赖决定显示什么：

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
  
  // 创建离屏容器用于渲染待定内容
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

  // 在隐藏容器中渲染 default 插槽内容
  patch(
    null,
    (suspense.pendingBranch = vnode.ssContent!),
    hiddenContainer,
    null,
    parentComponent,
    suspense, // 将 suspense 作为父级传递
    isSVG,
    slotScopeIds
  )

  // 检查渲染过程中是否产生了异步依赖
  if (suspense.deps > 0) {
    // 有异步依赖，触发 onPending 事件并显示 fallback
    triggerEvent(vnode, 'onPending')
    triggerEvent(vnode, 'onFallback')
    
    suspense.isInFallback = true
    
    // 在真实容器中渲染 fallback 内容
    patch(
      null,
      (suspense.activeBranch = vnode.ssFallback!),
      container,
      anchor,
      parentComponent,
      null, // fallback 不关联 suspense，其中的异步组件不计入 deps
      isSVG,
      slotScopeIds
    )
    setActiveBranch(suspense, suspense.activeBranch!)
  } else {
    // 无异步依赖，直接 resolve
    suspense.resolve(false, true)
  }
}
```

挂载流程的关键在于隐藏容器的使用。待定内容先在离屏渲染，这样即使渲染过程触发异步依赖，用户也不会看到不完整的界面。如果渲染完成后 deps 为零，说明没有异步依赖，直接 resolve 将内容移入真实容器。否则显示 fallback 并等待。

注意 fallback 渲染时传入的 parentSuspense 是 null，这意味着 fallback 中的异步组件不会被当前 Suspense 追踪。这是合理的——fallback 本身就是用来展示加载状态的，它不应该也进入等待。

## 创建边界

createSuspenseBoundary 函数创建并初始化 Suspense 边界对象，其中包含了核心的状态管理方法：

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

  // 解析 timeout 属性
  let timeout: number | undefined
  if (vnode.props) {
    const rawTimeout = vnode.props.timeout
    timeout = typeof rawTimeout === 'number' ? rawTimeout : undefined
  }

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
      // resolve 实现
    },

    fallback(fallbackVNode) {
      // fallback 实现
    },

    move(container, anchor, type) {
      // move 实现
    },

    next() {
      return suspense.activeBranch && next(suspense.activeBranch)
    },

    registerDep(instance, setupRenderEffect) {
      // 依赖注册实现
    },

    unmount(parentSuspense, doRemove) {
      // unmount 实现
    }
  }

  return suspense
}
```

边界对象封装了 Suspense 的全部状态和行为。`effects` 数组用于收集需要在 resolve 后执行的副作用，避免在 fallback 显示期间执行不必要的操作。

## 异步依赖注册

当组件有异步 setup 函数时，渲染器会调用 registerDep 来注册这个异步依赖：

```typescript
registerDep(instance, setupRenderEffect) {
  const isInPendingSuspense = !!suspense.pendingBranch
  
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
      // 检查组件或 Suspense 是否已卸载
      if (instance.isUnmounted || suspense.isUnmounted || 
          suspense.pendingId !== instance.suspenseId) {
        return
      }
      
      // 依赖完成，减少计数
      instance.asyncResolved = true
      const { vnode } = instance
      
      // 处理 async setup 返回值
      handleSetupResult(instance, asyncSetupResult, false)
      
      if (hydratedEl) {
        // SSR 场景，复用已有元素
        vnode.el = hydratedEl
      }
      
      const placeholder = !hydratedEl && instance.subTree.el
      
      // 执行渲染
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
        remove(placeholder!)
      }
      
      updateHOCHostEl(instance, vnode.el)
      
      suspense.deps--
      
      // 所有依赖完成，触发 resolve
      if (suspense.deps === 0) {
        suspense.resolve()
      }
    })
}
```

这段代码展示了异步依赖的完整处理流程。首先增加 deps 计数，然后设置 Promise 的处理回调。当 Promise resolve 后，先检查组件和 Suspense 是否仍然有效（可能在等待期间被卸载），然后处理 setup 返回值、执行渲染、更新计数。当 deps 降为零时调用 resolve。

## Resolve 流程

resolve 方法将待定内容移入真实容器并清理 fallback：

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

  if (suspense.isHydrating) {
    suspense.isHydrating = false
  } else if (!force) {
    // 检查待定 ID，防止过期的 resolve
    if (pendingId !== suspense.pendingId) {
      return
    }
    
    // 记录即将被移除的 fallback
    let delayEnter = false
    if (activeBranch) {
      if (suspense.isInFallback) {
        // 从 fallback 切换到真实内容
        delayEnter = true
      }
      
      // 卸载 fallback
      unmount(activeBranch, parentComponent, suspense, true)
    }
    
    // 移动待定内容到真实容器
    if (!delayEnter) {
      move(pendingBranch!, container, anchor, MoveType.ENTER)
    }
  }

  setActiveBranch(suspense, pendingBranch!)
  suspense.pendingBranch = null
  suspense.isInFallback = false

  // 查找父级 Suspense
  let parent = suspense.parent
  let hasUnresolvedAncestor = false
  while (parent) {
    if (parent.pendingBranch) {
      // 父级仍在 pending，将 effects 移交给父级
      parent.effects.push(...effects)
      hasUnresolvedAncestor = true
      break
    }
    parent = parent.parent
  }

  // 只有没有未解决的祖先才执行 effects
  if (!hasUnresolvedAncestor) {
    queuePostFlushCb(effects)
  }
  suspense.effects = []

  // 触发 onResolve 事件
  triggerEvent(vnode, 'onResolve')
}
```

resolve 的实现需要处理几个边缘情况。首先是 pendingId 检查——在复杂场景中可能存在多个并发的异步更新，需要确保只有最新的那个生效。其次是 effects 的处理——如果存在未 resolve 的父级 Suspense，effects 需要移交给父级，等父级 resolve 后再执行，这确保了嵌套 Suspense 的正确行为。

## Fallback 切换

当正在显示内容时发生新的异步加载，fallback 方法处理向 fallback 的切换：

```typescript
fallback(fallbackVNode) {
  if (!suspense.pendingBranch) {
    return
  }

  const { vnode, activeBranch, parentComponent, container, isSVG } = suspense

  // 触发 onFallback 事件
  triggerEvent(vnode, 'onFallback')

  const anchor = next(activeBranch!)
  
  const mountFallback = () => {
    if (!suspense.isInFallback) {
      return
    }
    // 挂载新的 fallback
    patch(
      null,
      (suspense.activeBranch = fallbackVNode),
      container,
      anchor,
      parentComponent,
      null,
      isSVG
    )
    setActiveBranch(suspense, fallbackVNode)
  }

  // 处理 Transition
  const delayEnter =
    activeBranch!.transition && activeBranch!.transition.mode === 'out-in'
  if (delayEnter) {
    activeBranch!.transition!.afterLeave = mountFallback
  }

  // 标记为 fallback 状态
  suspense.isInFallback = true
  
  // 卸载当前内容
  unmount(activeBranch!, parentComponent, null, true)

  if (!delayEnter) {
    mountFallback()
  }
}
```

这个方法处理从正常内容回到 fallback 的场景，比如当内容中的数据触发了新的异步加载时。它还处理了 Transition 组件的 out-in 模式，确保过渡动画正确执行。

## 卸载处理

Suspense 的卸载需要同时清理活动分支和待定分支：

```typescript
unmount(parentSuspense, doRemove) {
  suspense.isUnmounted = true
  
  if (suspense.activeBranch) {
    unmount(
      suspense.activeBranch,
      parentComponent,
      parentSuspense,
      doRemove
    )
  }
  
  if (suspense.pendingBranch) {
    unmount(
      suspense.pendingBranch,
      parentComponent,
      parentSuspense,
      doRemove
    )
  }
}
```

设置 isUnmounted 标志很重要，它会阻止正在等待的异步依赖在 resolve 时执行渲染，避免在已卸载的组件上操作。

## 小结

Suspense 的实现展示了 Vue 处理异步状态的优雅方案。通过 SuspenseBoundary 追踪异步依赖、使用隐藏容器进行离屏渲染、在 resolve 时无缝切换内容，Suspense 将复杂的异步加载逻辑封装为简洁的声明式 API。嵌套 Suspense 的 effects 传递机制确保了副作用在正确时机执行，而各种边界检查则保证了并发场景下的稳定性。
