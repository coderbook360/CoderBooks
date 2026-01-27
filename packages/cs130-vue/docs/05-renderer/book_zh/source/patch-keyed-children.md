# patchKeyedChildren 带 key 子节点更新

`patchKeyedChildren` 是 Vue 3 的核心 diff 算法，也称为"快速 Diff"。它通过 key 精确匹配节点，使用 LIS 优化移动操作。

## 函数签名

```typescript
const patchKeyedChildren = (
  c1: VNode[],
  c2: VNodeArrayChildren,
  container: RendererElement,
  parentAnchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => { ... }
```

## 算法概述

算法分为五个阶段：
1. 从头部开始同步
2. 从尾部开始同步
3. 新增节点
4. 删除节点
5. 处理未知序列（移动 + 增删）

## 完整实现

```typescript
const patchKeyedChildren = (
  c1, c2, container, parentAnchor,
  parentComponent, parentSuspense, isSVG, slotScopeIds, optimized
) => {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1  // 旧列表结束索引
  let e2 = l2 - 1         // 新列表结束索引

  // 1. 从头部开始同步
  while (i <= e1 && i <= e2) {
    const n1 = c1[i]
    const n2 = (c2[i] = optimized
      ? cloneIfMounted(c2[i] as VNode)
      : normalizeVNode(c2[i]))
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized)
    } else {
      break
    }
    i++
  }

  // 2. 从尾部开始同步
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1]
    const n2 = (c2[e2] = optimized
      ? cloneIfMounted(c2[e2] as VNode)
      : normalizeVNode(c2[e2]))
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized)
    } else {
      break
    }
    e1--
    e2--
  }

  // 3. 新增节点（旧的处理完，新的还有剩余）
  if (i > e1) {
    if (i <= e2) {
      const nextPos = e2 + 1
      const anchor = nextPos < l2 ? (c2[nextPos] as VNode).el : parentAnchor
      while (i <= e2) {
        patch(
          null,
          (c2[i] = optimized
            ? cloneIfMounted(c2[i] as VNode)
            : normalizeVNode(c2[i])),
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        i++
      }
    }
  }

  // 4. 删除节点（新的处理完，旧的还有剩余）
  else if (i > e2) {
    while (i <= e1) {
      unmount(c1[i], parentComponent, parentSuspense, true)
      i++
    }
  }

  // 5. 未知序列
  else {
    const s1 = i  // 旧未知序列开始
    const s2 = i  // 新未知序列开始

    // 5.1 构建新序列的 key -> index 映射
    const keyToNewIndexMap: Map<string | number | symbol, number> = new Map()
    for (i = s2; i <= e2; i++) {
      const nextChild = (c2[i] = optimized
        ? cloneIfMounted(c2[i] as VNode)
        : normalizeVNode(c2[i]))
      if (nextChild.key != null) {
        keyToNewIndexMap.set(nextChild.key, i)
      }
    }

    // 5.2 遍历旧序列，匹配并标记
    let j
    let patched = 0
    const toBePatched = e2 - s2 + 1
    let moved = false
    let maxNewIndexSoFar = 0
    
    // newIndexToOldIndexMap: 新索引 -> 旧索引 + 1（0 表示新增）
    const newIndexToOldIndexMap = new Array(toBePatched)
    for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

    for (i = s1; i <= e1; i++) {
      const prevChild = c1[i]
      
      // 已 patch 完所有新节点，剩余旧节点直接卸载
      if (patched >= toBePatched) {
        unmount(prevChild, parentComponent, parentSuspense, true)
        continue
      }
      
      let newIndex
      if (prevChild.key != null) {
        // 有 key，查找映射
        newIndex = keyToNewIndexMap.get(prevChild.key)
      } else {
        // 无 key，遍历查找相同类型
        for (j = s2; j <= e2; j++) {
          if (
            newIndexToOldIndexMap[j - s2] === 0 &&
            isSameVNodeType(prevChild, c2[j] as VNode)
          ) {
            newIndex = j
            break
          }
        }
      }
      
      if (newIndex === undefined) {
        // 找不到匹配，卸载
        unmount(prevChild, parentComponent, parentSuspense, true)
      } else {
        // 记录映射
        newIndexToOldIndexMap[newIndex - s2] = i + 1
        
        // 检测是否需要移动
        if (newIndex >= maxNewIndexSoFar) {
          maxNewIndexSoFar = newIndex
        } else {
          moved = true
        }
        
        patch(prevChild, c2[newIndex] as VNode, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized)
        patched++
      }
    }

    // 5.3 移动和挂载
    const increasingNewIndexSequence = moved
      ? getSequence(newIndexToOldIndexMap)
      : EMPTY_ARR
    j = increasingNewIndexSequence.length - 1
    
    // 从后往前遍历，确保锚点正确
    for (i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = s2 + i
      const nextChild = c2[nextIndex] as VNode
      const anchor = nextIndex + 1 < l2 ? (c2[nextIndex + 1] as VNode).el : parentAnchor
      
      if (newIndexToOldIndexMap[i] === 0) {
        // 新增节点
        patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized)
      } else if (moved) {
        // 需要移动
        if (j < 0 || i !== increasingNewIndexSequence[j]) {
          // 不在 LIS 中，需要移动
          move(nextChild, container, anchor, MoveType.REORDER)
        } else {
          j--
        }
      }
    }
  }
}
```

## 阶段详解

### 阶段 1：头部同步

```typescript
// 旧: [A, B, C, D, E]
// 新: [A, B, F, G, E]

// i=0: A === A, patch
// i=1: B === B, patch
// i=2: C !== F, break
// 结果: i=2
```

### 阶段 2：尾部同步

```typescript
// 从上面继续
// e1=4, e2=4: E === E, patch
// 结果: e1=3, e2=3
```

### 阶段 3：新增

```typescript
// 旧: [A, B]
// 新: [A, B, C, D]
// 头部同步后: i=2, e1=1, e2=3

// i > e1 且 i <= e2
// 挂载 C, D
```

### 阶段 4：删除

```typescript
// 旧: [A, B, C, D]
// 新: [A, B]
// 头部同步后: i=2, e1=3, e2=1

// i > e2 且 i <= e1
// 卸载 C, D
```

### 阶段 5：未知序列

```typescript
// 旧: [A, B, C, D, E, F, G]
// 新: [A, B, E, C, D, H, F, G]
// 同步后: i=2, e1=5, e2=6

// 未知序列:
// 旧: [C, D, E, F]
// 新: [E, C, D, H, F]
```

## LIS 优化

最长递增子序列（LIS）找出不需要移动的节点：

```typescript
// newIndexToOldIndexMap = [3, 1, 2, 0, 4]
// (E 在旧索引 3, C 在 1, D 在 2, H 是新增 0, F 在 4)

// LIS = [1, 2, 4] (索引: [1, 2, 4])
// 对应节点 C, D, F 不需要移动
// 只需要移动 E，新增 H
```

## move 操作

```typescript
const move: MoveFn = (
  vnode,
  container,
  anchor,
  moveType,
  parentSuspense = null
) => {
  const { el, type, transition, children, shapeFlag } = vnode
  
  if (shapeFlag & ShapeFlags.COMPONENT) {
    move(vnode.component!.subTree, container, anchor, moveType)
    return
  }
  
  if (type === Fragment) {
    hostInsert(el!, container, anchor)
    for (let i = 0; i < (children as VNode[]).length; i++) {
      move((children as VNode[])[i], container, anchor, moveType)
    }
    hostInsert(vnode.anchor!, container, anchor)
    return
  }
  
  // 处理 Transition
  if (moveType !== MoveType.REORDER && transition && !transition.persisted) {
    // Transition 逻辑
  } else {
    hostInsert(el!, container, anchor)
  }
}
```

## 复杂度分析

| 阶段 | 复杂度 |
|------|--------|
| 头部同步 | O(min(n, m)) |
| 尾部同步 | O(min(n, m)) |
| 构建 Map | O(n) |
| 遍历匹配 | O(m) |
| 计算 LIS | O(n log n) |
| 移动/挂载 | O(n) |

总体：O(n log n)

## 与 Vue 2 双端对比

Vue 2 使用双端 diff，Vue 3 改用快速 diff + LIS：

| 特性 | Vue 2 双端 | Vue 3 快速 |
|------|-----------|-----------|
| 复杂度 | O(n) | O(n log n) |
| 移动优化 | 无 | LIS |
| 实际性能 | 可能多次移动 | 最少移动 |

## 小结

`patchKeyedChildren` 是 Vue 3 的核心 diff 算法。通过头尾同步快速处理常见情况，再用 LIS 优化未知序列的移动操作。key 使得节点可以精确匹配，避免不必要的卸载和重建。
