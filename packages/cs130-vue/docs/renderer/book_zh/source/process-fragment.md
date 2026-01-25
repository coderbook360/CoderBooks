# processFragment 片段处理

`processFragment` 处理 Fragment 类型 VNode。Fragment 允许组件返回多个根节点，不需要包裹元素。

## 函数签名

```typescript
const processFragment = (
  n1: VNode | null,
  n2: VNode,
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
const processFragment = (
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
  // Fragment 使用两个空文本节点作为边界标记
  const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''))!
  const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''))!

  let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2

  // 合并 slotScopeIds
  if (fragmentSlotScopeIds) {
    slotScopeIds = slotScopeIds
      ? slotScopeIds.concat(fragmentSlotScopeIds)
      : fragmentSlotScopeIds
  }

  if (n1 == null) {
    // 挂载
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    // 挂载子节点
    mountChildren(
      n2.children as VNodeArrayChildren,
      container,
      fragmentEndAnchor,  // 使用 end 作为锚点
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  } else {
    // 更新
    if (
      patchFlag > 0 &&
      patchFlag & PatchFlags.STABLE_FRAGMENT &&
      dynamicChildren &&
      n1.dynamicChildren
    ) {
      // 稳定 Fragment：使用 Block 优化
      patchBlockChildren(
        n1.dynamicChildren,
        dynamicChildren,
        container,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds
      )
      // 处理 key-only Fragment
      if (n2.key != null || (parentComponent && n2 === parentComponent.subTree)) {
        traverseStaticChildren(n1, n2, true)
      }
    } else {
      // 完整 children diff
      patchChildren(
        n1,
        n2,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    }
  }
}
```

## Fragment 边界标记

Fragment 使用两个文本节点标记边界：

```html
<!-- DOM 结构 -->
""           <!-- fragmentStartAnchor (el) -->
<div>A</div>
<div>B</div>
<div>C</div>
""           <!-- fragmentEndAnchor (anchor) -->
```

这两个空文本节点是不可见的。

### 为什么需要边界

1. **定位子节点范围**：知道 Fragment 内容的开始和结束
2. **插入锚点**：新子节点插入到 endAnchor 之前
3. **移动操作**：移动 Fragment 时知道要移动哪些节点

## 挂载流程

```typescript
// 1. 创建边界标记
const start = hostCreateText('')
const end = hostCreateText('')

// 2. 插入边界
hostInsert(start, container, anchor)
hostInsert(end, container, anchor)

// 3. 挂载子节点（插入到 end 之前）
mountChildren(children, container, end, ...)
```

## 更新策略

### 稳定 Fragment

带 STABLE_FRAGMENT 标记的 Fragment 子节点结构不变：

```typescript
if (patchFlag & PatchFlags.STABLE_FRAGMENT && dynamicChildren) {
  patchBlockChildren(n1.dynamicChildren, dynamicChildren, ...)
}
```

这是编译器优化，只更新动态节点。

### 不稳定 Fragment

没有优化标记时，完整 diff：

```typescript
patchChildren(n1, n2, container, fragmentEndAnchor, ...)
```

## Fragment 类型

### v-for 生成

```html
<template v-for="item in list" :key="item.id">
  <div>{{ item.name }}</div>
</template>
```

编译为：

```typescript
createVNode(Fragment, null, 
  renderList(list, item => createVNode('div', { key: item.id }, item.name)),
  PatchFlags.KEYED_FRAGMENT
)
```

### v-if 多根

```html
<template v-if="show">
  <div>A</div>
  <div>B</div>
</template>
```

编译为：

```typescript
show 
  ? createVNode(Fragment, null, [
      createVNode('div', null, 'A'),
      createVNode('div', null, 'B')
    ])
  : createVNode(Comment)
```

### 组件多根

```vue
<template>
  <div>Root 1</div>
  <div>Root 2</div>
</template>
```

渲染结果是 Fragment。

## patchFlag 类型

| Flag | 含义 |
|------|------|
| STABLE_FRAGMENT | 子节点结构稳定 |
| KEYED_FRAGMENT | v-for 带 key |
| UNKEYED_FRAGMENT | v-for 无 key |

```typescript
const PatchFlags = {
  STABLE_FRAGMENT: 64,
  KEYED_FRAGMENT: 128,
  UNKEYED_FRAGMENT: 256,
}
```

## Fragment VNode 结构

```typescript
const fragmentVNode: VNode = {
  __v_isVNode: true,
  type: Fragment,           // Symbol('Fragment')
  props: null,
  key: null,
  ref: null,
  children: [vnode1, vnode2],
  shapeFlag: ShapeFlags.ARRAY_CHILDREN,
  patchFlag: PatchFlags.STABLE_FRAGMENT,
  dynamicChildren: [...],
  el: null,     // 指向 start anchor
  anchor: null, // 指向 end anchor
  // ...
}
```

## 与其他方案对比

### Vue 2

Vue 2 不支持多根组件，必须包裹：

```html
<template>
  <div> <!-- 必须的包裹 -->
    <span>A</span>
    <span>B</span>
  </div>
</template>
```

### React Fragment

```jsx
<>
  <div>A</div>
  <div>B</div>
</>
```

React 的 Fragment 类似，但实现细节不同。

## 边界情况

### 空 Fragment

```typescript
createVNode(Fragment, null, [])
```

只有两个边界标记，没有子节点。

### 嵌套 Fragment

```typescript
createVNode(Fragment, null, [
  createVNode(Fragment, null, [vnode1, vnode2]),
  createVNode(Fragment, null, [vnode3])
])
```

每层 Fragment 都有自己的边界标记。

## 卸载

Fragment 卸载时遍历子节点：

```typescript
function unmount(vnode: VNode, ...) {
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    unmountChildren(vnode.children as VNode[], ...)
  }
  // 移除边界标记
  hostRemove(vnode.el!)
  if (vnode.anchor) {
    hostRemove(vnode.anchor)
  }
}
```

## 小结

`processFragment` 处理 Fragment VNode，支持多根节点。它使用两个空文本节点作为边界标记，确保子节点定位准确。结合 patchFlag 和 dynamicChildren 实现优化更新。Fragment 是 Vue 3 的重要特性，消除了包裹元素的限制。
