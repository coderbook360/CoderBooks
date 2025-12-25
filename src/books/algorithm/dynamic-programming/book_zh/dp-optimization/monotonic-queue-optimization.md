# 单调队列优化

单调队列是优化 DP 转移的利器，可以在 O(1) 时间内找到滑动窗口的最值。

## 问题背景

考虑转移方程：

```
dp[i] = max{dp[j] + cost(j, i)} for j in [i-k, i-1]
```

朴素实现：O(n × k)

如果能 O(1) 找到窗口最值，就能优化到 O(n)。

## 单调队列原理

维护一个双端队列，保持队列中元素单调（递增或递减）。

### 单调递减队列（求最大值）

```typescript
class MonotonicQueue {
  private deque: number[] = [];  // 存储下标
  private arr: number[];
  
  constructor(arr: number[]) {
    this.arr = arr;
  }
  
  // 添加元素（下标）
  push(i: number): void {
    // 移除所有比当前小的元素
    while (this.deque.length && this.arr[this.deque.at(-1)!] <= this.arr[i]) {
      this.deque.pop();
    }
    this.deque.push(i);
  }
  
  // 移除过期元素
  popExpired(left: number): void {
    while (this.deque.length && this.deque[0] < left) {
      this.deque.shift();
    }
  }
  
  // 获取最大值
  getMax(): number {
    return this.arr[this.deque[0]];
  }
}
```

### 为什么是对的？

关键洞见：如果 `arr[j] <= arr[i]` 且 `j < i`，那么 j 永远不会是窗口最大值。

- j 先过期
- 在 j 过期前，i 的值更大

所以 j 可以安全地移除。

## 经典应用：滑动窗口最大值

**LeetCode 239. Sliding Window Maximum**

```typescript
function maxSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = [];  // 存储下标
  
  for (let i = 0; i < nums.length; i++) {
    // 移除过期元素
    while (deque.length && deque[0] < i - k + 1) {
      deque.shift();
    }
    
    // 移除比当前小的元素
    while (deque.length && nums[deque.at(-1)!] <= nums[i]) {
      deque.pop();
    }
    
    deque.push(i);
    
    // 窗口形成后记录结果
    if (i >= k - 1) {
      result.push(nums[deque[0]]);
    }
  }
  
  return result;
}
```

## DP 优化应用

### 问题：跳跃游戏变体

从位置 0 跳到位置 n-1，每次最多跳 k 步，求最小代价。

```typescript
// 朴素：O(n×k)
function minCost(cost: number[], k: number): number {
  const n = cost.length;
  const dp = Array(n).fill(Infinity);
  dp[0] = cost[0];
  
  for (let i = 1; i < n; i++) {
    for (let j = Math.max(0, i - k); j < i; j++) {
      dp[i] = Math.min(dp[i], dp[j] + cost[i]);
    }
  }
  
  return dp[n - 1];
}

// 优化：O(n)
function minCost(cost: number[], k: number): number {
  const n = cost.length;
  const dp = Array(n).fill(Infinity);
  dp[0] = cost[0];
  
  // 单调递增队列（求最小值）
  const deque: number[] = [0];
  
  for (let i = 1; i < n; i++) {
    // 移除过期元素
    while (deque.length && deque[0] < i - k) {
      deque.shift();
    }
    
    // 转移
    dp[i] = dp[deque[0]] + cost[i];
    
    // 维护单调性
    while (deque.length && dp[deque.at(-1)!] >= dp[i]) {
      deque.pop();
    }
    deque.push(i);
  }
  
  return dp[n - 1];
}
```

### 问题：有限制的子序列和

**LeetCode 1425. Constrained Subsequence Sum**

给定数组 nums 和整数 k，找到一个子序列，相邻元素下标差不超过 k，求最大子序列和。

```typescript
function constrainedSubsetSum(nums: number[], k: number): number {
  const n = nums.length;
  const dp = [...nums];  // dp[i] = 以 i 结尾的最大子序列和
  
  const deque: number[] = [];  // 单调递减队列
  let maxSum = dp[0];
  
  for (let i = 0; i < n; i++) {
    // 移除过期
    while (deque.length && deque[0] < i - k) {
      deque.shift();
    }
    
    // 转移：可以不接任何前面的元素
    if (deque.length) {
      dp[i] = Math.max(dp[i], dp[deque[0]] + nums[i]);
    }
    
    // 更新答案
    maxSum = Math.max(maxSum, dp[i]);
    
    // 维护单调性
    while (deque.length && dp[deque.at(-1)!] <= dp[i]) {
      deque.pop();
    }
    deque.push(i);
  }
  
  return maxSum;
}
```

### 问题：绝对差不超过限制的最长子数组

**LeetCode 1438. Longest Continuous Subarray With Absolute Diff Less Than or Equal to Limit**

需要同时维护最大值和最小值，用两个单调队列。

```typescript
function longestSubarray(nums: number[], limit: number): number {
  const maxDeque: number[] = [];  // 单调递减
  const minDeque: number[] = [];  // 单调递增
  
  let left = 0;
  let result = 0;
  
  for (let right = 0; right < nums.length; right++) {
    // 加入右边元素
    while (maxDeque.length && nums[maxDeque.at(-1)!] <= nums[right]) {
      maxDeque.pop();
    }
    maxDeque.push(right);
    
    while (minDeque.length && nums[minDeque.at(-1)!] >= nums[right]) {
      minDeque.pop();
    }
    minDeque.push(right);
    
    // 收缩左边界
    while (nums[maxDeque[0]] - nums[minDeque[0]] > limit) {
      if (maxDeque[0] === left) maxDeque.shift();
      if (minDeque[0] === left) minDeque.shift();
      left++;
    }
    
    result = Math.max(result, right - left + 1);
  }
  
  return result;
}
```

## 单调队列模板

### 求滑动窗口最大值

```typescript
function slidingMax(arr: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = [];  // 存下标，单调递减
  
  for (let i = 0; i < arr.length; i++) {
    // 1. 移除过期
    while (deque.length && deque[0] <= i - k) {
      deque.shift();
    }
    
    // 2. 维护单调性
    while (deque.length && arr[deque.at(-1)!] <= arr[i]) {
      deque.pop();
    }
    
    // 3. 入队
    deque.push(i);
    
    // 4. 记录结果
    if (i >= k - 1) {
      result.push(arr[deque[0]]);
    }
  }
  
  return result;
}
```

### 求滑动窗口最小值

```typescript
function slidingMin(arr: number[], k: number): number[] {
  const result: number[] = [];
  const deque: number[] = [];  // 存下标，单调递增
  
  for (let i = 0; i < arr.length; i++) {
    while (deque.length && deque[0] <= i - k) {
      deque.shift();
    }
    
    while (deque.length && arr[deque.at(-1)!] >= arr[i]) {
      deque.pop();
    }
    
    deque.push(i);
    
    if (i >= k - 1) {
      result.push(arr[deque[0]]);
    }
  }
  
  return result;
}
```

## 复杂度分析

- **时间**：O(n)，每个元素最多入队出队各一次
- **空间**：O(k)，队列最多存 k 个元素

## 适用条件

单调队列优化适用于：

1. **转移来源有范围限制**：只从 [i-k, i-1] 转移
2. **转移代价可分离**：`dp[i] = min/max{dp[j]} + f(i)`
3. **求最值**：需要窗口内的最大或最小值

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [239. 滑动窗口最大值](https://leetcode.cn/problems/sliding-window-maximum/) | 困难 | 经典应用 |
| [1425. 约束子序列和](https://leetcode.cn/problems/constrained-subsequence-sum/) | 困难 | DP + 单调队列 |
| [1438. 绝对差不超过限制的最长子数组](https://leetcode.cn/problems/longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit/) | 中等 | 双单调队列 |

## 总结

单调队列优化的要点：

1. **队列存下标**：方便判断过期
2. **先移除过期**：保证队首在窗口内
3. **维护单调性**：移除无用元素
4. **队首即答案**：O(1) 获取最值

核心思想：
- 利用单调性淘汰无效元素
- 保证队列中只有"有潜力"的元素
- 每个元素 O(1) 摊还
