# 实战：最大子数组和

最大子数组和是动态规划的经典问题，也是理解"以 i 结尾"状态定义的最佳案例。

## 题目描述

给你一个整数数组 `nums`，请你找出一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。

📎 [LeetCode 53. 最大子数组和](https://leetcode.cn/problems/maximum-subarray/)

**示例**：

```
输入：nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]
输出：6
解释：连续子数组 [4, -1, 2, 1] 的和最大，为 6
```

**约束**：
- `1 <= nums.length <= 10^5`
- `-10^4 <= nums[i] <= 10^4`

**进阶**：如果你已经实现复杂度为 O(n) 的解法，尝试使用更为精妙的分治法求解。

## 思路分析

### 为什么不能用"前 i 个元素的最大和"？

如果定义 `dp[i]` = 前 i 个元素的最大子数组和，问题是：我们不知道这个最大和的子数组在哪结束。

计算 `dp[i+1]` 时：
- 如果 `nums[i]` 要和前面的子数组连起来，我们需要知道那个子数组是否以 `nums[i-1]` 结尾
- 这个信息丢失了！

### 正确的状态定义

`dp[i]` = **以 nums[i] 结尾**的最大子数组和

这样定义的好处：
- 每个子数组的"接口"是确定的（以 i 结尾）
- 计算 `dp[i]` 时，只需决定是否"接上"前面的子数组

### 状态转移

对于 `dp[i]`，有两种选择：
1. **接上前面**：`dp[i-1] + nums[i]`
2. **重新开始**：`nums[i]`（前面的和是负数，不如丢弃）

```
dp[i] = max(dp[i-1] + nums[i], nums[i])
      = max(dp[i-1], 0) + nums[i]
```

### 图示理解

```
nums:    -2    1   -3    4   -1    2    1   -5    4
          ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
dp:      -2    1   -2    4    3    5    6    1    5
          ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑    ↑
决策:    开始 开始 接上 开始 接上 接上 接上 接上 接上

最大值：max(dp) = 6
```

## 解法一：递推

```typescript
/**
 * 递推
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function maxSubArray(nums: number[]): number {
  const n = nums.length;
  const dp = new Array(n);
  
  dp[0] = nums[0];
  let maxSum = dp[0];
  
  for (let i = 1; i < n; i++) {
    // 接上前面 vs 重新开始
    dp[i] = Math.max(dp[i - 1] + nums[i], nums[i]);
    maxSum = Math.max(maxSum, dp[i]);
  }
  
  return maxSum;
}
```

## 解法二：空间优化

`dp[i]` 只依赖 `dp[i-1]`，可以用一个变量：

```typescript
/**
 * 空间优化
 * 时间复杂度：O(n)
 * 空间复杂度：O(1)
 */
function maxSubArray(nums: number[]): number {
  let currentSum = nums[0];  // 以当前位置结尾的最大和
  let maxSum = nums[0];      // 全局最大和
  
  for (let i = 1; i < nums.length; i++) {
    // 如果前面的和是负数，不如丢弃
    currentSum = Math.max(currentSum + nums[i], nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  
  return maxSum;
}
```

### 换一种写法（更直观）

```typescript
function maxSubArray(nums: number[]): number {
  let currentSum = 0;
  let maxSum = -Infinity;
  
  for (const num of nums) {
    // 如果前面的和是负数，丢弃；否则累加
    currentSum = Math.max(currentSum, 0) + num;
    maxSum = Math.max(maxSum, currentSum);
  }
  
  return maxSum;
}
```

## 解法三：Kadane 算法

这个空间优化版本就是著名的 **Kadane 算法**，核心思想：

> 如果一个子数组的和是负数，那么它对后续的贡献是负面的，不如丢弃。

```typescript
/**
 * Kadane 算法
 */
function maxSubArray(nums: number[]): number {
  let maxEndingHere = nums[0];
  let maxSoFar = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    // 关键：负数和不如重新开始
    maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
    maxSoFar = Math.max(maxSoFar, maxEndingHere);
  }
  
  return maxSoFar;
}
```

## 解法四：分治法

分治法将数组分成两半，最大子数组有三种情况：
1. 完全在左半部分
2. 完全在右半部分
3. 跨越中点

```typescript
/**
 * 分治法
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(log n)
 */
function maxSubArray(nums: number[]): number {
  function divideConquer(left: number, right: number): number {
    if (left === right) return nums[left];
    
    const mid = Math.floor((left + right) / 2);
    
    // 左半部分最大和
    const leftMax = divideConquer(left, mid);
    // 右半部分最大和
    const rightMax = divideConquer(mid + 1, right);
    // 跨越中点的最大和
    const crossMax = maxCrossing(left, mid, right);
    
    return Math.max(leftMax, rightMax, crossMax);
  }
  
  function maxCrossing(left: number, mid: number, right: number): number {
    // 从中点向左的最大和
    let leftSum = -Infinity;
    let sum = 0;
    for (let i = mid; i >= left; i--) {
      sum += nums[i];
      leftSum = Math.max(leftSum, sum);
    }
    
    // 从中点向右的最大和
    let rightSum = -Infinity;
    sum = 0;
    for (let i = mid + 1; i <= right; i++) {
      sum += nums[i];
      rightSum = Math.max(rightSum, sum);
    }
    
    return leftSum + rightSum;
  }
  
  return divideConquer(0, nums.length - 1);
}
```

## 变体问题

### 变体一：返回子数组的起止位置

```typescript
function maxSubArray(nums: number[]): [number, number, number] {
  let maxSum = nums[0];
  let start = 0, end = 0;
  
  let currentSum = nums[0];
  let currentStart = 0;
  
  for (let i = 1; i < nums.length; i++) {
    if (currentSum < 0) {
      // 重新开始
      currentSum = nums[i];
      currentStart = i;
    } else {
      // 接上前面
      currentSum += nums[i];
    }
    
    if (currentSum > maxSum) {
      maxSum = currentSum;
      start = currentStart;
      end = i;
    }
  }
  
  return [maxSum, start, end];
}
```

### 变体二：环形数组

📎 [LeetCode 918. 环形子数组的最大和](https://leetcode.cn/problems/maximum-sum-circular-subarray/)

```typescript
function maxSubarraySumCircular(nums: number[]): number {
  const n = nums.length;
  let total = 0;
  let maxSum = -Infinity, minSum = Infinity;
  let currentMax = 0, currentMin = 0;
  
  for (const num of nums) {
    total += num;
    
    // 正常的最大子数组和
    currentMax = Math.max(currentMax + num, num);
    maxSum = Math.max(maxSum, currentMax);
    
    // 最小子数组和
    currentMin = Math.min(currentMin + num, num);
    minSum = Math.min(minSum, currentMin);
  }
  
  // 如果全是负数，返回最大值
  if (maxSum < 0) return maxSum;
  
  // 环形最大和 = max(正常最大和, 总和 - 最小和)
  return Math.max(maxSum, total - minSum);
}
```

### 变体三：至少包含 k 个元素

```typescript
function maxSubArray(nums: number[], k: number): number {
  const n = nums.length;
  
  // 前缀和
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  
  // dp[i] = 以 i 结尾（不限长度）的最大子数组和
  const dp = new Array(n).fill(0);
  dp[0] = nums[0];
  for (let i = 1; i < n; i++) {
    dp[i] = Math.max(dp[i - 1] + nums[i], nums[i]);
  }
  
  let maxSum = prefix[k];  // 前 k 个元素的和
  
  for (let i = k; i < n; i++) {
    // 选项1：恰好 k 个元素（以 i 结尾的前 k 个）
    const exactK = prefix[i + 1] - prefix[i + 1 - k];
    
    // 选项2：超过 k 个元素（前 k 个 + 前面的最大子数组）
    const moreThanK = exactK + Math.max(0, dp[i - k]);
    
    maxSum = Math.max(maxSum, exactK, moreThanK);
  }
  
  return maxSum;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 递推 | O(n) | O(n) |
| 空间优化 | O(n) | O(1) |
| 分治法 | O(n log n) | O(log n) |

## 本章小结

1. **状态定义的艺术**："以 i 结尾" 是解决连续子数组问题的关键
2. **决策简单**：接上前面 vs 重新开始
3. **Kadane 算法**：负数和不如丢弃
4. **答案位置**：需要遍历所有 dp[i] 找最大值

**解题技巧**：
- "以 i 结尾"保证了子数组的连续性
- 空间可以优化到 O(1)
- 环形数组：考虑 total - minSum
