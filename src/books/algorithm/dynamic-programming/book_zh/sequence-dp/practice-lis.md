# 实战：最长递增子序列

## 题目描述

给你一个整数数组 `nums`，找到其中最长严格递增子序列的长度。

**子序列** 是由数组派生而来的序列，删除（或不删除）数组中的元素而不改变其余元素的顺序。例如，`[3,6,2,7]` 是数组 `[0,3,1,6,2,2,7]` 的子序列。

📎 [LeetCode 300. 最长递增子序列](https://leetcode.cn/problems/longest-increasing-subsequence/)

**示例**：

```
输入：nums = [10, 9, 2, 5, 3, 7, 101, 18]
输出：4
解释：最长递增子序列是 [2, 3, 7, 101]，因此长度为 4。
```

## 方法一：动态规划 O(n²)

### 思路

定义 `dp[i]` = 以 `nums[i]` 结尾的 LIS 长度。

对于每个位置 i，遍历所有 j < i，如果 `nums[j] < nums[i]`，则可以接在 j 后面。

```typescript
/**
 * 动态规划
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function lengthOfLIS(nums: number[]): number {
  const n = nums.length;
  if (n === 0) return 0;
  
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}
```

## 方法二：贪心 + 二分 O(n log n)

### 思路

维护数组 `tails`，`tails[i]` 表示长度为 `i+1` 的 LIS 的最小末尾。

**贪心策略**：相同长度的 LIS，末尾越小，后续能接上的可能性越大。

```typescript
/**
 * 贪心 + 二分
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(n)
 */
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  
  for (const num of nums) {
    let left = 0, right = tails.length;
    
    // 二分查找第一个 >= num 的位置
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] < num) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left === tails.length) {
      tails.push(num);
    } else {
      tails[left] = num;
    }
  }
  
  return tails.length;
}
```

## 方法三：还原 LIS 路径

如果需要输出一个具体的 LIS：

```typescript
function findLIS(nums: number[]): number[] {
  const n = nums.length;
  if (n === 0) return [];
  
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        prev[i] = j;
      }
    }
  }
  
  // 找最大值位置
  let maxIdx = 0;
  for (let i = 1; i < n; i++) {
    if (dp[i] > dp[maxIdx]) {
      maxIdx = i;
    }
  }
  
  // 回溯构造
  const result: number[] = [];
  let idx = maxIdx;
  while (idx !== -1) {
    result.push(nums[idx]);
    idx = prev[idx];
  }
  
  return result.reverse();
}
```

## 示例演算

以 `nums = [10, 9, 2, 5, 3, 7, 101, 18]` 为例：

### DP 方法

| i | nums[i] | dp[i] | 可接在谁后面 |
|---|---------|-------|-------------|
| 0 | 10 | 1 | - |
| 1 | 9 | 1 | - |
| 2 | 2 | 1 | - |
| 3 | 5 | 2 | 2 |
| 4 | 3 | 2 | 2 |
| 5 | 7 | 3 | 5 或 3 |
| 6 | 101 | 4 | 7 |
| 7 | 18 | 4 | 7 |

### 贪心方法

| 步骤 | num | tails | 操作 |
|-----|-----|-------|------|
| 1 | 10 | [10] | 追加 |
| 2 | 9 | [9] | 替换 |
| 3 | 2 | [2] | 替换 |
| 4 | 5 | [2, 5] | 追加 |
| 5 | 3 | [2, 3] | 替换 |
| 6 | 7 | [2, 3, 7] | 追加 |
| 7 | 101 | [2, 3, 7, 101] | 追加 |
| 8 | 18 | [2, 3, 7, 18] | 替换 |

## 变种问题

### 非严格递增

```typescript
// 改为 <= 比较
if (tails[mid] <= num)  // 二分时
```

### 最长递减

```typescript
// 方法一：反转数组
lengthOfLIS(nums.reverse());

// 方法二：改变比较方向
if (nums[j] > nums[i])  // DP 时
```

## 复杂度对比

| 方法 | 时间 | 空间 | 优点 |
|-----|------|------|------|
| DP | O(n²) | O(n) | 简单，可还原 |
| 贪心+二分 | O(n log n) | O(n) | 高效 |

## 相关题目

- [354. 俄罗斯套娃信封](https://leetcode.cn/problems/russian-doll-envelopes/)（二维 LIS）
- [673. 最长递增子序列的个数](https://leetcode.cn/problems/number-of-longest-increasing-subsequence/)（计数）
- [1048. 最长字符串链](https://leetcode.cn/problems/longest-string-chain/)（字符串 LIS）

## 本章小结

1. **核心状态**：`dp[i]` = 以 i 结尾的 LIS 长度
2. **两种方法**：O(n²) DP 和 O(n log n) 贪心+二分
3. **还原路径**：记录前驱索引
4. **变种处理**：非严格、递减等
