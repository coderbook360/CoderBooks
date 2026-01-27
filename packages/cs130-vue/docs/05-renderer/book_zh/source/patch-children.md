# patchChildren 子节点更新

`patchChildren` 是子节点更新的入口，根据新旧子节点类型选择不同的处理策略。

## 函数签名

```typescript
const patchChildren: PatchChildrenFn = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean = false
) => { ... }
```

## 实现

```typescript
const patchChildren: PatchChildrenFn = (
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
  const c1 = n1 && n1.children
  const prevShapeFlag = n1 ? n1.shapeFlag : 0
  const c2 = n2.children
  const { patchFlag, shapeFlag } = n2

  // 快速路径：根据 patchFlag 优化
  if (patchFlag > 0) {
    if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
      // 带 key 的 Fragment
      patchKeyedChildren(
        c1 as VNode[],
        c2 as VNodeArrayChildren,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      return
    } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
      // 无 key 的 Fragment
      patchUnkeyedChildren(
        c1 as VNode[],
        c2 as VNodeArrayChildren,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
      return
    }
  }

  // 三种可能的子节点类型：text, array, no children
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 新子节点是文本
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧的是数组，先卸载
      unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
    }
    if (c2 !== c1) {
      hostSetElementText(container, c2 as string)
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧的是数组
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新的也是数组：完整 diff
        patchKeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
      } else {
        // 新的不是数组，卸载旧的
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense, true)
      }
    } else {
      // 旧的是文本或空
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, '')
      }
      // 新的是数组，挂载
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
      }
    }
  }
}
```

## 决策矩阵

| 旧子节点 | 新子节点 | 操作 |
|----------|----------|------|
| text | text | 更新文本 |
| text | array | 清空 + 挂载 |
| text | null | 清空 |
| array | text | 卸载 + 设置文本 |
| array | array | diff 算法 |
| array | null | 卸载 |
| null | text | 设置文本 |
| null | array | 挂载 |
| null | null | 无操作 |

## 场景分析

### Text → Text

```typescript
if (c2 !== c1) {
  hostSetElementText(container, c2 as string)
}
```

只在内容变化时更新。

### Text → Array

```typescript
// 1. 清空文本
hostSetElementText(container, '')
// 2. 挂载子节点
mountChildren(c2, container, ...)
```

### Array → Text

```typescript
// 1. 卸载所有子节点
unmountChildren(c1, ...)
// 2. 设置文本
hostSetElementText(container, c2)
```

### Array → Array

```typescript
if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
  patchKeyedChildren(c1, c2, ...)
} else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
  patchUnkeyedChildren(c1, c2, ...)
} else {
  // 默认使用 keyed
  patchKeyedChildren(c1, c2, ...)
}
```

### Array → Null

```typescript
unmountChildren(c1, parentComponent, parentSuspense, true)
```

## patchFlag 优化

### KEYED_FRAGMENT

v-for 带 key：

```html
<div v-for="item in list" :key="item.id">
```

使用 `patchKeyedChildren`，可以高效复用和移动节点。

### UNKEYED_FRAGMENT

v-for 无 key：

```html
<div v-for="item in list">
```

使用 `patchUnkeyedChildren`，按索引更新。

## 为什么区分 keyed 和 unkeyed

### Keyed

节点有唯一标识，可以：
- 准确识别哪些节点移动了
- 复用 DOM 节点
- 使用 LIS 优化移动

### Unkeyed

没有标识，只能：
- 按位置一一对应
- 无法识别移动
- 新增/删除在末尾处理

## 性能对比

```typescript
// Keyed（复杂但准确）
// 时间复杂度：O(n) 或 O(n log n)
patchKeyedChildren(c1, c2, ...)

// Unkeyed（简单但可能多余操作）
// 时间复杂度：O(n)
patchUnkeyedChildren(c1, c2, ...)
```

## 边界处理

### 空数组

```typescript
// c1 = [], c2 = [vnode1, vnode2]
// 直接挂载

// c1 = [vnode1, vnode2], c2 = []
// 卸载所有
```

### null children

```typescript
// 规范化后 null 表示无子节点
if (c1 == null) {
  // 无需卸载
}
if (c2 == null) {
  // 无需挂载
}
```

## 与 processFragment 的关系

Fragment 的子节点更新也用 patchChildren：

```typescript
// processFragment 中
patchChildren(
  n1,
  n2,
  container,
  fragmentEndAnchor,  // 锚点是 Fragment 结束标记
  ...
)
```

## 小结

`patchChildren` 根据新旧子节点类型分发到不同处理逻辑。文本、数组、空三种类型的组合产生九种情况。对于数组到数组的情况，根据 patchFlag 选择 keyed 或 unkeyed 算法。这是 diff 算法的入口。
