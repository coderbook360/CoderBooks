# hydrateVNode 虚拟节点水合

本章分析 Vue hydration 中虚拟节点的处理逻辑。

## 核心逻辑

`hydrateVNode` 是处理虚拟节点 hydration 的核心函数，负责将 VNode 与 DOM 节点关联。

```typescript
// packages/runtime-core/src/hydration.ts

/**
 * hydration VNode
 */
function hydrateVNode(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null
): Node | null {
  const { type, shapeFlag } = vnode
  
  // 存储 DOM 引用
  vnode.el = node
  
  // 处理 key
  if (vnode.key != null) {
    setVNodeKey(node, vnode.key)
  }
  
  // 根据类型处理
  if (type === Text) {
    return hydrateTextNode(node, vnode)
  }
  
  if (type === Comment) {
    return hydrateCommentNode(node, vnode)
  }
  
  if (type === Static) {
    return hydrateStaticNode(node, vnode)
  }
  
  if (type === Fragment) {
    return hydrateFragmentNode(node, vnode, parentComponent, parentSuspense, slotScopeIds)
  }
  
  // 元素或组件
  if (shapeFlag & ShapeFlags.ELEMENT) {
    return hydrateElementNode(node, vnode, parentComponent, parentSuspense, slotScopeIds)
  }
  
  if (shapeFlag & ShapeFlags.COMPONENT) {
    return hydrateComponentNode(node, vnode, parentComponent, parentSuspense, slotScopeIds)
  }
  
  // 不支持的类型
  if (__DEV__) {
    warn(`Cannot hydrate node type: ${type}`)
  }
  
  return node.nextSibling
}
```

## 文本节点处理

```typescript
/**
 * hydration 文本节点
 */
function hydrateTextNode(node: Node, vnode: VNode): Node | null {
  // 验证节点类型
  if (node.nodeType !== Node.TEXT_NODE) {
    if (__DEV__) {
      warn(`Hydration text mismatch: expected text node, got ${node.nodeName}`)
    }
    return handleMismatch(node, vnode)
  }
  
  // 比较文本内容
  const expectedText = String(vnode.children || '')
  const actualText = node.textContent || ''
  
  if (expectedText !== actualText) {
    if (__DEV__) {
      warn(
        `Hydration text content mismatch:\n` +
        `- Expected: ${expectedText}\n` +
        `- Actual: ${actualText}`
      )
    }
    
    // 修正文本内容
    node.textContent = expectedText
  }
  
  return node.nextSibling
}
```

## 静态节点处理

静态节点是编译时优化的结果，它们在 hydration 时可以跳过详细验证。

```typescript
/**
 * hydration 静态节点
 */
function hydrateStaticNode(node: Node, vnode: VNode): Node | null {
  // 静态节点可能跨越多个 DOM 节点
  const staticContent = vnode.children as string
  
  // 计算需要跳过的节点数
  let currentNode: Node | null = node
  let count = 0
  
  // 创建临时容器解析静态内容
  const temp = document.createElement('div')
  temp.innerHTML = staticContent
  const expectedCount = temp.childNodes.length
  
  // 跳过相应数量的节点
  while (currentNode && count < expectedCount) {
    // 存储第一个和最后一个节点的引用
    if (count === 0) {
      vnode.el = currentNode
    }
    if (count === expectedCount - 1) {
      vnode.anchor = currentNode
    }
    
    currentNode = currentNode.nextSibling
    count++
  }
  
  return currentNode
}
```

## 条件渲染处理

条件渲染产生的注释节点需要特殊处理。

```typescript
/**
 * hydration 注释节点
 */
function hydrateCommentNode(node: Node, vnode: VNode): Node | null {
  // 验证节点类型
  if (node.nodeType !== Node.COMMENT_NODE) {
    if (__DEV__) {
      warn(`Hydration comment mismatch: expected comment, got ${node.nodeName}`)
    }
    return handleMismatch(node, vnode)
  }
  
  return node.nextSibling
}

/**
 * 处理 v-if/v-else 产生的注释
 */
function hydrateConditionalComment(node: Node): boolean {
  if (node.nodeType === Node.COMMENT_NODE) {
    const data = (node as Comment).data
    // Vue 条件渲染的占位注释
    return data === '' || data === 'v-if'
  }
  return false
}
```

## VNode 复用

对于相同的 VNode 结构，可以复用之前的 hydration 结果。

```typescript
/**
 * 检查是否可以复用
 */
function canReuseHydration(
  oldVNode: VNode | null,
  newVNode: VNode
): boolean {
  if (!oldVNode) return false
  
  // 类型必须相同
  if (oldVNode.type !== newVNode.type) return false
  
  // key 必须相同
  if (oldVNode.key !== newVNode.key) return false
  
  // 已经有 el 引用
  if (oldVNode.el) {
    newVNode.el = oldVNode.el
    return true
  }
  
  return false
}
```

## 动态组件处理

动态组件 (`<component :is="...">`) 需要运行时确定实际类型。

```typescript
/**
 * hydration 动态组件
 */
function hydrateDynamicComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // 解析实际组件类型
  const Component = resolveDynamicComponent(vnode.type)
  
  if (!Component) {
    if (__DEV__) {
      warn(`Failed to resolve dynamic component: ${vnode.type}`)
    }
    return node.nextSibling
  }
  
  // 创建解析后的 VNode
  const resolvedVNode = createVNode(
    Component,
    vnode.props,
    vnode.children
  )
  
  // 继续 hydration
  return hydrateVNode(node, resolvedVNode, parentComponent, null, null)
}
```

## 小结

本章分析了 VNode hydration 的处理：

1. **类型分发**：根据 VNode 类型选择处理方式
2. **文本节点**：比较和修正文本内容
3. **静态节点**：高效跳过多个节点
4. **注释节点**：处理条件渲染占位符
5. **VNode 复用**：优化重复结构
6. **动态组件**：运行时类型解析

理解 VNode hydration 有助于优化组件设计和排查问题。
