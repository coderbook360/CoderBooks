# invokeLifecycle 生命周期调用

注册的生命周期钩子需要在正确的时机被调用。`invokeArrayFns` 和相关函数负责执行这些钩子。

## 钩子调用的时机

```
setupComponent
  ↓
setupRenderEffect
  ↓
componentUpdateFn:
  首次渲染:
    beforeMount hooks → patch → mounted hooks
  更新:
    beforeUpdate hooks → patch → updated hooks
  ↓
unmountComponent:
  beforeUnmount hooks → 卸载 → unmounted hooks
```

## invokeArrayFns

基础的数组函数调用：

```typescript
export const invokeArrayFns = (fns: Function[], arg?: any) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}
```

简单遍历执行所有函数。

## 挂载时的钩子调用

在 `componentUpdateFn` 中：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    // 首次挂载
    
    // beforeMount
    if (bm) {
      invokeArrayFns(bm)
    }
    
    // 渲染和挂载
    const subTree = (instance.subTree = renderComponentRoot(instance))
    patch(null, subTree, container, ...)
    
    // mounted
    if (m) {
      queuePostRenderEffect(m, parentSuspense)
    }
    
    instance.isMounted = true
  } else {
    // 更新逻辑...
  }
}
```

## beforeMount

同步调用：

```typescript
if (bm) {
  invokeArrayFns(bm)
}
```

在渲染之前立即执行。

## mounted

异步调用：

```typescript
if (m) {
  queuePostRenderEffect(m, parentSuspense)
}
```

放入后置队列，DOM 更新后执行。

## queuePostRenderEffect

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb

export function queuePostFlushCb(cb: SchedulerJobs) {
  if (!isArray(cb)) {
    if (!activePostFlushCbs || !activePostFlushCbs.includes(cb)) {
      pendingPostFlushCbs.push(cb)
    }
  } else {
    pendingPostFlushCbs.push(...cb)
  }
  queueFlush()
}
```

钩子被添加到后置队列。

## 更新时的钩子

```typescript
if (!instance.isMounted) {
  // 挂载...
} else {
  // 更新
  
  // beforeUpdate
  if (bu) {
    invokeArrayFns(bu)
  }
  
  // 渲染新树
  const nextTree = renderComponentRoot(instance)
  const prevTree = instance.subTree
  instance.subTree = nextTree
  
  // patch
  patch(prevTree, nextTree, ...)
  
  // updated
  if (u) {
    queuePostRenderEffect(u, parentSuspense)
  }
}
```

## beforeUpdate

同步执行：

```typescript
if (bu) {
  invokeArrayFns(bu)
}
```

在组件重新渲染前调用。

## updated

异步执行：

```typescript
if (u) {
  queuePostRenderEffect(u, parentSuspense)
}
```

DOM 更新后调用。

## 卸载时的钩子

在 `unmountComponent` 中：

```typescript
const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: SuspenseBoundary | null,
  doRemove?: boolean
) => {
  const { bum, scope, update, subTree, um } = instance
  
  // beforeUnmount
  if (bum) {
    invokeArrayFns(bum)
  }
  
  // 停止响应式 effect
  scope.stop()
  
  // 停止更新
  if (update) {
    update.active = false
    unmount(subTree, instance, parentSuspense, doRemove)
  }
  
  // unmounted
  if (um) {
    queuePostRenderEffect(um, parentSuspense)
  }
  
  // 标记已卸载
  queuePostRenderEffect(() => {
    instance.isUnmounted = true
  }, parentSuspense)
}
```

## beforeUnmount

同步执行：

```typescript
if (bum) {
  invokeArrayFns(bum)
}
```

在开始卸载前调用。

## unmounted

异步执行：

```typescript
if (um) {
  queuePostRenderEffect(um, parentSuspense)
}
```

卸载完成后调用。

## 父子组件的执行顺序

挂载顺序：

```
Parent beforeMount
  Child beforeMount
  Child mounted
Parent mounted
```

因为 `mounted` 是后置队列，子组件先完成。

卸载顺序：

```
Parent beforeUnmount
  Child beforeUnmount
  Child unmounted
Parent unmounted
```

## Suspense 处理

有 Suspense 时使用特殊处理：

```typescript
export const queuePostRenderEffect = __FEATURE_SUSPENSE__
  ? queueEffectWithSuspense
  : queuePostFlushCb
```

```typescript
function queueEffectWithSuspense(
  fn: Function | Function[],
  suspense: SuspenseBoundary | null
): void {
  if (suspense && suspense.pendingBranch) {
    if (isArray(fn)) {
      suspense.effects.push(...fn)
    } else {
      suspense.effects.push(fn)
    }
  } else {
    queuePostFlushCb(fn)
  }
}
```

Suspense 等待中时，钩子暂存。

## activated / deactivated

KeepAlive 组件的特殊钩子：

```typescript
// 激活
if (a) {
  queuePostRenderEffect(a, parentSuspense)
}

// 停用
if (da) {
  queuePostRenderEffect(da, parentSuspense)
}
```

## VNode 钩子

VNode 也可以有生命周期钩子：

```javascript
h('div', {
  onVnodeMounted: (vnode) => { /* ... */ }
})
```

处理逻辑：

```typescript
const { onVnodeMounted } = props
if (onVnodeMounted) {
  queuePostRenderEffect(() => invokeVNodeHook(onVnodeMounted, parent, vnode), parentSuspense)
}
```

## invokeVNodeHook

```typescript
export function invokeVNodeHook(
  hook: VNodeHook,
  instance: ComponentInternalInstance | null,
  vnode: VNode,
  prevVNode: VNode | null = null
) {
  callWithAsyncErrorHandling(hook, instance, ErrorCodes.VNODE_HOOK, [
    vnode,
    prevVNode
  ])
}
```

## 调试钩子

renderTracked 和 renderTriggered：

```typescript
if (instance.rtg) {
  invokeArrayFns(instance.rtg, event)
}

if (instance.rtc) {
  invokeArrayFns(instance.rtc, event)
}
```

在响应式追踪时调用。

## 错误钩子

errorCaptured 在错误处理链中调用：

```typescript
// handleError 中
const errorCapturedHooks = cur.ec
if (errorCapturedHooks) {
  for (let i = 0; i < errorCapturedHooks.length; i++) {
    if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
      return
    }
  }
}
```

## serverPrefetch

SSR 专用钩子：

```typescript
if (sp) {
  // 等待所有 serverPrefetch 完成
  await Promise.all(
    sp.map(hook => hook.call(publicThis, publicThis))
  )
}
```

## 钩子执行的保证

1. **beforeMount/beforeUpdate**：同步执行，在 DOM 操作前
2. **mounted/updated/unmounted**：异步执行，在 DOM 操作后
3. **错误隔离**：一个钩子失败不影响其他钩子
4. **顺序保证**：按注册顺序执行

## 性能考虑

避免在钩子中做重计算：

```javascript
// 不好
onMounted(() => {
  heavyComputation()  // 阻塞渲染
})

// 好
onMounted(() => {
  setTimeout(() => {
    heavyComputation()  // 下一个宏任务
  }, 0)
})
```

## 小结

生命周期钩子的调用：

1. **before* 钩子**：同步调用，在操作前
2. ***ed 钩子**：异步调用，放入后置队列
3. **统一入口**：`invokeArrayFns` 遍历执行
4. **错误处理**：通过 `callWithAsyncErrorHandling`

调度机制确保钩子在正确的时机、正确的顺序执行。

下一章将详细分析挂载相关的钩子。
