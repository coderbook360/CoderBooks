# unmount 卸载流程

`unmount` 函数负责卸载 VNode，包括移除 DOM、清理副作用、触发生命周期钩子。

## 函数签名

```typescript
const unmount: UnmountFn = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  doRemove: boolean = false,
  optimized: boolean = false
) => { ... }
```

## 实现

```typescript
const unmount: UnmountFn = (
  vnode,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimized = false
) => {
  const {
    type,
    props,
    ref,
    children,
    dynamicChildren,
    shapeFlag,
    patchFlag,
    dirs
  } = vnode

  // 清除 ref
  if (ref != null) {
    setRef(ref, null, parentSuspense, vnode, true)
  }

  // KeepAlive 缓存的组件：停用而非卸载
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    ;(parentComponent!.ctx as KeepAliveContext).deactivate(vnode)
    return
  }

  // 检查是否有需要清理的内容
  const shouldInvokeDirs = shapeFlag & ShapeFlags.ELEMENT && dirs
  const shouldInvokeVnodeHook = !isAsyncWrapper(vnode)
  let vnodeHook: VNodeHook | undefined | null

  // onVnodeBeforeUnmount
  if (
    shouldInvokeVnodeHook &&
    (vnodeHook = props && props.onVnodeBeforeUnmount)
  ) {
    invokeVNodeHook(vnodeHook, parentComponent, vnode)
  }

  // 组件
  if (shapeFlag & ShapeFlags.COMPONENT) {
    unmountComponent(vnode.component!, parentSuspense, doRemove)
  } else {
    // Suspense
    if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      vnode.suspense!.unmount(parentSuspense, doRemove)
      return
    }

    // 指令 beforeUnmount
    if (shouldInvokeDirs) {
      invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount')
    }

    // Teleport
    if (shapeFlag & ShapeFlags.TELEPORT) {
      ;(vnode.type as typeof TeleportImpl).remove(
        vnode,
        parentComponent,
        parentSuspense,
        optimized,
        internals,
        doRemove
      )
    } else if (
      dynamicChildren &&
      (type !== Fragment ||
        (patchFlag > 0 && patchFlag & PatchFlags.STABLE_FRAGMENT))
    ) {
      // Block 优化：只卸载动态子节点
      unmountChildren(
        dynamicChildren,
        parentComponent,
        parentSuspense,
        false,
        true
      )
    } else if (
      (type === Fragment &&
        patchFlag &
          (PatchFlags.KEYED_FRAGMENT | PatchFlags.UNKEYED_FRAGMENT)) ||
      (!optimized && shapeFlag & ShapeFlags.ARRAY_CHILDREN)
    ) {
      // 卸载所有子节点
      unmountChildren(children as VNode[], parentComponent, parentSuspense)
    }

    // 移除 DOM
    if (doRemove) {
      remove(vnode)
    }
  }

  // onVnodeUnmounted（异步）
  if (
    (shouldInvokeVnodeHook &&
      (vnodeHook = props && props.onVnodeUnmounted)) ||
    shouldInvokeDirs
  ) {
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode)
      shouldInvokeDirs &&
        invokeDirectiveHook(vnode, null, parentComponent, 'unmounted')
    }, parentSuspense)
  }
}
```

## 卸载流程

### 1. 清除 ref

```typescript
if (ref != null) {
  setRef(ref, null, parentSuspense, vnode, true)
}
```

将 ref 设置为 null，清除引用。

### 2. KeepAlive 特殊处理

```typescript
if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
  parentComponent.ctx.deactivate(vnode)
  return  // 不实际卸载
}
```

KeepAlive 缓存的组件只停用，不卸载。

### 3. beforeUnmount 钩子

```typescript
// VNode 钩子
if (props?.onVnodeBeforeUnmount) {
  invokeVNodeHook(vnodeHook, parentComponent, vnode)
}

// 指令钩子
if (dirs) {
  invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount')
}
```

### 4. 卸载子内容

根据类型分别处理：

```typescript
// 组件
if (shapeFlag & ShapeFlags.COMPONENT) {
  unmountComponent(vnode.component!, ...)
}

// Suspense
if (shapeFlag & ShapeFlags.SUSPENSE) {
  vnode.suspense!.unmount(...)
}

// Teleport
if (shapeFlag & ShapeFlags.TELEPORT) {
  vnode.type.remove(vnode, ...)
}

// 子节点
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  unmountChildren(children, ...)
}
```

### 5. 移除 DOM

```typescript
if (doRemove) {
  remove(vnode)
}
```

### 6. unmounted 钩子（异步）

```typescript
queuePostRenderEffect(() => {
  props?.onVnodeUnmounted && invokeVNodeHook(...)
  dirs && invokeDirectiveHook(..., 'unmounted')
}, parentSuspense)
```

## remove 函数

```typescript
const remove: RemoveFn = vnode => {
  const { type, el, anchor, transition } = vnode
  
  if (type === Fragment) {
    removeFragment(el!, anchor!)
    return
  }
  
  if (type === Static) {
    removeStaticNode(vnode)
    return
  }

  const performRemove = () => {
    hostRemove(el!)
    if (transition && !transition.persisted && transition.afterLeave) {
      transition.afterLeave()
    }
  }

  if (
    vnode.shapeFlag & ShapeFlags.ELEMENT &&
    transition &&
    !transition.persisted
  ) {
    const { leave, delayLeave } = transition
    const performLeave = () => leave(el!, performRemove)
    if (delayLeave) {
      delayLeave(vnode.el!, performRemove, performLeave)
    } else {
      performLeave()
    }
  } else {
    performRemove()
  }
}
```

## hostRemove

```typescript
function remove(child: Node) {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}
```

## doRemove 参数

```typescript
// doRemove = true：移除 DOM
unmount(vnode, parent, suspense, true)

// doRemove = false：只清理不移除
unmount(vnode, parent, suspense, false)
```

父节点已被移除时，子节点不需要单独移除。

## optimized 参数

```typescript
// optimized = true：使用 dynamicChildren
if (dynamicChildren) {
  unmountChildren(dynamicChildren, ...)
}

// optimized = false：遍历所有子节点
unmountChildren(children, ...)
```

## Transition 处理

带过渡的元素延迟移除：

```typescript
if (transition && !transition.persisted) {
  const performLeave = () => leave(el, performRemove)
  if (delayLeave) {
    delayLeave(el, performRemove, performLeave)
  } else {
    performLeave()
  }
} else {
  performRemove()
}
```

## 生命周期顺序

1. onVnodeBeforeUnmount
2. 指令 beforeUnmount
3. 子组件/子节点卸载
4. 移除 DOM
5. onVnodeUnmounted（异步）
6. 指令 unmounted（异步）

## 小结

`unmount` 是卸载的核心函数，按清除 ref、触发钩子、卸载子内容、移除 DOM 的顺序执行。它处理 KeepAlive、Transition 等特殊情况，确保资源正确清理。异步钩子在 DOM 移除后执行。
