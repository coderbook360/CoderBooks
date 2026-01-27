# unmountElement 元素卸载

元素卸载是 unmount 流程的一部分，主要涉及指令清理、子节点卸载和 DOM 移除。

## 卸载流程

在 `unmount` 函数中，元素卸载的相关代码：

```typescript
const unmount: UnmountFn = (vnode, parentComponent, parentSuspense, doRemove, optimized) => {
  const { type, props, ref, children, dynamicChildren, shapeFlag, patchFlag, dirs } = vnode

  // 1. 清除 ref
  if (ref != null) {
    setRef(ref, null, parentSuspense, vnode, true)
  }

  // 2. 指令 beforeUnmount
  const shouldInvokeDirs = shapeFlag & ShapeFlags.ELEMENT && dirs
  if (shouldInvokeDirs) {
    invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount')
  }

  // 3. 卸载子节点
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    unmountChildren(children as VNode[], parentComponent, parentSuspense)
  }

  // 4. 移除 DOM
  if (doRemove) {
    remove(vnode)
  }

  // 5. 指令 unmounted（异步）
  if (shouldInvokeDirs) {
    queuePostRenderEffect(() => {
      invokeDirectiveHook(vnode, null, parentComponent, 'unmounted')
    }, parentSuspense)
  }
}
```

## ref 清理

```typescript
if (ref != null) {
  setRef(ref, null, parentSuspense, vnode, true)
}
```

`setRef` 将 ref 设置为 null：

```typescript
function setRef(
  rawRef: VNodeNormalizedRef,
  oldRawRef: VNodeNormalizedRef | null,
  parentSuspense: SuspenseBoundary | null,
  vnode: VNode,
  isUnmount = false
) {
  // ...
  const value = isUnmount ? null : vnode.el
  // 设置 ref 值
  if (isFunction(ref)) {
    callWithErrorHandling(ref, owner, ErrorCodes.FUNCTION_REF, [value, refs])
  } else {
    ref.value = value
  }
}
```

## 指令生命周期

### beforeUnmount

```typescript
if (dirs) {
  invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount')
}
```

DOM 还存在时调用。

### unmounted

```typescript
queuePostRenderEffect(() => {
  invokeDirectiveHook(vnode, null, parentComponent, 'unmounted')
}, parentSuspense)
```

DOM 移除后异步调用。

### invokeDirectiveHook

```typescript
function invokeDirectiveHook(
  vnode: VNode,
  prevVNode: VNode | null,
  instance: ComponentInternalInstance | null,
  name: DirectiveHookName
) {
  const bindings = vnode.dirs!
  const oldBindings = prevVNode && prevVNode.dirs!
  
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i]
    if (oldBindings) {
      binding.oldValue = oldBindings[i].value
    }
    let hook = binding.dir[name] as DirectiveHook | undefined
    if (hook) {
      pauseTracking()
      callWithAsyncErrorHandling(
        hook,
        instance,
        ErrorCodes.DIRECTIVE_HOOK,
        [vnode.el, binding, vnode, prevVNode]
      )
      resetTracking()
    }
  }
}
```

## 子节点卸载

### 数组子节点

```typescript
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  unmountChildren(
    children as VNode[],
    parentComponent,
    parentSuspense,
    false,  // doRemove: 父已移除，子不需要
    false   // optimized
  )
}
```

### unmountChildren

```typescript
const unmountChildren: UnmountChildrenFn = (
  children,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimized = false,
  start = 0
) => {
  for (let i = start; i < children.length; i++) {
    unmount(children[i], parentComponent, parentSuspense, doRemove, optimized)
  }
}
```

## DOM 移除

### remove 函数

```typescript
const remove: RemoveFn = vnode => {
  const { type, el, anchor, transition } = vnode

  // Fragment 特殊处理
  if (type === Fragment) {
    removeFragment(el!, anchor!)
    return
  }

  // Static 特殊处理
  if (type === Static) {
    removeStaticNode(vnode)
    return
  }

  const performRemove = () => {
    hostRemove(el!)
    // Transition 回调
    if (transition && !transition.persisted && transition.afterLeave) {
      transition.afterLeave()
    }
  }

  // Transition 处理
  if (
    vnode.shapeFlag & ShapeFlags.ELEMENT &&
    transition &&
    !transition.persisted
  ) {
    const { leave, delayLeave } = transition
    const performLeave = () => leave(el!, performRemove)
    if (delayLeave) {
      delayLeave(el!, performRemove, performLeave)
    } else {
      performLeave()
    }
  } else {
    performRemove()
  }
}
```

### hostRemove

```typescript
function remove(child: Node) {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}
```

## Transition 离开动画

```typescript
if (transition && !transition.persisted) {
  const { leave, delayLeave } = transition
  
  const performLeave = () => {
    leave(el!, () => {
      // 动画完成后移除
      hostRemove(el!)
      transition.afterLeave?.()
    })
  }
  
  if (delayLeave) {
    // 延迟离开（如 out-in 模式）
    delayLeave(el!, performRemove, performLeave)
  } else {
    performLeave()
  }
}
```

## 事件监听器清理

事件监听器随 DOM 元素一起被清理：

```typescript
// 元素移除时，其上的事件监听器自动失效
parent.removeChild(el)
// el 上的 _vei（vue event invokers）随之失效
```

Vue 使用 invoker 模式，更新时只换 value：

```typescript
// 设置事件时
el._vei = { onClick: invoker }

// 元素移除后，invoker 不再被引用，会被 GC
```

## 属性清理

大多数属性不需要显式清理：

```typescript
// 这些随 DOM 移除自动清理
el.className = 'foo'
el.style.color = 'red'

// 但某些情况需要手动清理
// 如 v-model 的 compositionstart/end 监听
```

## VNode 钩子

```typescript
// beforeUnmount
if (props?.onVnodeBeforeUnmount) {
  invokeVNodeHook(vnodeHook, parentComponent, vnode)
}

// unmounted（异步）
if (props?.onVnodeUnmounted) {
  queuePostRenderEffect(() => {
    invokeVNodeHook(vnodeHook, parentComponent, vnode)
  }, parentSuspense)
}
```

## 边界情况

### 已分离的元素

```typescript
function remove(child: Node) {
  const parent = child.parentNode
  if (parent) {  // 检查是否还有父节点
    parent.removeChild(child)
  }
}
```

### 嵌套卸载

父元素卸载时，子元素不需要单独 removeChild：

```typescript
// 父元素
unmount(parentVNode, ..., true)  // doRemove = true

// 子元素（父已移除）
unmount(childVNode, ..., false)  // doRemove = false
```

## 小结

元素卸载涉及 ref 清理、指令钩子、子节点递归卸载、DOM 移除。Transition 元素需要等待离开动画完成。通过 doRemove 参数避免重复 DOM 操作。
