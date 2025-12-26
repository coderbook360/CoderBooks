# 实战：单调队列优化示例

本章通过 LeetCode 真题演示如何用单调队列优化 DP，将时间复杂度从 $O(n \times k)$ 降至 $O(n)$。

## 问题：约束条件下的子序列和

**LeetCode 1425. Constrained Subsequence Sum**

给定整数数组 `nums` 和整数 `k`，返回非空子序列的最大和，约束条件是子序列中任意两个相邻元素在原数组中的距离不超过 `k`。

**示例**：
```
输入: nums = [10,2,-10,5,20], k = 2
输出: 37
解释: 子序列 [10, 2, 5, 20] 和为 37
```

## 朴素 DP 解法

### 状态定义

`dp[i]` = 以 `nums[i]` 结尾的最大子序列和

### 转移方程

```
dp[i] = max(nums[i], max{dp[j] + nums[i]}) for j in [i-k, i-1]
```

要么独自成为子序列，要么接在前面某个位置后面。

### 代码实现

```typescript
function constrainedSubsetSum(nums: number[], k: number): number {
  const n = nums.length;
  const dp = new Array(n);
  dp[0] = nums[0];
  let result = dp[0];
  
  for (let i = 1; i < n; i++) {
    dp[i] = nums[i];  // 至少是自己
    
    // 检查前k个位置
    for (let j = Math.max(0, i - k); j < i; j++) {
      dp[i] = Math.max(dp[i], dp[j] + nums[i]);
    }
    
    result = Math.max(result, dp[i]);
  }
  
  return result;
}
```

**时间复杂度**：$O(n \times k)$  
**空间复杂度**：$O(n)$

**瓶颈**：每次找前 k 个位置的最大值需要 $O(k)$。

## 单调队列优化

### 优化思路

转移方程中需要找：

```
max{dp[j]} for j in [i-k, i-1]
```

这是**滑动窗口最大值**问题！用单调队列 O(1) 求解。

### 单调递减队列

```typescript
class MonotonicQueue {
  private deque: number[] = [];  // 存储下标
  private dp: number[];
  
  constructor(dp: number[]) {
    this.dp = dp;
  }
  
  push(i: number): void {
    // 移除所有小于等于当前值的元素
    while (this.deque.length && this.dp[this.deque.at(-1)!] <= this.dp[i]) {
      this.deque.pop();
    }
    this.deque.push(i);
  }
  
  popExpired(left: number): void {
    while (this.deque.length && this.deque[0] < left) {
      this.deque.shift();
    }
  }
  
  getMax(): number {
    return this.deque.length ? this.dp[this.deque[0]] : Number.NEGATIVE_INFINITY;
  }
}
```

### 优化代码

```typescript
function constrainedSubsetSumOptimized(nums: number[], k: number): number {
  const n = nums.length;
  const dp = new Array(n);
  dp[0] = nums[0];
  
  const deque: number[] = [];  // 单调递减队列，存储下标
  deque.push(0);
  
  let result = dp[0];
  
  for (let i = 1; i < n; i++) {
    // 移除过期元素（下标 < i - k）
    while (deque.length && deque[0] < i - k) {
      deque.shift();
    }
    
    // 从队首获取最大值
    dp[i] = Math.max(nums[i], dp[deque[0]] + nums[i]);
    
    // 维护单调性：移除所有 <= dp[i] 的元素
    while (deque.length && dp[deque.at(-1)!] <= dp[i]) {
      deque.pop();
    }
    
    deque.push(i);
    result = Math.max(result, dp[i]);
  }
  
  return result;
}
```

**时间复杂度**：$O(n)$  
**空间复杂度**：$O(n)$

每个元素最多入队一次、出队一次，均摊 O(1)。

## 执行过程演示

`nums = [10,2,-10,5,20], k = 2`

| i | nums[i] | 窗口 [i-k, i-1] | deque (下标) | deque (值) | max值 | dp[i] |
|---|---------|----------------|--------------|-----------|-------|-------|
| 0 | 10 | - | [0] | [10] | - | 10 |
| 1 | 2 | [0] | [0, 1] | [10, 2] | 10 | 12 |
| 2 | -10 | [0, 1] | [1, 2] | [12, 2] | 12 | 2 |
| 3 | 5 | [1, 2] | [1, 3] | [12, 7] | 12 | 17 |
| 4 | 20 | [2, 3] | [3, 4] | [17, 37] | 17 | 37 |

**详细步骤**：

**i = 0**:
- `dp[0] = 10`
- deque: [0]

**i = 1**:
- 窗口: [0]
- max = dp[0] = 10
- `dp[1] = max(2, 10 + 2) = 12`
- deque: [0, 1] (保留0，因为10 > 2)

**i = 2**:
- 窗口: [0, 1]
- max = dp[0] = 10
- `dp[2] = max(-10, 10 + (-10)) = 0`... 等等，这里有问题！

让我重新计算：

**i = 2**:
- 窗口: [0, 1]
- deque队首是0，dp[0] = 10
- 但我们要取的是 `dp[1]`（更大）！

这里暴露了一个问题：单调队列应该维护递减顺序。

让我修正代码：

```typescript
function constrainedSubsetSumOptimized(nums: number[], k: number): number {
  const n = nums.length;
  const dp = new Array(n);
  dp[0] = nums[0];
  
  const deque: number[] = [0];  // 单调递减队列
  let result = dp[0];
  
  for (let i = 1; i < n; i++) {
    // 移除过期元素
    while (deque.length && deque[0] < i - k) {
      deque.shift();
    }
    
    // 计算 dp[i]
    const maxPrev = deque.length > 0 ? dp[deque[0]] : 0;
    dp[i] = Math.max(nums[i], maxPrev + nums[i]);
    
    // 维护单调递减队列
    while (deque.length && dp[deque.at(-1)!] <= dp[i]) {
      deque.pop();
    }
    deque.push(i);
    
    result = Math.max(result, dp[i]);
  }
  
  return result;
}
```

重新演示：

| i | nums[i] | dp[i] | deque | deque值 |
|---|---------|-------|-------|---------|
| 0 | 10 | 10 | [0] | [10] |
| 1 | 2 | 12 | [1] | [12] |
| 2 | -10 | 2 | [1,2] | [12,2] |
| 3 | 5 | 17 | [3] | [17] |
| 4 | 20 | 37 | [4] | [37] |

**i = 1**:
- 队首 dp[0] = 10
- `dp[1] = max(2, 10 + 2) = 12`
- 移除 0（因为 10 < 12）
- deque: [1]

**i = 2**:
- 队首 dp[1] = 12
- `dp[2] = max(-10, 12 + (-10)) = 2`
- 保留 1（因为 12 > 2）
- deque: [1, 2]

**i = 3**:
- 移除过期：i - k = 1，保留 >= 1
- 队首 dp[1] = 12
- `dp[3] = max(5, 12 + 5) = 17`
- 移除所有 < 17：[1, 2] 都移除
- deque: [3]

**i = 4**:
- 移除过期：i - k = 2，保留 >= 2
- 队首 dp[3] = 17
- `dp[4] = max(20, 17 + 20) = 37`
- deque: [4]

**结果**: 37 ✅

## 完整代码

```typescript
function constrainedSubsetSum(nums: number[], k: number): number {
  const n = nums.length;
  const dp = new Array(n);
  dp[0] = nums[0];
  
  const deque: number[] = [0];
  let result = dp[0];
  
  for (let i = 1; i < n; i++) {
    // 1. 移除过期元素
    while (deque.length && deque[0] < i - k) {
      deque.shift();
    }
    
    // 2. 取队首最大值
    const maxPrev = deque.length > 0 ? Math.max(0, dp[deque[0]]) : 0;
    dp[i] = nums[i] + maxPrev;
    
    // 3. 维护单调性
    while (deque.length && dp[deque.at(-1)!] <= dp[i]) {
      deque.pop();
    }
    deque.push(i);
    
    result = Math.max(result, dp[i]);
  }
  
  return result;
}
```

## 类似题目

### LeetCode 1696. Jump Game VI

给定数组 `nums` 和 `k`，从 0 跳到 n-1，每次最多跳 k 步，求最大分数。

```typescript
function maxResult(nums: number[], k: number): number {
  const n = nums.length;
  const dp = new Array(n);
  dp[0] = nums[0];
  
  const deque: number[] = [0];
  
  for (let i = 1; i < n; i++) {
    // 移除过期
    while (deque.length && deque[0] < i - k) {
      deque.shift();
    }
    
    // 转移
    dp[i] = dp[deque[0]] + nums[i];
    
    // 维护单调性
    while (deque.length && dp[deque.at(-1)!] <= dp[i]) {
      deque.pop();
    }
    deque.push(i);
  }
  
  return dp[n - 1];
}
```

### LeetCode 862. Shortest Subarray with Sum at Least K

找最短子数组，和 >= k。

**关键**：用单调队列维护前缀和的递增序列。

```typescript
function shortestSubarray(nums: number[], k: number): number {
  const n = nums.length;
  const prefix = new Array(n + 1).fill(0);
  
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  
  const deque: number[] = [];
  let minLen = Infinity;
  
  for (let i = 0; i <= n; i++) {
    // 检查是否满足条件
    while (deque.length && prefix[i] - prefix[deque[0]] >= k) {
      minLen = Math.min(minLen, i - deque[0]);
      deque.shift();
    }
    
    // 维护单调递增队列
    while (deque.length && prefix[deque.at(-1)!] >= prefix[i]) {
      deque.pop();
    }
    deque.push(i);
  }
  
  return minLen === Infinity ? -1 : minLen;
}
```

## 总结

**单调队列优化 DP 的标志**：
1. 转移方程需要找**固定窗口**的最值
2. 窗口大小为 k
3. 原始算法 $O(n \times k)$

**优化步骤**：
1. 用双端队列维护单调性
2. 队首存储最值
3. 移除过期元素
4. 移除破坏单调性的元素

**时间复杂度**：从 $O(n \times k)$ 降至 $O(n)$

**关键洞见**：如果 `dp[j] <= dp[i]` 且 `j < i`，则 j 永远不会是最优解。

掌握单调队列优化，是从普通选手到高手的关键一步！
