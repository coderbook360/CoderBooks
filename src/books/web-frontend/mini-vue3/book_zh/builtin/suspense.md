# Suspense 组件实现

异步组件加载时如何显示 Loading 状态？多个异步依赖如何统一管理？**Suspense 提供了声明式的解决方案。**

**Suspense 是 Vue 3 处理异步依赖的重要能力。** 本章将深入分析 Suspense 的实现原理。

## 基本用法

```vue
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  
  <template #fallback>
    <Loading />
  </template>
</Suspense>
```

工作流程：
1. 尝试渲染 default 插槽
2. 遇到异步依赖，显示 fallback
3. 所有异步依赖完成，切换回 default

## 异步依赖的来源

### 异步组件

```javascript
const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
)
```

### async setup

```javascript
export default {
  async setup() {
    const data = await fetchData()
    return { data }
  }
}
```

### 顶层 await

```vue
<script setup>
const data = await fetchData()
</script>
```

## Suspense 组件定义

```javascript
const SuspenseImpl = {
  name: 'Suspense',
  __isSuspense: true,
  
  process(n1, n2, container, anchor, parentComponent, parentSuspense,
          isSVG, slotScopeIds, optimized, rendererInternals) {
    if (n1 == null) {
      mountSuspense(n2, container, anchor, parentComponent, parentSuspense,
                    isSVG, slotScopeIds, optimized, rendererInternals)
    } else {
      patchSuspense(n1, n2, container, anchor, parentComponent,
                    isSVG, slotScopeIds, optimized, rendererInternals)
    }
  },
  
  hydrate: hydrateSuspense,
  create: createSuspenseBoundary
}
```

Suspense 不是普通组件，有自己的 `process` 方法。

## Suspense 边界

```javascript
function createSuspenseBoundary(vnode, parent, parentComponent, container,
                                 hiddenContainer, anchor, isSVG, slotScopeIds,
                                 optimized, rendererInternals) {
  const suspense = {
    vnode,
    parent,
    parentComponent,
    container,
    hiddenContainer,
    anchor,
    isSVG,
    slotScopeIds,
    optimized,
    
    // 状态
    deps: 0,                // 待完成的异步依赖数
    pendingId: 0,           // 用于取消过期的操作
    timeout: vnode.props?.timeout,
    
    // 插槽内容
    activeBranch: null,     // 当前显示的分支
    pendingBranch: null,    // 等待中的分支
    isInFallback: true,     // 是否显示 fallback
    isResolved: false,      // 是否已解析完成
    isUnmounted: false,
    effects: [],
    
    // 方法
    resolve,
    fallback,
    move,
    next,
    registerDep,
    unmount
  }
  
  return suspense
}
```

## 挂载 Suspense

```javascript
function mountSuspense(vnode, container, anchor, parentComponent, parentSuspense,
                        isSVG, slotScopeIds, optimized, rendererInternals) {
  const { patch, createElement } = rendererInternals
  
  // 创建隐藏容器
  const hiddenContainer = createElement('div')
  
  // 创建 Suspense 边界
  const suspense = vnode.suspense = createSuspenseBoundary(
    vnode,
    parentSuspense,
    parentComponent,
    container,
    hiddenContainer,
    anchor,
    isSVG,
    slotScopeIds,
    optimized,
    rendererInternals
  )
  
  // 先渲染 default 内容到隐藏容器
  patch(
    null,
    suspense.pendingBranch = vnode.ssContent,
    hiddenContainer,
    null,
    parentComponent,
    suspense,  // 传递 suspense 边界
    isSVG,
    slotScopeIds
  )
  
  // 检查是否有异步依赖
  if (suspense.deps > 0) {
    // 有异步依赖，渲染 fallback
    patch(
      null,
      vnode.ssFallback,
      container,
      anchor,
      parentComponent,
      null,
      isSVG,
      slotScopeIds
    )
    setActiveBranch(suspense, vnode.ssFallback)
  } else {
    // 无异步依赖，直接解析
    suspense.resolve()
  }
}
```

## 注册异步依赖

当异步组件或 async setup 执行时，会注册依赖：

```javascript
function registerDep(instance, setupResult) {
  const suspense = instance.suspense
  
  // 增加依赖计数
  suspense.deps++
  
  const hydratedEl = instance.vnode.el
  
  setupResult
    .then(resolved => {
      // 检查是否已取消
      if (instance.isUnmounted || suspense.isUnmounted) {
        return
      }
      
      // 设置 setup 结果
      instance.asyncResolved = true
      handleSetupResult(instance, resolved)
      
      // 减少依赖计数
      suspense.deps--
      
      // 所有依赖完成
      if (suspense.deps === 0) {
        suspense.resolve()
      }
    })
    .catch(err => {
      handleError(err, instance, 'async setup')
    })
}
```

## 解析 Suspense

当所有异步依赖完成时：

```javascript
function resolve(suspense) {
  const { vnode, activeBranch, pendingBranch, container, anchor,
          isSVG, slotScopeIds, optimized, effects } = suspense
  
  // 移除 fallback
  if (activeBranch) {
    unmount(activeBranch, null, suspense, true)
  }
  
  // 移动 default 内容从隐藏容器到实际容器
  move(pendingBranch, container, anchor, MoveType.ENTER)
  
  // 设置激活分支
  setActiveBranch(suspense, pendingBranch)
  suspense.pendingBranch = null
  suspense.isResolved = true
  
  // 执行延迟的 effects
  if (effects.length) {
    queuePostFlushCb(effects)
  }
}
```

## fallback 切换

```javascript
function fallback(suspense, fallbackVNode) {
  const { container, anchor, isSVG, slotScopeIds, optimized, vnode } = suspense
  
  // 卸载当前激活分支
  if (suspense.activeBranch) {
    unmount(suspense.activeBranch, null, suspense, true)
  }
  
  // 渲染 fallback
  patch(
    null,
    fallbackVNode,
    container,
    anchor,
    suspense.parentComponent,
    null,
    isSVG,
    slotScopeIds
  )
  
  setActiveBranch(suspense, fallbackVNode)
}
```

## 超时处理

```vue
<Suspense :timeout="3000">
  <AsyncComponent />
  
  <template #fallback>
    <Loading />
  </template>
</Suspense>
```

超时后会触发 `onTimeout` 事件：

```javascript
if (timeout > 0) {
  setTimeout(() => {
    if (!suspense.isResolved && !suspense.isUnmounted) {
      // 触发超时事件
      const onTimeout = vnode.props?.onTimeout
      onTimeout?.()
    }
  }, timeout)
}
```

## 嵌套 Suspense

```vue
<Suspense>
  <template #default>
    <OuterAsync>
      <Suspense>
        <template #default>
          <InnerAsync />
        </template>
        <template #fallback>
          <InnerLoading />
        </template>
      </Suspense>
    </OuterAsync>
  </template>
  
  <template #fallback>
    <OuterLoading />
  </template>
</Suspense>
```

每个 Suspense 独立管理自己的异步依赖：
1. 外层 Suspense 等待 OuterAsync
2. 内层 Suspense 等待 InnerAsync
3. 它们的 fallback 独立显示

## 事件

```vue
<Suspense
  @resolve="onResolve"
  @pending="onPending"
  @fallback="onFallback"
>
```

- `pending`：开始等待异步依赖
- `fallback`：切换到 fallback 内容
- `resolve`：所有依赖完成，显示 default

## 与 Transition 配合

```vue
<Transition>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</Transition>
```

Transition 会在 Suspense 状态切换时应用过渡效果。

## 本章小结

本章分析了 Suspense 的实现：

- **异步依赖**：异步组件、async setup、顶层 await
- **Suspense 边界**：管理异步依赖的计数和状态
- **注册机制**：`registerDep` 收集异步依赖
- **解析流程**：所有依赖完成后切换到 default
- **fallback**：等待期间显示的后备内容
- **超时处理**：支持超时事件

Suspense 提供了声明式的异步处理能力，是构建大型应用的重要工具。

下一章，我们将分析 Fragment 的实现。
