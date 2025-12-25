# 实战：石子游戏 II

## 题目描述

Alice 和 Bob 继续石子游戏。许多堆石子排成一行，每堆都有正整数颗石子 `piles[i]`。

游戏规则：
- 每回合玩家可以从剩余石子堆的开头取走前 `1` 到 `2M` 堆石子
- `M` 的初始值为 `1`
- 每次取完后，`M` 更新为 `max(M, 取走的堆数)`

假设 Alice 先手且双方都采取最优策略，返回 Alice 能获得的最大石子数。

📎 [LeetCode 1140. 石子游戏 II](https://leetcode.cn/problems/stone-game-ii/)

**示例**：

```
输入：piles = [2, 7, 9, 4, 4]
输出：10
解释：
  M = 1，Alice 取 1 堆 [2]，M 保持 1
  M = 1，Bob 取 2 堆 [7, 9]，M 变成 2
  M = 2，Alice 取 2 堆 [4, 4]
  Alice = 2 + 4 + 4 = 10
```

## 问题分析

与之前的博弈问题不同：
- 不是从两端取，而是从开头取
- 可以取的数量取决于 `M` 的值
- `M` 会随游戏进行而变化

## 状态设计

```
dp[i][m] = 从第 i 堆开始，当前 M = m 时，当前玩家能获得的最大石子数
```

## 状态转移

当前玩家可以取 `1` 到 `2m` 堆：

```
dp[i][m] = max(sum[i:] - dp[i + x][max(m, x)]) for x in 1..2m
```

**理解**：
- 我取了前 x 堆，获得 `sum[i:i+x]`
- 剩余石子为 `sum[i+x:]`
- 对手能获得 `dp[i + x][max(m, x)]`
- 我能获得 `sum[i:] - dp[i + x][max(m, x)]`

## 代码实现

### 方法一：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n³)
 * 空间复杂度：O(n²)
 */
function stoneGameII(piles: number[]): number {
  const n = piles.length;
  
  // 后缀和
  const suffix = new Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    suffix[i] = suffix[i + 1] + piles[i];
  }
  
  const memo: number[][] = Array.from(
    { length: n },
    () => new Array(n + 1).fill(-1)
  );
  
  function dfs(i: number, m: number): number {
    // 如果可以全部拿完
    if (i + 2 * m >= n) {
      return suffix[i];
    }
    
    if (memo[i][m] !== -1) return memo[i][m];
    
    let best = 0;
    // 尝试取 1 到 2m 堆
    for (let x = 1; x <= 2 * m && i + x <= n; x++) {
      // 对手在 [i+x, n) 能获得 dfs(i+x, max(m, x))
      // 我能获得 suffix[i] - dfs(i+x, max(m, x))
      const opponentBest = dfs(i + x, Math.max(m, x));
      best = Math.max(best, suffix[i] - opponentBest);
    }
    
    memo[i][m] = best;
    return best;
  }
  
  return dfs(0, 1);
}
```

### 方法二：迭代 DP

```typescript
function stoneGameII(piles: number[]): number {
  const n = piles.length;
  
  // 后缀和
  const suffix = new Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    suffix[i] = suffix[i + 1] + piles[i];
  }
  
  // dp[i][m] = 从 i 开始，M = m 时当前玩家的最大收益
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  // 从后往前填表
  for (let i = n - 1; i >= 0; i--) {
    for (let m = 1; m <= n; m++) {
      // 如果可以全部拿完
      if (i + 2 * m >= n) {
        dp[i][m] = suffix[i];
        continue;
      }
      
      // 尝试取 1 到 2m 堆
      for (let x = 1; x <= 2 * m && i + x <= n; x++) {
        dp[i][m] = Math.max(
          dp[i][m],
          suffix[i] - dp[i + x][Math.max(m, x)]
        );
      }
    }
  }
  
  return dp[0][1];
}
```

## 示例演算

以 `piles = [2, 7, 9, 4, 4]` 为例：

```
后缀和：suffix = [26, 24, 17, 8, 4, 0]

从后往前：

i = 4, m = 1:
  可以取 1-2 堆，i + 2m = 6 >= n = 5
  dp[4][1] = suffix[4] = 4

i = 3:
  m = 1: i + 2 = 5 >= 5, dp[3][1] = suffix[3] = 8
  m >= 2: dp[3][m] = suffix[3] = 8

i = 2:
  m = 1: 取 1 堆：suffix[2] - dp[3][1] = 17 - 8 = 9
         取 2 堆：suffix[2] - dp[4][2] = 17 - 4 = 13
         dp[2][1] = 13
  m = 2: 可以取 1-4 堆，全拿
         dp[2][2] = suffix[2] = 17

i = 1:
  m = 1: 取 1 堆：suffix[1] - dp[2][1] = 24 - 13 = 11
         取 2 堆：suffix[1] - dp[3][2] = 24 - 8 = 16
         dp[1][1] = 16

i = 0:
  m = 1: 取 1 堆：suffix[0] - dp[1][1] = 26 - 16 = 10
         取 2 堆：suffix[0] - dp[2][2] = 26 - 17 = 9
         dp[0][1] = 10

答案：10
```

## 复杂度分析

- **时间复杂度**：O(n³)
  - 状态数 O(n²)
  - 每个状态转移 O(n)
  
- **空间复杂度**：O(n²)

## 本章小结

1. **动态 M 值**：状态需要记录 M
2. **后缀和技巧**：`suffix[i] - dp[next]` 简化计算
3. **全拿边界**：`i + 2m >= n` 时可以全拿

## 相关题目

- [877. 石子游戏](./practice-stone-game.md)
- [1406. 石子游戏 III](./practice-stone-game-iii.md)
