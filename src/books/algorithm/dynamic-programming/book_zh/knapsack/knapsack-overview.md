# 背包问题概述

背包问题是动态规划中最经典的问题类型，几乎所有 DP 学习都绑定从背包问题开始。掌握背包问题，就掌握了 DP 的精髓。

## 什么是背包问题？

**背包问题**的基本形式是：有一个容量为 W 的背包，有 n 个物品，每个物品有重量 w[i] 和价值 v[i]。问如何选择物品放入背包，使得总价值最大？

这看似是一个简单的选择问题，但它的变体覆盖了动态规划的各种核心技巧。

## 背包问题的分类

| 类型 | 特点 | 典型问题 |
|-----|------|---------|
| 0-1 背包 | 每个物品只能选一次 | 分割等和子集 |
| 完全背包 | 每个物品可以选无限次 | 零钱兑换 |
| 多重背包 | 每个物品有数量限制 | 数位 DP |
| 分组背包 | 每组只能选一个 | 选课问题 |
| 依赖背包 | 物品之间有依赖关系 | 树形背包 |

## 0-1 背包：基础中的基础

### 问题描述

```
有 n 个物品，第 i 个物品的重量为 w[i]，价值为 v[i]
背包容量为 W
每个物品只能选一次
求能装入背包的最大总价值
```

### 状态定义

`dp[i][j]` = 考虑前 i 个物品，背包容量为 j 时的最大价值

### 状态转移

对于第 i 个物品，有两种选择：
1. **不选**：`dp[i][j] = dp[i-1][j]`
2. **选**（如果装得下）：`dp[i][j] = dp[i-1][j-w[i]] + v[i]`

```
dp[i][j] = max(dp[i-1][j], dp[i-1][j-w[i]] + v[i])  if j >= w[i]
dp[i][j] = dp[i-1][j]                                if j < w[i]
```

### 基础实现

```typescript
/**
 * 0-1 背包
 * 时间复杂度：O(n * W)
 * 空间复杂度：O(n * W)
 */
function knapsack01(weights: number[], values: number[], W: number): number {
  const n = weights.length;
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(W + 1).fill(0)
  );
  
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1];
    const v = values[i - 1];
    
    for (let j = 0; j <= W; j++) {
      if (j >= w) {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i - 1][j - w] + v);
      } else {
        dp[i][j] = dp[i - 1][j];
      }
    }
  }
  
  return dp[n][W];
}
```

### 空间优化

注意到 `dp[i][j]` 只依赖 `dp[i-1][...]`，可以用一维数组：

```typescript
/**
 * 0-1 背包（空间优化）
 * 时间复杂度：O(n * W)
 * 空间复杂度：O(W)
 */
function knapsack01(weights: number[], values: number[], W: number): number {
  const dp = new Array(W + 1).fill(0);
  
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    const v = values[i];
    
    // 逆序遍历！防止同一物品被重复选择
    for (let j = W; j >= w; j--) {
      dp[j] = Math.max(dp[j], dp[j - w] + v);
    }
  }
  
  return dp[W];
}
```

**关键点**：必须逆序遍历容量，否则同一物品可能被选多次。

### 为什么要逆序？

```
正序遍历时：
dp[j-w] 可能已经被本轮更新过，包含了第 i 个物品
再用它来更新 dp[j]，相当于第 i 个物品选了两次

逆序遍历时：
更新 dp[j] 时，dp[j-w] 还是上一轮的值（不含第 i 个物品）
保证每个物品只被选一次
```

## 完全背包

### 问题描述

与 0-1 背包的区别：每个物品可以选无限次。

### 状态转移

```
dp[i][j] = max(dp[i-1][j], dp[i][j-w[i]] + v[i])  if j >= w[i]
                         ↑
                    注意这里是 dp[i]，不是 dp[i-1]
```

### 空间优化

```typescript
/**
 * 完全背包
 * 时间复杂度：O(n * W)
 * 空间复杂度：O(W)
 */
function knapsackComplete(weights: number[], values: number[], W: number): number {
  const dp = new Array(W + 1).fill(0);
  
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    const v = values[i];
    
    // 正序遍历！允许同一物品被重复选择
    for (let j = w; j <= W; j++) {
      dp[j] = Math.max(dp[j], dp[j - w] + v);
    }
  }
  
  return dp[W];
}
```

**关键点**：正序遍历容量，允许同一物品被多次选择。

### 0-1 背包 vs 完全背包

| 特点 | 0-1 背包 | 完全背包 |
|-----|---------|---------|
| 物品使用 | 只能用一次 | 可以用无限次 |
| 转移来源 | `dp[i-1][j-w]` | `dp[i][j-w]` |
| 遍历顺序 | 逆序 | 正序 |

## 背包问题的三种问法

### 1. 最值问题

**问**：最大价值是多少？
**状态转移**：`dp[j] = max(dp[j], dp[j-w] + v)`

### 2. 方案数问题

**问**：有多少种方法能装满背包？
**状态转移**：`dp[j] += dp[j-w]`

```typescript
function countWays(weights: number[], W: number): number {
  const dp = new Array(W + 1).fill(0);
  dp[0] = 1;  // 空背包有一种方案
  
  for (const w of weights) {
    for (let j = W; j >= w; j--) {  // 0-1 背包逆序
      dp[j] += dp[j - w];
    }
  }
  
  return dp[W];
}
```

### 3. 可行性问题

**问**：能否装满背包？
**状态转移**：`dp[j] = dp[j] || dp[j-w]`

```typescript
function canFill(weights: number[], W: number): boolean {
  const dp = new Array(W + 1).fill(false);
  dp[0] = true;
  
  for (const w of weights) {
    for (let j = W; j >= w; j--) {
      dp[j] = dp[j] || dp[j - w];
    }
  }
  
  return dp[W];
}
```

## 背包问题与 LeetCode

背包问题在 LeetCode 上有大量变体：

| 题目 | 背包类型 | 问法 |
|-----|---------|------|
| 416. 分割等和子集 | 0-1 背包 | 可行性 |
| 494. 目标和 | 0-1 背包 | 方案数 |
| 322. 零钱兑换 | 完全背包 | 最值 |
| 518. 零钱兑换 II | 完全背包 | 方案数 |
| 377. 组合总和 IV | 完全背包 | 方案数（排列）|
| 474. 一和零 | 二维背包 | 最值 |
| 879. 盈利计划 | 二维背包 | 方案数 |

## 本章学习路线

```
背包问题概述（本章）
    ↓
┌────────────────────────────────┐
│        0-1 背包问题             │
├────────────────────────────────┤
│ • 分割等和子集                  │
│ • 目标和                       │
│ • 最后一块石头的重量 II         │
└────────────────────────────────┘
    ↓
┌────────────────────────────────┐
│        完全背包问题             │
├────────────────────────────────┤
│ • 零钱兑换                      │
│ • 零钱兑换 II                   │
│ • 完全平方数                    │
└────────────────────────────────┘
    ↓
┌────────────────────────────────┐
│        进阶背包问题             │
├────────────────────────────────┤
│ • 一和零（二维背包）            │
│ • 盈利计划                      │
└────────────────────────────────┘
```

## 本章小结

1. **背包问题是 DP 的核心**：掌握背包 = 掌握 DP 思想
2. **三种经典类型**：0-1 背包、完全背包、多重背包
3. **三种问法**：最值、方案数、可行性
4. **空间优化的关键**：遍历顺序（0-1 逆序，完全正序）

下一章，我们从"分割等和子集"开始，深入学习 0-1 背包的应用。
