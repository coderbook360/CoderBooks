# 实战：零钱兑换 II

零钱兑换 II 是完全背包的方案数问题，与零钱兑换 I 的最值问题形成对比。

## 题目描述

给你一个整数数组 `coins` 表示不同面额的硬币，另给一个整数 `amount` 表示总金额。

请你计算并返回可以凑成总金额的硬币组合数。如果任何硬币组合都无法凑出总金额，返回 `0`。

假设每一种面额的硬币有无限个。

📎 [LeetCode 518. 零钱兑换 II](https://leetcode.cn/problems/coin-change-ii/)

**示例**：

```
输入：amount = 5, coins = [1, 2, 5]
输出：4
解释：有四种方式可以凑成总金额：
5 = 5
5 = 2 + 2 + 1
5 = 2 + 1 + 1 + 1
5 = 1 + 1 + 1 + 1 + 1
```

**约束**：
- `1 <= coins.length <= 300`
- `1 <= coins[i] <= 5000`
- `coins` 中的所有值互不相同
- `0 <= amount <= 5000`

## 思路分析

### 与零钱兑换 I 的区别

| 问题 | 目标 | 状态转移 |
|-----|------|---------|
| 零钱兑换 I | 最少硬币数 | `dp[j] = min(...)` |
| 零钱兑换 II | 组合方案数 | `dp[j] += ...` |

### 组合 vs 排列

这道题求的是**组合数**（不考虑顺序）：
- [1, 2, 2] 和 [2, 1, 2] 视为同一种方案
- 所以 5 = 2 + 2 + 1 只算一种

### 状态定义

`dp[j]` = 凑出金额 j 的组合数

### 状态转移

```
dp[j] += dp[j - coin]
```

### 遍历顺序的关键

**先物品后背包**：得到组合数
**先背包后物品**：得到排列数

为什么？

```
先物品后背包：
  对于 coins = [1, 2]，先把 1 考虑完，再考虑 2
  不会出现 [2, 1] 这种顺序，因为 2 是后考虑的

先背包后物品：
  对于 amount = 3，会同时考虑 [1, 2] 和 [2, 1]
  因为 dp[3] 可以从 dp[2] + 1 或 dp[1] + 2 转移
```

## 解法一：组合数（先物品后背包）

```typescript
/**
 * 组合数（先遍历物品）
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(amount)
 */
function change(amount: number, coins: number[]): number {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;  // 凑出金额 0 有一种方案：不选任何硬币
  
  // 先遍历物品（关键！）
  for (const coin of coins) {
    // 再遍历背包（正序，完全背包）
    for (let j = coin; j <= amount; j++) {
      dp[j] += dp[j - coin];
    }
  }
  
  return dp[amount];
}
```

### 图示理解

```
coins = [1, 2, 5], amount = 5

处理 coin = 1:
dp = [1, 1, 1, 1, 1, 1]  // 只用 1 凑

处理 coin = 2:
dp = [1, 1, 2, 2, 3, 3]  // 用 1 和 2 凑

处理 coin = 5:
dp = [1, 1, 2, 2, 3, 4]  // 用 1, 2, 5 凑

最终：dp[5] = 4
```

## 排列数对比（组合总和 IV）

📎 [LeetCode 377. 组合总和 IV](https://leetcode.cn/problems/combination-sum-iv/)

如果要求排列数（[1, 2] 和 [2, 1] 算两种），就先遍历背包：

```typescript
/**
 * 排列数（先遍历背包）
 */
function combinationSum4(nums: number[], target: number): number {
  const dp = new Array(target + 1).fill(0);
  dp[0] = 1;
  
  // 先遍历背包（关键！）
  for (let j = 1; j <= target; j++) {
    // 再遍历物品
    for (const num of nums) {
      if (j >= num) {
        dp[j] += dp[j - num];
      }
    }
  }
  
  return dp[target];
}
```

### 组合数 vs 排列数 示例

```
nums = [1, 2], target = 3

组合数（先物品）：
  只有 [1,1,1] 和 [1,2] 两种 → 2

排列数（先背包）：
  [1,1,1], [1,2], [2,1] 三种 → 3
```

## 解法二：二维 DP

```typescript
/**
 * 二维 DP
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(n * amount)
 */
function change(amount: number, coins: number[]): number {
  const n = coins.length;
  
  // dp[i][j] = 用前 i 种硬币凑出金额 j 的方案数
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(amount + 1).fill(0)
  );
  
  // 金额为 0 时，有一种方案（不选）
  for (let i = 0; i <= n; i++) {
    dp[i][0] = 1;
  }
  
  for (let i = 1; i <= n; i++) {
    const coin = coins[i - 1];
    for (let j = 0; j <= amount; j++) {
      dp[i][j] = dp[i - 1][j];  // 不用第 i 种硬币
      if (j >= coin) {
        dp[i][j] += dp[i][j - coin];  // 用第 i 种硬币（可以用多次）
      }
    }
  }
  
  return dp[n][amount];
}
```

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(n * amount)
 */
function change(amount: number, coins: number[]): number {
  const memo: Map<string, number> = new Map();
  
  // coinIndex：当前考虑的硬币索引
  // remain：剩余金额
  function dfs(coinIndex: number, remain: number): number {
    if (remain === 0) return 1;
    if (coinIndex >= coins.length || remain < 0) return 0;
    
    const key = `${coinIndex},${remain}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 不用当前硬币 + 用当前硬币（可以继续用）
    const result = dfs(coinIndex + 1, remain) + dfs(coinIndex, remain - coins[coinIndex]);
    
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, amount);
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 一维 DP | O(n × amount) | O(amount) |
| 二维 DP | O(n × amount) | O(n × amount) |
| 记忆化搜索 | O(n × amount) | O(n × amount) |

## 总结：背包问题的遍历顺序

| 背包类型 | 容量遍历 | 结果 |
|---------|---------|------|
| 0-1 背包 | 逆序 | 每个物品只用一次 |
| 完全背包 | 正序 | 每个物品可用多次 |

| 方案类型 | 外层循环 | 内层循环 | 结果 |
|---------|---------|---------|------|
| 组合数 | 物品 | 背包 | 不考虑顺序 |
| 排列数 | 背包 | 物品 | 考虑顺序 |

## 相关题目

| 题目 | 难度 | 类型 |
|-----|------|------|
| [322. 零钱兑换](https://leetcode.cn/problems/coin-change/) | 中等 | 最值 |
| [377. 组合总和 IV](https://leetcode.cn/problems/combination-sum-iv/) | 中等 | 排列数 |
| [39. 组合总和](https://leetcode.cn/problems/combination-sum/) | 中等 | 回溯 |
| [40. 组合总和 II](https://leetcode.cn/problems/combination-sum-ii/) | 中等 | 回溯 |

## 本章小结

1. **组合数 vs 排列数**：遍历顺序决定结果
2. **先物品后背包**：组合数（不考虑顺序）
3. **先背包后物品**：排列数（考虑顺序）
4. **状态转移**：`dp[j] += dp[j - coin]`

**核心技巧**：
- 方案数问题用累加
- 遍历顺序影响结果类型
- 完全背包正序遍历容量
