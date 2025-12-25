# 实战：划分为 K 个相等的子集

## 题目描述

给定一个整数数组 `nums` 和一个正整数 `k`，判断是否可以把这个数组分成 `k` 个非空子集，其和都相等。

📎 [LeetCode 698. 划分为 K 个相等的子集](https://leetcode.cn/problems/partition-to-k-equal-sum-subsets/)

**示例**：

```
输入：nums = [4, 3, 2, 3, 5, 2, 1], k = 4
输出：true
解释：可以分为 (5), (1, 4), (2, 3), (2, 3)，每组和为 5

输入：nums = [1, 2, 3, 4], k = 3
输出：false
```

## 问题分析

**可行性检查**：
1. 总和必须能被 k 整除
2. 每组目标和 = 总和 / k
3. 最大元素不能超过目标和

## 方法一：回溯

标准的回溯解法，尝试将每个数放入 k 个桶中。

```typescript
function canPartitionKSubsets(nums: number[], k: number): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % k !== 0) return false;
  
  const target = sum / k;
  const n = nums.length;
  
  // 降序排序，优先放大数
  nums.sort((a, b) => b - a);
  
  if (nums[0] > target) return false;
  
  // k 个桶
  const buckets = new Array(k).fill(0);
  
  function backtrack(index: number): boolean {
    if (index === n) {
      return buckets.every(b => b === target);
    }
    
    const num = nums[index];
    const seen = new Set<number>();  // 剪枝：相同和的桶只尝试一次
    
    for (let i = 0; i < k; i++) {
      // 剪枝
      if (buckets[i] + num > target) continue;
      if (seen.has(buckets[i])) continue;
      
      seen.add(buckets[i]);
      buckets[i] += num;
      
      if (backtrack(index + 1)) return true;
      
      buckets[i] -= num;
    }
    
    return false;
  }
  
  return backtrack(0);
}
```

## 方法二：状态压缩 DP

### 思路

用状态压缩表示已使用的数字，记录"当前组已填充的和"。

### 代码实现

```typescript
/**
 * 状态压缩 DP
 * 时间复杂度：O(n × 2^n)
 * 空间复杂度：O(2^n)
 */
function canPartitionKSubsets(nums: number[], k: number): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % k !== 0) return false;
  
  const target = sum / k;
  const n = nums.length;
  
  if (Math.max(...nums) > target) return false;
  
  // dp[mask] = 使用 mask 中的数字后，当前组的累计和（对 target 取模）
  // -1 表示不可达
  const dp = new Array(1 << n).fill(-1);
  dp[0] = 0;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === -1) continue;
    
    for (let i = 0; i < n; i++) {
      // 数字 i 已使用
      if (mask & (1 << i)) continue;
      
      // 加入数字 i 后超过当前组目标
      if (dp[mask] + nums[i] > target) continue;
      
      const newMask = mask | (1 << i);
      dp[newMask] = (dp[mask] + nums[i]) % target;
    }
  }
  
  // 所有数字都使用，且最后一组也恰好填满
  return dp[(1 << n) - 1] === 0;
}
```

### 优化：排序剪枝

```typescript
function canPartitionKSubsets(nums: number[], k: number): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % k !== 0) return false;
  
  const target = sum / k;
  const n = nums.length;
  
  if (Math.max(...nums) > target) return false;
  
  // 降序排序
  nums.sort((a, b) => b - a);
  
  const dp = new Array(1 << n).fill(-1);
  dp[0] = 0;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === -1) continue;
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      if (dp[mask] + nums[i] > target) continue;
      
      const newMask = mask | (1 << i);
      dp[newMask] = (dp[mask] + nums[i]) % target;
    }
  }
  
  return dp[(1 << n) - 1] === 0;
}
```

## 方法三：记忆化搜索

```typescript
function canPartitionKSubsets(nums: number[], k: number): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % k !== 0) return false;
  
  const target = sum / k;
  const n = nums.length;
  
  if (Math.max(...nums) > target) return false;
  
  nums.sort((a, b) => b - a);
  
  const memo: Map<number, boolean> = new Map();
  
  function dfs(mask: number, currentSum: number): boolean {
    if (mask === (1 << n) - 1) {
      return currentSum === 0;
    }
    
    // 标准化：当一组填满后，重置 currentSum
    if (currentSum === target) {
      currentSum = 0;
    }
    
    const key = mask * (target + 1) + currentSum;
    if (memo.has(key)) return memo.get(key)!;
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      if (currentSum + nums[i] > target) continue;
      
      if (dfs(mask | (1 << i), currentSum + nums[i])) {
        memo.set(key, true);
        return true;
      }
    }
    
    memo.set(key, false);
    return false;
  }
  
  return dfs(0, 0);
}
```

## 示例演算

以 `nums = [4, 3, 2, 3, 5, 2, 1], k = 4` 为例：

```
sum = 20, target = 5

排序后：[5, 4, 3, 3, 2, 2, 1]

状态压缩 DP：
  dp[0] = 0（当前组已填 0）
  
  使用 5：dp[1] = (0 + 5) % 5 = 0（一组填满）
  使用 4：dp[2] = (0 + 4) % 5 = 4
  使用 3：dp[4] = (0 + 3) % 5 = 3
  ...
  
  从 dp[1] = 0 扩展（已有一组 [5]）:
    使用 4：dp[3] = (0 + 4) % 5 = 4
    ...
  
  从 dp[2] = 4 扩展（当前组已有 4）:
    使用 1：dp[...] = (4 + 1) % 5 = 0（又填满一组）
    ...

最终 dp[1111111] = 0，可以划分
```

## 复杂度分析

| 方法 | 时间 | 空间 |
|-----|------|------|
| 回溯 | O(k^n) 最坏 | O(n) |
| 状态压缩 DP | O(n × 2^n) | O(2^n) |
| 记忆化搜索 | O(n × 2^n × target) | O(2^n × target) |

## 本章小结

1. **可行性检查**：总和整除、最大值不超标
2. **状态设计**：`dp[mask]` = 当前组已填充的和
3. **取模技巧**：`% target` 自动处理组的边界
4. **剪枝优化**：降序排序减少无效搜索

## 相关题目

- [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/)（k=2 的简化版）
- [473. 火柴拼正方形](./practice-matchsticks-square.md)（k=4）
