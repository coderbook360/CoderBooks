# baseCreateRenderer 核心实现

`baseCreateRenderer` 是 Vue 3 渲染器的核心，包含了所有渲染逻辑。这个函数约有 2000 行代码，定义了 `patch`、`mount`、`update`、`unmount` 等关键流程。

## 函数签名

```typescript
function baseCreateRenderer(
  options: RendererOptions,
  createHydrationFns?: typeof createHydrationFunctions
): Renderer<any> | HydrationRenderer
```

第二个参数用于 SSR 水合场景，普通渲染时不传。

## 整体结构

```typescript
function baseCreateRenderer(options, createHydrationFns) {
  // 1. 解构平台操作
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    // ...
  } = options
  
  // 2. 定义内部函数
  const patch = (n1, n2, container, anchor, ...) => { /* ... */ }
  const processElement = (n1, n2, container, anchor, ...) => { /* ... */ }
  const mountElement = (vnode, container, anchor, ...) => { /* ... */ }
  const patchElement = (n1, n2, ...) => { /* ... */ }
  const patchChildren = (n1, n2, container, anchor, ...) => { /* ... */ }
  const patchKeyedChildren = (c1, c2, container, ...) => { /* ... */ }
  const processComponent = (n1, n2, container, anchor, ...) => { /* ... */ }
  const mountComponent = (vnode, container, anchor, ...) => { /* ... */ }
  const updateComponent = (n1, n2, ...) => { /* ... */ }
  const unmount = (vnode, parentComponent, parentSuspense, doRemove) => { /* ... */ }
  // ... 更多函数
  
  // 3. 定义 render 函数
  const render = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null, null, true)
      }
    } else {
      patch(container._vnode || null, vnode, container)
    }
    container._vnode = vnode
  }
  
  // 4. 返回渲染器
  return {
    render,
    createApp: createAppAPI(render)
  }
}
```

## 关键函数一览

**patch**：核心分发器，根据 VNode 类型调用对应处理函数。

**processElement / processComponent / processText / processComment / processFragment**：处理各类型 VNode。

**mountElement / mountComponent**：首次渲染挂载。

**patchElement / updateComponent**：更新已存在的节点。

**patchChildren / patchKeyedChildren / patchUnkeyedChildren**：子节点 Diff。

**unmount / unmountComponent / unmountChildren**：卸载节点。

**move**：移动节点位置。

## 闭包设计

所有函数定义在 `baseCreateRenderer` 内部，形成闭包。这样做的好处：

1. **访问平台操作**：所有函数都能访问 `hostInsert`、`hostRemove` 等
2. **相互调用**：函数间可以直接调用，无需传递引用
3. **隔离状态**：每个渲染器实例有独立的作用域

```typescript
function baseCreateRenderer(options) {
  const { insert: hostInsert, /* ... */ } = options
  
  // mountElement 可以直接使用 hostInsert
  const mountElement = (vnode, container, anchor) => {
    const el = hostCreateElement(vnode.type)
    hostInsert(el, container, anchor)
  }
  
  // patch 可以直接调用 mountElement
  const patch = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor)
    }
  }
}
```

## internals 对象

内置组件（Teleport、Suspense、KeepAlive）需要调用渲染器内部函数。通过 `internals` 对象传递：

```typescript
const internals = {
  p: patch,
  um: unmount,
  m: move,
  r: remove,
  mt: mountComponent,
  mc: mountChildren,
  pc: patchChildren,
  pbc: patchBlockChildren,
  n: getNextHostNode,
  o: options  // 平台操作
}
```

内置组件的 `process` 方法接收这个对象：

```typescript
// Teleport 组件
process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals) {
  const { mc: mountChildren, pc: patchChildren, /* ... */ } = internals
  // 使用这些方法
}
```

## 优化参数

很多函数接收 `optimized` 参数，表示是否启用编译优化：

```typescript
const patch = (
  n1,
  n2,
  container,
  anchor = null,
  parentComponent = null,
  parentSuspense = null,
  isSVG = false,
  slotScopeIds = null,
  optimized = false  // 是否使用优化路径
) => {
  // ...
}
```

开启优化时：
- 使用 `dynamicChildren` 替代完整子节点 Diff
- 根据 `patchFlag` 选择性更新属性
- 跳过静态节点

## SVG 处理

SVG 元素需要使用 `createElementNS`，通过 `isSVG` 参数传递：

```typescript
const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG) => {
  // 继承 SVG 上下文，或者检查当前元素是否是 svg
  isSVG = isSVG || vnode.type === 'svg'
  
  const el = hostCreateElement(vnode.type, isSVG, /* ... */)
  
  // 递归时传递 isSVG
  mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG, /* ... */)
}
```

## Suspense 边界

Suspense 会创建边界，子组件需要知道所在的 Suspense：

```typescript
const patch = (n1, n2, container, anchor, parentComponent, parentSuspense, /* ... */) => {
  // parentSuspense 向下传递
  processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, /* ... */)
}
```

异步组件 setup 时会通知 Suspense 增加计数。

## 作用域 ID

Scoped CSS 通过作用域 ID 实现，需要在渲染时应用：

```typescript
const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds) => {
  const el = hostCreateElement(vnode.type, isSVG)
  
  // 应用作用域 ID
  if (slotScopeIds) {
    for (const id of slotScopeIds) {
      hostSetScopeId(el, id)
    }
  }
  
  // 子节点继承
  mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG, slotScopeIds)
}
```

## 关键代码路径

**挂载元素**：

```
patch(null, vnode)
  → processElement(null, vnode)
    → mountElement(vnode)
      → hostCreateElement()
      → mountChildren()
      → hostInsert()
```

**更新元素**：

```
patch(oldVNode, newVNode)
  → processElement(oldVNode, newVNode)
    → patchElement(oldVNode, newVNode)
      → patchProps()
      → patchChildren() / patchBlockChildren()
```

**挂载组件**：

```
patch(null, componentVNode)
  → processComponent(null, componentVNode)
    → mountComponent(componentVNode)
      → createComponentInstance()
      → setupComponent()
      → setupRenderEffect()
        → effect.run()
          → patch(null, subTree)
```

## 错误处理

渲染过程中的错误通过 `callWithErrorHandling` 包装：

```typescript
const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => {
  const componentUpdateFn = () => {
    // 渲染逻辑
  }
  
  // 包装错误处理
  const effect = new ReactiveEffect(componentUpdateFn, () => {
    queueJob(instance.update)
  })
  
  instance.update = effect.run.bind(effect)
  instance.update()
}
```

生命周期钩子调用也有错误处理：

```typescript
function callHook(hook, instance) {
  callWithErrorHandling(hook, instance, ErrorCodes.LIFECYCLE_HOOK)
}
```

## 小结

`baseCreateRenderer` 通过闭包组织了整个渲染器的逻辑。理解它的结构和关键函数，是深入源码的基础。后续章节将逐一分析各个函数的具体实现。
