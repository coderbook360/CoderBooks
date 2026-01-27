# processElement 元素处理

`processElement` 处理普通 DOM 元素的挂载和更新。它是 patch 分发的目标函数之一。

## 函数签名

```typescript
const processElement = (
  n1: VNode | null,      // 旧 VNode
  n2: VNode,             // 新 VNode
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
const processElement = (
  n1,
  n2,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized
) => {
  // SVG 检测
  isSVG = isSVG || (n2.type as string) === 'svg'
  
  if (n1 == null) {
    // 挂载
    mountElement(
      n2,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  } else {
    // 更新
    patchElement(
      n1,
      n2,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  }
}
```

## 挂载：mountElement

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

  // 2. 处理子节点
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    hostSetElementText(el, vnode.children as string)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 数组子节点
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

  // 3. 处理指令 created 钩子
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
    // value 单独处理（需要在其他属性之后）
    if ('value' in props) {
      hostPatchProp(el, 'value', null, props.value)
    }
    // VNode 钩子
    if ((vnodeHook = props.onVnodeBeforeMount)) {
      invokeVNodeHook(vnodeHook, parentComponent, vnode)
    }
  }

  // 6. 处理指令 beforeMount 钩子
  if (dirs) {
    invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount')
  }

  // 7. 处理 Transition
  const needCallTransitionHooks =
    (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
    transition &&
    !transition.persisted
  if (needCallTransitionHooks) {
    transition!.beforeEnter(el)
  }

  // 8. 插入 DOM
  hostInsert(el, container, anchor)

  // 9. 后置钩子（需要 post queue）
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

## 更新：patchElement

```typescript
const patchElement = (
  n1: VNode,
  n2: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  const el = (n2.el = n1.el!)
  let { patchFlag, dynamicChildren, dirs } = n2
  patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS
  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ
  let vnodeHook: VNodeHook | undefined | null

  // 触发 onVnodeBeforeUpdate
  if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
    invokeVNodeHook(vnodeHook, parentComponent, n2, n1)
  }
  if (dirs) {
    invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate')
  }

  // 优化路径：根据 patchFlag 精确更新
  if (patchFlag > 0) {
    if (patchFlag & PatchFlags.FULL_PROPS) {
      // 完整 props diff
      patchProps(
        el,
        n2,
        oldProps,
        newProps,
        parentComponent,
        parentSuspense,
        isSVG
      )
    } else {
      // class 更新
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          hostPatchProp(el, 'class', null, newProps.class, isSVG)
        }
      }
      // style 更新
      if (patchFlag & PatchFlags.STYLE) {
        hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
      }
      // 动态 props 更新
      if (patchFlag & PatchFlags.PROPS) {
        const propsToUpdate = n2.dynamicProps!
        for (let i = 0; i < propsToUpdate.length; i++) {
          const key = propsToUpdate[i]
          const prev = oldProps[key]
          const next = newProps[key]
          if (next !== prev || key === 'value') {
            hostPatchProp(
              el, key, prev, next, isSVG,
              n1.children as VNode[], parentComponent,
              parentSuspense, unmountChildren
            )
          }
        }
      }
    }

    // 文本更新
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children as string)
      }
    }
  } else if (!optimized && dynamicChildren == null) {
    // 非优化模式：完整 diff props
    patchProps(
      el, n2, oldProps, newProps,
      parentComponent, parentSuspense, isSVG
    )
  }

  // 更新子节点
  if (dynamicChildren) {
    // Block 优化路径
    patchBlockChildren(
      n1.dynamicChildren!,
      dynamicChildren,
      el,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds
    )
  } else if (!optimized) {
    // 完整 children diff
    patchChildren(
      n1, n2, el, null,
      parentComponent, parentSuspense,
      isSVG, slotScopeIds, false
    )
  }

  // 后置钩子
  if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1)
      dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated')
    }, parentSuspense)
  }
}
```

## 关键步骤解析

### 1. 元素创建

```typescript
el = hostCreateElement(type, isSVG, props?.is, props)
```

- `type`：标签名如 'div'
- `isSVG`：是否在 SVG 上下文
- `props.is`：自定义元素

### 2. 子节点处理

根据 shapeFlag 区分：

```typescript
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  hostSetElementText(el, children)
} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  mountChildren(children, el, ...)
}
```

### 3. Props 设置

跳过保留 key：

```typescript
const isReservedProp = (key: string) => 
  key === 'key' || key === 'ref' || 
  key.startsWith('onVnode')
```

value 最后设置（确保其他属性已就绪）。

### 4. 优化更新

patchFlag 精确指导更新：

```typescript
if (patchFlag & PatchFlags.CLASS) {
  // 只比较 class
}
if (patchFlag & PatchFlags.STYLE) {
  // 只比较 style  
}
if (patchFlag & PatchFlags.PROPS) {
  // 只比较 dynamicProps 列表中的属性
}
```

### 5. Block 子节点

有 dynamicChildren 时使用 Block 优化：

```typescript
if (dynamicChildren) {
  patchBlockChildren(n1.dynamicChildren, dynamicChildren, ...)
}
```

只 patch 动态节点，静态跳过。

## SVG 处理

SVG 需要特殊命名空间：

```typescript
isSVG = isSVG || n2.type === 'svg'

// foreignObject 内部恢复 HTML
if (isSVG && type !== 'foreignObject') {
  mountChildren(..., true)
}
```

## 生命周期

挂载：
1. created（指令）
2. beforeMount（指令 + VNode 钩子）
3. 插入 DOM
4. mounted（指令 + VNode 钩子 + Transition.enter）

更新：
1. beforeUpdate（指令 + VNode 钩子）
2. 更新 DOM
3. updated（指令 + VNode 钩子）

## 小结

`processElement` 是元素处理的入口，分为挂载和更新两条路径。挂载按创建元素、设置子节点、设置属性、插入 DOM 的顺序执行。更新利用 patchFlag 进行精确更新，结合 Block 优化减少不必要的 diff。
