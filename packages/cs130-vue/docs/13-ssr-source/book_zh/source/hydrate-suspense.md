# hydrateSuspense Suspense 水合

`hydrateSuspense` 处理 Suspense 边界的水合。Suspense 在 SSR 场景下尤为重要，因为它涉及异步内容的同步化处理和客户端恢复。

## Suspense 水合的复杂性

服务端渲染时，Suspense 的异步依赖已经被解析，渲染的是 default 内容。水合时需要：

1. **识别边界**：找到 Suspense 的开始和结束标记
2. **恢复状态**：恢复 resolved 状态
3. **处理异步**：客户端可能有新的异步依赖

## 函数签名

```typescript
function hydrateSuspense(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null
```

## 核心实现

```typescript
function hydrateSuspense(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null {
  // 创建 Suspense 边界实例
  const suspense = (vnode.suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    node.parentElement!,
    document.createComment(''),  // hiddenContainer
    vnode.anchor as Comment,
    isSVG,
    slotScopeIds,
    optimized,
    true // isHydrating
  ))
  
  // 水合 default 内容
  const result = hydrateNode(
    node,
    (suspense.pendingBranch = vnode.ssContent!),
    parentComponent,
    suspense,
    slotScopeIds,
    optimized
  )
  
  // 检查是否有异步依赖
  if (suspense.deps === 0) {
    // 没有异步依赖，立即 resolve
    suspense.resolve(false, true)
  }
  
  return result
}
```

## Suspense 边界创建

```typescript
function createSuspenseBoundary(
  vnode: VNode,
  parent: SuspenseBoundary | null,
  parentComponent: ComponentInternalInstance | null,
  container: Element,
  hiddenContainer: Element,
  anchor: Node | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  isHydrating: boolean
): SuspenseBoundary {
  const suspense: SuspenseBoundary = {
    vnode,
    parent,
    parentComponent,
    container,
    hiddenContainer,
    anchor,
    isSVG,
    slotScopeIds,
    optimized,
    
    // 状态
    deps: 0,
    isHydrating,
    isResolved: false,
    
    // 分支
    pendingBranch: null,
    activeBranch: null,
    
    // 方法
    resolve: null!,
    fallback: null!,
    registerDep: null!
  }
  
  // 初始化方法
  suspense.resolve = (resume = false, sync = false) => {
    resolveSuspense(suspense, resume, sync)
  }
  
  suspense.registerDep = (instance, setupRenderEffect) => {
    registerAsyncDep(suspense, instance, setupRenderEffect)
  }
  
  return suspense
}
```

## 异步依赖注册

```typescript
function registerAsyncDep(
  suspense: SuspenseBoundary,
  instance: ComponentInternalInstance,
  setupRenderEffect: Function
) {
  const isResolved = suspense.isResolved
  
  if (!isResolved) {
    suspense.deps++
  }
  
  const asyncDep = instance.asyncDep
  
  asyncDep!.then((resolvedComp) => {
    // 组件可能已卸载
    if (instance.isUnmounted || suspense.isUnmounted) {
      return
    }
    
    suspense.deps--
    
    // 更新组件
    instance.asyncResolved = true
    
    // 继续设置
    setupRenderEffect(
      instance,
      resolvedComp,
      suspense.container,
      null,
      suspense,
      suspense.isSVG,
      suspense.optimized
    )
    
    // 检查是否全部 resolve
    if (suspense.deps === 0) {
      suspense.resolve()
    }
  })
}
```

## 解析完成

```typescript
function resolveSuspense(
  suspense: SuspenseBoundary,
  resume: boolean,
  sync: boolean
) {
  const { container, pendingBranch, anchor, parentComponent } = suspense
  
  // 激活分支
  suspense.activeBranch = pendingBranch
  suspense.pendingBranch = null
  suspense.isResolved = true
  
  // 触发 onResolved 钩子
  const onResolved = parentComponent?.vnode.props?.onResolved
  if (onResolved) {
    onResolved()
  }
  
  // 清理水合标记
  if (suspense.isHydrating) {
    suspense.isHydrating = false
  }
}
```

## 服务端标记格式

```html
<!--suspense start-->
<div class="content">
  <!-- 异步组件的渲染结果 -->
</div>
<!--suspense end-->
```

## 水合时的状态同步

```typescript
function syncSuspenseState(suspense: SuspenseBoundary) {
  // 从服务端传递的状态
  const ssrState = window.__SSR_SUSPENSE_STATE__
  
  if (ssrState && ssrState[suspense.uid]) {
    const state = ssrState[suspense.uid]
    
    // 恢复异步数据
    if (state.data) {
      restoreAsyncData(suspense, state.data)
    }
    
    // 标记为已解析
    if (state.resolved) {
      suspense.isResolved = true
    }
  }
}
```

## 嵌套 Suspense

```typescript
function hydrateNestedSuspense(
  node: Node,
  vnode: VNode,
  parentSuspense: SuspenseBoundary | null
): Node | null {
  // 创建子 Suspense
  const childSuspense = createSuspenseBoundary(
    vnode,
    parentSuspense,  // 关联父 Suspense
    // ...
  )
  
  // 水合内容
  const result = hydrateNode(
    node,
    vnode.ssContent!,
    null,
    childSuspense,
    null,
    false
  )
  
  // 如果有未解决的依赖，通知父 Suspense
  if (childSuspense.deps > 0 && parentSuspense) {
    parentSuspense.deps++
    
    childSuspense.effects.push(() => {
      parentSuspense.deps--
      if (parentSuspense.deps === 0) {
        parentSuspense.resolve()
      }
    })
  }
  
  return result
}
```

## 超时处理

```typescript
function setupSuspenseTimeout(
  suspense: SuspenseBoundary,
  timeout: number
) {
  const timeoutId = setTimeout(() => {
    if (!suspense.isResolved) {
      // 超时，显示 fallback
      showFallback(suspense)
    }
  }, timeout)
  
  // 清理
  suspense.effects.push(() => {
    clearTimeout(timeoutId)
  })
}
```

## Fallback 处理

水合时通常不需要 fallback，但需要准备：

```typescript
function prepareFallback(suspense: SuspenseBoundary, vnode: VNode) {
  const fallbackVNode = vnode.ssFallback
  
  if (fallbackVNode) {
    // 预渲染到隐藏容器
    render(fallbackVNode, suspense.hiddenContainer)
    suspense.fallbackVNode = fallbackVNode
  }
}

function showFallback(suspense: SuspenseBoundary) {
  const { container, anchor, activeBranch, fallbackVNode } = suspense
  
  // 移除当前内容
  if (activeBranch) {
    unmount(activeBranch)
  }
  
  // 显示 fallback
  if (fallbackVNode) {
    patch(null, fallbackVNode, container, anchor)
  }
  
  suspense.activeBranch = fallbackVNode
  suspense.isResolved = false
}
```

## 完整水合流程

```typescript
function hydrateSuspenseFull(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
): Node | null {
  // 1. 找到开始标记
  let startNode = node
  if (node.nodeType === Node.COMMENT_NODE) {
    // <!--suspense start-->
    startNode = node.nextSibling!
  }
  
  // 2. 创建边界
  const suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    node.parentElement!,
    document.createElement('div'), // hiddenContainer
    null,
    isSVG,
    null,
    optimized,
    true
  )
  
  vnode.suspense = suspense
  
  // 3. 同步服务端状态
  syncSuspenseState(suspense)
  
  // 4. 获取 default 内容
  const contentVNode = vnode.ssContent || vnode.children
  suspense.pendingBranch = contentVNode
  
  // 5. 水合内容
  let currentNode: Node | null = startNode
  
  if (Array.isArray(contentVNode)) {
    for (const child of contentVNode) {
      if (currentNode) {
        currentNode = hydrateNode(
          currentNode,
          child,
          parentComponent,
          suspense,
          null,
          optimized
        )
      }
    }
  } else {
    currentNode = hydrateNode(
      currentNode,
      contentVNode,
      parentComponent,
      suspense,
      null,
      optimized
    )
  }
  
  // 6. 检查异步状态
  if (suspense.deps === 0) {
    suspense.resolve(false, true)
  }
  
  // 7. 找到结束标记，返回下一个节点
  while (currentNode && 
         !(currentNode.nodeType === Node.COMMENT_NODE && 
           currentNode.textContent === 'suspense end')) {
    currentNode = currentNode.nextSibling
  }
  
  return currentNode?.nextSibling || null
}
```

## 错误处理

```typescript
function hydrateSuspenseWithErrorBoundary(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  try {
    return hydrateSuspense(node, vnode, parentComponent, null, false, null, false)
  } catch (error) {
    const errorHandler = vnode.props?.onError
    
    if (errorHandler) {
      errorHandler(error)
    }
    
    // 显示 fallback
    const suspense = vnode.suspense
    if (suspense) {
      showFallback(suspense)
    }
    
    // 找到结束标记
    let current = node
    while (current.nextSibling) {
      current = current.nextSibling
      if (current.nodeType === Node.COMMENT_NODE &&
          current.textContent === 'suspense end') {
        return current.nextSibling
      }
    }
    
    return null
  }
}
```

## 小结

`hydrateSuspense` 处理 Suspense 边界的水合：

1. 创建 Suspense 边界实例
2. 恢复服务端状态
3. 水合 default 内容
4. 注册和追踪异步依赖
5. 处理嵌套 Suspense
6. 准备 fallback 以备超时

Suspense 水合确保服务端渲染的异步内容在客户端正确激活，并保持一致的用户体验。
