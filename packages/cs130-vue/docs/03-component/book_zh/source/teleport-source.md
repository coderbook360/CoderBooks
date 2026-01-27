# Teleport 组件源码

Teleport 是 Vue 3 的内置组件，允许将组件的 DOM 节点"传送"到文档中的任意位置。本章分析 Teleport 的核心实现。

## 组件定义

```typescript
// packages/runtime-core/src/components/Teleport.ts
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
    // 挂载或更新逻辑
  },
  remove(
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    optimized: boolean,
    { um: unmount, o: { remove: hostRemove } }: RendererInternals,
    doRemove: boolean
  ) {
    // 移除逻辑
  },
  move: moveTeleport,
  hydrate: hydrateTeleport
}

export const Teleport = TeleportImpl as unknown as {
  __isTeleport: true
  new (): {
    $props: VNodeProps & TeleportProps
  }
}
```

## TeleportProps 定义

```typescript
export interface TeleportProps {
  to: string | RendererElement | null | undefined
  disabled?: boolean
}
```

## isTeleport 判断

```typescript
export const isTeleport = (type: any): boolean => type.__isTeleport
```

## process 方法分析

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
  const {
    mc: mountChildren,
    pc: patchChildren,
    pbc: patchBlockChildren,
    o: { insert, querySelector, createText, createComment }
  } = internals

  const disabled = isTeleportDisabled(n2.props)
  let { shapeFlag, children, dynamicChildren } = n2

  if (n1 == null) {
    // ⭐ 挂载逻辑
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

    // 挂载子节点
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
      // disabled 时挂载到原位置
      mount(container, mainAnchor)
    } else if (target) {
      // 正常挂载到目标
      mount(target, targetAnchor)
    }
  } else {
    // ⭐ 更新逻辑
    // 见下一章
  }
}
```

## resolveTarget 目标解析

```typescript
const resolveTarget = <T = RendererElement>(
  props: TeleportProps | null,
  select: RendererOptions['querySelector']
): T | null => {
  const targetSelector = props && props.to
  
  if (isString(targetSelector)) {
    if (!select) {
      // 没有 querySelector
      return null
    }
    const target = select(targetSelector)
    if (!target) {
      // ⭐ 目标不存在警告
      __DEV__ && warn(`Failed to locate Teleport target with selector "${targetSelector}".`)
    }
    return target as T
  } else {
    // 直接传入 DOM 元素
    if (__DEV__ && !targetSelector && !isTeleportDisabled(props)) {
      warn(`Invalid Teleport target: ${targetSelector}`)
    }
    return targetSelector as T
  }
}
```

## isTeleportDisabled 判断

```typescript
export const isTeleportDisabled = (props: VNode['props']): boolean =>
  props && (props.disabled || props.disabled === '')
```

## 占位符的作用

```typescript
// 创建开始和结束占位符
const placeholder = (n2.el = createComment('teleport start'))
const mainAnchor = (n2.anchor = createComment('teleport end'))

insert(placeholder, container, anchor)
insert(mainAnchor, container, anchor)
```

占位符用于：
1. 标记 Teleport 在原始位置的存在
2. 便于后续 disabled 切换时的定位
3. 便于移除时找到位置

## 目标锚点

```typescript
const targetAnchor = (n2.targetAnchor = createText(''))

if (target) {
  insert(targetAnchor, target)
}
```

targetAnchor 用于在目标容器中标记子节点的插入位置。

## disabled 状态处理

```typescript
if (disabled) {
  // disabled 时子节点挂载到原位置
  mount(container, mainAnchor)
} else if (target) {
  // 正常时挂载到目标位置
  mount(target, targetAnchor)
}
```

## VNode 结构

```typescript
interface TeleportVNode extends VNode {
  type: typeof TeleportImpl
  props: TeleportProps
  anchor: RendererNode | null
  target: RendererElement | null
  targetAnchor: RendererNode | null
  children: VNodeArrayChildren
}
```

## 使用示例

```html
<template>
  <div>
    <h1>Modal Demo</h1>
    <button @click="showModal = true">Open Modal</button>
    
    <Teleport to="body">
      <div v-if="showModal" class="modal">
        <p>This is a modal</p>
        <button @click="showModal = false">Close</button>
      </div>
    </Teleport>
  </div>
</template>
```

渲染后的 DOM 结构：

```html
<div>
  <h1>Modal Demo</h1>
  <button>Open Modal</button>
  <!-- teleport start -->
  <!-- teleport end -->
</div>

<body>
  <!-- 在 body 末尾 -->
  <div class="modal">
    <p>This is a modal</p>
    <button>Close</button>
  </div>
</body>
```

## 小结

Teleport 组件源码的核心要点：

1. **特殊组件**：使用 `__isTeleport` 标识
2. **process 方法**：统一处理挂载和更新
3. **占位符**：在原位置保留标记
4. **目标解析**：支持选择器字符串或 DOM 元素
5. **disabled 状态**：可切换传送行为

下一章将分析 Teleport 的挂载与更新逻辑。
