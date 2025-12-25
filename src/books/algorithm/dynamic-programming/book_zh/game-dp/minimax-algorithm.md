# 极大极小搜索

极大极小（Minimax）是博弈问题的核心算法思想。

## 核心思想

在双人零和博弈中：

- **Max 玩家**：希望最大化自己的收益
- **Min 玩家**：希望最小化对手的收益（等价于最大化自己的收益）

由于是零和博弈，Min 玩家最小化对手收益 = 最大化自己收益。

## 算法框架

```typescript
function minimax(
  state: State,
  isMaxPlayer: boolean,
  memo: Map<string, number>
): number {
  // 终止条件
  if (isGameOver(state)) {
    return evaluate(state);  // 评估局面对 Max 玩家的价值
  }
  
  // 记忆化
  const key = serialize(state);
  if (memo.has(key)) return memo.get(key)!;
  
  const moves = getValidMoves(state);
  
  if (isMaxPlayer) {
    // Max 玩家选择最大值
    let maxVal = -Infinity;
    for (const move of moves) {
      const nextState = applyMove(state, move);
      const val = minimax(nextState, false, memo);
      maxVal = Math.max(maxVal, val);
    }
    memo.set(key, maxVal);
    return maxVal;
  } else {
    // Min 玩家选择最小值
    let minVal = Infinity;
    for (const move of moves) {
      const nextState = applyMove(state, move);
      const val = minimax(nextState, true, memo);
      minVal = Math.min(minVal, val);
    }
    memo.set(key, minVal);
    return minVal;
  }
}
```

## 简化：相对收益表示

在很多问题中，我们可以用**当前玩家相对于对手的收益**来简化：

```
dp[state] = 当前玩家能比对手多获得的分数
```

这样就不需要区分 Max 和 Min 玩家了：

```typescript
function solve(state: State, memo: Map<string, number>): number {
  if (isGameOver(state)) {
    return 0;  // 没有剩余分数
  }
  
  const key = serialize(state);
  if (memo.has(key)) return memo.get(key)!;
  
  let best = -Infinity;
  for (const move of getValidMoves(state)) {
    // 我拿到 score，对手的相对收益变成 -solve(nextState)
    const score = getValue(move);
    const nextState = applyMove(state, move);
    best = Math.max(best, score - solve(nextState, memo));
  }
  
  memo.set(key, best);
  return best;
}
```

**关键理解**：`score - solve(nextState)` 表示：
- 我拿到 `score` 分
- 对手在下一状态能比我多拿 `solve(nextState)` 分
- 所以我比对手多拿 `score - solve(nextState)` 分

## 示例：预测赢家

```
给定数组 nums，两人轮流从两端取数，问先手能否获胜（总分不低于对手）。
```

```typescript
function PredictTheWinner(nums: number[]): boolean {
  const n = nums.length;
  const memo: Map<string, number> = new Map();
  
  function dfs(i: number, j: number): number {
    if (i > j) return 0;
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    // 选左边 vs 选右边
    const pickLeft = nums[i] - dfs(i + 1, j);
    const pickRight = nums[j] - dfs(i, j - 1);
    
    const result = Math.max(pickLeft, pickRight);
    memo.set(key, result);
    return result;
  }
  
  return dfs(0, n - 1) >= 0;
}
```

## Alpha-Beta 剪枝

在极大极小搜索中，可以通过剪枝减少搜索空间：

```typescript
function alphabeta(
  state: State,
  depth: number,
  alpha: number,  // Max 玩家的最佳选择
  beta: number,   // Min 玩家的最佳选择
  isMaxPlayer: boolean
): number {
  if (depth === 0 || isGameOver(state)) {
    return evaluate(state);
  }
  
  if (isMaxPlayer) {
    let value = -Infinity;
    for (const move of getValidMoves(state)) {
      const nextState = applyMove(state, move);
      value = Math.max(value, alphabeta(nextState, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;  // Beta 剪枝
    }
    return value;
  } else {
    let value = Infinity;
    for (const move of getValidMoves(state)) {
      const nextState = applyMove(state, move);
      value = Math.min(value, alphabeta(nextState, depth - 1, alpha, beta, true));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;  // Alpha 剪枝
    }
    return value;
  }
}

// 调用
alphabeta(initialState, maxDepth, -Infinity, Infinity, true);
```

## 剪枝原理

- **Alpha**：Max 玩家到目前为止找到的最佳值
- **Beta**：Min 玩家到目前为止找到的最佳值

当 `alpha >= beta` 时：
- 对于 Max 玩家：Min 玩家不会选择这个分支（有更好的选择）
- 对于 Min 玩家：Max 玩家不会选择这个分支（有更好的选择）

## 本章小结

1. **极大极小**：Max 选最大，Min 选最小
2. **相对收益**：`score - dfs(next)` 简化思维
3. **Alpha-Beta**：剪枝优化，减少搜索空间

**何时用极大极小**：
- 双人对抗
- 完全信息
- 零和博弈
- 需要求最优策略

**何时用 Alpha-Beta**：
- 搜索空间太大
- 需要限制搜索深度
- 对局复杂的棋类游戏
