# 实战：不同路径

网格路径问题的基础。

## 问题描述

一个机器人位于m × n网格的左上角，每次只能向下或向右移动一步。

机器人试图达到网格的右下角，共有多少条不同的路径？

示例：
- m = 3, n = 7 → 28

## 思路分析

到达`(i, j)`的路径数 = 到达`(i-1, j)`的路径数 + 到达`(i, j-1)`的路径数

因为只能从上面或左边过来。

## 解法1：DP

```javascript
function uniquePaths(m, n) {
    const dp = Array.from({length: m}, () => Array(n).fill(0));
    
    // 第一行和第一列都只有一条路径
    for (let i = 0; i < m; i++) dp[i][0] = 1;
    for (let j = 0; j < n; j++) dp[0][j] = 1;
    
    // 填充其他位置
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    
    return dp[m - 1][n - 1];
}
```

## 解法2：空间优化

只用一行数组：

```javascript
function uniquePaths(m, n) {
    const dp = Array(n).fill(1);
    
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[j] = dp[j] + dp[j - 1];
        }
    }
    
    return dp[n - 1];
}
```

## 解法3：组合数学

总共需要走m-1步向下，n-1步向右，共m+n-2步。

问题变成：在m+n-2步中选择m-1步向下（或n-1步向右）。

```javascript
function uniquePaths(m, n) {
    // C(m+n-2, m-1) = (m+n-2)! / ((m-1)! * (n-1)!)
    let result = 1;
    for (let i = 1; i < m; i++) {
        result = result * (n - 1 + i) / i;
    }
    return Math.round(result);
}
```

时间O(min(m,n))，空间O(1)。

## DP表的理解

```
m=3, n=4:

1  1  1  1
1  2  3  4
1  3  6  10  ← 答案
```

每个格子 = 上 + 左。

## 复杂度分析

**DP解法**：
- 时间：O(m × n)
- 空间：O(n)（优化后）

**组合数学**：
- 时间：O(min(m, n))
- 空间：O(1)

## 小结

不同路径是网格DP的入门题：
- 状态转移简单直观
- 可以用组合数学优化
- 为更复杂的网格问题打基础
