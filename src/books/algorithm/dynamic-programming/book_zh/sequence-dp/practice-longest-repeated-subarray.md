# 实战：最长重复子数组

## 题目描述

给两个整数数组 `nums1` 和 `nums2`，返回两个数组中**公共的**、长度最长的子数组的长度。

📎 [LeetCode 718. 最长重复子数组](https://leetcode.cn/problems/maximum-length-of-repeated-subarray/)

**示例**：

```
输入：nums1 = [1, 2, 3, 2, 1], nums2 = [3, 2, 1, 4, 7]
输出：3
解释：长度最长的公共子数组是 [3, 2, 1]
```

## 子数组 vs 子序列

| 概念 | 要求 | 示例 |
|-----|------|------|
| 子数组 | **连续** | [2, 3] 是 [1, 2, 3, 4] 的子数组 |
| 子序列 | 不连续，保持顺序 | [1, 3] 是 [1, 2, 3, 4] 的子序列 |

这道题求的是**子数组**，即连续的公共部分。

## 状态定义

```
dp[i][j] = 以 nums1[i-1] 和 nums2[j-1] 结尾的最长公共子数组长度
```

**为什么是"结尾"而不是"前缀"？**

因为子数组要求连续，必须以某个位置结尾才能保证连续性。

## 状态转移

```
如果 nums1[i-1] === nums2[j-1]:
    dp[i][j] = dp[i-1][j-1] + 1  // 延续之前的连续段

否则:
    dp[i][j] = 0  // 不相等，连续断开
```

## 代码实现

```typescript
/**
 * 最长重复子数组
 * 时间复杂度：O(m × n)
 * 空间复杂度：O(m × n)
 */
function findLength(nums1: number[], nums2: number[]): number {
  const m = nums1.length, n = nums2.length;
  
  // dp[i][j] = 以 nums1[i-1] 和 nums2[j-1] 结尾的最长公共子数组长度
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  let maxLen = 0;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (nums1[i - 1] === nums2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        maxLen = Math.max(maxLen, dp[i][j]);
      }
      // 不相等时 dp[i][j] = 0（初始值）
    }
  }
  
  return maxLen;
}
```

## 空间优化

```typescript
function findLength(nums1: number[], nums2: number[]): number {
  const m = nums1.length, n = nums2.length;
  const dp = new Array(n + 1).fill(0);
  
  let maxLen = 0;
  
  for (let i = 1; i <= m; i++) {
    // 从后往前更新，避免覆盖 dp[j-1]
    for (let j = n; j >= 1; j--) {
      if (nums1[i - 1] === nums2[j - 1]) {
        dp[j] = dp[j - 1] + 1;
        maxLen = Math.max(maxLen, dp[j]);
      } else {
        dp[j] = 0;  // 重要：不相等时要归零
      }
    }
  }
  
  return maxLen;
}
```

## 示例演算

以 `nums1 = [1, 2, 3, 2, 1]`, `nums2 = [3, 2, 1, 4, 7]` 为例：

|   | 0 | 3 | 2 | 1 | 4 | 7 |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 0 | 0 | 0 | **1** | 0 | 0 |
| 2 | 0 | 0 | **1** | 0 | 0 | 0 |
| 3 | 0 | **1** | 0 | 0 | 0 | 0 |
| 2 | 0 | 0 | **2** | 0 | 0 | 0 |
| 1 | 0 | 0 | 0 | **3** | 0 | 0 |

最长公共子数组长度 = 3（位置 (5, 4) 处）

## 与 LCS 的对比

| 问题 | 状态定义 | 不相等时 |
|-----|---------|---------|
| LCS（子序列） | 前缀的 LCS | `max(dp[i-1][j], dp[i][j-1])` |
| 本题（子数组） | 以该位置结尾的长度 | `0` |

```typescript
// LCS：不相等时取两个方向的最大值
dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);

// 子数组：不相等时归零
dp[i][j] = 0;
```

## 方法二：滑动窗口 + 哈希

另一种 O((m+n) × min(m,n)) 的方法：

```typescript
function findLength(nums1: number[], nums2: number[]): number {
  const m = nums1.length, n = nums2.length;
  
  function maxLen(offset1: number, offset2: number, len: number): number {
    let result = 0, count = 0;
    for (let i = 0; i < len; i++) {
      if (nums1[offset1 + i] === nums2[offset2 + i]) {
        count++;
        result = Math.max(result, count);
      } else {
        count = 0;
      }
    }
    return result;
  }
  
  let result = 0;
  
  // nums1 固定，nums2 滑动
  for (let i = 0; i < m; i++) {
    result = Math.max(result, maxLen(i, 0, Math.min(m - i, n)));
  }
  
  // nums2 固定，nums1 滑动
  for (let j = 1; j < n; j++) {
    result = Math.max(result, maxLen(0, j, Math.min(m, n - j)));
  }
  
  return result;
}
```

## 方法三：二分 + 哈希

O(n log n) 的方法：二分长度 + Rabin-Karp 哈希判断是否存在该长度的公共子数组。

```typescript
// 这里只给出思路，具体实现较复杂
// 1. 二分搜索答案长度 L
// 2. 对于每个 L，用滚动哈希检查是否存在长度为 L 的公共子数组
// 3. 如果存在，尝试更大的 L；否则尝试更小的 L
```

## 还原子数组

```typescript
function findLongestSubarray(nums1: number[], nums2: number[]): number[] {
  const m = nums1.length, n = nums2.length;
  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  let maxLen = 0, endIdx = 0;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (nums1[i - 1] === nums2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j];
          endIdx = i;  // 记录结束位置
        }
      }
    }
  }
  
  // 从 endIdx - maxLen 到 endIdx - 1
  return nums1.slice(endIdx - maxLen, endIdx);
}
```

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| DP | O(m × n) | O(m × n) |
| 空间优化 DP | O(m × n) | O(n) |
| 滑动窗口 | O((m+n) × min(m,n)) | O(1) |
| 二分+哈希 | O((m+n) × log(min(m,n))) | O(m) |

## 本章小结

1. **子数组 = 连续**：状态定义为"以某位置结尾"
2. **断开归零**：不相等时长度重置为 0
3. **答案位置**：需要遍历整个 dp 表取最大值
4. **与 LCS 区别**：LCS 不相等时取 max，这里归零
