# hydrateFragment Fragment 水合

本章分析 Vue hydration 中 Fragment 节点的处理。

## Fragment 概述

Fragment 是 Vue 3 引入的虚拟节点类型，允许组件返回多个根节点。在 SSR 中，Fragment 通过注释节点标记边界。

```html
<!-- 服务端渲染的 Fragment -->
<!--[--><span>first</span><span>second</span><span>third</span><!--]-->
```

`<!--[-->` 和 `<!--]-->` 是 Fragment 的开始和结束标记。

## 基本实现

```typescript
// packages/runtime-core/src/hydration.ts

/**
 * hydration Fragment
 */
function hydrateFragment(
  node: Comment,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null {
  // 验证开始标记
  if (node.nodeType !== Node.COMMENT_NODE || node.data !== '[') {
    if (__DEV__) {
      warn(`Hydration fragment start marker mismatch`)
    }
    return handleMismatch(node, vnode)
  }
  
  // 存储 anchor 引用
  vnode.el = node
  
  // 移动到第一个子节点
  let nextNode: Node | null = node.nextSibling
  const children = vnode.children as VNode[]
  
  // hydrate 所有子节点
  for (let i = 0; i < children.length; i++) {
    if (!nextNode) {
      if (__DEV__) {
        warn(`Hydration fragment child missing at index ${i}`)
      }
      break
    }
    
    // 跳过结束标记检查
    if (nextNode.nodeType === Node.COMMENT_NODE && 
        (nextNode as Comment).data === ']') {
      // 子节点数量不匹配
      if (__DEV__) {
        warn(`Hydration fragment has fewer children than expected`)
      }
      break
    }
    
    nextNode = hydrateNode(
      nextNode,
      children[i],
      parentComponent,
      parentSuspense,
      slotScopeIds,
      optimized
    )
  }
  
  // 查找结束标记
  while (nextNode) {
    if (nextNode.nodeType === Node.COMMENT_NODE &&
        (nextNode as Comment).data === ']') {
      // 找到结束标记
      vnode.anchor = nextNode
      return nextNode.nextSibling
    }
    
    if (__DEV__) {
      warn(`Extra node found in fragment: ${formatNode(nextNode)}`)
    }
    
    // 跳过多余节点
    nextNode = nextNode.nextSibling
  }
  
  if (__DEV__) {
    warn(`Fragment end marker not found`)
  }
  
  return null
}
```

## 嵌套 Fragment

Fragment 可以嵌套，需要正确匹配开始和结束标记。

```typescript
/**
 * 处理嵌套 Fragment
 */
function hydrateNestedFragments(
  node: Comment,
  vnodes: VNode[],
  parentComponent: ComponentInternalInstance | null
): Node | null {
  let currentNode: Node | null = node
  let depth = 0
  
  for (const vnode of vnodes) {
    if (!currentNode) break
    
    if (vnode.type === Fragment) {
      // 嵌套的 Fragment
      if (currentNode.nodeType === Node.COMMENT_NODE &&
          (currentNode as Comment).data === '[') {
        depth++
        currentNode = hydrateFragment(
          currentNode as Comment,
          vnode,
          parentComponent,
          null,
          null,
          false
        )
      }
    } else {
      currentNode = hydrateNode(
        currentNode,
        vnode,
        parentComponent,
        null,
        null,
        false
      )
    }
  }
  
  return currentNode
}
```

## 空 Fragment

空 Fragment 在 DOM 中表现为相邻的开始和结束标记。

```typescript
/**
 * hydration 空 Fragment
 */
function hydrateEmptyFragment(node: Comment, vnode: VNode): Node | null {
  // 验证开始标记
  if (node.data !== '[') {
    return handleMismatch(node, vnode)
  }
  
  vnode.el = node
  
  // 下一个节点应该是结束标记
  const next = node.nextSibling
  
  if (next?.nodeType === Node.COMMENT_NODE &&
      (next as Comment).data === ']') {
    vnode.anchor = next
    return next.nextSibling
  }
  
  if (__DEV__) {
    warn(`Empty fragment end marker not found immediately after start`)
  }
  
  return next
}
```

## v-for Fragment

v-for 指令产生的 Fragment 包含动态数量的子节点。

```typescript
/**
 * hydration v-for Fragment
 */
function hydrateForFragment(
  node: Comment,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  if (node.data !== '[') {
    return handleMismatch(node, vnode)
  }
  
  vnode.el = node
  
  const children = vnode.children as VNode[]
  let currentNode: Node | null = node.nextSibling
  
  // 使用 key 映射优化匹配
  const keyedNodes = new Map<any, Node>()
  const pendingNodes: Node[] = []
  
  // 收集所有节点
  while (currentNode) {
    if (currentNode.nodeType === Node.COMMENT_NODE &&
        (currentNode as Comment).data === ']') {
      break
    }
    
    // 检查 key 属性
    if (currentNode.nodeType === Node.ELEMENT_NODE) {
      const key = (currentNode as Element).getAttribute('data-key')
      if (key != null) {
        keyedNodes.set(key, currentNode)
      } else {
        pendingNodes.push(currentNode)
      }
    } else {
      pendingNodes.push(currentNode)
    }
    
    currentNode = currentNode.nextSibling
  }
  
  // 按照 VNode 顺序匹配
  let pendingIndex = 0
  for (const child of children) {
    let matchedNode: Node | undefined
    
    if (child.key != null) {
      matchedNode = keyedNodes.get(child.key)
    }
    
    if (!matchedNode && pendingIndex < pendingNodes.length) {
      matchedNode = pendingNodes[pendingIndex++]
    }
    
    if (matchedNode) {
      hydrateNode(
        matchedNode,
        child,
        parentComponent,
        null,
        null,
        false
      )
    }
  }
  
  // 找到结束标记
  while (currentNode) {
    if (currentNode.nodeType === Node.COMMENT_NODE &&
        (currentNode as Comment).data === ']') {
      vnode.anchor = currentNode
      return currentNode.nextSibling
    }
    currentNode = currentNode.nextSibling
  }
  
  return null
}
```

## 稳定 Fragment

编译时可以确定的稳定 Fragment 可以跳过详细验证。

```typescript
/**
 * 检查是否为稳定 Fragment
 */
function isStableFragment(vnode: VNode): boolean {
  // 检查 patchFlag
  if (vnode.patchFlag !== undefined) {
    // STABLE_FRAGMENT = 64
    return (vnode.patchFlag & 64) !== 0
  }
  return false
}

/**
 * hydration 稳定 Fragment
 */
function hydrateStableFragment(
  node: Comment,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  vnode.el = node
  
  // 直接跳过内容，找到结束标记
  let currentNode: Node | null = node.nextSibling
  let depth = 1
  
  while (currentNode && depth > 0) {
    if (currentNode.nodeType === Node.COMMENT_NODE) {
      const data = (currentNode as Comment).data
      if (data === '[') depth++
      else if (data === ']') depth--
    }
    
    if (depth > 0) {
      currentNode = currentNode.nextSibling
    }
  }
  
  if (currentNode) {
    vnode.anchor = currentNode
    return currentNode.nextSibling
  }
  
  return null
}
```

## 小结

本章分析了 Fragment 的 hydration：

1. **边界标记**：使用注释标记开始和结束
2. **嵌套处理**：正确匹配嵌套深度
3. **空 Fragment**：相邻的标记对
4. **v-for 优化**：使用 key 映射匹配
5. **稳定 Fragment**：跳过详细验证

正确处理 Fragment 确保了多根组件的 hydration 正确性。
