# Teleport 组件实现

Teleport 允许将组件的内容渲染到 DOM 树的其他位置。这对于模态框、通知、下拉菜单等需要脱离父组件 DOM 层级的场景非常有用。

## 基本用法

```vue
<template>
  <button @click="open = true">打开模态框</button>
  
  <Teleport to="body">
    <div v-if="open" class="modal">
      <p>模态框内容</p>
      <button @click="open = false">关闭</button>
    </div>
  </Teleport>
</template>
```

模态框渲染到 body，而非当前组件内。

## Teleport 对象

```typescript
export const TeleportImpl = {
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
      const placeholder = (n2.el = __DEV__
        ? createComment('teleport start')
        : createText(''))
      const mainAnchor = (n2.anchor = __DEV__
        ? createComment('teleport end')
        : createText(''))

      insert(placeholder, container, anchor)
      insert(mainAnchor, container, anchor)

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
        // disabled：渲染在原位置
        mount(container, mainAnchor)
      } else if (target) {
        // 正常：渲染到 target
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
          // 从 target 移回原位置
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
          // 从原位置移到 target
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
  },

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
      hostRemove(anchor!)
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
  },

  move: moveTeleport,
  hydrate: hydrateTeleport
}
```

## resolveTarget

解析目标元素：

```typescript
const resolveTarget = <T = RendererElement>(
  props: TeleportProps | null,
  select: typeof document.querySelector
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
    return target as T
  } else {
    // 直接传入 DOM 元素
    return targetSelector as T
  }
}
```

支持选择器字符串或 DOM 元素引用。

## 占位符

Teleport 在原位置留下占位符：

```typescript
const placeholder = (n2.el = __DEV__
  ? createComment('teleport start')
  : createText(''))
const mainAnchor = (n2.anchor = __DEV__
  ? createComment('teleport end')
  : createText(''))

insert(placeholder, container, anchor)
insert(mainAnchor, container, anchor)
```

开发环境用注释节点便于调试，生产环境用空文本节点。

## disabled 属性

```vue
<Teleport to="body" :disabled="isMobile">
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

## 动态切换 disabled

```typescript
if (disabled) {
  if (!wasDisabled) {
    // disabled 变为 true：从 target 移回原位置
    moveTeleport(n2, container, mainAnchor, internals, TeleportMoveTypes.TOGGLE)
  }
} else {
  if (wasDisabled) {
    // disabled 变为 false：从原位置移到 target
    moveTeleport(n2, target, targetAnchor, internals, TeleportMoveTypes.TOGGLE)
  }
}
```

## 动态改变 target

```typescript
if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
  const nextTarget = resolveTarget(n2.props, querySelector)
  if (nextTarget) {
    moveTeleport(n2, nextTarget, null, internals, TeleportMoveTypes.TARGET_CHANGE)
  }
}
```

target 变化时，内容移动到新目标。

## moveTeleport

移动 Teleport 内容：

```typescript
function moveTeleport(
  vnode: VNode,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  { o: { insert }, m: move }: RendererInternals,
  moveType: TeleportMoveTypes = TeleportMoveTypes.REORDER
) {
  // 移动 target anchor
  if (moveType === TeleportMoveTypes.TARGET_CHANGE) {
    insert(vnode.targetAnchor!, container, parentAnchor)
  }
  
  const { el, anchor, shapeFlag, children, props } = vnode
  const isReorder = moveType === TeleportMoveTypes.REORDER
  
  // 移动主元素
  if (isReorder) {
    insert(el!, container, parentAnchor)
  }
  
  // 移动子元素
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
  
  // 移动 anchor
  if (isReorder) {
    insert(anchor!, container, parentAnchor)
  }
}
```

## 多个 Teleport 到同一目标

```vue
<Teleport to="#modals">
  <Modal1 />
</Teleport>
<Teleport to="#modals">
  <Modal2 />
</Teleport>
```

按顺序渲染到目标容器。

## defer 属性

Vue 3.5+ 支持延迟解析：

```vue
<Teleport to="#container" defer>
  <div>内容</div>
</Teleport>
```

等待当前渲染周期完成后再解析目标，解决目标元素在同一模板中定义的问题。

## SSR 处理

SSR 时 Teleport 需要特殊处理：

```typescript
hydrate: hydrateTeleport
```

服务端渲染的内容在客户端激活时需要正确关联。

## 使用场景

### 模态框

```vue
<Teleport to="body">
  <div class="modal-overlay" v-if="show">
    <div class="modal">
      <!-- 模态框内容 -->
    </div>
  </div>
</Teleport>
```

### 全屏通知

```vue
<Teleport to="#notifications">
  <Notification 
    v-for="n in notifications" 
    :key="n.id" 
    :message="n.message" 
  />
</Teleport>
```

### 下拉菜单

```vue
<Teleport to="body">
  <div 
    class="dropdown" 
    v-if="open" 
    :style="{ top: pos.y, left: pos.x }"
  >
    <!-- 菜单项 -->
  </div>
</Teleport>
```

## 小结

Teleport 的实现要点：

1. **目标解析**：支持选择器和元素引用
2. **占位符**：在原位置保留标记
3. **disabled 切换**：动态在原位置和目标间移动
4. **target 变化**：移动到新目标
5. **SSR 兼容**：hydration 支持

Teleport 解决了 DOM 层级和组件逻辑分离的问题，让模态框等场景的实现更加优雅。

下一章将分析 Suspense 的实现。
