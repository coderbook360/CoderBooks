# 实战：石子游戏

## 题目描述

Alice 和 Bob 用几堆石子在做游戏。一共有偶数堆石子，排成一行；每堆都有正整数颗石子。

游戏以谁手中的石子最多来决定胜负。Alice 和 Bob 轮流进行，Alice 先开始。每回合，玩家从行的开始或结束处取走整堆石子。

假设 Alice 和 Bob 都发挥出最佳水平，当 Alice 赢得比赛时返回 `true`，当 Bob 赢得比赛时返回 `false`。

📎 [LeetCode 877. 石子游戏](https://leetcode.cn/problems/stone-game/)

**示例**：

```
输入：piles = [5, 3, 4, 5]
输出：true
解释：
  Alice 先取开始 5 颗，剩 [3, 4, 5]
  Bob 取结束 5 颗，剩 [3, 4]
  Alice 取 4 颗，剩 [3]
  Bob 取 3 颗
  Alice 得 9，Bob 得 8，Alice 获胜
```

## 方法一：区间 DP

### 状态定义

```
dp[i][j] = 在 piles[i..j] 中，当前玩家能比对手多拿的石子数
```

### 状态转移

```
dp[i][j] = max(
  piles[i] - dp[i + 1][j],  // 拿左边
  piles[j] - dp[i][j - 1]   // 拿右边
)
```

**理解**：我拿了 `piles[i]`，在剩余区间中对手能比我多拿 `dp[i+1][j]`，所以我比对手多 `piles[i] - dp[i+1][j]`。

### 代码实现

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n²)
 * 空间复杂度：O(n²)
 */
function stoneGame(piles: number[]): boolean {
  const n = piles.length;
  
  // dp[i][j] = 当前玩家在 [i, j] 中能比对手多拿的数量
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // base case：单个堆
  for (let i = 0; i < n; i++) {
    dp[i][i] = piles[i];
  }
  
  // 枚举区间长度
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      dp[i][j] = Math.max(
        piles[i] - dp[i + 1][j],
        piles[j] - dp[i][j - 1]
      );
    }
  }
  
  return dp[0][n - 1] > 0;
}
```

### 空间优化

```typescript
function stoneGame(piles: number[]): boolean {
  const n = piles.length;
  const dp = [...piles];  // dp[i] 最初表示 dp[i][i]
  
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      dp[i] = Math.max(piles[i] - dp[i + 1], piles[j] - dp[i]);
    }
  }
  
  return dp[0] > 0;
}
```

## 方法二：记忆化搜索

```typescript
function stoneGame(piles: number[]): boolean {
  const n = piles.length;
  const memo: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(undefined)
  );
  
  function dfs(i: number, j: number): number {
    if (i > j) return 0;
    if (i === j) return piles[i];
    
    if (memo[i][j] !== undefined) return memo[i][j];
    
    const pickLeft = piles[i] - dfs(i + 1, j);
    const pickRight = piles[j] - dfs(i, j - 1);
    
    memo[i][j] = Math.max(pickLeft, pickRight);
    return memo[i][j];
  }
  
  return dfs(0, n - 1) > 0;
}
```

## 方法三：数学证明（最优解）

对于这道特定题目，Alice 永远获胜！

**证明**：

由于堆数是偶数，可以将石子堆分成两组：
- 奇数位置：piles[0], piles[2], piles[4], ...
- 偶数位置：piles[1], piles[3], piles[5], ...

两组的总和不可能相等（题目保证总数是奇数）。

Alice 可以始终选择总和较大的那一组：
- 如果奇数组更大，Alice 总是取奇数位置
- 如果偶数组更大，Alice 总是取偶数位置

```typescript
function stoneGame(piles: number[]): boolean {
  // Alice 永远能赢
  return true;
}
```

## 示例演算

以 `piles = [5, 3, 4, 5]` 为例：

```
初始：dp[0][0]=5, dp[1][1]=3, dp[2][2]=4, dp[3][3]=5

len = 2：
  dp[0][1] = max(5 - dp[1][1], 3 - dp[0][0]) = max(5-3, 3-5) = max(2, -2) = 2
  dp[1][2] = max(3 - dp[2][2], 4 - dp[1][1]) = max(3-4, 4-3) = max(-1, 1) = 1
  dp[2][3] = max(4 - dp[3][3], 5 - dp[2][2]) = max(4-5, 5-4) = max(-1, 1) = 1

len = 3：
  dp[0][2] = max(5 - dp[1][2], 4 - dp[0][1]) = max(5-1, 4-2) = max(4, 2) = 4
  dp[1][3] = max(3 - dp[2][3], 5 - dp[1][2]) = max(3-1, 5-1) = max(2, 4) = 4

len = 4：
  dp[0][3] = max(5 - dp[1][3], 5 - dp[0][2]) = max(5-4, 5-4) = max(1, 1) = 1

dp[0][3] = 1 > 0，Alice 获胜！
```

## 本章小结

1. **区间博弈模型**：`dp[i][j]` = 当前玩家在区间内的相对收益
2. **转移公式**：`max(拿左边 - 对手收益, 拿右边 - 对手收益)`
3. **数学技巧**：特定条件下可以证明先手必胜

## 相关题目

- [486. 预测赢家](./practice-predict-winner.md)
- [1140. 石子游戏 II](./practice-stone-game-ii.md)
- [1406. 石子游戏 III](./practice-stone-game-iii.md)
