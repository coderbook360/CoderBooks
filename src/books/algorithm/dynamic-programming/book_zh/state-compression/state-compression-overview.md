# 状态压缩 DP 概述

状态压缩 DP 使用二进制数来表示状态集合，是处理"选或不选"问题的强大技巧。

## 什么是状态压缩

当问题涉及到一组元素的选取状态时，可以用一个整数的二进制位来表示：

```
状态 5 = 二进制 101 = 第 0、2 个元素被选中
状态 7 = 二进制 111 = 第 0、1、2 个元素都被选中
```

## 适用场景

状态压缩 DP 适用于：

1. **元素数量较少**：通常 n ≤ 20
2. **需要记录"选了哪些"**：不只是"选了几个"
3. **有约束条件**：如相邻、配对、覆盖等

## 为什么需要状态压缩

考虑旅行商问题（TSP）：

- n 个城市，求经过所有城市的最短路径
- 如果用数组记录访问状态：`visited = [true, false, true, ...]`
- 状态空间太大，无法用普通 DP

用状态压缩：
- `mask = 5`（二进制 101）表示访问了城市 0 和 2
- 状态数 = 2^n，可接受

## 位运算基础

### 常用操作

| 操作 | 代码 | 含义 |
|-----|------|------|
| 取第 i 位 | `(mask >> i) & 1` | 检查第 i 位是否为 1 |
| 设置第 i 位 | `mask \| (1 << i)` | 将第 i 位设为 1 |
| 清除第 i 位 | `mask & ~(1 << i)` | 将第 i 位设为 0 |
| 翻转第 i 位 | `mask ^ (1 << i)` | 0↔1 |
| 最低位的 1 | `mask & (-mask)` | lowbit |
| 去掉最低位的 1 | `mask & (mask - 1)` | 常用于计数 |

### 子集枚举

枚举 mask 的所有子集：

```typescript
// 枚举 mask 的所有非空子集
for (let sub = mask; sub > 0; sub = (sub - 1) & mask) {
  // sub 是 mask 的子集
}
```

### 计算 1 的个数

```typescript
function popcount(x: number): number {
  let count = 0;
  while (x > 0) {
    x &= (x - 1);
    count++;
  }
  return count;
}
```

## 状态压缩 DP 模板

### 基本模板

```typescript
function stateCompressionDP(n: number): number {
  const FULL = (1 << n) - 1;  // 全选状态
  
  // dp[mask] = 当选取状态为 mask 时的最优值
  const dp = new Array(1 << n).fill(初始值);
  dp[0] = 基础值;
  
  for (let mask = 0; mask <= FULL; mask++) {
    // 枚举下一个选择
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;  // 已选过
      
      const nextMask = mask | (1 << i);
      dp[nextMask] = 更新(dp[mask], ...);
    }
  }
  
  return dp[FULL];
}
```

### 带位置的模板（TSP 类型）

```typescript
function tspDP(n: number, dist: number[][]): number {
  const FULL = (1 << n) - 1;
  
  // dp[mask][i] = 访问了 mask 中的城市，当前在 i 的最短路
  const dp = Array.from(
    { length: 1 << n },
    () => new Array(n).fill(Infinity)
  );
  
  dp[1][0] = 0;  // 从城市 0 出发
  
  for (let mask = 1; mask <= FULL; mask++) {
    for (let u = 0; u < n; u++) {
      if (!(mask & (1 << u))) continue;  // u 不在 mask 中
      
      for (let v = 0; v < n; v++) {
        if (mask & (1 << v)) continue;  // v 已访问
        
        const nextMask = mask | (1 << v);
        dp[nextMask][v] = Math.min(
          dp[nextMask][v],
          dp[mask][u] + dist[u][v]
        );
      }
    }
  }
  
  // 从任意城市返回城市 0
  let result = Infinity;
  for (let u = 0; u < n; u++) {
    result = Math.min(result, dp[FULL][u] + dist[u][0]);
  }
  
  return result;
}
```

## 经典问题类型

### 1. 旅行商问题（TSP）

访问所有城市的最短路径。

### 2. 任务分配

n 个人 n 个任务，求最优分配。

### 3. 棋盘覆盖

用特定形状覆盖棋盘。

### 4. 子集划分

将集合划分成满足条件的子集。

## 复杂度分析

- **状态数**：O(2^n)
- **转移**：O(n) 或 O(2^n)（枚举子集）
- **总复杂度**：O(n × 2^n) 或 O(3^n)

通常 n ≤ 20 时可以使用。

## 本章内容

本章将介绍：

1. **基础问题**：最短路、分配问题
2. **子集划分**：划分为 K 个子集
3. **棋盘问题**：多米诺覆盖、N 皇后
4. **综合应用**：综合运用多种技巧

## 总结

状态压缩 DP 的核心：

1. **用二进制表示状态**
2. **位运算操作状态**
3. **枚举转移**

掌握位运算是关键！
