# 实战：石子游戏 III

## 题目描述

Alice 和 Bob 用几堆石子做游戏。石子排成一行，每堆石子都有一个关联的分数 `stoneValue[i]`（可以为负数）。

Alice 和 Bob 轮流取石子，Alice 先手。每轮中，玩家从剩余石子中取前 1、2 或 3 堆。

返回谁赢得比赛：`"Alice"`、`"Bob"` 或 `"Tie"`。

📎 [LeetCode 1406. 石子游戏 III](https://leetcode.cn/problems/stone-game-iii/)

**示例**：

```
输入：stoneValue = [1, 2, 3, 7]
输出："Bob"
解释：
  Alice 取 [1]（或 [1,2]、[1,2,3]），Bob 总能获得更多

输入：stoneValue = [1, 2, 3, -9]
输出："Alice"

输入：stoneValue = [1, 2, 3, 6]
输出："Tie"
```

## 问题分析

与石子游戏 II 相比更简单：
- 每次只能取 1、2 或 3 堆（固定）
- 有负数，需要考虑避开负数堆

## 状态设计

```
dp[i] = 从第 i 堆开始，当前玩家能比对手多获得的分数
```

## 状态转移

```
dp[i] = max(
  sum[i:i+1] - dp[i+1],  // 取 1 堆
  sum[i:i+2] - dp[i+2],  // 取 2 堆
  sum[i:i+3] - dp[i+3]   // 取 3 堆
)
```

## 代码实现

### 方法一：一维 DP

```typescript
/**
 * 一维 DP
 * 时间复杂度：O(n)
 * 空间复杂度：O(n)
 */
function stoneGameIII(stoneValue: number[]): string {
  const n = stoneValue.length;
  
  // dp[i] = 从 i 开始，当前玩家比对手多拿的分数
  const dp = new Array(n + 1).fill(0);
  
  // 从后往前
  for (let i = n - 1; i >= 0; i--) {
    dp[i] = -Infinity;
    let sum = 0;
    
    // 取 1、2 或 3 堆
    for (let k = 1; k <= 3 && i + k <= n; k++) {
      sum += stoneValue[i + k - 1];
      dp[i] = Math.max(dp[i], sum - dp[i + k]);
    }
  }
  
  if (dp[0] > 0) return "Alice";
  if (dp[0] < 0) return "Bob";
  return "Tie";
}
```

### 方法二：空间优化

由于 `dp[i]` 只依赖 `dp[i+1]`、`dp[i+2]`、`dp[i+3]`，可以用滚动变量：

```typescript
function stoneGameIII(stoneValue: number[]): string {
  const n = stoneValue.length;
  
  // dp1 = dp[i+1], dp2 = dp[i+2], dp3 = dp[i+3]
  let dp1 = 0, dp2 = 0, dp3 = 0;
  
  for (let i = n - 1; i >= 0; i--) {
    let best = -Infinity;
    let sum = 0;
    
    // 取 1 堆
    sum = stoneValue[i];
    best = Math.max(best, sum - dp1);
    
    // 取 2 堆
    if (i + 1 < n) {
      sum += stoneValue[i + 1];
      best = Math.max(best, sum - dp2);
    }
    
    // 取 3 堆
    if (i + 2 < n) {
      sum += stoneValue[i + 2];
      best = Math.max(best, sum - dp3);
    }
    
    // 滚动
    dp3 = dp2;
    dp2 = dp1;
    dp1 = best;
  }
  
  if (dp1 > 0) return "Alice";
  if (dp1 < 0) return "Bob";
  return "Tie";
}
```

### 方法三：记忆化搜索

```typescript
function stoneGameIII(stoneValue: number[]): string {
  const n = stoneValue.length;
  const memo: number[] = new Array(n).fill(undefined);
  
  function dfs(i: number): number {
    if (i >= n) return 0;
    
    if (memo[i] !== undefined) return memo[i];
    
    let best = -Infinity;
    let sum = 0;
    
    for (let k = 0; k < 3 && i + k < n; k++) {
      sum += stoneValue[i + k];
      best = Math.max(best, sum - dfs(i + k + 1));
    }
    
    memo[i] = best;
    return best;
  }
  
  const diff = dfs(0);
  
  if (diff > 0) return "Alice";
  if (diff < 0) return "Bob";
  return "Tie";
}
```

## 示例演算

以 `stoneValue = [1, 2, 3, 7]` 为例：

```
从后往前：

i = 3: 
  取 1 堆：7 - dp[4] = 7 - 0 = 7
  dp[3] = 7

i = 2:
  取 1 堆：3 - dp[3] = 3 - 7 = -4
  取 2 堆：3 + 7 - dp[4] = 10 - 0 = 10
  dp[2] = 10

i = 1:
  取 1 堆：2 - dp[2] = 2 - 10 = -8
  取 2 堆：2 + 3 - dp[3] = 5 - 7 = -2
  取 3 堆：2 + 3 + 7 - dp[4] = 12 - 0 = 12
  dp[1] = 12

i = 0:
  取 1 堆：1 - dp[1] = 1 - 12 = -11
  取 2 堆：1 + 2 - dp[2] = 3 - 10 = -7
  取 3 堆：1 + 2 + 3 - dp[3] = 6 - 7 = -1
  dp[0] = -1

dp[0] = -1 < 0，Bob 获胜！
```

## 负数处理

负数使问题更有趣：

- 如果某堆是大负数，应该尽量让对手吃
- 但如果后面是大正数，可能需要忍痛吃下负数

DP 自动处理这些情况，无需特殊处理。

## 复杂度分析

- **时间复杂度**：O(n)
- **空间复杂度**：O(1)（优化后）

## 本章小结

1. **固定选择**：只能取 1、2、3 堆，比 II 更简单
2. **负数处理**：DP 自动处理
3. **空间优化**：只需要 3 个变量

## 相关题目

- [877. 石子游戏](./practice-stone-game.md)
- [1140. 石子游戏 II](./practice-stone-game-ii.md)
- [1510. 石子游戏 IV](https://leetcode.cn/problems/stone-game-iv/)
