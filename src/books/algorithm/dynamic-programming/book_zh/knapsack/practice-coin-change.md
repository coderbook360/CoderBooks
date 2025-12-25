# 实战：零钱兑换

零钱兑换是完全背包的经典应用，每种硬币可以使用无限次。

## 题目描述

给你一个整数数组 `coins`，表示不同面额的硬币；以及一个整数 `amount`，表示总金额。

计算并返回可以凑成总金额所需的最少的硬币个数。如果没有任何一种硬币组合能组成总金额，返回 `-1`。

你可以认为每种硬币的数量是无限的。

📎 [LeetCode 322. 零钱兑换](https://leetcode.cn/problems/coin-change/)

**示例**：

```
输入：coins = [1, 2, 5], amount = 11
输出：3
解释：11 = 5 + 5 + 1

输入：coins = [2], amount = 3
输出：-1

输入：coins = [1], amount = 0
输出：0
```

**约束**：
- `1 <= coins.length <= 12`
- `1 <= coins[i] <= 2³¹ - 1`
- `0 <= amount <= 10⁴`

## 思路分析

### 为什么是完全背包？

- 背包容量：amount
- 物品：每种硬币
- 每个物品可以选无限次 → 完全背包
- 目标：最少的硬币数（最小值问题）

### 状态定义

`dp[j]` = 凑出金额 j 所需的最少硬币数

### 状态转移

对于每种硬币 coin，如果选择使用它：
```
dp[j] = min(dp[j], dp[j - coin] + 1)
```

### 初始化

- `dp[0] = 0`：凑出金额 0 需要 0 个硬币
- `dp[j] = Infinity`：初始假设凑不出

## 解法一：完全背包（外层物品）

```typescript
/**
 * 完全背包（先遍历物品）
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(amount)
 */
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  
  // 先遍历物品
  for (const coin of coins) {
    // 再遍历背包（正序，完全背包）
    for (let j = coin; j <= amount; j++) {
      dp[j] = Math.min(dp[j], dp[j - coin] + 1);
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

## 解法二：完全背包（外层背包）

```typescript
/**
 * 完全背包（先遍历背包）
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(amount)
 */
function coinChange(coins: number[], amount: number): number {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  
  // 先遍历背包
  for (let j = 1; j <= amount; j++) {
    // 再遍历物品
    for (const coin of coins) {
      if (j >= coin && dp[j - coin] !== Infinity) {
        dp[j] = Math.min(dp[j], dp[j - coin] + 1);
      }
    }
  }
  
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

### 两种遍历顺序的区别

对于**最值问题**，两种顺序都可以，结果相同。

但对于**方案数问题**：
- 先物品后背包：组合数（不考虑顺序）
- 先背包后物品：排列数（考虑顺序）

这一点在"零钱兑换 II"和"组合总和 IV"中会详细讨论。

## 解法三：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(amount)
 */
function coinChange(coins: number[], amount: number): number {
  const memo = new Map<number, number>();
  
  function dp(remain: number): number {
    if (remain === 0) return 0;
    if (remain < 0) return Infinity;
    
    if (memo.has(remain)) return memo.get(remain)!;
    
    let minCoins = Infinity;
    for (const coin of coins) {
      minCoins = Math.min(minCoins, dp(remain - coin) + 1);
    }
    
    memo.set(remain, minCoins);
    return minCoins;
  }
  
  const result = dp(amount);
  return result === Infinity ? -1 : result;
}
```

## 解法四：BFS

BFS 可以找到最短路径（最少硬币数）：

```typescript
/**
 * BFS
 * 时间复杂度：O(n * amount)
 * 空间复杂度：O(amount)
 */
function coinChange(coins: number[], amount: number): number {
  if (amount === 0) return 0;
  
  const visited = new Set<number>();
  const queue: number[] = [0];
  let steps = 0;
  
  while (queue.length > 0) {
    steps++;
    const size = queue.length;
    
    for (let i = 0; i < size; i++) {
      const curr = queue.shift()!;
      
      for (const coin of coins) {
        const next = curr + coin;
        
        if (next === amount) return steps;
        if (next > amount) continue;
        if (visited.has(next)) continue;
        
        visited.add(next);
        queue.push(next);
      }
    }
  }
  
  return -1;
}
```

## 图示理解

```
coins = [1, 2, 5], amount = 11

dp[0] = 0   (base case)
dp[1] = 1   (1)
dp[2] = 1   (2)
dp[3] = 2   (2+1)
dp[4] = 2   (2+2)
dp[5] = 1   (5)
dp[6] = 2   (5+1)
dp[7] = 2   (5+2)
dp[8] = 3   (5+2+1)
dp[9] = 3   (5+2+2)
dp[10] = 2  (5+5)
dp[11] = 3  (5+5+1)
```

## 输出具体方案

```typescript
function coinChangePath(coins: number[], amount: number): number[] {
  const dp = new Array(amount + 1).fill(Infinity);
  const parent = new Array(amount + 1).fill(-1);
  
  dp[0] = 0;
  
  for (let j = 1; j <= amount; j++) {
    for (const coin of coins) {
      if (j >= coin && dp[j - coin] + 1 < dp[j]) {
        dp[j] = dp[j - coin] + 1;
        parent[j] = coin;  // 记录用了哪个硬币
      }
    }
  }
  
  if (dp[amount] === Infinity) return [];
  
  // 回溯获取方案
  const result: number[] = [];
  let curr = amount;
  
  while (curr > 0) {
    result.push(parent[curr]);
    curr -= parent[curr];
  }
  
  return result;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| DP（外层物品）| O(n × amount) | O(amount) |
| DP（外层背包）| O(n × amount) | O(amount) |
| 记忆化搜索 | O(n × amount) | O(amount) |
| BFS | O(n × amount) | O(amount) |

## 贪心为什么不行？

```
coins = [1, 3, 4], amount = 6

贪心：6 = 4 + 1 + 1 → 3 个硬币
最优：6 = 3 + 3     → 2 个硬币
```

贪心每次选最大面额的硬币，但这不一定是最优解。

只有当硬币面额满足特殊条件（如每个面额是更小面额的倍数）时，贪心才正确。

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [518. 零钱兑换 II](https://leetcode.cn/problems/coin-change-ii/) | 中等 | 方案数 |
| [377. 组合总和 IV](https://leetcode.cn/problems/combination-sum-iv/) | 中等 | 排列数 |
| [279. 完全平方数](https://leetcode.cn/problems/perfect-squares/) | 中等 | 平方数做硬币 |

## 本章小结

1. **完全背包特点**：每种硬币可用无限次
2. **遍历顺序**：正序遍历背包容量
3. **初始化**：`dp[0] = 0`，其余为 Infinity
4. **答案处理**：检查是否为 Infinity

**核心技巧**：
- 最小值问题初始化为 Infinity
- 正序遍历允许重复选择
- BFS 也可以求最短路径
