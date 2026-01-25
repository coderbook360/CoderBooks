# mountElement 元素挂载

`mountElement` 负责创建 DOM 元素并挂载到容器中。这是元素首次渲染的核心流程。

## 函数签名

```typescript
const mountElement = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => { ... }
```

## 实现

```typescript
const mountElement = (
  vnode,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized
) => {
  let el: RendererElement
  let vnodeHook: VNodeHook | undefined | null
  const { type, props, shapeFlag, transition, dirs } = vnode

  // 1. 创建元素
  el = vnode.el = hostCreateElement(
    type as string,
    isSVG,
    props && props.is,
    props
  )

  // 2. 处理子节点（先于 props，因为某些 props 依赖子节点）
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    hostSetElementText(el, vnode.children as string)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(
      vnode.children as VNodeArrayChildren,
      el,
      null,
      parentComponent,
      parentSuspense,
      isSVG && type !== 'foreignObject',
      slotScopeIds,
      optimized
    )
  }

  // 3. 指令 created 钩子
  if (dirs) {
    invokeDirectiveHook(vnode, null, parentComponent, 'created')
  }

  // 4. 设置 scopeId
  setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent)

  // 5. 处理 props
  if (props) {
    for (const key in props) {
      if (key !== 'value' && !isReservedProp(key)) {
        hostPatchProp(
          el,
          key,
          null,
          props[key],
          isSVG,
          vnode.children as VNode[],
          parentComponent,
          parentSuspense,
          unmountChildren
        )
      }
    }
    // value 最后设置
    if ('value' in props) {
      hostPatchProp(el, 'value', null, props.value)
    }
    // VNode 钩子
    if ((vnodeHook = props.onVnodeBeforeMount)) {
      invokeVNodeHook(vnodeHook, parentComponent, vnode)
    }
  }

  // 6. 指令 beforeMount 钩子
  if (dirs) {
    invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount')
  }

  // 7. Transition beforeEnter
  const needCallTransitionHooks =
    (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
    transition &&
    !transition.persisted
  if (needCallTransitionHooks) {
    transition!.beforeEnter(el)
  }

  // 8. 插入 DOM
  hostInsert(el, container, anchor)

  // 9. 后置回调
  if (
    (vnodeHook = props && props.onVnodeMounted) ||
    needCallTransitionHooks ||
    dirs
  ) {
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode)
      needCallTransitionHooks && transition!.enter(el)
      dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted')
    }, parentSuspense)
  }
}
```

## 步骤详解

### 1. 创建元素

```typescript
el = vnode.el = hostCreateElement(type, isSVG, props?.is, props)
```

`hostCreateElement` 的 DOM 实现：

```typescript
function createElement(
  tag: string,
  isSVG?: boolean,
  is?: string,
  props?: Record<string, any>
): Element {
  const el = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag, is ? { is } : undefined)
  
  // 处理 select 的 multiple
  if (tag === 'select' && props && props.multiple != null) {
    (el as HTMLSelectElement).setAttribute('multiple', props.multiple)
  }
  
  return el
}
```

### 2. 处理子节点

子节点先于 props 处理，因为某些 props（如 option 的 value）依赖子节点：

```typescript
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  // 文本子节点：直接设置 textContent
  hostSetElementText(el, children)
} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  // 数组子节点：递归挂载
  mountChildren(children, el, null, ...)
}
```

### 3. 设置 props

遍历 props 对象，调用 `hostPatchProp`：

```typescript
for (const key in props) {
  if (key !== 'value' && !isReservedProp(key)) {
    hostPatchProp(el, key, null, props[key], ...)
  }
}
```

保留属性不处理：

```typescript
const isReservedProp = (key: string) =>
  key === 'key' ||
  key === 'ref' ||
  key.startsWith('onVnode')
```

### 4. value 最后设置

value 需要在其他属性之后：

```typescript
if ('value' in props) {
  hostPatchProp(el, 'value', null, props.value)
}
```

对于 `<input>`、`<select>`、`<textarea>`，value 依赖其他属性（如 type、multiple）。

### 5. scopeId

Scoped CSS 的标识：

```typescript
function setScopeId(
  el: RendererElement,
  vnode: VNode,
  scopeId: string | null,
  slotScopeIds: string[] | null,
  parentComponent: ComponentInternalInstance | null
) {
  if (scopeId) {
    hostSetScopeId(el, scopeId)
  }
  if (slotScopeIds) {
    for (let i = 0; i < slotScopeIds.length; i++) {
      hostSetScopeId(el, slotScopeIds[i])
    }
  }
  // 父组件的 slotScopeId
  if (parentComponent) {
    const treeOwnerId = parentComponent.type.__scopeId
    if (treeOwnerId && treeOwnerId !== scopeId) {
      hostSetScopeId(el, treeOwnerId + '-s')
    }
  }
}
```

### 6. 插入 DOM

```typescript
hostInsert(el, container, anchor)
```

实现：

```typescript
function insert(child: Node, parent: Element, anchor: Node | null) {
  parent.insertBefore(child, anchor)
}
```

anchor 为 null 时等同于 appendChild。

## 生命周期顺序

1. **created**（指令）
2. **beforeMount**（指令 + onVnodeBeforeMount）
3. **插入 DOM**
4. **mounted**（指令 + onVnodeMounted + Transition.enter）

mounted 在 post queue 中执行，确保 DOM 已完成。

## Transition 处理

```typescript
const needCallTransitionHooks = transition && !transition.persisted

if (needCallTransitionHooks) {
  // 插入前
  transition.beforeEnter(el)
}

hostInsert(el, container, anchor)

if (needCallTransitionHooks) {
  // 插入后（异步）
  queuePostRenderEffect(() => {
    transition.enter(el)
  })
}
```

## SVG 处理

```typescript
isSVG && type !== 'foreignObject'
```

foreignObject 内部是 HTML 上下文，不是 SVG。

## 性能考虑

### 批量属性设置

props 循环设置，每个都是 DOM 操作：

```typescript
for (const key in props) {
  hostPatchProp(el, key, null, props[key], ...)
}
```

这是必要的开销，无法避免。

### 子节点先于插入

元素在内存中构建完整后才插入 DOM：

```typescript
// 1. 创建元素
el = hostCreateElement(type)

// 2. 设置子节点（还在内存中）
mountChildren(children, el, ...)

// 3. 设置属性（还在内存中）
hostPatchProp(...)

// 4. 最后插入（触发一次重排）
hostInsert(el, container, anchor)
```

这减少了重排次数。

## 小结

`mountElement` 是元素挂载的核心，按创建元素、设置子节点、设置属性、插入 DOM 的顺序执行。它处理 SVG、scopeId、指令钩子、Transition 等复杂场景，是 Vue 渲染器的基础功能。
