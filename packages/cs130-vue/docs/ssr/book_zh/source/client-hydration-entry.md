# 客户端 Hydration 入口

本章分析 Vue 客户端 hydration 的入口实现。

## createSSRApp

`createSSRApp` 是 SSR 应用的客户端入口，它创建一个专门用于 hydration 的应用实例。

```typescript
// packages/runtime-dom/src/index.ts

export function createSSRApp(rootComponent: Component, rootProps?: object): App {
  // 创建基础 app
  const app = createApp(rootComponent, rootProps)
  
  // 标记为 SSR 模式
  app._isSSR = true
  
  // 替换 mount 方法
  const { mount } = app
  app.mount = (container: Element | string): any => {
    const containerEl = normalizeContainer(container)
    
    if (!containerEl) {
      return
    }
    
    // 检查是否有服务端渲染的内容
    if (containerEl.hasChildNodes()) {
      // 执行 hydration
      return mountSSR(app, containerEl)
    } else {
      // 没有 SSR 内容，回退到普通渲染
      return mount(containerEl)
    }
  }
  
  return app
}
```

## hydration 入口

`hydrateNode` 是 hydration 的核心入口函数。

```typescript
// packages/runtime-core/src/hydration.ts

export function createHydrationFunctions(
  rendererInternals: RendererInternals
): [
  hydrate: RootHydrateFn,
  hydrateNode: HydrateNodeFn
] {
  const {
    mt: mountComponent,
    p: patch,
    o: { patchProp, nextSibling, parentNode, remove, insert, createComment }
  } = rendererInternals
  
  /**
   * 根级 hydration
   */
  const hydrate: RootHydrateFn = (vnode, container) => {
    if (!container.hasChildNodes()) {
      // 没有服务端内容
      if (__DEV__) {
        warn('Attempting to hydrate an empty container')
      }
      patch(null, vnode, container)
      return
    }
    
    // 从第一个子节点开始 hydration
    hydrateNode(container.firstChild!, vnode, null, null, null)
    
    // 刷新调度器
    flushPostFlushCbs()
    
    // 设置根节点引用
    container._vnode = vnode
  }
  
  return [hydrate, hydrateNode]
}
```

## hydrateNode 分发

`hydrateNode` 根据节点类型分发到不同的处理函数。

```typescript
/**
 * hydration 单个节点
 */
const hydrateNode: HydrateNodeFn = (
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized = false
): Node | null => {
  const isFragmentStart = isComment(node) && node.data === '['
  
  // 处理异步组件和 Suspense
  const onMismatch = () => handleMismatch(node, vnode, parentComponent)
  
  const { type, ref, shapeFlag } = vnode
  const domType = node.nodeType
  
  // 存储 DOM 引用
  vnode.el = node
  
  // 根据 VNode 类型分发
  let nextNode: Node | null = null
  
  switch (type) {
    case Text:
      nextNode = hydrateText(node, vnode)
      break
      
    case Comment:
      nextNode = hydrateComment(node, vnode)
      break
      
    case Static:
      nextNode = hydrateStatic(node, vnode)
      break
      
    case Fragment:
      nextNode = hydrateFragment(
        node as Comment,
        vnode,
        parentComponent,
        parentSuspense,
        slotScopeIds,
        optimized
      )
      break
      
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        nextNode = hydrateElement(
          node as Element,
          vnode,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        nextNode = hydrateComponent(
          vnode,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized,
          node
        )
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        nextNode = hydrateTeleport(
          node,
          vnode,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        nextNode = hydrateSuspense(
          node,
          vnode,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
      }
  }
  
  // 处理 ref
  if (ref != null) {
    setRef(ref, null, parentSuspense, vnode)
  }
  
  return nextNode
}
```

## 不匹配处理

当 DOM 与 VNode 不匹配时，需要特殊处理。

```typescript
/**
 * 处理 hydration 不匹配
 */
function handleMismatch(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  if (__DEV__) {
    warn(
      `Hydration node mismatch:\n` +
      `- Client vnode: ${formatVNode(vnode)}\n` +
      `- Server rendered DOM: ${formatDOM(node)}`
    )
  }
  
  // 标记不匹配
  vnode.el = null
  
  // 获取下一个兄弟节点
  const next = nextSibling(node)
  
  // 获取父容器
  const container = parentNode(node)!
  
  // 移除不匹配的节点
  remove(node)
  
  // 重新创建正确的节点
  patch(null, vnode, container, next, parentComponent, null, getContainerType(container))
  
  return next
}
```

## SSR 状态恢复

在 hydration 过程中，需要恢复服务端传递的状态。

```typescript
/**
 * 恢复 SSR 状态
 */
function restoreSSRState(): void {
  // 获取服务端注入的状态
  const ssrState = (window as any).__VUE_SSR_STATE__
  
  if (ssrState) {
    // Pinia 状态恢复
    if (ssrState.pinia) {
      const pinia = getActivePinia()
      if (pinia) {
        pinia.state.value = ssrState.pinia
      }
    }
    
    // 其他状态恢复...
    
    // 清理
    delete (window as any).__VUE_SSR_STATE__
  }
}
```

## 小结

本章分析了客户端 hydration 的入口：

1. **createSSRApp**：创建支持 hydration 的应用
2. **hydrate 函数**：根级 hydration 入口
3. **hydrateNode**：节点级分发处理
4. **不匹配处理**：检测并修复不一致
5. **状态恢复**：恢复 SSR 序列化的状态

理解 hydration 入口有助于排查 SSR 相关问题。
