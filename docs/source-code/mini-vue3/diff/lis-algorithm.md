# 最长递增子序列算法详解

上一章我们看到快速 Diff 使用最长递增子序列（LIS）来确定哪些节点不需要移动。**但 LIS 究竟是什么？它如何帮助实现最小移动？**

这是一个经典的算法问题，也是 LeetCode 高频题目。理解它不仅能帮助你理解 Vue 源码，还能提升算法能力。让我们深入理解这个关键算法。

## 问题定义

首先要问一个问题：什么是最长递增子序列？

**子序列**：从原序列中选取若干元素，保持相对顺序不变。

**递增子序列**：元素严格递增的子序列。

**最长递增子序列**：所有递增子序列中长度最大的那个。

```
原数组: [3, 1, 4, 1, 5, 9, 2, 6]

一些子序列:
  [3, 4, 5]     ✓ 递增，长度 3
  [1, 4, 5, 9]  ✓ 递增，长度 4
  [1, 4, 5, 6]  ✓ 递增，长度 4
  [1, 2, 6]     ✓ 递增，长度 3
  [1, 1]        ✗ 非严格递增
  [9, 6]        ✗ 递减

最长递增子序列: [1, 4, 5, 9] 或 [1, 4, 5, 6]
长度: 4
```

注意：LIS 可能不唯一，但长度是确定的。

## 与 Diff 的关联

现在我要问第二个问题：LIS 和 Diff 有什么关系？

回顾快速 Diff 中的 `newIndexToOldIndexMap`：

```javascript
// 旧列表乱序部分: [C, D, E]    (索引 2~4)
// 新列表乱序部分: [E, D, C, X] (索引 2~5)

// newIndexToOldIndexMap 记录：
//   新列表每个位置的节点，在旧列表中的索引（+1）
//   [5, 4, 3, 0]
//   E→5(旧索引4+1), D→4(旧索引3+1), C→3(旧索引2+1), X→0(新增)
```

这个数组的含义是：新列表的节点**如果保持这个顺序**，对应到旧列表的索引是 [4, 3, 2]（忽略新增的 0）。

如果我们找出其中的**递增子序列**，比如 [2, 3, 4]（如果存在），意味着这些节点在新旧列表中的**相对顺序不变**——它们不需要移动。

```javascript
// 另一个例子
// 旧列表: [A, B, C, D]
// 新列表: [A, C, D, B]

// newIndexToOldIndexMap = [1, 3, 4, 2]
// 忽略 0，考虑 [1, 3, 4, 2]

// LIS: [1, 3, 4]，索引 [0, 1, 2]
// 意味着：A、C、D 相对顺序不变，不需要移动
// 只需要移动 B 到正确位置
```

**核心洞察**：LIS 中的元素保持相对顺序不变，对应的节点不需要移动。其他节点移动到正确位置即可。LIS 越长，需要移动的节点越少。

## O(n²) 动态规划解法

先看最直观的解法——动态规划：

```javascript
function lisDP(arr) {
  const n = arr.length
  if (n === 0) return []
  
  // dp[i] 表示以 arr[i] 结尾的 LIS 长度
  const dp = new Array(n).fill(1)
  // prev[i] 记录前驱索引，用于回溯路径
  const prev = new Array(n).fill(-1)
  
  let maxLen = 1
  let maxIdx = 0
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      // 如果 arr[j] < arr[i]，可以接在 arr[j] 后面
      if (arr[j] < arr[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1
        prev[i] = j
      }
    }
    
    if (dp[i] > maxLen) {
      maxLen = dp[i]
      maxIdx = i
    }
  }
  
  // 回溯构造结果
  const result = []
  let idx = maxIdx
  while (idx !== -1) {
    result.unshift(idx)  // 返回的是索引
    idx = prev[idx]
  }
  
  return result
}
```

**核心逻辑**：

- `dp[i]` 表示以 `arr[i]` 结尾的 LIS 长度
- 对于每个 `i`，遍历所有 `j < i`，如果 `arr[j] < arr[i]`，则 `dp[i] = max(dp[i], dp[j] + 1)`
- `prev` 数组记录前驱，用于回溯完整路径

**时间复杂度**：O(n²)——两层循环
**空间复杂度**：O(n)——dp 和 prev 数组

让我们手动模拟一下：

```
arr = [3, 1, 4, 1, 5, 9, 2, 6]

i=0: dp=[1], prev=[-1]
i=1: 1<3? No, dp=[1,1], prev=[-1,-1]
i=2: 3<4? Yes, dp[2]=2; 1<4? Yes, dp[2]=max(2,2)=2
     dp=[1,1,2], prev=[-1,-1,0或1]
i=3: 1<1? No, 1<1? No, 4<1? No
     dp=[1,1,2,1], prev=[-1,-1,1,-1]
i=4: 3<5,dp=2; 1<5,dp=2; 4<5,dp=3; 1<5,dp=max(3,2)=3
     dp=[1,1,2,1,3], prev=[-1,-1,1,-1,2]
...

最终 dp=[1,1,2,1,3,4,2,4]
maxLen=4, maxIdx=5 或 7

回溯：7→4→2→1 得到索引 [1,2,4,7]
对应值：[1,4,5,6]
```

## O(n log n) 贪心 + 二分解法

O(n²) 对于大列表可能太慢。有没有更优的解法？

核心思想：维护一个 `tails` 数组，`tails[i]` 表示长度为 `i+1` 的 LIS 的**最小末尾值**。

为什么记录"最小末尾值"？因为末尾值越小，后续能接上的元素就越多，LIS 越可能更长。这是一种**贪心**策略。

```javascript
function lisBinary(arr) {
  const n = arr.length
  if (n === 0) return []
  
  // tails[i]: 长度为 i+1 的 LIS 的最小末尾元素的索引
  const tails = []
  // prev[i]: arr[i] 在 LIS 中的前驱索引
  const prev = new Array(n).fill(-1)
  
  for (let i = 0; i < n; i++) {
    const val = arr[i]
    
    // 二分查找：找到第一个 >= val 的位置
    let left = 0
    let right = tails.length
    
    while (left < right) {
      const mid = (left + right) >> 1
      if (arr[tails[mid]] < val) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    
    // left 就是 val 应该放置的位置
    if (left < tails.length) {
      // 替换现有位置
      tails[left] = i
    } else {
      // 扩展 tails
      tails.push(i)
    }
    
    // 记录前驱
    if (left > 0) {
      prev[i] = tails[left - 1]
    }
  }
  
  // 回溯构造结果
  const result = new Array(tails.length)
  let idx = tails[tails.length - 1]
  for (let i = tails.length - 1; i >= 0; i--) {
    result[i] = idx
    idx = prev[idx]
  }
  
  return result
}
```

**关键步骤解析**：

1. **二分查找**：在 `tails` 中找到第一个 `>= val` 的位置
   - 如果找到，说明 `val` 可以替换那个位置（使末尾更小）
   - 如果没找到，说明 `val` 比所有末尾都大，可以扩展 LIS

2. **为什么这样有效**？
   - `tails` 始终保持严格递增
   - 当遇到新元素时，用二分找到它应该"插入"的位置
   - 这个位置表示：以该元素结尾，LIS 的长度是 `left + 1`

让我们手动模拟：

```
arr = [3, 1, 4, 1, 5, 9, 2, 6]
索引:   0  1  2  3  4  5  6  7

i=0, val=3:
  tails=[], left=0
  tails=[0]  // 长度 1 的 LIS 末尾是索引 0（值 3）
  prev=[-1,...]

i=1, val=1:
  tails=[0], arr[0]=3, 1<3
  left=0, 替换 tails[0]=1
  tails=[1]  // 长度 1 的 LIS 末尾改为索引 1（值 1，更小）
  prev=[-1,-1,...]

i=2, val=4:
  tails=[1], arr[1]=1, 4>1
  left=1, 扩展 tails=[1,2]
  prev[2]=tails[0]=1
  prev=[-1,-1,1,...]

i=3, val=1:
  tails=[1,2], arr[1]=1, 1>=1? Yes
  left=0, tails[0]=3
  tails=[3,2]  // 实际上值相同，没变化

i=4, val=5:
  arr[tails]=[1,4], 5>4
  left=2, tails=[3,2,4]
  prev[4]=tails[1]=2

i=5, val=9:
  arr[tails]=[1,4,5], 9>5
  left=3, tails=[3,2,4,5]
  prev[5]=tails[2]=4

i=6, val=2:
  arr[tails]=[1,4,5,9], 2<4
  left=1, tails[1]=6
  tails=[3,6,4,5]
  prev[6]=tails[0]=3

i=7, val=6:
  arr[tails]=[1,2,5,9], 6<9
  left=3, tails[3]=7
  tails=[3,6,4,7]
  prev[7]=tails[2]=4

最终 tails=[3,6,4,7]
回溯：7→4→6→3，得到索引 [3,6,4,7]
对应值：[1,2,5,6]
```

等等，[3,6,4,7] 对应的值是 [1,2,5,6]，但顺序似乎不对？

实际上，回溯应该是：从 tails 最后一个元素开始，通过 prev 链回溯。

```
tails = [3, 6, 4, 7]
result[3] = 7 (idx=7)
result[2] = prev[7] = 4 (idx=4)
result[1] = prev[4] = 2 (idx=2)
result[0] = prev[2] = 1 (idx=1)

result = [1, 2, 4, 7]
对应值: [1, 4, 5, 6] ✓
```

**时间复杂度**：O(n log n)——每个元素进行一次二分查找
**空间复杂度**：O(n)

## Vue 3 源码中的实现

Vue 3 的 LIS 实现针对 Diff 场景做了优化：

```javascript
// packages/runtime-core/src/renderer.ts
function getSequence(arr) {
  const p = arr.slice()  // 复制数组，存储前驱
  const result = [0]     // 存储 LIS 的索引
  let i, j, u, v, c
  const len = arr.length
  
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    // 跳过 0，因为 0 表示新节点
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        // arrI 比当前 LIS 末尾大，直接扩展
        p[i] = j
        result.push(i)
        continue
      }
      
      // 二分查找
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  
  // 回溯
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  
  return result
}
```

**关键优化**：
1. **跳过 0**：0 表示新节点，不参与 LIS 计算
2. **快速路径**：如果新元素比 LIS 末尾大，直接扩展，不需要二分
3. **原地修改**：使用 p 数组存储前驱，减少空间开销

## 在 Diff 中的应用

让我们完整看一下 LIS 如何在快速 Diff 中使用：

```javascript
// newIndexToOldIndexMap = [5, 4, 3, 0]
// 对应：E(旧索引4), D(旧索引3), C(旧索引2), X(新增)

const seq = getSequence([5, 4, 3, 0])
// 由于 5>4>3，没有长度>1的递增子序列
// seq = [2]，只有索引 2（值 3）

// 遍历时：
// i=3 (X): newIndexToOldIndexMap[3]=0，新增
// i=2 (C): i===seq[0]=2，不移动，j--
// i=1 (D): j<0 或 i!==seq[j]，移动
// i=0 (E): j<0，移动

// 结果：新增 1 个，移动 2 个
```

LIS 的作用是识别出可以保持不动的节点，最小化移动操作。

## 本章小结

本章深入分析了最长递增子序列算法：

- **问题定义**：找出严格递增的最长子序列
- **与 Diff 关联**：LIS 中的节点相对顺序不变，不需要移动
- **O(n²) DP 解法**：直观但效率不够
- **O(n log n) 贪心+二分**：维护最小末尾，二分查找位置
- **Vue 3 实现**：跳过 0、快速路径、原地修改

LIS 是快速 Diff 的核心优化。理解了 LIS，就理解了为什么快速 Diff 能实现最少移动。

下一章，我们将讨论 key 的作用与 Diff 性能优化——为什么正确使用 key 如此重要？
