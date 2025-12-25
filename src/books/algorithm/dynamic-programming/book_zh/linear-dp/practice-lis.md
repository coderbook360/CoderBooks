# 实战：最长递增子序列

最长递增子序列（LIS）是动态规划的经典问题，也是理解"以 i 结尾"状态定义的进阶案例。

## 题目描述

给你一个整数数组 `nums`，找到其中最长严格递增子序列的长度。

**子序列**是由数组派生而来的序列，删除（或不删除）数组中的元素而不改变其余元素的顺序。

📎 [LeetCode 300. 最长递增子序列](https://leetcode.cn/problems/longest-increasing-subsequence/)

**示例**：

```
输入：nums = [10, 9, 2, 5, 3, 7, 101, 18]
输出：4
解释：最长递增子序列是 [2, 3, 7, 101]，长度为 4
```

**约束**：
- `1 <= nums.length <= 2500`
- `-10^4 <= nums[i] <= 10^4`

**进阶**：你能将算法的时间复杂度降低到 O(n log n) 吗？

## 思路分析

### 子序列 vs 子数组

| 特性 | 子数组 | 子序列 |
|-----|-------|-------|
| 连续性 | 必须连续 | 不必连续 |
| 顺序 | 保持原顺序 | 保持原顺序 |
| 例子 | [2, 5, 3] | [2, 3, 7] |

### 状态定义

`dp[i]` = 以 `nums[i]` 结尾的最长递增子序列长度

为什么是"以 i 结尾"？因为我们需要知道子序列的最后一个元素是什么，才能判断新元素能否接上去。

### 状态转移

对于 `dp[i]`，遍历所有 `j < i`：
- 如果 `nums[j] < nums[i]`，可以把 `nums[i]` 接到以 `nums[j]` 结尾的子序列后面
- `dp[i] = max(dp[j] + 1)`，对所有满足条件的 j

```
dp[i] = max(dp[j] + 1) for all j < i and nums[j] < nums[i]
```

如果没有任何 `nums[j] < nums[i]`，则 `dp[i] = 1`（自己单独成序列）。

### 图示理解

```
nums:  10    9    2    5    3    7   101   18
        ↓    ↓    ↓    ↓    ↓    ↓    ↓     ↓
dp:     1    1    1    2    2    3    4     4
                       ↑    ↑    ↑    ↑     ↑
                      2→5  2→3 3→7 7→101 7→18

LIS: [2, 3, 7, 101] 或 [2, 3, 7, 18]
```

## 解法一：O(n²) 动态规划

```typescript
/**
 * O(n²) 动态规划
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n)
 */
function lengthOfLIS(nums: number[]): number {
  const n = nums.length;
  const dp = new Array(n).fill(1);  // 至少自己一个
  
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

### 输出具体序列

```typescript
function findLIS(nums: number[]): number[] {
  const n = nums.length;
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);  // 记录前驱
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
        prev[i] = j;  // 记录从哪里转移来
      }
    }
  }
  
  // 找到最大值的位置
  let maxLen = 0, maxIdx = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] > maxLen) {
      maxLen = dp[i];
      maxIdx = i;
    }
  }
  
  // 回溯构建序列
  const lis: number[] = [];
  for (let i = maxIdx; i !== -1; i = prev[i]) {
    lis.unshift(nums[i]);
  }
  
  return lis;
}
```

## 解法二：O(n log n) 贪心 + 二分

**核心思想**：维护一个数组 `tails`，`tails[i]` 表示长度为 `i+1` 的递增子序列的最小末尾元素。

为什么贪心？同样长度的递增子序列，末尾元素越小，后续能接上的元素越多。

### 算法流程

1. 遍历 `nums` 中的每个元素 `num`
2. 如果 `num` 大于 `tails` 的所有元素，追加到末尾
3. 否则，用二分查找找到第一个 ≥ num 的位置，替换它

```typescript
/**
 * O(n log n) 贪心 + 二分
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(n)
 */
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  
  for (const num of nums) {
    // 二分查找：第一个 >= num 的位置
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] < num) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    if (left === tails.length) {
      tails.push(num);  // 追加
    } else {
      tails[left] = num;  // 替换
    }
  }
  
  return tails.length;
}
```

### 图示理解

```
nums = [10, 9, 2, 5, 3, 7, 101, 18]

处理 10: tails = [10]
处理 9:  tails = [9]   (替换 10)
处理 2:  tails = [2]   (替换 9)
处理 5:  tails = [2, 5] (追加)
处理 3:  tails = [2, 3] (替换 5)
处理 7:  tails = [2, 3, 7] (追加)
处理 101: tails = [2, 3, 7, 101] (追加)
处理 18: tails = [2, 3, 7, 18] (替换 101)

最终长度：4
```

**注意**：`tails` 数组不一定是实际的 LIS，它只保证长度正确。

### 为什么这是正确的？

- `tails` 始终保持递增
- `tails[i]` 是所有长度为 `i+1` 的递增子序列的最小末尾
- 新元素要么扩展最长序列，要么优化某个长度的末尾

## 变体问题

### 变体一：最长非递减子序列

只需把 `<` 改成 `<=`：

```typescript
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  
  for (const num of nums) {
    // 找第一个 > num 的位置（而不是 >= num）
    let left = 0, right = tails.length;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tails[mid] <= num) {  // 改这里
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

### 变体二：最长递增子序列的个数

📎 [LeetCode 673. 最长递增子序列的个数](https://leetcode.cn/problems/number-of-longest-increasing-subsequence/)

```typescript
function findNumberOfLIS(nums: number[]): number {
  const n = nums.length;
  const dp = new Array(n).fill(1);     // 长度
  const count = new Array(n).fill(1);  // 个数
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1;
          count[i] = count[j];
        } else if (dp[j] + 1 === dp[i]) {
          count[i] += count[j];
        }
      }
    }
  }
  
  const maxLen = Math.max(...dp);
  let result = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i] === maxLen) {
      result += count[i];
    }
  }
  
  return result;
}
```

### 变体三：俄罗斯套娃信封

📎 [LeetCode 354. 俄罗斯套娃信封问题](https://leetcode.cn/problems/russian-doll-envelopes/)

```typescript
function maxEnvelopes(envelopes: number[][]): number {
  // 按宽度升序，宽度相同时按高度降序
  envelopes.sort((a, b) => a[0] === b[0] ? b[1] - a[1] : a[0] - b[0]);
  
  // 对高度求 LIS
  const heights = envelopes.map(e => e[1]);
  return lengthOfLIS(heights);
}
```

### 变体四：最少需要几个递增子序列

📎 [LeetCode 1713. 得到子序列的最少操作次数](https://leetcode.cn/problems/minimum-operations-to-make-a-subsequence/)（相关问题）

根据 Dilworth 定理：最少需要的递增子序列数 = 最长非递增子序列长度

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| O(n²) DP | O(n²) | O(n) |
| 贪心 + 二分 | O(n log n) | O(n) |

## 本章小结

1. **状态定义**：`dp[i]` = 以 `nums[i]` 结尾的 LIS 长度
2. **O(n²) 解法**：遍历所有 `j < i`，找满足条件的最大 `dp[j] + 1`
3. **O(n log n) 解法**：维护最小末尾数组，用二分查找优化
4. **答案位置**：遍历所有 `dp[i]` 找最大值

**核心技巧**：
- "以 i 结尾"是处理子序列问题的标准定义
- 贪心思想：末尾元素越小，扩展空间越大
- 二分优化：在有序数组中快速定位
