# hydrateTeleport Teleport 水合

`hydrateTeleport` 处理 Teleport 组件的水合。由于 Teleport 的内容渲染在目标位置而非定义位置，水合时需要找到正确的 DOM 节点。

## Teleport 水合的挑战

服务端渲染时，Teleport 内容被渲染到目标容器。水合时面临：

1. **位置分离**：定义位置和渲染位置不同
2. **标记识别**：需要识别服务端插入的标记
3. **内容匹配**：将 VNode 与目标位置的 DOM 匹配

## 函数签名

```typescript
function hydrateTeleport(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null
```

## 核心实现

```typescript
function hydrateTeleport(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null {
  const { props, children } = vnode
  
  // 获取目标选择器
  const targetSelector = props?.to
  
  // 定义位置的锚点（注释节点）
  const startAnchor = node
  const endAnchor = node.nextSibling
  
  // 保存锚点
  vnode.anchor = endAnchor
  
  if (props?.disabled) {
    // disabled 模式，内容在原位置
    return hydrateChildren(
      startAnchor.nextSibling,
      vnode,
      node.parentElement!,
      parentComponent,
      parentSuspense,
      slotScopeIds,
      optimized
    )
  }
  
  // 查找目标容器
  const target = resolveTarget(targetSelector)
  
  if (target) {
    // 在目标容器中水合内容
    const targetContent = locateTeleportContent(target)
    
    if (targetContent) {
      hydrateChildren(
        targetContent,
        vnode,
        target,
        parentComponent,
        parentSuspense,
        slotScopeIds,
        optimized
      )
    }
    
    vnode.target = target
  }
  
  // 返回占位符后的下一个节点
  return endAnchor?.nextSibling || null
}
```

## 目标定位

```typescript
function resolveTarget(selector: string | null): Element | null {
  if (!selector) {
    __DEV__ && warn('Teleport requires a target selector')
    return null
  }
  
  if (typeof selector === 'string') {
    const target = document.querySelector(selector)
    
    if (!target && __DEV__) {
      warn(`Teleport target "${selector}" not found.`)
    }
    
    return target
  }
  
  return selector
}
```

## 内容定位

服务端渲染的 Teleport 会插入标记注释：

```typescript
function locateTeleportContent(target: Element): Node | null {
  // 服务端渲染的标记格式
  // <!--teleport start-->内容<!--teleport end-->
  
  const children = target.childNodes
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (
      child.nodeType === Node.COMMENT_NODE &&
      child.textContent === 'teleport start'
    ) {
      return child.nextSibling
    }
  }
  
  // 如果没有标记，从第一个子节点开始
  return target.firstChild
}
```

## 多 Teleport 共享目标

多个 Teleport 可能指向同一目标：

```typescript
function locateTeleportContentById(
  target: Element,
  teleportId: string
): { start: Node | null; end: Node | null } {
  const children = target.childNodes
  let start: Node | null = null
  let end: Node | null = null
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (child.nodeType === Node.COMMENT_NODE) {
      const text = child.textContent
      
      if (text === `teleport start ${teleportId}`) {
        start = child.nextSibling
      } else if (text === `teleport end ${teleportId}`) {
        end = child
        break
      }
    }
  }
  
  return { start, end }
}
```

## 子节点水合

```typescript
function hydrateTeleportChildren(
  startNode: Node | null,
  vnode: VNode,
  container: Element,
  parentComponent: ComponentInternalInstance | null
): void {
  const children = vnode.children as VNode[]
  
  let node = startNode
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    
    if (node) {
      node = hydrateNode(node, child, parentComponent, false) || null
    }
  }
}
```

## Disabled 状态切换

水合后可能切换 disabled：

```typescript
function handleTeleportToggle(
  vnode: VNode,
  prevDisabled: boolean,
  newDisabled: boolean
) {
  const { target, anchor } = vnode
  
  if (prevDisabled && !newDisabled) {
    // 从原位置移动到目标
    moveTeleportContent(vnode, anchor!.parentElement!, target!)
  } else if (!prevDisabled && newDisabled) {
    // 从目标移回原位置
    moveTeleportContent(vnode, target!, anchor!.parentElement!, anchor)
  }
}

function moveTeleportContent(
  vnode: VNode,
  from: Element,
  to: Element,
  anchor?: Node | null
) {
  const children = vnode.children as VNode[]
  
  for (const child of children) {
    if (child.el) {
      to.insertBefore(child.el, anchor || null)
    }
  }
}
```

## 服务端标记格式

```html
<!-- 源位置 -->
<div id="app">
  <!--teleport start-->
  <!--teleport end-->
</div>

<!-- 目标位置 -->
<div id="modal-container">
  <!--teleport start uid-1-->
  <div class="modal">Modal Content</div>
  <!--teleport end uid-1-->
</div>
```

## 完整水合流程

```typescript
function hydrateTeleportFull(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null {
  const props = vnode.props || {}
  const children = vnode.children as VNode[]
  
  // 1. 获取占位符锚点
  const startAnchor = node as Comment
  const endAnchor = node.nextSibling as Comment
  
  vnode.el = startAnchor
  vnode.anchor = endAnchor
  
  // 2. 处理 disabled 模式
  if (props.disabled) {
    let currentNode = startAnchor.nextSibling
    
    for (const child of children) {
      if (currentNode && currentNode !== endAnchor) {
        currentNode = hydrateNode(
          currentNode,
          child,
          parentComponent,
          false
        )
      }
    }
    
    return endAnchor.nextSibling
  }
  
  // 3. 查找目标
  const targetSelector = props.to
  const target = resolveTarget(targetSelector)
  
  if (!target) {
    __DEV__ && warn(`Teleport target not found: ${targetSelector}`)
    return endAnchor.nextSibling
  }
  
  vnode.target = target
  
  // 4. 定位目标中的内容
  const teleportId = (vnode as any).uid || ''
  const { start: contentStart } = locateTeleportContentById(target, teleportId)
  
  // 5. 水合目标中的内容
  if (contentStart) {
    let currentNode: Node | null = contentStart
    
    for (const child of children) {
      if (currentNode) {
        currentNode = hydrateNode(
          currentNode,
          child,
          parentComponent,
          false
        )
      }
    }
  }
  
  // 6. 返回占位符后的下一个节点
  return endAnchor.nextSibling
}
```

## 事件处理

Teleport 内容的事件在目标位置附加：

```typescript
function attachTeleportEvents(
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
) {
  const children = vnode.children as VNode[]
  
  for (const child of children) {
    if (child.el && child.props) {
      attachEvents(child.el as Element, child.props, parentComponent)
    }
  }
}
```

## 与 Suspense 配合

```typescript
function hydrateTeleportInSuspense(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary
): Node | null {
  // Teleport 内容可能包含异步组件
  const asyncDeps = collectAsyncDeps(vnode)
  
  if (asyncDeps.length > 0) {
    suspense.registerAsyncDeps(asyncDeps)
  }
  
  return hydrateTeleport(
    node,
    vnode,
    parentComponent,
    suspense,
    null,
    false
  )
}
```

## 错误处理

```typescript
function hydrateTeleportSafe(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  try {
    return hydrateTeleport(node, vnode, parentComponent, null, null, false)
  } catch (error) {
    __DEV__ && warn(
      `Teleport hydration failed for target "${vnode.props?.to}": ${error}`
    )
    
    // 降级：在原位置渲染
    return hydrateFallback(node, vnode, parentComponent)
  }
}
```

## 小结

`hydrateTeleport` 处理 Teleport 的水合：

1. 解析占位符锚点
2. 根据 disabled 状态选择水合位置
3. 查找目标容器
4. 定位服务端渲染的内容
5. 水合子节点并附加事件
6. 处理多 Teleport 共享目标的情况

Teleport 水合的关键是正确匹配定义位置的 VNode 与目标位置的 DOM 节点。
