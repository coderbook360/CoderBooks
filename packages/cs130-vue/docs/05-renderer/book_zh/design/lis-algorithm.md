# 最长递增子序列

最长递增子序列（Longest Increasing Subsequence，简称 LIS）是 Vue 3 快速 Diff 算法的核心优化手段。理解这个算法，才能理解 Vue 3 为何能将 DOM 移动操作降到最少。

## 问题背景

在 Diff 过程中，我们经常需要处理节点的移动。假设旧数组中节点 A、B、C、D 对应的位置是 0、1、2、3，而它们在新数组中的位置变成了 B、D、A、C（索引 1、3、0、2）。

直觉告诉我们需要移动节点，但移动哪些、怎么移动才是最优的？这里的关键洞察是：如果一组节点在新旧数组中的相对顺序保持不变，它们就不需要移动。我们只需要移动那些打破顺序的节点。

所谓"相对顺序保持不变"，就是这些节点的旧索引形成一个递增序列。找到最长的这样一个序列，其他节点相对它移动，就能达到最少移动次数。

## LIS 算法原理

给定一个数组，找出最长的严格递增子序列。这个子序列不要求连续，但必须保持原数组中的相对顺序。

例如数组 `[3, 5, 6, 2, 5, 4, 19, 5, 6, 7, 12]`，其最长递增子序列之一是 `[3, 5, 6, 7, 12]`，长度为 5。

### 动态规划解法

最直观的解法是动态规划：

```javascript
function lengthOfLIS(nums) {
  const n = nums.length
  if (n === 0) return 0
  
  // dp[i] 表示以 nums[i] 结尾的 LIS 长度
  const dp = new Array(n).fill(1)
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1)
      }
    }
  }
  
  return Math.max(...dp)
}
```

这个解法时间复杂度是 O(n²)，对于大数组不够高效。

### 贪心 + 二分查找优化

更高效的解法结合贪心思想和二分查找，时间复杂度降到 O(n log n)：

```javascript
function getSequence(arr) {
  const n = arr.length
  // result 存储 LIS 的索引
  const result = [0]
  // p 用于回溯，记录每个位置的前驱索引
  const p = arr.slice()
  
  for (let i = 1; i < n; i++) {
    const current = arr[i]
    
    // 特殊处理：0 表示新增节点，不参与 LIS 计算
    if (current === 0) continue
    
    const last = arr[result[result.length - 1]]
    
    // 如果当前值大于 result 最后一个，直接追加
    if (current > last) {
      p[i] = result[result.length - 1]
      result.push(i)
      continue
    }
    
    // 二分查找第一个大于等于 current 的位置
    let left = 0
    let right = result.length - 1
    while (left < right) {
      const mid = (left + right) >> 1
      if (arr[result[mid]] < current) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    
    // 替换该位置
    if (current < arr[result[left]]) {
      if (left > 0) {
        p[i] = result[left - 1]
      }
      result[left] = i
    }
  }
  
  // 回溯构建正确的 LIS 索引序列
  let length = result.length
  let idx = result[length - 1]
  while (length-- > 0) {
    result[length] = idx
    idx = p[idx]
  }
  
  return result
}
```

这段代码的思路是：维护一个辅助数组，每个位置存储"长度为 i+1 的递增子序列的最小末尾元素的索引"。遍历原数组时，如果当前元素比辅助数组末尾大，直接追加；否则用二分查找找到应该替换的位置。

最后通过回溯数组 `p` 构建出正确的 LIS 索引序列。

## Vue 3 中的应用

在 Vue 3 的快速 Diff 算法中，LIS 用于确定哪些节点不需要移动。

### Diff 流程

首先处理公共前缀和后缀，这些节点位置没变，直接 patch：

```javascript
// 处理公共前缀
while (i <= e1 && i <= e2) {
  if (isSameVNode(c1[i], c2[i])) {
    patch(c1[i], c2[i], container)
    i++
  } else {
    break
  }
}

// 处理公共后缀
while (i <= e1 && i <= e2) {
  if (isSameVNode(c1[e1], c2[e2])) {
    patch(c1[e1], c2[e2], container)
    e1--
    e2--
  } else {
    break
  }
}
```

处理完前缀后缀后，中间剩余的部分才需要精细 Diff。对于中间部分：

1. 建立新节点 key 到索引的映射
2. 遍历旧节点，记录每个旧节点在新数组中的位置
3. 对位置数组求 LIS
4. LIS 中的节点不移动，其他节点相对移动

```javascript
// source 数组记录新节点对应的旧索引
// 例如 source = [2, 3, 1, -1]
// 表示新数组中索引 0 的节点来自旧数组索引 2
// -1 表示是新增节点

const increasingSequence = getSequence(source)
// 假设返回 [0, 1]，表示 source[0] 和 source[1] 形成 LIS
// 对应的节点不需要移动
```

### 移动逻辑

从后向前遍历新节点，判断是否需要移动：

```javascript
let j = increasingSequence.length - 1

for (let i = toBePatched - 1; i >= 0; i--) {
  const newIndex = s2 + i
  const newVNode = c2[newIndex]
  const anchor = newIndex + 1 < l2 ? c2[newIndex + 1].el : null
  
  if (source[i] === -1) {
    // 新增节点，挂载
    mount(newVNode, container, anchor)
  } else if (j < 0 || i !== increasingSequence[j]) {
    // 不在 LIS 中，需要移动
    insert(newVNode.el, container, anchor)
  } else {
    // 在 LIS 中，不移动，j 前移
    j--
  }
}
```

## 为什么从后向前

从后向前遍历有个好处：可以直接用下一个节点的 DOM 作为 anchor。因为后面的节点要么已经处理过位置正确，要么是新挂载的，位置也正确。

如果从前向后，每次插入后前面的 anchor 可能已经失效，需要额外处理。

## 性能对比

假设有 1000 个节点的列表，只在头部插入一个新节点：

**简单 Diff**：移动 999 次（每个节点都需要移动）

**双端 Diff**：旧尾 vs 新尾匹配，然后旧尾指针一直左移，最后挂载新头。移动 0 次，但循环 1000 次。

**快速 Diff + LIS**：处理公共后缀 999 次 patch，然后挂载 1 个新节点。最优。

## LIS 的数学性质

LIS 算法的正确性基于一个贪心性质：对于相同长度的递增子序列，末尾元素越小，后续扩展的可能性越大。

这就是为什么在二分查找时，我们用当前元素替换第一个大于等于它的位置——保持每个长度的"潜力"最大。

但要注意，算法过程中辅助数组不一定是真正的 LIS。比如数组 `[2, 1]`，处理完后辅助数组可能是 `[1]`，但实际 LIS 是 `[2]` 或 `[1]`。所以需要用 `p` 数组回溯来构建正确结果。

## 小结

LIS 算法是 Vue 3 快速 Diff 的核心优化。通过找出不需要移动的节点序列，将移动操作降到理论最小值。

理解 LIS，就理解了 Vue 3 相比 Vue 2 双端 Diff 的本质改进：不是盲目地四种情况尝试，而是用数学方法计算最优移动方案。
