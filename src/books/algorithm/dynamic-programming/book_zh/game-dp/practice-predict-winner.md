# 实战：预测赢家

## 题目描述

给你一个整数数组 `nums`。两个玩家轮流进行，每次从数组的两端取一个数字。Alice 先手，假设两人都采取最优策略。

返回 Alice 能否赢得比赛（分数大于等于 Bob）。

📎 [LeetCode 486. 预测赢家](https://leetcode.cn/problems/predict-the-winner/)

**示例**：

```
输入：nums = [1, 5, 2]
输出：false
解释：
  Alice 选 1，Bob 选 5，Alice 选 2
  Alice = 3，Bob = 5，Bob 获胜

输入：nums = [1, 5, 233, 7]
输出：true
解释：
  Alice 选 7，Bob 选 233（或 1），Alice 可以获胜
```

## 问题分析

这道题与"石子游戏"非常相似，区别在于：
- 这里数组长度可以是奇数
- 需要 `>=` 而不是 `>`
- 没有"先手必胜"的数学规律

## 方法一：区间 DP

### 状态定义

```
dp[i][j] = 当前玩家在 nums[i..j] 中能比对手多拿的分数
```

### 代码实现

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n²)
 */
function PredictTheWinner(nums: number[]): boolean {
  const n = nums.length;
  
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // base case
  for (let i = 0; i < n; i++) {
    dp[i][i] = nums[i];
  }
  
  // 枚举区间长度
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      dp[i][j] = Math.max(
        nums[i] - dp[i + 1][j],
        nums[j] - dp[i][j - 1]
      );
    }
  }
  
  return dp[0][n - 1] >= 0;
}
```

### 空间优化

```typescript
function PredictTheWinner(nums: number[]): boolean {
  const n = nums.length;
  const dp = [...nums];
  
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      dp[i] = Math.max(nums[i] - dp[i + 1], nums[j] - dp[i]);
    }
  }
  
  return dp[0] >= 0;
}
```

## 方法二：记忆化搜索

```typescript
function PredictTheWinner(nums: number[]): boolean {
  const n = nums.length;
  const memo: Map<string, number> = new Map();
  
  function dfs(i: number, j: number): number {
    if (i > j) return 0;
    if (i === j) return nums[i];
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const pickLeft = nums[i] - dfs(i + 1, j);
    const pickRight = nums[j] - dfs(i, j - 1);
    
    const result = Math.max(pickLeft, pickRight);
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, n - 1) >= 0;
}
```

## 方法三：另一种状态设计

记录双方的绝对分数：

```typescript
function PredictTheWinner(nums: number[]): boolean {
  const n = nums.length;
  const total = nums.reduce((a, b) => a + b, 0);
  
  // dp[i][j] = 先手在 [i, j] 中能获得的最大分数
  const memo: Map<string, number> = new Map();
  
  function dfs(i: number, j: number): number {
    if (i > j) return 0;
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 区间总和
    let sum = 0;
    for (let k = i; k <= j; k++) sum += nums[k];
    
    // 选左边或右边
    const pickLeft = sum - dfs(i + 1, j);
    const pickRight = sum - dfs(i, j - 1);
    
    const result = Math.max(pickLeft, pickRight);
    memo.set(key, result);
    return result;
  }
  
  const aliceScore = dfs(0, n - 1);
  return aliceScore >= total - aliceScore;
}
```

**理解**：`sum - dfs(next)` 表示我拿完后，区间总和减去对手能拿的最大值。

## 示例演算

以 `nums = [1, 5, 2]` 为例：

```
dp[0][0] = 1, dp[1][1] = 5, dp[2][2] = 2

len = 2:
  dp[0][1] = max(1 - 5, 5 - 1) = max(-4, 4) = 4
  dp[1][2] = max(5 - 2, 2 - 5) = max(3, -3) = 3

len = 3:
  dp[0][2] = max(1 - dp[1][2], 2 - dp[0][1])
           = max(1 - 3, 2 - 4)
           = max(-2, -2)
           = -2

dp[0][2] = -2 < 0，Alice 输！
```

## 本章小结

1. **通用博弈模型**：与石子游戏相同的 DP 框架
2. **区别**：没有特殊数学规律，必须用 DP
3. **获胜条件**：`>= 0` 表示不输（平局也算赢）

## 复杂度分析

- **时间复杂度**：O(n²)
- **空间复杂度**：O(n)（优化后）

## 相关题目

- [877. 石子游戏](./practice-stone-game.md)
- [1140. 石子游戏 II](./practice-stone-game-ii.md)
