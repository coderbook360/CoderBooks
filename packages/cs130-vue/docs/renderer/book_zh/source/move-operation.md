# move 移动操作

`move` 函数负责在 DOM 中移动节点。它处理元素、组件、Fragment 等不同类型的移动。

## 函数签名

```typescript
const move: MoveFn = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  moveType: MoveType,
  parentSuspense: SuspenseBoundary | null = null
) => { ... }
```

## MoveType 枚举

```typescript
const enum MoveType {
  ENTER = 0,   // 进入（Transition）
  LEAVE = 1,   // 离开（Transition）
  REORDER = 2  // 重排（diff 移动）
}
```

## 实现

```typescript
const move: MoveFn = (
  vnode,
  container,
  anchor,
  moveType,
  parentSuspense = null
) => {
  const { el, type, transition, children, shapeFlag } = vnode
  
  // 组件：移动其子树
  if (shapeFlag & ShapeFlags.COMPONENT) {
    move(vnode.component!.subTree, container, anchor, moveType)
    return
  }

  // Suspense
  if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
    vnode.suspense!.move(container, anchor, moveType)
    return
  }

  // Teleport
  if (shapeFlag & ShapeFlags.TELEPORT) {
    ;(type as typeof TeleportImpl).move(vnode, container, anchor, internals)
    return
  }

  // Fragment：移动所有子节点
  if (type === Fragment) {
    hostInsert(el!, container, anchor)
    for (let i = 0; i < (children as VNode[]).length; i++) {
      move((children as VNode[])[i], container, anchor, moveType)
    }
    hostInsert(vnode.anchor!, container, anchor)
    return
  }

  // Static：移动静态节点范围
  if (type === Static) {
    moveStaticNode(vnode, container, anchor)
    return
  }

  // 普通元素 + Transition
  const needTransition =
    moveType !== MoveType.REORDER &&
    shapeFlag & ShapeFlags.ELEMENT &&
    transition
  
  if (needTransition) {
    if (moveType === MoveType.ENTER) {
      transition!.beforeEnter(el!)
      hostInsert(el!, container, anchor)
      queuePostRenderEffect(() => transition!.enter(el!), parentSuspense)
    } else {
      const { leave, delayLeave, afterLeave } = transition!
      const remove = () => hostInsert(el!, container, anchor)
      const performLeave = () => {
        leave(el!, () => {
          remove()
          afterLeave && afterLeave()
        })
      }
      if (delayLeave) {
        delayLeave(el!, remove, performLeave)
      } else {
        performLeave()
      }
    }
  } else {
    // 普通移动
    hostInsert(el!, container, anchor)
  }
}
```

## 各类型移动

### 普通元素

```typescript
// 最简单的情况
hostInsert(el, container, anchor)
```

`hostInsert` 实现：

```typescript
function insert(child: Node, parent: Element, anchor: Node | null) {
  parent.insertBefore(child, anchor)
}
```

### 组件

组件没有自己的 DOM 节点，移动其 subTree：

```typescript
if (shapeFlag & ShapeFlags.COMPONENT) {
  move(vnode.component!.subTree, container, anchor, moveType)
  return
}
```

### Fragment

Fragment 需要移动所有子节点和边界标记：

```typescript
if (type === Fragment) {
  // 移动开始标记
  hostInsert(el!, container, anchor)
  // 移动所有子节点
  for (let i = 0; i < children.length; i++) {
    move(children[i], container, anchor, moveType)
  }
  // 移动结束标记
  hostInsert(vnode.anchor!, container, anchor)
  return
}
```

### Static

静态节点可能包含多个 DOM 节点：

```typescript
function moveStaticNode(
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null
) {
  let cur = vnode.el!
  const end = vnode.anchor!
  while (cur !== end) {
    const next = cur.nextSibling!
    hostInsert(cur, container, anchor)
    cur = next
  }
  hostInsert(end, container, anchor)
}
```

### Teleport

Teleport 有自己的移动逻辑：

```typescript
if (shapeFlag & ShapeFlags.TELEPORT) {
  ;(type as typeof TeleportImpl).move(vnode, container, anchor, internals)
  return
}
```

### Suspense

```typescript
if (shapeFlag & ShapeFlags.SUSPENSE) {
  vnode.suspense!.move(container, anchor, moveType)
  return
}
```

## Transition 处理

移动时可能触发过渡动画：

```typescript
const needTransition =
  moveType !== MoveType.REORDER &&  // 重排不触发
  shapeFlag & ShapeFlags.ELEMENT &&  // 只有元素有过渡
  transition

if (needTransition) {
  if (moveType === MoveType.ENTER) {
    // 进入动画
    transition.beforeEnter(el)
    hostInsert(el, container, anchor)
    queuePostRenderEffect(() => transition.enter(el), parentSuspense)
  } else {
    // 离开动画
    const { leave, delayLeave, afterLeave } = transition
    const performLeave = () => {
      leave(el, () => {
        hostInsert(el, container, anchor)
        afterLeave?.()
      })
    }
    if (delayLeave) {
      delayLeave(el, remove, performLeave)
    } else {
      performLeave()
    }
  }
}
```

## 使用场景

### patchKeyedChildren

diff 算法中移动节点：

```typescript
if (j < 0 || i !== increasingNewIndexSequence[j]) {
  move(nextChild, container, anchor, MoveType.REORDER)
} else {
  j--
}
```

### KeepAlive

激活/停用时移动：

```typescript
// 激活
move(vnode, container, anchor, MoveType.ENTER)

// 停用
move(cachedVNode, storageContainer, null, MoveType.LEAVE)
```

### TransitionGroup

列表过渡：

```typescript
for (const child of moving) {
  move(child, container, anchor, MoveType.REORDER)
}
```

## anchor 的作用

anchor 决定插入位置：

```typescript
// anchor = null：appendChild
parent.insertBefore(child, null)  // 等同于 appendChild

// anchor 有值：insertBefore
parent.insertBefore(child, anchor)
```

在 diff 中计算锚点：

```typescript
const anchor = nextIndex + 1 < l2 
  ? (c2[nextIndex + 1] as VNode).el 
  : parentAnchor
```

## 性能考虑

### DOM 操作开销

insertBefore 是相对昂贵的操作：
- 触发布局计算
- 可能触发重绘
- 更新内部数据结构

### 最小化移动

LIS 优化确保移动次数最少：

```typescript
// 只移动不在 LIS 中的节点
if (i !== increasingNewIndexSequence[j]) {
  move(...)
}
```

### 批量操作

多个移动操作会被浏览器合并：

```typescript
// 这些操作会被合并为一次重排
move(child1, container, anchor)
move(child2, container, anchor)
move(child3, container, anchor)
```

## 小结

`move` 函数处理各类型节点的 DOM 移动。普通元素直接 insertBefore，组件移动 subTree，Fragment 移动所有子节点。配合 Transition 支持移动动画。LIS 优化确保 diff 中的移动次数最少。
