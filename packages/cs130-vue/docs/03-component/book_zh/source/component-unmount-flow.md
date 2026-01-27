# 组件卸载流程

当组件不再需要时，Vue 会执行卸载流程，清理 DOM、停止 effect、执行生命周期钩子。

## unmount 函数

```typescript
// renderer.ts
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

  // 清理 ref
  if (ref != null) {
    setRef(ref, null, parentSuspense, vnode, true)
  }

  // ⭐ KeepAlive 特殊处理
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    ;(parentComponent!.ctx as KeepAliveContext).deactivate(vnode)
    return
  }

  const shouldInvokeDirs = shapeFlag & ShapeFlags.ELEMENT && dirs
  const shouldInvokeVnodeHook = !isAsyncWrapper(vnode)

  let vnodeHook: VNodeHook | undefined | null
  
  // 执行 onVnodeBeforeUnmount
  if (
    shouldInvokeVnodeHook &&
    (vnodeHook = props && props.onVnodeBeforeUnmount)
  ) {
    invokeVNodeHook(vnodeHook, parentComponent, vnode)
  }

  // ⭐ 组件卸载
  if (shapeFlag & ShapeFlags.COMPONENT) {
    unmountComponent(vnode.component!, parentSuspense, doRemove)
  } else {
    // 其他类型的卸载...
    
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(
        children as VNode[],
        parentComponent,
        parentSuspense,
        doRemove,
        optimized
      )
    }

    if (doRemove) {
      remove(vnode)
    }
  }

  // 执行 onVnodeUnmounted
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

## unmountComponent 组件卸载

```typescript
const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: SuspenseBoundary | null,
  doRemove?: boolean
) => {
  if (__DEV__ && instance.type.__hmrId) {
    unregisterHMR(instance)
  }

  const { bum, scope, update, subTree, um } = instance

  // ⭐ 执行 onBeforeUnmount
  if (bum) {
    invokeArrayFns(bum)
  }

  // ⭐ 兼容 Vue 2 的 beforeDestroy
  if (
    __COMPAT__ &&
    isCompatEnabled(DeprecationTypes.INSTANCE_EVENT_HOOKS, instance)
  ) {
    instance.emit('hook:beforeDestroy')
  }

  // ⭐ 停止所有 effects
  scope.stop()

  // ⭐ 停止更新 effect
  if (update) {
    update.active = false
    unmount(subTree, instance, parentSuspense, doRemove)
  }

  // ⭐ 异步执行 onUnmounted
  if (um) {
    queuePostRenderEffect(um, parentSuspense)
  }

  // 兼容 Vue 2 的 destroyed
  if (
    __COMPAT__ &&
    isCompatEnabled(DeprecationTypes.INSTANCE_EVENT_HOOKS, instance)
  ) {
    queuePostRenderEffect(
      () => instance.emit('hook:destroyed'),
      parentSuspense
    )
  }

  // 设置卸载标记
  queuePostRenderEffect(() => {
    instance.isUnmounted = true
  }, parentSuspense)

  // Suspense 特殊处理
  if (
    __FEATURE_SUSPENSE__ &&
    parentSuspense &&
    parentSuspense.pendingBranch &&
    !parentSuspense.isUnmounted &&
    instance.asyncDep &&
    !instance.asyncResolved &&
    instance.suspenseId === parentSuspense.pendingId
  ) {
    parentSuspense.deps--
    if (parentSuspense.deps === 0) {
      parentSuspense.resolve()
    }
  }

  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentRemoved(instance)
  }
}
```

## scope.stop() 停止 effects

```typescript
// 停止组件作用域内的所有 effects
scope.stop()

// EffectScope 的 stop 方法
stop(fromParent?: boolean) {
  if (this.active) {
    let i, l
    for (i = 0, l = this.effects.length; i < l; i++) {
      this.effects[i].stop()
    }
    for (i = 0, l = this.cleanups.length; i < l; i++) {
      this.cleanups[i]()
    }
    if (this.scopes) {
      for (i = 0, l = this.scopes.length; i < l; i++) {
        this.scopes[i].stop(true)
      }
    }
    // ...
    this.active = false
  }
}
```

## update.active = false

```typescript
if (update) {
  // 标记更新函数失效
  update.active = false
  // 卸载子树
  unmount(subTree, instance, parentSuspense, doRemove)
}
```

## unmountChildren 递归卸载

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

## 生命周期执行顺序

```
父 onBeforeUnmount
  ↓
子 onBeforeUnmount
  ↓
子 scope.stop()
  ↓
子 unmount(subTree)
  ↓
子 onUnmounted (异步)
  ↓
父 scope.stop()
  ↓
父 unmount(subTree)
  ↓
父 onUnmounted (异步)
```

## remove 移除 DOM

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
    // 移除 transition 后处理
    if (transition && !transition.persisted && transition.afterLeave) {
      transition.afterLeave()
    }
  }

  if (
    vnode.shapeFlag & ShapeFlags.ELEMENT &&
    transition &&
    !transition.persisted
  ) {
    // 有 transition，执行离开动画
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

## 卸载时的清理

```typescript
// 清理 ref
if (ref != null) {
  setRef(ref, null, parentSuspense, vnode, true)
}

// 清理指令
if (shouldInvokeDirs) {
  invokeDirectiveHook(vnode, null, parentComponent, 'unmounted')
}
```

## 使用示例

### 清理资源

```html
<script setup>
import { onBeforeUnmount, onUnmounted } from 'vue'

let timer = null

onMounted(() => {
  timer = setInterval(() => {
    console.log('tick')
  }, 1000)
})

onBeforeUnmount(() => {
  // DOM 仍存在，可以访问
  console.log('Before unmount:', document.body.contains(el))
  
  // 清理定时器
  clearInterval(timer)
})

onUnmounted(() => {
  // DOM 已移除
  console.log('Unmounted, DOM removed')
})
</script>
```

### 条件渲染触发卸载

```html
<template>
  <Child v-if="show" />
  <button @click="show = !show">Toggle</button>
</template>
```

## 小结

组件卸载流程的核心要点：

1. **KeepAlive 处理**：deactivate 而非卸载
2. **onBeforeUnmount**：同步执行，DOM 仍存在
3. **scope.stop()**：停止所有 effects
4. **递归卸载**：卸载子组件和子节点
5. **onUnmounted**：异步执行，DOM 已移除
6. **isUnmounted**：标记卸载完成

下一章将分析边界情况处理。
