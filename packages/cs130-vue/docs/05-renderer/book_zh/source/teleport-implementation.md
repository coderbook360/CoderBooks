# Teleport 实现

Teleport 组件将子节点渲染到 DOM 中的指定位置，突破组件层级限制。

## TeleportImpl 结构

```typescript
const TeleportImpl = {
  __isTeleport: true,
  
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
  ) { ... },
  
  remove(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    optimized: boolean,
    { um: unmount, o: { remove: hostRemove } }: RendererInternals,
    doRemove: boolean
  ) { ... },
  
  move: moveTeleport,
  hydrate: hydrateTeleport
}
```

## process 实现

```typescript
process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals) {
  const {
    mc: mountChildren,
    pc: patchChildren,
    pbc: patchBlockChildren,
    o: { insert, querySelector, createText, createComment }
  } = internals

  const disabled = isTeleportDisabled(n2.props)
  let { shapeFlag, children, dynamicChildren } = n2

  if (n1 == null) {
    // 挂载
    // 创建占位符
    const placeholder = (n2.el = __DEV__
      ? createComment('teleport start')
      : createText(''))
    const mainAnchor = (n2.anchor = __DEV__
      ? createComment('teleport end')
      : createText(''))

    insert(placeholder, container, anchor)
    insert(mainAnchor, container, anchor)

    // 解析目标
    const target = (n2.target = resolveTarget(n2.props, querySelector))
    const targetAnchor = (n2.targetAnchor = createText(''))
    
    if (target) {
      insert(targetAnchor, target)
      isSVG = isSVG || isTargetSVG(target)
    }

    const mount = (container: RendererElement, anchor: RendererNode) => {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(
          children as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
      }
    }

    if (disabled) {
      // 禁用时渲染到原位置
      mount(container, mainAnchor)
    } else if (target) {
      // 渲染到目标
      mount(target, targetAnchor)
    }
  } else {
    // 更新
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

    if (disabled) {
      if (!wasDisabled) {
        // 从目标移回原位置
        moveTeleport(
          n2,
          container,
          mainAnchor,
          internals,
          TeleportMoveTypes.TOGGLE
        )
      }
    } else {
      // 目标变化
      if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
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
        // 从原位置移到目标
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

## resolveTarget

```typescript
const resolveTarget = <T = RendererElement>(
  props: TeleportProps | null,
  select: RendererOptions['querySelector']
): T | null => {
  const targetSelector = props && props.to
  if (isString(targetSelector)) {
    if (!select) {
      return null
    }
    const target = select(targetSelector)
    if (!target) {
      warn(`Failed to locate Teleport target with selector "${targetSelector}".`)
    }
    return target as any
  } else {
    // 直接传入 DOM 元素
    return targetSelector as any
  }
}
```

## moveTeleport

```typescript
function moveTeleport(
  vnode: VNode,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  { o: { insert }, m: move }: RendererInternals,
  moveType: TeleportMoveTypes = TeleportMoveTypes.REORDER
) {
  // 更新目标锚点
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

## remove 实现

```typescript
remove(vnode, parentComponent, parentSuspense, optimized, { um: unmount, o: { remove: hostRemove } }, doRemove) {
  const { shapeFlag, children, anchor, targetAnchor, target, props } = vnode

  if (target) {
    hostRemove(targetAnchor!)
  }

  if (doRemove || !isTeleportDisabled(props)) {
    // 移除占位符
    hostRemove(anchor!)
    
    // 卸载子节点
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

## disabled 属性

```typescript
<Teleport to="#modal" :disabled="isMobile">
  <Modal />
</Teleport>
```

disabled 时内容渲染在原位置：

```typescript
if (disabled) {
  mount(container, mainAnchor)
} else if (target) {
  mount(target, targetAnchor)
}
```

## 目标切换

```typescript
// 模板
<Teleport :to="target">
  <Content />
</Teleport>

// 目标变化时
if ((n2.props.to) !== (n1.props.to)) {
  const nextTarget = resolveTarget(n2.props, querySelector)
  if (nextTarget) {
    moveTeleport(n2, nextTarget, null, internals, TeleportMoveTypes.TARGET_CHANGE)
  }
}
```

## 占位符

Teleport 在原位置留下占位符：

```html
<!-- 原始位置 -->
<div id="app">
  <!--teleport start-->
  <!--teleport end-->
</div>

<!-- 目标位置 -->
<div id="modal">
  <div class="modal-content">...</div>
</div>
```

## VNode 结构

```typescript
const teleportVNode: VNode = {
  type: Teleport,
  props: { to: '#modal', disabled: false },
  children: [...],
  shapeFlag: ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN,
  el: placeholder,
  anchor: mainAnchor,
  target: targetElement,
  targetAnchor: targetAnchorNode,
  // ...
}
```

## 使用场景

- 模态框
- 通知/Toast
- 下拉菜单（避免 overflow 裁剪）
- 全屏组件

## 小结

Teleport 通过 process 函数处理挂载和更新，将子节点渲染到指定目标。它支持动态目标切换和 disabled 控制。在原位置保留占位符以维护组件树结构。
