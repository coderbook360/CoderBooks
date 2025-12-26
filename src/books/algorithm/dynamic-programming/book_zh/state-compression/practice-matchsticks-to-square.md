# 实战：火柴拼正方形

## 题目描述

给定一个整数数组 `matchsticks`，其中 `matchsticks[i]` 是第 `i` 根火柴的长度。用所有火柴拼成一个正方形，不能折断火柴，每根火柴只能用一次。

📎 [LeetCode 473. 火柴拼正方形](https://leetcode.cn/problems/matchsticks-to-square/)

**示例**：

```
输入：matchsticks = [1,1,2,2,2]
输出：true
解释：可以拼成边长为 2 的正方形

输入：matchsticks = [3,3,3,3,4]
输出：false
解释：不能用这些火柴拼成正方形
```

**约束条件**：
- `1 <= matchsticks.length <= 15`
- `1 <= matchsticks[i] <= 10^8`

## 问题分析

首先要问：这道题的本质是什么？

实际上，这是一个**分组问题**——将 n 根火柴分成 4 组，每组的和都等于正方形的边长。

**可行性检查**：
1. 所有火柴长度之和必须能被 4 整除
2. 单根火柴长度不能超过边长

```typescript
function preCheck(matchsticks: number[]): [boolean, number] {
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  
  // 总和必须是 4 的倍数
  if (sum % 4 !== 0) return [false, 0];
  
  const side = sum / 4;
  
  // 最长火柴不能超过边长
  if (Math.max(...matchsticks) > side) return [false, 0];
  
  return [true, side];
}
```

## 方法一：回溯法

最直观的方法是用回溯，尝试将每根火柴放入 4 条边中的某一条。

### 朴素回溯

```typescript
function makesquare(matchsticks: number[]): boolean {
  const [valid, side] = preCheck(matchsticks);
  if (!valid) return false;
  
  const n = matchsticks.length;
  const sides = [0, 0, 0, 0];  // 4 条边的当前长度
  
  // 降序排序，优先放大的火柴（剪枝）
  matchsticks.sort((a, b) => b - a);
  
  function backtrack(index: number): boolean {
    // 所有火柴都放完了
    if (index === n) {
      return sides.every(s => s === side);
    }
    
    const stick = matchsticks[index];
    
    // 尝试将当前火柴放入每条边
    for (let i = 0; i < 4; i++) {
      // 剪枝：放入后超过边长
      if (sides[i] + stick > side) continue;
      
      // 剪枝：相同长度的边只需尝试一次
      if (i > 0 && sides[i] === sides[i - 1]) continue;
      
      sides[i] += stick;
      if (backtrack(index + 1)) return true;
      sides[i] -= stick;
    }
    
    return false;
  }
  
  return backtrack(0);
}
```

### 剪枝策略解析

**为什么要降序排序？**

大火柴选择少，小火柴选择多。先放大火柴可以更早发现不可行的分支。

**为什么相同长度的边只需尝试一次？**

如果 `sides[0] === sides[1]`，把火柴放入 `sides[0]` 和放入 `sides[1]` 是等价的，只需尝试一个。

## 方法二：状态压缩 DP

### 思路

用一个 n 位的二进制数表示哪些火柴已被使用。

**状态定义**：
- `dp[mask]` 表示使用 mask 中的火柴后，当前边的累计长度

**关键洞见**：
- 每次累计达到边长 side，就开始填充下一条边
- 用 `dp[mask] % side` 记录当前边已填充的长度

### 代码实现

```typescript
/**
 * 状态压缩 DP
 * 时间复杂度：O(n × 2^n)
 * 空间复杂度：O(2^n)
 */
function makesquare(matchsticks: number[]): boolean {
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  const n = matchsticks.length;
  
  if (Math.max(...matchsticks) > side) return false;
  
  // dp[mask] = 使用 mask 中的火柴后，当前边的累计长度
  // -1 表示不可达状态
  const dp = new Array(1 << n).fill(-1);
  dp[0] = 0;  // 初始状态：没有使用任何火柴
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === -1) continue;
    
    // 尝试添加每根未使用的火柴
    for (let i = 0; i < n; i++) {
      // 火柴 i 已被使用
      if (mask & (1 << i)) continue;
      
      // 当前边剩余空间
      const remaining = side - (dp[mask] % side);
      
      // 火柴太长，放不下
      if (matchsticks[i] > remaining) continue;
      
      const newMask = mask | (1 << i);
      dp[newMask] = dp[mask] + matchsticks[i];
    }
  }
  
  // 所有火柴都使用，且恰好填满 4 条边
  return dp[(1 << n) - 1] === sum;
}
```

### 优化：排序 + 提前终止

```typescript
function makesquare(matchsticks: number[]): boolean {
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  const n = matchsticks.length;
  
  // 降序排序
  matchsticks.sort((a, b) => b - a);
  
  if (matchsticks[0] > side) return false;
  
  const dp = new Array(1 << n).fill(-1);
  dp[0] = 0;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === -1) continue;
    
    // 当前边已填充的长度
    const current = dp[mask] % side;
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      
      // 关键优化：填充必须按顺序
      // 避免重复计算等价状态
      if (current + matchsticks[i] <= side) {
        const newMask = mask | (1 << i);
        if (dp[newMask] === -1) {
          dp[newMask] = dp[mask] + matchsticks[i];
        }
      }
    }
  }
  
  return dp[(1 << n) - 1] === sum;
}
```

## 方法三：记忆化搜索

状态压缩 DP 也可以用记忆化搜索实现，逻辑更直观：

```typescript
function makesquare(matchsticks: number[]): boolean {
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  const n = matchsticks.length;
  
  matchsticks.sort((a, b) => b - a);
  if (matchsticks[0] > side) return false;
  
  const memo = new Map<number, boolean>();
  
  function dfs(mask: number, sidesComplete: number, current: number): boolean {
    // 已完成 4 条边
    if (sidesComplete === 4) return true;
    
    // 当前边填满，开始下一条边
    if (current === side) {
      return dfs(mask, sidesComplete + 1, 0);
    }
    
    const key = mask * 100 + current;  // 简化 key
    if (memo.has(key)) return memo.get(key)!;
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      if (current + matchsticks[i] > side) continue;
      
      if (dfs(mask | (1 << i), sidesComplete, current + matchsticks[i])) {
        memo.set(key, true);
        return true;
      }
    }
    
    memo.set(key, false);
    return false;
  }
  
  return dfs(0, 0, 0);
}
```

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| 回溯 + 剪枝 | O(4^n) 最坏 | O(n) | 实际远快于理论值 |
| 状态压缩 DP | O(n × 2^n) | O(2^n) | 适合 n ≤ 15 |
| 记忆化搜索 | O(n × 2^n) | O(2^n) | 与 DP 等价 |

## 关键技巧

**1. 预检查快速排除**
```typescript
if (sum % 4 !== 0 || max > side) return false;
```

**2. 降序排序加速剪枝**

大元素选择少，先处理可以更早发现死路。

**3. 状态设计**

用 `dp[mask] % side` 巧妙地同时记录：
- 已完成多少条边：`dp[mask] / side`
- 当前边填充了多少：`dp[mask] % side`

## 与"划分 K 个子集"的对比

本题是 [698. 划分为K个相等的子集](https://leetcode.cn/problems/partition-to-k-equal-sum-subsets/) 的特例（K=4）。

| 特性 | 火柴拼正方形 | 划分 K 个子集 |
|------|-------------|---------------|
| 分组数 | 固定为 4 | 任意 K |
| 约束 | n ≤ 15 | n ≤ 16 |
| 最佳方法 | 状态压缩 DP | 状态压缩 DP |

## 总结

本题是状态压缩 DP 的经典应用：

1. **问题识别**：分组问题 + 小规模（n ≤ 15）→ 考虑状态压缩
2. **状态设计**：用二进制表示元素使用情况
3. **巧妙记录**：用取模技巧同时维护多个信息
4. **剪枝优化**：排序、等价状态去重

核心思想：**穷举所有子集，但用 DP 避免重复计算**。
