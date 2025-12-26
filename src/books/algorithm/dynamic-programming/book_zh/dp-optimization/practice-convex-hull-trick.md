# 实战：斜率优化示例

本章通过经典题目演示斜率优化（Convex Hull Trick），将 $O(n^2)$ 的 DP 优化到 $O(n \log n)$ 或 $O(n)$。

## 问题：任务分配

**LeetCode 1335. Minimum Difficulty of a Job Schedule**

给定数组 `jobDifficulty` 和天数 `d`，将任务分成 `d` 天完成，每天至少完成一个任务。每天的代价是当天完成的任务中最大难度。求最小总代价。

**示例**：
```
输入: jobDifficulty = [6,5,4,3,2,1], d = 2
输出: 7
解释: 第1天完成 [6,5,4,3,2]，难度6；第2天完成 [1]，难度1。总代价7。
```

## 朴素 DP 解法

### 状态定义

`dp[i][k]` = 前 i 个任务分成 k 天的最小代价

### 转移方程

```
dp[i][k] = min(dp[j][k-1] + max(jobDifficulty[j+1:i+1]))
           for j in [k-2, i-1]
```

第 k 天完成任务 [j+1, i]，前面 j 个任务用 k-1 天。

### 代码实现

```typescript
function minDifficulty(jobDifficulty: number[], d: number): number {
  const n = jobDifficulty.length;
  if (n < d) return -1;
  
  const INF = Infinity;
  const dp: number[][] = Array.from({ length: n }, () => new Array(d + 1).fill(INF));
  
  // 初始化：第1天
  let maxSoFar = 0;
  for (let i = 0; i < n; i++) {
    maxSoFar = Math.max(maxSoFar, jobDifficulty[i]);
    dp[i][1] = maxSoFar;
  }
  
  // DP转移
  for (let k = 2; k <= d; k++) {
    for (let i = k - 1; i < n; i++) {
      for (let j = k - 2; j < i; j++) {
        // 计算 [j+1, i] 的最大值
        let maxVal = 0;
        for (let t = j + 1; t <= i; t++) {
          maxVal = Math.max(maxVal, jobDifficulty[t]);
        }
        dp[i][k] = Math.min(dp[i][k], dp[j][k - 1] + maxVal);
      }
    }
  }
  
  return dp[n - 1][d];
}
```

**时间复杂度**：$O(n^2 \times d)$  
**空间复杂度**：$O(n \times d)$

**瓶颈**：内层循环 $O(n^2)$。

## 单调栈优化

### 优化区间最大值

计算 `[j+1, i]` 的最大值不需要每次重新计算，用单调栈预处理。

```typescript
function minDifficultyOptimized(jobDifficulty: number[], d: number): number {
  const n = jobDifficulty.length;
  if (n < d) return -1;
  
  const INF = Infinity;
  let dp: number[] = new Array(n).fill(INF);
  
  // 初始化第1天
  dp[0] = jobDifficulty[0];
  for (let i = 1; i < n; i++) {
    dp[i] = Math.max(dp[i - 1], jobDifficulty[i]);
  }
  
  // 逐天转移
  for (let k = 2; k <= d; k++) {
    const newDp: number[] = new Array(n).fill(INF);
    const stack: number[] = [];  // 单调递减栈，存储下标
    
    for (let i = k - 1; i < n; i++) {
      newDp[i] = dp[i - 1] + jobDifficulty[i];  // 只有第i个任务
      
      // 单调栈维护区间最大值
      while (stack.length > 0 && jobDifficulty[stack.at(-1)!] <= jobDifficulty[i]) {
        const j = stack.pop()!;
        newDp[i] = Math.min(newDp[i], newDp[j] - jobDifficulty[j] + jobDifficulty[i]);
      }
      
      if (stack.length > 0) {
        newDp[i] = Math.min(newDp[i], newDp[stack.at(-1)!]);
      }
      
      stack.push(i);
    }
    
    dp = newDp;
  }
  
  return dp[n - 1];
}
```

**时间复杂度**：$O(n \times d)$  
**空间复杂度**：$O(n)$

每个元素最多入栈、出栈各一次。

## 经典斜率优化题目

### LeetCode 1478. Allocate Mailboxes

在一条数轴上放置 `k` 个邮筒，使所有房子到最近邮筒的距离和最小。

### 状态定义

`dp[i][j]` = 前 i 个房子放 j 个邮筒的最小代价

### 转移方程

```
dp[i][j] = min(dp[t][j-1] + cost[t+1][i])
           for t in [j-1, i-1]
```

`cost[l][r]` = 区间 [l, r] 只放一个邮筒的代价（中位数最优）

### 预处理 cost

```typescript
function preprocessCost(houses: number[]): number[][] {
  const n = houses.length;
  const cost: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const mid = Math.floor((i + j) / 2);
      for (let k = i; k <= j; k++) {
        cost[i][j] += Math.abs(houses[k] - houses[mid]);
      }
    }
  }
  
  return cost;
}
```

### 朴素 DP

```typescript
function minDistance(houses: number[], k: number): number {
  const n = houses.length;
  houses.sort((a, b) => a - b);
  
  const cost = preprocessCost(houses);
  const INF = Infinity;
  const dp: number[][] = Array.from({ length: n }, () => new Array(k + 1).fill(INF));
  
  // 初始化：k=1
  for (let i = 0; i < n; i++) {
    dp[i][1] = cost[0][i];
  }
  
  // DP转移
  for (let j = 2; j <= k; j++) {
    for (let i = j - 1; i < n; i++) {
      for (let t = j - 2; t < i; t++) {
        dp[i][j] = Math.min(dp[i][j], dp[t][j - 1] + cost[t + 1][i]);
      }
    }
  }
  
  return dp[n - 1][k];
}
```

**时间复杂度**：$O(n^2 \times k)$

### 斜率优化分析

转移方程：
```
dp[i][j] = dp[t][j-1] + cost[t+1][i]
```

**观察**：`cost[t+1][i]` 可以展开为关于 t 的函数。

但这题的 cost 函数比较复杂，斜率优化不太直观。更适合用**四边形不等式**优化。

## 更直接的斜率优化题：超市货架

### 问题描述

有 n 个商品，第 i 个商品高度 `h[i]`，宽度 `w[i]`。货架宽度 `W`，求摆放所有商品的最小总高度。

同一层的商品高度取最大值。

### 状态定义

`dp[i]` = 摆放前 i 个商品的最小总高度

### 转移方程

```
dp[i] = min(dp[j] + maxHeight[j+1:i])
        其中 sum(w[j+1:i]) <= W
```

### 单调队列优化

```typescript
function minHeight(heights: number[], widths: number[], W: number): number {
  const n = heights.length;
  const dp = new Array(n + 1).fill(Infinity);
  dp[0] = 0;
  
  for (let i = 1; i <= n; i++) {
    let width = 0;
    let maxH = 0;
    
    for (let j = i - 1; j >= 0; j--) {
      width += widths[j];
      if (width > W) break;
      
      maxH = Math.max(maxH, heights[j]);
      dp[i] = Math.min(dp[i], dp[j] + maxH);
    }
  }
  
  return dp[n];
}
```

**时间复杂度**：$O(n^2)$

**注意**：这题很难用斜率优化，因为 maxHeight 不是线性的。

## 真正适合斜率优化的题

### LeetCode 1787. Make the XOR of All Segments Equal to Zero

这题可以用斜率优化，但非常复杂，涉及：
1. 状态转移可以写成直线方程
2. 维护下凸包
3. 查询最优直线

由于篇幅限制，这里提供思路：

**转移方程**：
```
dp[i] = min(dp[j] + a[j] × b[i] + c[i])
```

**优化步骤**：
1. 将方程写成 `y = kx + b` 形式
2. 维护凸包（按斜率排序）
3. 二分或双指针查询

## 单调队列 vs 斜率优化

| 特性 | 单调队列 | 斜率优化 |
|------|---------|---------|
| 适用场景 | 固定窗口最值 | 决策单调性 |
| 转移形式 | `dp[i] = f(max/min{dp[j]})` | `dp[i] = dp[j] + cost(j, i)` |
| 优化原理 | 队列维护单调性 | 凸包维护最优直线 |
| 时间复杂度 | $O(n)$ | $O(n \log n)$ 或 $O(n)$ |
| 实现难度 | ⭐⭐ | ⭐⭐⭐⭐ |

## 实战建议

### 识别斜率优化题

1. **转移方程** 形如 `dp[i] = min(dp[j] + a[j] × b[i] + c[i])`
2. **决策单调性**：最优决策点 j 随 i 单调
3. **可以转化为直线方程**

### 何时使用

- 单调队列不够用（不是简单的窗口最值）
- 存在决策单调性
- 能写成直线方程

### 何时不用

- 转移方程无法线性化
- 没有决策单调性
- 单调队列已足够

## 完整示例：栅栏涂色

### 问题

n 个栅栏，涂 k 种颜色，相邻栅栏不能同色，求方案数。

### 状态定义

`dp[i][0]` = 第 i 个与第 i-1 个不同色  
`dp[i][1]` = 第 i 个与第 i-1 个相同色

### 转移方程

```
dp[i][0] = (dp[i-1][0] + dp[i-1][1]) × (k - 1)
dp[i][1] = dp[i-1][0]
```

### 代码

```typescript
function numWays(n: number, k: number): number {
  if (n === 0) return 0;
  if (n === 1) return k;
  
  let same = 0;
  let diff = k;
  
  for (let i = 2; i <= n; i++) {
    const newDiff = (same + diff) * (k - 1);
    const newSame = diff;
    
    same = newSame;
    diff = newDiff;
  }
  
  return same + diff;
}
```

**时间复杂度**：$O(n)$  
**空间复杂度**：$O(1)$

这题不需要斜率优化，滚动数组足矣。

## 总结

**斜率优化核心**：
1. 转移方程可写成 `y = kx + b`
2. 维护凸包（下凸或上凸）
3. 查询最优直线（二分或双指针）

**适用标志**：
- 形如 `dp[i] = min(dp[j] + a[j] × b[i])`
- 存在决策单调性
- 朴素算法 $O(n^2)$

**优化效果**：
- $O(n^2)$ → $O(n \log n)$ （二分查询）
- $O(n^2)$ → $O(n)$ （双指针查询）

**实战建议**：
- 先尝试单调队列
- 单调队列不够用时考虑斜率优化
- 注意凸包的维护和查询

**常见误区**：
- 不是所有 DP 都能斜率优化
- 需要能转化为直线方程
- 实现复杂，注意边界情况

掌握斜率优化，是竞赛选手的必备技能！

## 进阶资源

- **USACO Training**: Convex Hull Optimization
- **Codeforces**: DP Optimizations Tutorial
- **CP-Algorithms**: Convex Hull Trick

持续练习，方能精通！
