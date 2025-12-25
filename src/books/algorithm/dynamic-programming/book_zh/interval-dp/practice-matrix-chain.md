# 实战：矩阵链乘法

## 题目描述

给定 `n` 个矩阵的维度，矩阵 `A[i]` 的维度为 `p[i-1] × p[i]`（即行数 × 列数）。

计算这些矩阵的乘积 `A[1] × A[2] × ... × A[n]` 的最小乘法次数。

矩阵乘法满足结合律，不同的计算顺序会导致不同的运算次数。

📎 [LeetCode 1039. 多边形三角剖分的最低得分](https://leetcode.cn/problems/minimum-score-triangulation-of-polygon/)（类似问题）

**示例**：

```
输入：p = [10, 30, 5, 60]
解释：有 3 个矩阵，维度分别为 10×30, 30×5, 5×60

方案 1：(A1 × A2) × A3
  A1 × A2: 10 × 30 × 5 = 1500
  结果 × A3: 10 × 5 × 60 = 3000
  总计: 4500

方案 2：A1 × (A2 × A3)
  A2 × A3: 30 × 5 × 60 = 9000
  A1 × 结果: 10 × 30 × 60 = 18000
  总计: 27000

输出：4500（方案 1 更优）
```

## 问题分析

这是区间 DP 的经典问题。对于矩阵链 `A[i..j]`：

- **子问题**：求 `A[i] × A[i+1] × ... × A[j]` 的最少乘法次数
- **选择**：在哪里分割，即 `(A[i..k]) × (A[k+1..j])`

## 状态定义

```
dp[i][j] = 计算 A[i] × A[i+1] × ... × A[j] 的最少乘法次数
```

## 状态转移

```
dp[i][j] = min(dp[i][k] + dp[k+1][j] + p[i-1] * p[k] * p[j])
         对于所有 i <= k < j
```

**理解**：
- `dp[i][k]`：计算左边部分的代价，结果维度为 `p[i-1] × p[k]`
- `dp[k+1][j]`：计算右边部分的代价，结果维度为 `p[k] × p[j]`
- `p[i-1] * p[k] * p[j]`：两个结果矩阵相乘的代价

## 代码实现

### 方法一：区间 DP

```typescript
/**
 * 区间 DP
 * 时间复杂度：O(n³)
 * 空间复杂度：O(n²)
 */
function matrixChainOrder(p: number[]): number {
  const n = p.length - 1;  // 矩阵个数
  
  if (n <= 1) return 0;
  
  // dp[i][j] = 计算 A[i..j] 的最少乘法次数
  // 矩阵编号 1 到 n，维度 p[i-1] × p[i]
  const dp: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(n + 1).fill(0)
  );
  
  // 枚举区间长度
  for (let len = 2; len <= n; len++) {
    for (let i = 1; i + len - 1 <= n; i++) {
      const j = i + len - 1;
      
      dp[i][j] = Infinity;
      
      // 枚举分割点
      for (let k = i; k < j; k++) {
        const cost = dp[i][k] + dp[k + 1][j] + p[i - 1] * p[k] * p[j];
        dp[i][j] = Math.min(dp[i][j], cost);
      }
    }
  }
  
  return dp[1][n];
}
```

### 方法二：记忆化搜索

```typescript
function matrixChainOrder(p: number[]): number {
  const n = p.length - 1;
  
  if (n <= 1) return 0;
  
  const memo: number[][] = Array.from(
    { length: n + 1 },
    () => new Array(n + 1).fill(-1)
  );
  
  function dfs(i: number, j: number): number {
    if (i === j) return 0;
    
    if (memo[i][j] !== -1) return memo[i][j];
    
    let result = Infinity;
    for (let k = i; k < j; k++) {
      const cost = dfs(i, k) + dfs(k + 1, j) + p[i - 1] * p[k] * p[j];
      result = Math.min(result, cost);
    }
    
    memo[i][j] = result;
    return result;
  }
  
  return dfs(1, n);
}
```

## LeetCode 1039：多边形三角剖分

这是矩阵链乘法的变形。给定凸多边形的顶点值，求三角剖分的最低得分。

```typescript
/**
 * LeetCode 1039. 多边形三角剖分的最低得分
 */
function minScoreTriangulation(values: number[]): number {
  const n = values.length;
  
  // dp[i][j] = 从顶点 i 到 j 的多边形的最低剖分得分
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(0)
  );
  
  // 枚举区间长度（至少 3 个顶点才能形成三角形）
  for (let len = 3; len <= n; len++) {
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;
      
      dp[i][j] = Infinity;
      
      // 枚举第三个顶点
      for (let k = i + 1; k < j; k++) {
        const score = dp[i][k] + dp[k][j] + values[i] * values[k] * values[j];
        dp[i][j] = Math.min(dp[i][j], score);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 示例演算

以 `p = [10, 30, 5, 60]` 为例：

```
n = 3（3 个矩阵）
A1: 10×30, A2: 30×5, A3: 5×60

初始：dp[i][i] = 0

len = 2:
  dp[1][2]: k=1
    = dp[1][1] + dp[2][2] + p[0]*p[1]*p[2]
    = 0 + 0 + 10*30*5 = 1500
  
  dp[2][3]: k=2
    = dp[2][2] + dp[3][3] + p[1]*p[2]*p[3]
    = 0 + 0 + 30*5*60 = 9000

len = 3:
  dp[1][3]:
    k=1: dp[1][1] + dp[2][3] + p[0]*p[1]*p[3]
       = 0 + 9000 + 10*30*60 = 27000
    k=2: dp[1][2] + dp[3][3] + p[0]*p[2]*p[3]
       = 1500 + 0 + 10*5*60 = 4500
    
    dp[1][3] = min(27000, 4500) = 4500

答案：4500
```

## 区间 DP 模板总结

矩阵链乘法是区间 DP 的模板题，很多问题都可以归约到这个模型：

```typescript
// 区间 DP 通用模板
for (let len = 2; len <= n; len++) {           // 枚举区间长度
  for (let i = start; i + len - 1 <= end; i++) { // 枚举左端点
    const j = i + len - 1;                       // 计算右端点
    
    dp[i][j] = 初始值;
    
    for (let k = i; k < j; k++) {                // 枚举分割点
      dp[i][j] = min/max(dp[i][j], dp[i][k] + dp[k+1][j] + 合并代价);
    }
  }
}
```

## 本章小结

1. **经典模型**：矩阵链乘法是区间 DP 的起源
2. **状态含义**：区间 `[i, j]` 的最优值
3. **转移核心**：枚举分割点，考虑合并代价
4. **应用广泛**：很多问题可以建模为矩阵链乘法

## 相关题目

- [312. 戳气球](./practice-burst-balloons.md)
- [1039. 多边形三角剖分的最低得分](https://leetcode.cn/problems/minimum-score-triangulation-of-polygon/)
- [1000. 合并石头的最低成本](./practice-merge-stones.md)
