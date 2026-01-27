# Teleport 挂载与更新

本章分析 Teleport 组件的更新逻辑、目标切换和 disabled 状态变化的处理。

## 更新逻辑

```typescript
process(
  n1: TeleportVNode | null,
  n2: TeleportVNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  internals: RendererInternals
) {
  // ... 挂载逻辑

  if (n1 !== null) {
    // ⭐ 更新逻辑
    n2.el = n1.el
    const mainAnchor = (n2.anchor = n1.anchor)!
    const target = (n2.target = n1.target)!
    const targetAnchor = (n2.targetAnchor = n1.targetAnchor)!
    
    const wasDisabled = isTeleportDisabled(n1.props)
    const currentContainer = wasDisabled ? container : target
    const currentAnchor = wasDisabled ? mainAnchor : targetAnchor

    isSVG = isSVG || isTargetSVG(target)

    // 更新子节点
    if (dynamicChildren) {
      patchBlockChildren(
        n1.dynamicChildren!,
        dynamicChildren,
        currentContainer,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds
      )
      traverseStaticChildren(n1, n2, true)
    } else if (!optimized) {
      patchChildren(
        n1,
        n2,
        currentContainer,
        currentAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        false
      )
    }

    // 处理 disabled 和 target 变化
    if (disabled) {
      if (!wasDisabled) {
        // disabled: false -> true
        moveTeleport(
          n2,
          container,
          mainAnchor,
          internals,
          TeleportMoveTypes.TOGGLE
        )
      }
    } else {
      if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
        // target 变化
        const nextTarget = (n2.target = resolveTarget(
          n2.props,
          querySelector
        ))
        if (nextTarget) {
          moveTeleport(
            n2,
            nextTarget,
            null,
            internals,
            TeleportMoveTypes.TARGET_CHANGE
          )
        }
      } else if (wasDisabled) {
        // disabled: true -> false
        moveTeleport(
          n2,
          target,
          targetAnchor,
          internals,
          TeleportMoveTypes.TOGGLE
        )
      }
    }
  }
}
```

## TeleportMoveTypes

```typescript
export const enum TeleportMoveTypes {
  TARGET_CHANGE,  // 目标变化
  TOGGLE,         // disabled 切换
  REORDER         // 重新排序
}
```

## moveTeleport 移动逻辑

```typescript
function moveTeleport(
  vnode: VNode,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  { o: { insert }, m: move }: RendererInternals,
  moveType: TeleportMoveTypes = TeleportMoveTypes.REORDER
) {
  // 目标变化时更新 targetAnchor
  if (moveType === TeleportMoveTypes.TARGET_CHANGE) {
    insert(vnode.targetAnchor!, container, parentAnchor)
  }
  
  const { el, anchor, shapeFlag, children, props } = vnode
  const isReorder = moveType === TeleportMoveTypes.REORDER
  
  // 移动占位符
  if (isReorder) {
    insert(el!, container, parentAnchor)
  }
  
  // 移动子节点
  if (!isReorder || isTeleportDisabled(props)) {
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      for (let i = 0; i < (children as VNode[]).length; i++) {
        move(
          (children as VNode[])[i],
          container,
          parentAnchor,
          MoveType.REORDER
        )
      }
    }
  }
  
  // 移动结束锚点
  if (isReorder) {
    insert(anchor!, container, parentAnchor)
  }
}
```

## disabled 切换场景

### 从启用到禁用

```typescript
// disabled: false -> true
// 需要把子节点从 target 移回原位置
if (!wasDisabled) {
  moveTeleport(
    n2,
    container,      // 移回原容器
    mainAnchor,     // 在原位置的锚点前
    internals,
    TeleportMoveTypes.TOGGLE
  )
}
```

### 从禁用到启用

```typescript
// disabled: true -> false
// 需要把子节点从原位置移到 target
if (wasDisabled) {
  moveTeleport(
    n2,
    target,         // 移到目标
    targetAnchor,   // 在目标锚点前
    internals,
    TeleportMoveTypes.TOGGLE
  )
}
```

## 目标变化场景

```typescript
// to 属性变化
if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
  const nextTarget = (n2.target = resolveTarget(n2.props, querySelector))
  if (nextTarget) {
    moveTeleport(
      n2,
      nextTarget,
      null,
      internals,
      TeleportMoveTypes.TARGET_CHANGE
    )
  }
}
```

## remove 移除逻辑

```typescript
remove(
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  optimized: boolean,
  { um: unmount, o: { remove: hostRemove } }: RendererInternals,
  doRemove: boolean
) {
  const { shapeFlag, children, anchor, targetAnchor, target, props } = vnode

  if (target) {
    hostRemove(targetAnchor!)
  }

  if (doRemove || !isTeleportDisabled(props)) {
    // 移除占位符
    hostRemove(anchor!)
    
    // 移除子节点
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      for (let i = 0; i < (children as VNode[]).length; i++) {
        const child = (children as VNode[])[i]
        unmount(
          child,
          parentComponent,
          parentSuspense,
          true,
          !!child.dynamicChildren
        )
      }
    }
  }
}
```

## hydrate 服务端渲染

```typescript
hydrate(
  node: Node,
  vnode: TeleportVNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean,
  {
    o: { nextSibling, parentNode, querySelector }
  }: RendererInternals<Node, Element>,
  hydrateChildren: (
    node: Node | null,
    vnode: VNode,
    container: Element,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => Node | null
): Node | null {
  const target = (vnode.target = resolveTarget<Element>(
    vnode.props,
    querySelector
  ))
  
  if (target) {
    const targetNode =
      target._lpa || target.firstChild
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (isTeleportDisabled(vnode.props)) {
        vnode.anchor = hydrateChildren(
          nextSibling(node),
          vnode,
          parentNode(node)!,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
        vnode.targetAnchor = targetNode
      } else {
        vnode.anchor = nextSibling(node)
        let targetAnchor = targetNode
        while (targetAnchor) {
          targetAnchor = nextSibling(targetAnchor)
          if (
            targetAnchor &&
            targetAnchor.nodeType === 8 &&
            (targetAnchor as Comment).data === 'teleport anchor'
          ) {
            vnode.targetAnchor = targetAnchor
            ;(target as TeleportTargetElement)._lpa =
              vnode.targetAnchor && nextSibling(vnode.targetAnchor as Node)
            break
          }
        }
        hydrateChildren(
          targetNode,
          vnode,
          target,
          parentComponent,
          parentSuspense,
          slotScopeIds,
          optimized
        )
      }
    }
  }
  return vnode.anchor && nextSibling(vnode.anchor as Node)
}
```

## 多个 Teleport 同一目标

```html
<template>
  <Teleport to="#modals">
    <div>Modal 1</div>
  </Teleport>
  <Teleport to="#modals">
    <div>Modal 2</div>
  </Teleport>
</template>
```

多个 Teleport 传送到同一目标时，按顺序追加。

## 使用示例

### 动态切换目标

```html
<template>
  <Teleport :to="target">
    <div>Content</div>
  </Teleport>
  <button @click="target = target === '#a' ? '#b' : '#a'">
    Toggle Target
  </button>
</template>

<script setup>
import { ref } from 'vue'
const target = ref('#a')
</script>
```

### 动态切换 disabled

```html
<template>
  <Teleport to="body" :disabled="isDisabled">
    <div>Modal</div>
  </Teleport>
  <button @click="isDisabled = !isDisabled">
    Toggle Disabled
  </button>
</template>
```

## 小结

Teleport 挂载与更新的核心要点：

1. **更新时复用**：复用 el、anchor、target 等
2. **disabled 切换**：通过 moveTeleport 移动子节点
3. **目标变化**：重新解析目标并移动
4. **移除逻辑**：清理占位符和子节点
5. **SSR 激活**：正确关联目标和锚点

下一章将分析 Suspense 组件源码。
