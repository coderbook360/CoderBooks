# 区间 DP 概述

区间 DP 是一类特殊的动态规划问题，状态定义在区间上，通过合并或分割子区间来求解。

## 什么是区间 DP

**区间 DP** 的特点：
- 状态定义为 `dp[i][j]`，表示区间 `[i, j]` 上的最优解
- 通过枚举分割点 k，将区间分成 `[i, k]` 和 `[k+1, j]` 两部分
- 从小区间逐步推导到大区间

## 经典问题

| 问题 | 描述 |
|-----|------|
| 矩阵链乘法 | 最小乘法次数 |
| 戳气球 | 最大硬币数 |
| 合并石头 | 最小代价 |
| 最长回文子序列 | 最长长度 |
| 回文子串计数 | 回文数量 |

## 区间 DP 的模板

```typescript
// 区间 DP 通用模板
function intervalDP(arr: any[]): number {
  const n = arr.length;
  
  // dp[i][j] = 区间 [i, j] 的最优解
  const dp: number[][] = Array.from(
    { length: n },
    () => new Array(n).fill(初始值)
  );
  
  // 边界：单元素区间
  for (let i = 0; i < n; i++) {
    dp[i][i] = 边界值;
  }
  
  // 枚举区间长度（从小到大）
  for (let len = 2; len <= n; len++) {
    // 枚举左端点
    for (let i = 0; i + len - 1 < n; i++) {
      const j = i + len - 1;  // 右端点
      
      // 枚举分割点
      for (let k = i; k < j; k++) {
        dp[i][j] = optimize(dp[i][j], dp[i][k] + dp[k + 1][j] + 合并代价);
      }
    }
  }
  
  return dp[0][n - 1];
}
```

## 三种枚举方式

### 方式一：枚举长度

```typescript
// 从小区间到大区间
for (let len = 2; len <= n; len++) {
  for (let i = 0; i + len - 1 < n; i++) {
    const j = i + len - 1;
    // 处理 dp[i][j]
  }
}
```

### 方式二：枚举右端点

```typescript
// 对于每个右端点，枚举左端点
for (let j = 0; j < n; j++) {
  for (let i = j; i >= 0; i--) {
    // 处理 dp[i][j]
  }
}
```

### 方式三：枚举左端点（逆序）

```typescript
// 从后往前枚举左端点
for (let i = n - 1; i >= 0; i--) {
  for (let j = i; j < n; j++) {
    // 处理 dp[i][j]
  }
}
```

## 区间 DP 的两种模式

### 模式一：区间合并

将两个子区间合并成一个更大的区间。

**典型问题**：矩阵链乘法、合并石头

```typescript
// 合并模式
dp[i][j] = min(dp[i][k] + dp[k+1][j] + merge_cost(i, j))
```

### 模式二：区间分割

在区间内选择一个元素，分割成左右两部分。

**典型问题**：戳气球、猜数字大小 II

```typescript
// 分割模式
dp[i][j] = max(dp[i][k-1] + dp[k+1][j] + gain(k))
```

## 区间 DP vs 线性 DP

| 特点 | 线性 DP | 区间 DP |
|-----|--------|--------|
| 状态定义 | `dp[i]` | `dp[i][j]` |
| 枚举方式 | 从前往后 | 从小区间到大区间 |
| 转移 | 从前面的状态 | 从子区间合并 |
| 时间复杂度 | 通常 O(n) 或 O(n²) | 通常 O(n³) |

## 记忆化搜索 vs 递推

区间 DP 可以用两种方式实现：

### 记忆化搜索

```typescript
const memo: number[][] = Array.from(
  { length: n },
  () => new Array(n).fill(-1)
);

function dfs(i: number, j: number): number {
  if (i > j) return 0;
  if (memo[i][j] !== -1) return memo[i][j];
  
  // 计算 dp[i][j]
  let result = 初始值;
  for (let k = i; k <= j; k++) {
    result = optimize(result, ...);
  }
  
  memo[i][j] = result;
  return result;
}
```

### 递推

```typescript
for (let len = 2; len <= n; len++) {
  for (let i = 0; i + len - 1 < n; i++) {
    const j = i + len - 1;
    // 计算 dp[i][j]
  }
}
```

**选择建议**：
- 记忆化搜索：更直观，边界情况更容易处理
- 递推：空间可能可以优化，常数更小

## 本章将学习的问题

- **最长回文子串**：经典入门题
- **回文子串计数**：计数型区间 DP
- **最长回文子序列**：与 LCS 相关
- **戳气球**：分割模式的经典题
- **合并石头**：合并模式的经典题
- **移除盒子**：复杂的区间 DP
- **奇怪的打印机**：难题
- **分割回文串 II**：最小分割
- **矩阵链乘法**：原型问题

## 本章小结

1. **区间 DP 特点**：状态定义在区间 `[i, j]` 上
2. **枚举顺序**：从小区间到大区间
3. **两种模式**：合并模式和分割模式
4. **时间复杂度**：通常 O(n³)

**下一章**：我们将学习区间 DP 的枚举方式细节。
