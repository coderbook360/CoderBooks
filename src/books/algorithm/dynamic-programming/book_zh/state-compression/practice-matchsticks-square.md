# 实战：火柴拼正方形

## 题目描述

给你一个整数数组 `matchsticks`，其中 `matchsticks[i]` 是第 `i` 个火柴的长度。

判断能否用所有火柴拼成一个正方形。

📎 [LeetCode 473. 火柴拼正方形](https://leetcode.cn/problems/matchsticks-to-square/)

**示例**：

```
输入：matchsticks = [1, 1, 2, 2, 2]
输出：true
解释：可以拼成边长为 2 的正方形

输入：matchsticks = [3, 3, 3, 3, 4]
输出：false
```

## 问题分析

这是"划分为 K 个相等子集"的特殊情况（k = 4）。

**可行性检查**：
1. 火柴数量 ≥ 4
2. 总长度能被 4 整除
3. 最长火柴不超过边长

## 方法一：回溯

```typescript
function makesquare(matchsticks: number[]): boolean {
  const n = matchsticks.length;
  if (n < 4) return false;
  
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  
  // 降序排序，优先放长火柴
  matchsticks.sort((a, b) => b - a);
  
  if (matchsticks[0] > side) return false;
  
  const sides = [0, 0, 0, 0];
  
  function backtrack(index: number): boolean {
    if (index === n) {
      return sides[0] === side && 
             sides[1] === side && 
             sides[2] === side;
    }
    
    const match = matchsticks[index];
    const seen = new Set<number>();
    
    for (let i = 0; i < 4; i++) {
      if (sides[i] + match > side) continue;
      if (seen.has(sides[i])) continue;
      
      seen.add(sides[i]);
      sides[i] += match;
      
      if (backtrack(index + 1)) return true;
      
      sides[i] -= match;
    }
    
    return false;
  }
  
  return backtrack(0);
}
```

## 方法二：状态压缩 DP

```typescript
/**
 * 状态压缩 DP
 * 时间复杂度：O(n × 2^n)
 * 空间复杂度：O(2^n)
 */
function makesquare(matchsticks: number[]): boolean {
  const n = matchsticks.length;
  if (n < 4) return false;
  
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  
  if (Math.max(...matchsticks) > side) return false;
  
  // dp[mask] = 使用 mask 中的火柴后，当前边已填充的长度（对 side 取模）
  // -1 表示不可达
  const dp = new Array(1 << n).fill(-1);
  dp[0] = 0;
  
  for (let mask = 0; mask < (1 << n); mask++) {
    if (dp[mask] === -1) continue;
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      if (dp[mask] + matchsticks[i] > side) continue;
      
      const newMask = mask | (1 << i);
      dp[newMask] = (dp[mask] + matchsticks[i]) % side;
    }
  }
  
  return dp[(1 << n) - 1] === 0;
}
```

## 方法三：子集划分 DP

枚举所有可能构成一条边的子集。

```typescript
function makesquare(matchsticks: number[]): boolean {
  const n = matchsticks.length;
  if (n < 4) return false;
  
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  
  // 找出所有和为 side 的子集
  const validSubsets: number[] = [];
  
  for (let mask = 0; mask < (1 << n); mask++) {
    let subSum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subSum += matchsticks[i];
      }
    }
    if (subSum === side) {
      validSubsets.push(mask);
    }
  }
  
  // 从有效子集中选 4 个不相交的
  const m = validSubsets.length;
  
  // dp[mask] = 能否从有效子集中选出不相交的子集覆盖 mask
  // 这里我们检查能否选出 4 个覆盖全部
  
  // 简化：直接枚举
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      if (validSubsets[i] & validSubsets[j]) continue;  // 相交
      
      for (let k = j + 1; k < m; k++) {
        const used = validSubsets[i] | validSubsets[j];
        if (used & validSubsets[k]) continue;
        
        for (let l = k + 1; l < m; l++) {
          const used2 = used | validSubsets[k];
          if (used2 & validSubsets[l]) continue;
          
          if ((used2 | validSubsets[l]) === (1 << n) - 1) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}
```

## 优化：递归子集划分

```typescript
function makesquare(matchsticks: number[]): boolean {
  const n = matchsticks.length;
  if (n < 4) return false;
  
  const sum = matchsticks.reduce((a, b) => a + b, 0);
  if (sum % 4 !== 0) return false;
  
  const side = sum / 4;
  
  // 预处理有效子集
  const validSubsets: number[] = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    let subSum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subSum += matchsticks[i];
      }
    }
    if (subSum === side) {
      validSubsets.push(mask);
    }
  }
  
  // 记忆化：dp[mask] = 能用有效子集覆盖 mask 中所有元素吗
  const memo: Map<number, boolean> = new Map();
  
  function canPartition(remaining: number, count: number): boolean {
    if (remaining === 0) return count === 4;
    if (count >= 4) return false;
    
    const key = remaining * 5 + count;
    if (memo.has(key)) return memo.get(key)!;
    
    for (const subset of validSubsets) {
      // subset 必须是 remaining 的子集
      if ((subset & remaining) !== subset) continue;
      
      if (canPartition(remaining ^ subset, count + 1)) {
        memo.set(key, true);
        return true;
      }
    }
    
    memo.set(key, false);
    return false;
  }
  
  return canPartition((1 << n) - 1, 0);
}
```

## 示例演算

以 `matchsticks = [1, 1, 2, 2, 2]` 为例：

```
sum = 8, side = 2
FULL = 11111 = 31

状态压缩 DP：
  dp[0] = 0
  
  使用火柴 0 (长度 1)：dp[1] = 1
  使用火柴 1 (长度 1)：dp[2] = 1
  使用火柴 2 (长度 2)：dp[4] = 0（一边填满）
  使用火柴 3 (长度 2)：dp[8] = 0
  使用火柴 4 (长度 2)：dp[16] = 0
  
  从 dp[1] = 1：
    使用火柴 1：dp[3] = (1+1) % 2 = 0（一边填满）
    使用火柴 2：dp[5] = (1+2) % 2 = 1? 不对，1+2=3>2，跳过
    ...

  继续扩展...

最终 dp[31] = 0，可以拼成正方形
```

## 复杂度分析

| 方法 | 时间 | 空间 |
|-----|------|------|
| 回溯 | O(4^n) 最坏 | O(n) |
| 状态压缩 DP | O(n × 2^n) | O(2^n) |
| 子集枚举 | O(3^n) | O(2^n) |

## 本章小结

1. **k=4 的特殊情况**：比通用划分问题更简单
2. **多种方法**：回溯、状态压缩、子集枚举
3. **剪枝关键**：降序排序、避免重复状态

## 相关题目

- [698. 划分为 K 个相等的子集](./practice-partition-k-subsets.md)
- [416. 分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/)
