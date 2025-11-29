# 实战：最大正方形

二维DP的经典问题。

## 问题描述

在一个由`'0'`和`'1'`组成的二维矩阵内，找到只包含`'1'`的最大正方形，并返回其面积。

示例：
```
输入：matrix = [
  ["1","0","1","0","0"],
  ["1","0","1","1","1"],
  ["1","1","1","1","1"],
  ["1","0","0","1","0"]
]
输出：4
```

## 思路分析

考虑以`(i, j)`为右下角的正方形。

如果`matrix[i][j] = '1'`，它能形成多大的正方形？

取决于三个方向：上、左、左上角。

## 状态定义

`dp[i][j]` = 以`(i, j)`为右下角的最大正方形边长

## 状态转移

```javascript
if (matrix[i][j] === '1') {
    dp[i][j] = Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]) + 1;
}
```

为什么取最小值？

因为正方形的边长受三个方向限制。只要有一个方向短，正方形就不能更大。

## 解法

```javascript
function maximalSquare(matrix) {
    const m = matrix.length;
    if (m === 0) return 0;
    const n = matrix[0].length;
    
    const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
    let maxSide = 0;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (matrix[i - 1][j - 1] === '1') {
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
                maxSide = Math.max(maxSide, dp[i][j]);
            }
        }
    }
    
    return maxSide * maxSide;
}
```

## 图解转移方程

```
当matrix[i][j] = '1'时：

dp[i-1][j-1]  dp[i-1][j]
            ↘     ↓
 dp[i][j-1]  →  dp[i][j]

dp[i][j] = min(左, 上, 左上) + 1
```

假设左=2，上=2，左上=1，则`dp[i][j] = 1 + 1 = 2`。

## 空间优化

只用一行数组：

```javascript
function maximalSquare(matrix) {
    const m = matrix.length;
    if (m === 0) return 0;
    const n = matrix[0].length;
    
    const dp = Array(n + 1).fill(0);
    let maxSide = 0;
    let prev = 0;  // 保存dp[i-1][j-1]
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const temp = dp[j];  // 保存更新前的值
            if (matrix[i - 1][j - 1] === '1') {
                dp[j] = Math.min(dp[j], dp[j - 1], prev) + 1;
                maxSide = Math.max(maxSide, dp[j]);
            } else {
                dp[j] = 0;
            }
            prev = temp;
        }
        prev = 0;  // 每行开始时重置
    }
    
    return maxSide * maxSide;
}
```

## 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(n)（优化后）

## 为什么是取最小

想象一个2×2的正方形，要扩展成3×3：
- 需要上方有2×2的正方形
- 需要左方有2×2的正方形
- 需要左上角有2×2的正方形

三个都满足才能扩展，所以取最小。

## 小结

最大正方形展示了二维DP的典型模式：
- 状态定义为"以(i,j)为某个位置的最优解"
- 转移依赖相邻位置
- 可以用滚动数组优化空间

这种"右下角"定义在很多矩阵DP中都会用到。
