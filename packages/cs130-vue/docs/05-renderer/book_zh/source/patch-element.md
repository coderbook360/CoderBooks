# patchElement 元素更新

`patchElement` 处理元素的更新，包括 props 更新和子节点更新。它利用 patchFlag 进行精确优化。

## 函数签名

```typescript
const patchElement = (
  n1: VNode,
  n2: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => { ... }
```

## 实现

```typescript
const patchElement = (
  n1,
  n2,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized
) => {
  // 复用 DOM 元素
  const el = (n2.el = n1.el!)
  
  let { patchFlag, dynamicChildren, dirs } = n2
  // 合并旧节点的 FULL_PROPS 标记
  patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS
  
  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ
  let vnodeHook: VNodeHook | undefined | null

  // 禁用 Block 追踪
  parentComponent && toggleRecurse(parentComponent, false)

  // beforeUpdate 钩子
  if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
    invokeVNodeHook(vnodeHook, parentComponent, n2, n1)
  }
  if (dirs) {
    invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate')
  }

  parentComponent && toggleRecurse(parentComponent, true)

  // 开发模式 HMR 检查
  if (__DEV__ && isHmrUpdating) {
    patchFlag = 0
    optimized = false
    n2.dynamicChildren = null
  }

  // Props 更新
  if (patchFlag > 0) {
    // 有优化标记
    if (patchFlag & PatchFlags.FULL_PROPS) {
      // 完整 props diff
      patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG)
    } else {
      // 精确更新
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          hostPatchProp(el, 'class', null, newProps.class, isSVG)
        }
      }
      if (patchFlag & PatchFlags.STYLE) {
        hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
      }
      if (patchFlag & PatchFlags.PROPS) {
        const propsToUpdate = n2.dynamicProps!
        for (let i = 0; i < propsToUpdate.length; i++) {
          const key = propsToUpdate[i]
          const prev = oldProps[key]
          const next = newProps[key]
          if (next !== prev || key === 'value') {
            hostPatchProp(
              el, key, prev, next, isSVG,
              n1.children as VNode[],
              parentComponent, parentSuspense, unmountChildren
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
    // 非优化模式：完整 diff
    patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG)
  }

  // 子节点更新
  if (dynamicChildren) {
    // Block 优化
    patchBlockChildren(
      n1.dynamicChildren!,
      dynamicChildren,
      el,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds
    )
    if (__DEV__ && parentComponent && parentComponent.type.__hmrId) {
      traverseStaticChildren(n1, n2)
    }
  } else if (!optimized) {
    // 完整 children diff
    patchChildren(
      n1, n2, el, null,
      parentComponent, parentSuspense,
      isSVG, slotScopeIds, false
    )
  }

  // updated 钩子
  if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
    queuePostRenderEffect(() => {
      vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1)
      dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated')
    }, parentSuspense)
  }
}
```

## 优化路径

### 1. CLASS 优化

```typescript
if (patchFlag & PatchFlags.CLASS) {
  if (oldProps.class !== newProps.class) {
    hostPatchProp(el, 'class', null, newProps.class, isSVG)
  }
}
```

只在 class 变化时更新。

### 2. STYLE 优化

```typescript
if (patchFlag & PatchFlags.STYLE) {
  hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
}
```

style 需要 diff 对象属性。

### 3. PROPS 优化

```typescript
if (patchFlag & PatchFlags.PROPS) {
  const propsToUpdate = n2.dynamicProps!
  for (let i = 0; i < propsToUpdate.length; i++) {
    const key = propsToUpdate[i]
    // 只更新 dynamicProps 中列出的属性
    if (next !== prev || key === 'value') {
      hostPatchProp(el, key, prev, next, ...)
    }
  }
}
```

只更新编译器标记的动态属性。

### 4. TEXT 优化

```typescript
if (patchFlag & PatchFlags.TEXT) {
  if (n1.children !== n2.children) {
    hostSetElementText(el, n2.children as string)
  }
}
```

直接更新文本内容。

## 完整 Props Diff

```typescript
function patchProps(
  el: RendererElement,
  vnode: VNode,
  oldProps: Data,
  newProps: Data,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean
) {
  if (oldProps !== newProps) {
    // 更新/添加新属性
    if (oldProps !== EMPTY_OBJ) {
      for (const key in oldProps) {
        if (!isReservedProp(key) && !(key in newProps)) {
          hostPatchProp(
            el, key, oldProps[key], null,
            isSVG, vnode.children as VNode[],
            parentComponent, parentSuspense, unmountChildren
          )
        }
      }
    }
    // 添加新属性
    for (const key in newProps) {
      if (isReservedProp(key)) continue
      const next = newProps[key]
      const prev = oldProps[key]
      if (next !== prev && key !== 'value') {
        hostPatchProp(
          el, key, prev, next,
          isSVG, vnode.children as VNode[],
          parentComponent, parentSuspense, unmountChildren
        )
      }
    }
    // value 最后
    if ('value' in newProps) {
      hostPatchProp(el, 'value', oldProps.value, newProps.value)
    }
  }
}
```

## 子节点更新

### Block 优化

```typescript
if (dynamicChildren) {
  patchBlockChildren(
    n1.dynamicChildren!,
    dynamicChildren,
    el, ...
  )
}
```

只 patch 动态节点，跳过静态。

### 完整 Diff

```typescript
if (!optimized) {
  patchChildren(n1, n2, el, null, ...)
}
```

需要完整比较所有子节点。

## 复用 DOM 元素

```typescript
const el = (n2.el = n1.el!)
```

更新时复用旧的 DOM 元素，只修改属性和子节点。

## value 特殊处理

value 总是最后更新：

```typescript
if (next !== prev || key === 'value') {
  hostPatchProp(el, key, prev, next, ...)
}
```

即使值相同也更新，因为用户可能直接修改了 input.value。

## 生命周期

1. **beforeUpdate**：指令 + onVnodeBeforeUpdate
2. **更新 props**
3. **更新子节点**
4. **updated**：指令 + onVnodeUpdated（异步）

## toggleRecurse

```typescript
parentComponent && toggleRecurse(parentComponent, false)
// ... 执行钩子 ...
parentComponent && toggleRecurse(parentComponent, true)
```

防止钩子中触发递归更新。

## 性能分析

| 场景 | 复杂度 | 说明 |
|------|--------|------|
| patchFlag 优化 | O(1) | 只更新标记的属性 |
| PROPS + dynamicProps | O(n) | n = 动态属性数 |
| 完整 props diff | O(m) | m = 总属性数 |
| Block children | O(d) | d = 动态节点数 |
| 完整 children | O(c) | c = 总子节点数 |

## 小结

`patchElement` 是元素更新的核心。它利用 patchFlag 精确定位需要更新的部分，避免不必要的 diff。配合 Block 优化，可以跳过静态子节点。这是 Vue 3 性能优化的关键实现。
