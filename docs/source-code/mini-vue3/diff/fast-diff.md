# 快速 Diff 算法

前面我们分析了简单 Diff 和双端 Diff，它们各有优势但都存在局限。Vue 3 采用了更先进的**快速 Diff 算法**——通过预处理跳过公共部分，使用最长递增子序列（LIS）确定最小移动方案。

**这是当前最高效的 Diff 策略之一，也是 Vue 3 性能提升的关键所在。** 让我们深入理解它的设计思想。

## 核心思想

快速 Diff 分为三个阶段：

1. **预处理**：跳过公共前缀和公共后缀
2. **简单情况处理**：仅新增或仅删除
3. **乱序部分处理**：使用 LIS 确定最小移动

这种分阶段策略的核心洞察是：**实际场景中，大部分变化只涉及列表的一小部分**。预处理能快速跳过不变的部分，只对真正变化的区域进行精细比较。

## 阶段一：预处理

首先从两端跳过相同的节点：

```javascript
function patchKeyedChildren(c1, c2, container, anchor) {
  let i = 0
  const l2 = c2.length
  let e1 = c1.length - 1  // 旧列表尾索引
  let e2 = l2 - 1         // 新列表尾索引
  
  // 1. 从头部同步
  while (i <= e1 && i <= e2) {
    const n1 = c1[i]
    const n2 = c2[i]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container)
    } else {
      break
    }
    i++
  }
  
  // 2. 从尾部同步
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1]
    const n2 = c2[e2]
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container)
    } else {
      break
    }
    e1--
    e2--
  }
  
  // 现在 i 到 e1 是旧列表的乱序部分
  // i 到 e2 是新列表的乱序部分
}
```

让我们用一个例子来理解预处理的效果：

```
旧: A B [C D E] F G
新: A B [E D C X] F G

从头同步: A、B 相同，i 移动到 2
从尾同步: G、F 相同，e1=4, e2=5

乱序部分:
  旧: [C, D, E]      (索引 2~4)
  新: [E, D, C, X]   (索引 2~5)
```

预处理跳过了 A、B、F、G，只剩下中间的乱序部分需要处理。这在实际场景中非常高效——比如列表中间插入一个元素，预处理就能跳过大部分节点。

## 阶段二：简单情况处理

预处理后，可能出现两种简单情况：

**情况一：旧列表已处理完，新列表有剩余 → 仅新增**

```javascript
// (a b)
// (a b) c d
if (i > e1) {
  if (i <= e2) {
    // 新增 i 到 e2 范围的节点
    const nextPos = e2 + 1
    const anchor = nextPos < l2 ? c2[nextPos].el : null
    while (i <= e2) {
      mount(c2[i], container, anchor)
      i++
    }
  }
}
```

**情况二：新列表已处理完，旧列表有剩余 → 仅删除**

```javascript
// (a b) c d
// (a b)
else if (i > e2) {
  while (i <= e1) {
    unmount(c1[i])
    i++
  }
}
```

这两种情况非常高效——直接批量新增或删除，无需任何移动操作。

## 阶段三：乱序部分处理

如果预处理后仍存在乱序部分，就进入核心的 Diff 逻辑：

```javascript
else {
  const s1 = i  // 旧列表乱序部分起始
  const s2 = i  // 新列表乱序部分起始
  
  // 3.1 构建新列表 key → index 映射
  const keyToNewIndexMap = new Map()
  for (let i = s2; i <= e2; i++) {
    if (c2[i].key != null) {
      keyToNewIndexMap.set(c2[i].key, i)
    }
  }
  
  // 3.2 遍历旧列表乱序部分
  const toBePatched = e2 - s2 + 1  // 待处理的新节点数量
  let patched = 0                   // 已处理数量
  let moved = false                 // 是否存在需要移动的节点
  let maxNewIndexSoFar = 0         // 类似简单 Diff 的 lastIndex
  
  // newIndexToOldIndexMap: 新节点在旧列表中的索引
  // 0 表示新节点（在旧列表中不存在）
  const newIndexToOldIndexMap = new Array(toBePatched).fill(0)
  
  for (let i = s1; i <= e1; i++) {
    const prevChild = c1[i]
    
    // 优化：如果已处理数量 >= 待处理数量，剩余旧节点都是多余的
    if (patched >= toBePatched) {
      unmount(prevChild)
      continue
    }
    
    // 查找当前旧节点在新列表中的位置
    let newIndex = keyToNewIndexMap.get(prevChild.key)
    
    if (newIndex === undefined) {
      // 未找到，删除
      unmount(prevChild)
    } else {
      // 找到可复用节点
      // +1 是为了区分"索引 0"和"不存在"
      newIndexToOldIndexMap[newIndex - s2] = i + 1
      
      // 判断是否需要移动（类似简单 Diff 的 lastIndex 策略）
      if (newIndex >= maxNewIndexSoFar) {
        maxNewIndexSoFar = newIndex
      } else {
        moved = true
      }
      
      patch(prevChild, c2[newIndex], container)
      patched++
    }
  }
  
  // 3.3 移动和新增
  // 使用 LIS 确定哪些节点不需要移动
  const increasingNewIndexSequence = moved
    ? getSequence(newIndexToOldIndexMap)
    : []
  
  let j = increasingNewIndexSequence.length - 1
  
  // 从后往前遍历，确保锚点正确
  for (let i = toBePatched - 1; i >= 0; i--) {
    const nextIndex = s2 + i
    const nextChild = c2[nextIndex]
    const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null
    
    if (newIndexToOldIndexMap[i] === 0) {
      // 新节点，挂载
      mount(nextChild, container, anchor)
    } else if (moved) {
      // 需要移动
      if (j < 0 || i !== increasingNewIndexSequence[j]) {
        // 不在 LIS 中，需要移动
        insert(nextChild.el, container, anchor)
      } else {
        // 在 LIS 中，不需要移动
        j--
      }
    }
  }
}
```

## 关键数据结构解析

**keyToNewIndexMap**

新列表的 key → 新索引映射，用于快速查找旧节点是否在新列表中存在：

```javascript
// 新列表: [E, D, C, X] (索引 2~5)
// keyToNewIndexMap:
//   E → 2
//   D → 3
//   C → 4
//   X → 5
```

**newIndexToOldIndexMap**

记录新列表中每个节点在旧列表中的位置（+1 后的值）：

```javascript
// 旧: [C, D, E]      (索引 2~4)
// 新: [E, D, C, X]   (索引 2~5)

// newIndexToOldIndexMap 长度 = 4（新列表乱序部分长度）
// 遍历旧列表后:
//   newIndexToOldIndexMap[0] = 5  (E 在旧列表索引 4，+1=5)
//   newIndexToOldIndexMap[1] = 4  (D 在旧列表索引 3，+1=4)
//   newIndexToOldIndexMap[2] = 3  (C 在旧列表索引 2，+1=3)
//   newIndexToOldIndexMap[3] = 0  (X 不存在于旧列表)
```

## 为什么使用 LIS

思考一下：在 `newIndexToOldIndexMap = [5, 4, 3, 0]` 中，哪些节点不需要移动？

如果我们能找出一组节点，它们在新旧列表中的**相对顺序**保持不变，那这些节点就不需要移动。其他节点移动到正确位置即可。

这正是**最长递增子序列**的用途：

```javascript
// newIndexToOldIndexMap = [5, 4, 3, 0]
// 忽略 0（新节点），考虑 [5, 4, 3]
// 严格递增子序列: [3], [4], [5] 都是长度 1
// 没有长度 > 1 的递增子序列

// 意味着：E、D、C 的相对顺序完全颠倒了
// 最少保留一个不动，其他都需要移动
```

换一个例子：

```javascript
// newIndexToOldIndexMap = [3, 4, 5, 0]
// 递增子序列: [3, 4, 5]，索引 [0, 1, 2]

// 意味着：前三个节点的相对顺序不变
// 它们不需要移动，只需要：
// 1. 新增索引 3 的新节点
```

LIS 帮助我们找出**最多**可以保持不动的节点，从而实现**最少**移动。

## 图解完整执行过程

```
旧: A B C D E F G
新: A B E D C X F G

Step 1: 预处理
  从头同步: A, B
  从尾同步: G, F
  
  乱序部分:
    旧: [C, D, E]    s1=2, e1=4
    新: [E, D, C, X] s2=2, e2=5

Step 2: 构建映射
  keyToNewIndexMap = { E→2, D→3, C→4, X→5 }

Step 3: 遍历旧列表乱序部分
  i=2 (C): 在新列表索引 4, newIndexToOldIndexMap[2]=3
           4 > maxNewIndexSoFar(0), maxNewIndexSoFar=4
  i=3 (D): 在新列表索引 3, newIndexToOldIndexMap[1]=4
           3 < maxNewIndexSoFar(4), moved=true
  i=4 (E): 在新列表索引 2, newIndexToOldIndexMap[0]=5
           2 < maxNewIndexSoFar(4), moved=true
  
  newIndexToOldIndexMap = [5, 4, 3, 0]
  moved = true

Step 4: 计算 LIS
  getSequence([5, 4, 3, 0]) 忽略 0
  结果索引: [2] (只有 C 位置正确)

Step 5: 从后往前移动
  i=3: X, newIndexToOldIndexMap[3]=0, 新增
  i=2: C, 在 LIS 中, 不移动
  i=1: D, 不在 LIS, 移动到 C 前
  i=0: E, 不在 LIS, 移动到 D 前

结果: A B E D C X F G
操作: 2 次移动 + 1 次新增
```

## 从后往前遍历的原因

为什么最后的移动阶段要从后往前？

```javascript
for (let i = toBePatched - 1; i >= 0; i--) {
  const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null
  // ...
}
```

因为我们使用 `insertBefore` 进行移动，需要一个**锚点**来确定插入位置。如果从前往后遍历，后面的节点可能还没处理，无法作为锚点。从后往前则能确保锚点已经就位。

## 本章小结

本章深入分析了 Vue 3 的快速 Diff 算法：

- **三阶段策略**：预处理 → 简单情况 → 乱序处理
- **预处理**：跳过公共前缀和后缀，缩小处理范围
- **简单情况**：仅新增或仅删除，无需移动
- **乱序处理**：使用 LIS 确定最小移动方案
- **关键结构**：keyToNewIndexMap、newIndexToOldIndexMap
- **核心优化**：LIS 确保移动次数最少

快速 Diff 是当前最先进的 Diff 策略之一，结合了多种优化手段。它的设计体现了对实际场景的深刻理解：大部分变化发生在列表两端，预处理能快速跳过；乱序部分通过 LIS 实现最优移动。

下一章，我们将深入最长递增子序列算法——理解它的原理、实现和在 Diff 中的应用。
