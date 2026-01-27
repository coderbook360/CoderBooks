# processTeleport 处理流程

Teleport 组件的核心处理逻辑由 `processTeleport` 函数实现，它负责将子内容渲染到指定的目标容器中。这个函数需要处理目标容器的解析、子节点的挂载与移动、以及 `disabled` 状态的切换等复杂场景。

## 处理入口

当 patch 函数遇到 Teleport 类型的 VNode 时，会调用组件自身的 process 方法。Teleport 的设计特别之处在于它将处理逻辑封装在组件定义内部，而非渲染器中：

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
  ) {
    // 解构渲染器内部方法
    const {
      mc: mountChildren,
      pc: patchChildren,
      pbc: patchBlockChildren,
      o: { insert, querySelector, createText, createComment }
    } = internals
    
    const disabled = isTeleportDisabled(n2.props)
    const { shapeFlag, children } = n2
    
    if (n1 == null) {
      // 挂载流程
    } else {
      // 更新流程
    }
  }
}
```

这段代码展示了 Teleport 处理函数的整体结构。函数首先从渲染器内部对象中解构出所需的方法，然后根据旧节点 n1 是否存在来决定执行挂载还是更新逻辑。`disabled` 属性决定了内容是否传送到目标容器。

## 目标容器解析

Teleport 需要一个目标容器来放置传送的内容。`resolveTarget` 函数负责解析 `to` 属性指定的目标：

```typescript
const resolveTarget = <T = RendererElement>(
  props: TeleportProps | null,
  select: typeof document.querySelector | null
): T | null => {
  const targetSelector = props && props.to
  
  if (isString(targetSelector)) {
    // 字符串选择器，使用 querySelector 查找
    if (!select) {
      __DEV__ && warn('Current renderer does not support string target.')
      return null
    }
    const target = select(targetSelector)
    if (!target) {
      __DEV__ && warn(`Failed to locate Teleport target with selector "${targetSelector}".`)
    }
    return target as any
  } else {
    // 直接传入 DOM 元素
    if (__DEV__ && !targetSelector && !disabled) {
      warn(`Invalid Teleport target: ${targetSelector}`)
    }
    return targetSelector as any
  }
}
```

`to` 属性支持两种形式：CSS 选择器字符串（如 `'#modal-container'`）或直接的 DOM 元素引用。当使用字符串时，函数会调用渲染器提供的 querySelector 方法进行查找。如果目标不存在，开发环境下会输出警告信息，帮助开发者定位问题。

## 挂载流程

首次渲染 Teleport 时，需要在原位置插入占位符，然后将子内容渲染到目标容器：

```typescript
if (n1 == null) {
  // 创建占位符用于标记 Teleport 位置
  const placeholder = (n2.el = __DEV__
    ? createComment('teleport start')
    : createText(''))
  const mainAnchor = (n2.anchor = __DEV__
    ? createComment('teleport end')
    : createText(''))
  
  // 在原位置插入占位符
  insert(placeholder, container, anchor)
  insert(mainAnchor, container, anchor)
  
  // 解析目标容器
  const target = (n2.target = resolveTarget(n2.props, querySelector))
  const targetAnchor = (n2.targetAnchor = createText(''))
  
  if (target) {
    insert(targetAnchor, target)
    // 确定是否在 SVG 上下文中
    isSVG = isSVG || isTargetSVG(target)
  }
  
  // 根据 disabled 状态决定渲染位置
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
    // disabled 时渲染到原位置
    mount(container, mainAnchor)
  } else if (target) {
    // 正常情况渲染到目标容器
    mount(target, targetAnchor)
  }
}
```

挂载流程的设计颇有讲究。首先，即使内容被传送到别处，Teleport 仍需在原位置保留占位符——这是为了在 DOM 结构中标记其位置，便于后续的移动和卸载操作。开发环境使用注释节点（包含描述性文本），生产环境使用空文本节点以减小体积。

接下来解析目标容器并在其中插入锚点。最后根据 `disabled` 状态决定子内容的实际渲染位置：禁用时渲染在原位置，正常时渲染在目标容器。

## 更新流程

更新 Teleport 比挂载复杂得多，需要处理目标变化和 disabled 状态切换：

```typescript
else {
  // 复用占位符和锚点
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
    // 强制更新 HMR 时的静态内容
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
  
  // 处理 disabled 状态变化
  if (disabled) {
    if (!wasDisabled) {
      // 从启用变为禁用，移回原位置
      moveTeleport(
        n2,
        container,
        mainAnchor,
        internals,
        TeleportMoveTypes.TOGGLE
      )
    }
  } else {
    // 检查目标是否变化
    if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
      // 目标变化，移动到新目标
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
      // 从禁用变为启用，移动到目标
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
```

更新流程的核心在于正确追踪内容的当前位置。代码首先确定内容当前在哪个容器中（根据之前的 disabled 状态），然后在该位置执行常规的子节点更新。完成更新后，再根据状态变化决定是否需要移动内容。

状态变化有三种情况需要移动：从启用变为禁用（移回原位置）、目标容器变化（移到新目标）、从禁用变为启用（移到目标容器）。每种情况都对应不同的移动类型，便于调试和追踪。

## 移动操作

`moveTeleport` 函数负责在容器之间移动 Teleport 的子内容：

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
  
  // 重排时需要移动占位符
  if (isReorder) {
    insert(el!, container, parentAnchor)
  }
  
  // 禁用状态不移动子节点
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
  
  // 重排时移动结束锚点
  if (isReorder) {
    insert(anchor!, container, parentAnchor)
  }
}
```

移动逻辑需要区分不同的移动类型。目标变化时只需移动锚点和子节点，而重排序（如父节点排序）时还需移动占位符。子节点的移动委托给渲染器的 move 函数，确保递归处理嵌套的组件和 Teleport。

## disabled 属性

`disabled` 属性控制 Teleport 是否生效，这在条件渲染或初始化阶段特别有用：

```typescript
function isTeleportDisabled(props: VNode['props']): boolean {
  return props && (props.disabled || props.disabled === '')
}
```

当 disabled 为 true 或空字符串时，Teleport 的子内容会渲染在原位置，就像一个普通的 Fragment。这个设计让开发者可以轻松控制传送行为，比如在移动端禁用某些 Teleport 效果。

## 卸载处理

Teleport 的卸载需要同时清理原位置的占位符和目标容器中的内容：

```typescript
function remove(
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  optimized: boolean,
  { um: unmount, o: { remove: hostRemove } }: RendererInternals,
  doRemove: boolean
) {
  const { shapeFlag, children, anchor, targetAnchor, target, props } = vnode
  
  // 移除目标锚点
  if (target) {
    hostRemove(targetAnchor!)
  }
  
  // 移除子节点
  if (doRemove || !isTeleportDisabled(props)) {
    // 移除占位符
    hostRemove(anchor!)
    
    // 卸载子节点
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      for (let i = 0; i < (children as VNode[]).length; i++) {
        unmount(
          (children as VNode[])[i],
          parentComponent,
          parentSuspense,
          true,
          optimized
        )
      }
    }
  }
}
```

卸载操作首先移除目标容器中的锚点，然后移除原位置的结束占位符。子节点通过渲染器的 unmount 函数递归卸载，确保正确触发生命周期钩子和清理副作用。

## 小结

processTeleport 实现了 Teleport 组件的完整生命周期管理。挂载时解析目标容器、插入占位符、在正确位置渲染子内容。更新时处理子节点 diff 以及各种状态变化导致的移动。卸载时清理所有相关节点。这套机制让跨 DOM 树的内容渲染变得可控和可预测。
