# 博弈 DP 概述

博弈 DP 用于解决双人对抗性游戏问题，如棋类、取数、划分等。

## 什么是博弈问题

博弈问题通常具有以下特点：

1. **双人对抗**：两个玩家轮流行动
2. **完全信息**：双方都能看到全部局面
3. **零和博弈**：一方的收益等于另一方的损失
4. **最优策略**：双方都采取对自己最有利的策略

## 博弈 DP 的核心思想

### 极大极小思想

```
我的回合：选择能让我收益最大的行动
对手回合：选择能让我收益最小的行动（即对手收益最大）
```

由于是零和博弈：**对手收益最大 = 我的收益最小**

### 状态设计策略

**策略一：记录先手收益**
```
dp[状态] = 在该状态下，先手玩家能获得的最大收益
```

**策略二：记录收益差**
```
dp[状态] = 在该状态下，当前玩家比对手多获得的收益
```

**策略三：记录胜负**
```
dp[状态] = 在该状态下，先手是否必胜
```

## 经典博弈问题类型

### 1. 必胜必败态

判断先手是否必胜。

**状态分类**：
- **必胜态**：存在一个行动能让对手进入必败态
- **必败态**：所有行动都让对手进入必胜态

```typescript
// 伪代码
function isWinning(state: State): boolean {
  if (isEndState(state)) {
    return isFirstPlayerWin(state);
  }
  
  // 枚举所有可能的行动
  for (const action of getActions(state)) {
    const nextState = apply(state, action);
    
    // 如果存在一个行动让对手进入必败态
    if (!isWinning(nextState)) {
      return true;  // 当前是必胜态
    }
  }
  
  return false;  // 所有行动都让对手进入必胜态，当前是必败态
}
```

### 2. 最优收益

双方都采取最优策略时，先手能获得的最大收益。

```typescript
// 伪代码（极大极小）
function minimax(state: State, isMaxPlayer: boolean): number {
  if (isEndState(state)) {
    return evaluate(state);
  }
  
  if (isMaxPlayer) {
    let maxVal = -Infinity;
    for (const action of getActions(state)) {
      const val = minimax(apply(state, action), false);
      maxVal = Math.max(maxVal, val);
    }
    return maxVal;
  } else {
    let minVal = Infinity;
    for (const action of getActions(state)) {
      const val = minimax(apply(state, action), true);
      minVal = Math.min(minVal, val);
    }
    return minVal;
  }
}
```

### 3. Nim 博弈

经典的取物博弈，使用异或运算判断胜负。

```
若 a1 XOR a2 XOR ... XOR an ≠ 0，先手必胜
若 a1 XOR a2 XOR ... XOR an = 0，先手必败
```

## 博弈 DP 与区间 DP

很多博弈问题可以用区间 DP 解决：

```
dp[i][j] = 在 [i, j] 范围内，当前玩家能获得的最优收益
```

例如"预测赢家"问题：

```typescript
// dp[i][j] = 当前玩家在 [i, j] 中能比对手多拿的分数
dp[i][j] = max(
  nums[i] - dp[i + 1][j],  // 拿左边
  nums[j] - dp[i][j - 1]   // 拿右边
);
```

## 本章内容

本章将介绍以下博弈问题：

1. **基础博弈**：Nim 游戏、石子游戏等
2. **区间博弈**：预测赢家、石子游戏变体
3. **高级博弈**：猫和老鼠等复杂博弈

## 关键技巧

1. **逆向思维**：从终局倒推
2. **对称性**：利用对称简化分析
3. **记忆化搜索**：避免重复计算
4. **状态转换**：极大极小 → 相对收益

## 总结

博弈 DP 的核心是**站在当前玩家的角度思考**：

- 我要最大化我的收益
- 对手也会最大化他的收益（即最小化我的收益）

理解了这个对抗性思维，博弈 DP 就不难了。
