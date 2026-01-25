# hydrateText 文本水合

本章分析 Vue hydration 中文本节点的处理。

## 文本节点特点

文本节点是 DOM 中最基本的节点类型。在 SSR 中，文本内容可能会因为动态数据、时间戳、随机值等原因与客户端不同。

```typescript
// packages/runtime-core/src/hydration.ts

/**
 * hydration 文本节点
 */
function hydrateText(node: Node, vnode: VNode): Node | null {
  // 期望的文本内容
  const text = String(vnode.children ?? '')
  
  // 节点类型验证
  if (node.nodeType !== Node.TEXT_NODE) {
    // DOM 节点不是文本节点，这是严重不匹配
    if (__DEV__) {
      warn(
        `Hydration node type mismatch. ` +
        `Expected TEXT_NODE, but got ${getNodeTypeName(node.nodeType)}`
      )
    }
    
    // 创建正确的文本节点
    return handleTypeMismatch(node, vnode)
  }
  
  // 存储 DOM 引用
  vnode.el = node
  
  // 比较文本内容
  const actualText = node.textContent || ''
  
  if (text !== actualText) {
    if (__DEV__) {
      logTextMismatch(text, actualText, vnode)
    }
    
    // 静默修正
    node.textContent = text
  }
  
  return node.nextSibling
}
```

## 空白文本处理

浏览器和服务端对空白文本的处理可能不同。

```typescript
/**
 * 检查是否为可忽略的空白节点
 */
function isIgnorableWhitespace(node: Node): boolean {
  if (node.nodeType !== Node.TEXT_NODE) return false
  
  const text = node.textContent || ''
  
  // 只包含空白字符
  return /^\s*$/.test(text)
}

/**
 * 跳过空白文本节点
 */
function skipWhitespace(node: Node | null): Node | null {
  while (node && isIgnorableWhitespace(node)) {
    node = node.nextSibling
  }
  return node
}

/**
 * 带空白处理的文本 hydration
 */
function hydrateTextWithWhitespace(
  node: Node,
  vnode: VNode
): Node | null {
  // 跳过前导空白
  const textNode = skipWhitespace(node)
  
  if (!textNode) {
    // 没有找到文本节点
    return handleMissingNode(node, vnode)
  }
  
  return hydrateText(textNode, vnode)
}
```

## 相邻文本节点合并

服务端渲染可能产生相邻的文本节点，而浏览器可能会合并它们。

```typescript
/**
 * 处理相邻文本节点
 */
function hydrateAdjacentText(
  node: Node,
  vnodes: VNode[]
): Node | null {
  let currentNode: Node | null = node
  let combinedText = ''
  let textVNodes: VNode[] = []
  
  // 收集所有连续的文本 VNode
  for (const vnode of vnodes) {
    if (vnode.type === Text) {
      combinedText += String(vnode.children ?? '')
      textVNodes.push(vnode)
    } else {
      break
    }
  }
  
  if (textVNodes.length === 0) {
    return currentNode
  }
  
  // 检查 DOM 中是否有合并的文本
  if (currentNode?.nodeType === Node.TEXT_NODE) {
    const actualText = currentNode.textContent || ''
    
    if (actualText === combinedText) {
      // 完美匹配，所有 VNode 共享同一个 DOM 节点
      for (const vnode of textVNodes) {
        vnode.el = currentNode
      }
      return currentNode.nextSibling
    }
    
    if (textVNodes.length === 1) {
      // 单个文本节点，直接修正
      currentNode.textContent = combinedText
      textVNodes[0].el = currentNode
      return currentNode.nextSibling
    }
    
    // 多个文本 VNode，需要拆分 DOM
    return splitTextNodes(currentNode, textVNodes)
  }
  
  return currentNode
}

/**
 * 拆分合并的文本节点
 */
function splitTextNodes(
  node: Node,
  vnodes: VNode[]
): Node | null {
  const parent = node.parentNode!
  const next = node.nextSibling
  
  // 移除原始节点
  parent.removeChild(node)
  
  // 为每个 VNode 创建新的文本节点
  for (const vnode of vnodes) {
    const text = String(vnode.children ?? '')
    const textNode = document.createTextNode(text)
    parent.insertBefore(textNode, next)
    vnode.el = textNode
  }
  
  return next
}
```

## 特殊文本处理

某些文本内容需要特殊处理。

```typescript
/**
 * 处理 HTML 实体
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

/**
 * 比较文本（考虑 HTML 实体）
 */
function compareTextContent(expected: string, actual: string): boolean {
  // 直接比较
  if (expected === actual) return true
  
  // 解码后比较
  const decodedExpected = decodeHtmlEntities(expected)
  const decodedActual = decodeHtmlEntities(actual)
  
  return decodedExpected === decodedActual
}
```

## 动态文本

动态文本是 SSR 不匹配的常见来源。

```typescript
/**
 * 标记动态文本
 * 使用 data-allow-mismatch 避免警告
 */
function shouldAllowTextMismatch(vnode: VNode): boolean {
  // 检查父元素是否有 data-allow-mismatch
  const el = vnode.el as Element
  if (!el) return false
  
  const parent = el.parentElement
  if (!parent) return false
  
  const allowMismatch = parent.getAttribute('data-allow-mismatch')
  
  return allowMismatch === '' || allowMismatch === 'text'
}

/**
 * 带 mismatch 容忍的文本 hydration
 */
function hydrateTextWithTolerance(
  node: Node,
  vnode: VNode
): Node | null {
  const expected = String(vnode.children ?? '')
  
  if (node.nodeType !== Node.TEXT_NODE) {
    return handleTypeMismatch(node, vnode)
  }
  
  vnode.el = node
  
  const actual = node.textContent || ''
  
  if (expected !== actual) {
    const allowMismatch = shouldAllowTextMismatch(vnode)
    
    if (__DEV__ && !allowMismatch) {
      warn(`Hydration text mismatch:\n- Expected: ${expected}\n- Actual: ${actual}`)
    }
    
    // 总是修正内容
    node.textContent = expected
  }
  
  return node.nextSibling
}
```

## 小结

本章分析了文本节点的 hydration：

1. **基本处理**：类型验证和内容比较
2. **空白处理**：跳过可忽略的空白
3. **相邻合并**：处理文本节点合并
4. **HTML 实体**：正确解码比较
5. **动态文本**：容忍预期的不匹配

正确处理文本节点确保了 hydration 的可靠性。
