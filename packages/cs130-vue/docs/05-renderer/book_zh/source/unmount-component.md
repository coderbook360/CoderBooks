# unmountComponent 组件卸载

`unmountComponent` 处理组件的卸载，包括停止响应式副作用、触发生命周期钩子、卸载子树。

## 函数签名

```typescript
const unmountComponent = (
  instance: ComponentInternalInstance,
  parentSuspense: SuspenseBoundary | null,
  doRemove?: boolean
) => { ... }
```

## 实现

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

  // 1. beforeUnmount 钩子
  if (bum) {
    invokeArrayFns(bum)
  }

  // 2. 停止组件的响应式作用域
  scope.stop()

  // 3. 停止更新副作用
  if (update) {
    update.active = false
    // 卸载子树
    unmount(subTree, instance, parentSuspense, doRemove)
  }

  // 4. unmounted 钩子（异步）
  if (um) {
    queuePostRenderEffect(um, parentSuspense)
  }

  // 5. 标记已卸载
  queuePostRenderEffect(() => {
    instance.isUnmounted = true
  }, parentSuspense)

  // 6. Suspense 处理
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
}
```

## 卸载步骤

### 1. beforeUnmount 钩子

```typescript
if (bum) {
  invokeArrayFns(bum)
}
```

`bum` 是 beforeUnmount 钩子数组（可能有多个通过 mixins 等添加）：

```typescript
// 组件内
onBeforeUnmount(() => {
  console.log('cleaning up...')
})
```

### 2. 停止响应式作用域

```typescript
scope.stop()
```

EffectScope 收集了组件内的所有响应式副作用：

```typescript
// 组件的 scope 包含：
// - setup 中的 watch
// - setup 中的 watchEffect
// - setup 中创建的 computed
// - 子 scope

scope.stop()
// 停止所有副作用，防止内存泄漏
```

### 3. 停止更新副作用

```typescript
if (update) {
  update.active = false
  unmount(subTree, instance, parentSuspense, doRemove)
}
```

- `update.active = false`：标记副作用为非活跃，防止后续触发
- 卸载 subTree：递归卸载组件渲染的内容

### 4. unmounted 钩子

```typescript
if (um) {
  queuePostRenderEffect(um, parentSuspense)
}
```

异步执行，确保 DOM 已移除：

```typescript
// 组件内
onUnmounted(() => {
  console.log('component unmounted')
})
```

### 5. 标记已卸载

```typescript
queuePostRenderEffect(() => {
  instance.isUnmounted = true
}, parentSuspense)
```

用于防止卸载后的操作。

### 6. Suspense 依赖计数

```typescript
if (
  parentSuspense &&
  instance.asyncDep &&
  !instance.asyncResolved
) {
  parentSuspense.deps--
  if (parentSuspense.deps === 0) {
    parentSuspense.resolve()
  }
}
```

异步组件卸载时更新 Suspense 的依赖计数。

## 生命周期顺序

```
beforeUnmount (同步)
    ↓
scope.stop() (停止响应式)
    ↓
update.active = false
    ↓
unmount(subTree) (卸载子树)
    ↓
unmounted (异步)
    ↓
isUnmounted = true (异步)
```

## 父子组件卸载顺序

```
Parent beforeUnmount
    ↓
Child1 beforeUnmount
Child1 unmount subTree
    ↓
Child2 beforeUnmount
Child2 unmount subTree
    ↓
Parent unmount subTree
    ↓
Child1 unmounted
Child2 unmounted
    ↓
Parent unmounted
```

beforeUnmount 是父先子后，unmounted 是子先父后。

## 内存清理

### EffectScope

```typescript
scope.stop()
```

停止所有副作用，释放订阅关系。

### 组件引用

```typescript
instance.isUnmounted = true
```

后续代码可以检查这个标记避免操作已卸载的组件。

### 定时器/事件

需要在 beforeUnmount 或 unmounted 中手动清理：

```typescript
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('resize', handler)
})
```

## 异步组件处理

```typescript
if (instance.asyncDep && !instance.asyncResolved) {
  // 异步组件还在加载中就被卸载
  parentSuspense.deps--
}
```

## HMR 处理

```typescript
if (__DEV__ && instance.type.__hmrId) {
  unregisterHMR(instance)
}
```

开发模式下取消热更新注册。

## 与 KeepAlive 的交互

KeepAlive 缓存的组件不走 unmountComponent：

```typescript
// unmount 中
if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
  parentComponent.ctx.deactivate(vnode)
  return  // 不调用 unmountComponent
}
```

走 deactivate 而非 unmount。

## 小结

`unmountComponent` 处理组件的完整卸载流程：beforeUnmount 钩子、停止响应式作用域、停止更新副作用、卸载子树、unmounted 钩子。它确保组件的所有资源正确清理，防止内存泄漏。
