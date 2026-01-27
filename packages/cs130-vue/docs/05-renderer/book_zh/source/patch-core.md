# patch 核心分发

`patch` 函数是渲染器的核心，负责比较新旧 VNode 并执行最小化 DOM 操作。它是一个分发函数，根据 VNode 类型调用对应的处理函数。

## 函数签名

```typescript
const patch: PatchFn = (
  n1,                    // 旧 VNode（null 表示挂载）
  n2,                    // 新 VNode
  container,             // 容器元素
  anchor = null,         // 锚点（insertBefore 的参照）
  parentComponent = null,
  parentSuspense = null,
  isSVG = false,
  slotScopeIds = null,
  optimized = false      // 是否启用编译优化
) => { ... }
```

## 核心实现

```typescript
const patch: PatchFn = (
  n1, n2, container, anchor, parentComponent, 
  parentSuspense, isSVG, slotScopeIds, optimized
) => {
  // 类型不同，完全替换
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1)
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }

  // 禁止优化标记
  if (n2.patchFlag === PatchFlags.BAIL) {
    optimized = false
    n2.dynamicChildren = null
  }

  const { type, ref, shapeFlag } = n2

  // 根据类型分发
  switch (type) {
    case Text:
      processText(n1, n2, container, anchor)
      break
    case Comment:
      processCommentNode(n1, n2, container, anchor)
      break
    case Static:
      if (n1 == null) {
        mountStaticNode(n2, container, anchor, isSVG)
      }
      break
    case Fragment:
      processFragment(
        n1, n2, container, anchor, parentComponent,
        parentSuspense, isSVG, slotScopeIds, optimized
      )
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(
          n1, n2, container, anchor, parentComponent,
          parentSuspense, isSVG, slotScopeIds, optimized
        )
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(
          n1, n2, container, anchor, parentComponent,
          parentSuspense, isSVG, slotScopeIds, optimized
        )
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        ;(type as typeof TeleportImpl).process(
          n1, n2, container, anchor, parentComponent,
          parentSuspense, isSVG, slotScopeIds, optimized,
          internals
        )
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        ;(type as typeof SuspenseImpl).process(
          n1, n2, container, anchor, parentComponent,
          parentSuspense, isSVG, slotScopeIds, optimized,
          internals
        )
      }
  }

  // 设置 ref
  if (ref != null && parentComponent) {
    setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
  }
}
```

## 类型判断：isSameVNodeType

```typescript
function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}
```

type 和 key 都相同才认为是"同一个"节点，可以复用。否则直接替换。

## 各类型处理

### Text 文本节点

```typescript
function processText(
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) {
  if (n1 == null) {
    // 挂载
    hostInsert(
      (n2.el = hostCreateText(n2.children as string)),
      container,
      anchor
    )
  } else {
    // 更新
    const el = (n2.el = n1.el!)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children as string)
    }
  }
}
```

### Comment 注释节点

```typescript
function processCommentNode(
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) {
  if (n1 == null) {
    hostInsert(
      (n2.el = hostCreateComment((n2.children as string) || '')),
      container,
      anchor
    )
  } else {
    // 注释节点不更新内容
    n2.el = n1.el
  }
}
```

### Static 静态节点

```typescript
function mountStaticNode(
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean
) {
  // 静态节点使用 innerHTML 一次性插入
  ;[n2.el, n2.anchor] = hostInsertStaticContent!(
    n2.children as string,
    container,
    anchor,
    isSVG,
    n2.el,
    n2.anchor
  )
}
```

### Fragment 片段

```typescript
function processFragment(
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) {
  const fragmentStartAnchor = (n2.el = n1 
    ? n1.el 
    : hostCreateText(''))!
  const fragmentEndAnchor = (n2.anchor = n1 
    ? n1.anchor 
    : hostCreateText(''))!

  let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2

  if (n1 == null) {
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    // 挂载子节点
    mountChildren(
      n2.children as VNodeArrayChildren,
      container,
      fragmentEndAnchor,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  } else {
    // 更新
    if (
      patchFlag > 0 &&
      patchFlag & PatchFlags.STABLE_FRAGMENT &&
      dynamicChildren
    ) {
      // 优化路径
      patchBlockChildren(
        n1.dynamicChildren!,
        dynamicChildren,
        container,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds
      )
    } else {
      // 完整 diff
      patchChildren(
        n1, n2, container, fragmentEndAnchor, parentComponent,
        parentSuspense, isSVG, slotScopeIds, optimized
      )
    }
  }
}
```

### Element 元素

Element 处理较复杂，单独章节讲解。核心流程：

```typescript
function processElement(n1, n2, container, anchor, ...) {
  if (n1 == null) {
    mountElement(n2, container, anchor, ...)
  } else {
    patchElement(n1, n2, parentComponent, ...)
  }
}
```

### Component 组件

组件处理也单独讲解：

```typescript
function processComponent(n1, n2, container, anchor, ...) {
  if (n1 == null) {
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      // KeepAlive 激活
      parentComponent!.ctx.activate(n2, container, anchor, ...)
    } else {
      mountComponent(n2, container, anchor, ...)
    }
  } else {
    updateComponent(n1, n2, optimized)
  }
}
```

## 优化路径

### Block 优化

当 optimized 为 true 且有 dynamicChildren 时：

```typescript
if (dynamicChildren) {
  patchBlockChildren(
    n1.dynamicChildren!,
    dynamicChildren,
    container,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds
  )
}
```

只 patch 动态节点，跳过静态部分。

### patchFlag 优化

根据 patchFlag 决定更新内容：

```typescript
if (patchFlag & PatchFlags.CLASS) {
  // 只更新 class
}
if (patchFlag & PatchFlags.STYLE) {
  // 只更新 style
}
if (patchFlag & PatchFlags.TEXT) {
  // 只更新文本
}
```

## anchor 锚点

anchor 是 insertBefore 的参照节点：

```typescript
function hostInsert(child, parent, anchor) {
  parent.insertBefore(child, anchor || null)
}
```

- anchor 为 null：appendChild
- anchor 有值：insertBefore

## ref 处理

patch 最后设置 ref：

```typescript
if (ref != null && parentComponent) {
  setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
}
```

## 递归调用

patch 内部会递归调用自身：

```typescript
// mountChildren
for (let i = 0; i < children.length; i++) {
  patch(null, children[i], container, anchor, ...)
}

// patchChildren
for (let i = 0; i < commonLength; i++) {
  patch(c1[i], c2[i], container, null, ...)
}
```

## 小结

`patch` 是渲染器的核心分发函数，它根据 VNode 类型和 shapeFlag 将工作分发给具体的处理函数。它实现了 Vue 的 diff 算法入口，处理挂载、更新、替换等场景，是理解整个渲染流程的关键。
