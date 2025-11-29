# 实战：最小路径和

网格路径问题的最优化版本。

## 问题描述

给定一个包含非负整数的m × n网格，找出一条从左上角到右下角的路径，使得路径上的数字总和最小。

每次只能向下或者向右移动一步。

示例：
```
输入：[[1,3,1],[1,5,1],[4,2,1]]
输出：7（路径 1→3→1→1→1）
```

## 思路分析

`dp[i][j]` = 到达`(i,j)`的最小路径和

`dp[i][j] = min(dp[i-1][j], dp[i][j-1]) + grid[i][j]`

## 解法1：二维DP

```javascript
function minPathSum(grid) {
    const m = grid.length;
    const n = grid[0].length;
    
    const dp = Array.from({length: m}, () => Array(n).fill(0));
    
    // 初始化起点
    dp[0][0] = grid[0][0];
    
    // 初始化第一行
    for (let j = 1; j < n; j++) {
        dp[0][j] = dp[0][j - 1] + grid[0][j];
    }
    
    // 初始化第一列
    for (let i = 1; i < m; i++) {
        dp[i][0] = dp[i - 1][0] + grid[i][0];
    }
    
    // 填充
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
        }
    }
    
    return dp[m - 1][n - 1];
}
```

## 解法2：空间优化

```javascript
function minPathSum(grid) {
    const m = grid.length;
    const n = grid[0].length;
    
    const dp = Array(n).fill(0);
    
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (i === 0 && j === 0) {
                dp[j] = grid[0][0];
            } else if (i === 0) {
                dp[j] = dp[j - 1] + grid[i][j];
            } else if (j === 0) {
                dp[j] = dp[j] + grid[i][j];
            } else {
                dp[j] = Math.min(dp[j], dp[j - 1]) + grid[i][j];
            }
        }
    }
    
    return dp[n - 1];
}
```

## 解法3：原地修改

可以直接在原数组上修改，省去额外空间：

```javascript
function minPathSum(grid) {
    const m = grid.length;
    const n = grid[0].length;
    
    // 初始化第一行
    for (let j = 1; j < n; j++) {
        grid[0][j] += grid[0][j - 1];
    }
    
    // 初始化第一列
    for (let i = 1; i < m; i++) {
        grid[i][0] += grid[i - 1][0];
    }
    
    // 填充
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            grid[i][j] += Math.min(grid[i - 1][j], grid[i][j - 1]);
        }
    }
    
    return grid[m - 1][n - 1];
}
```

## 与不同路径的对比

| 问题 | 状态含义 | 转移方程 |
|-----|---------|---------|
| 不同路径 | 路径数 | `dp[i][j] = dp[i-1][j] + dp[i][j-1]` |
| 最小路径和 | 最小和 | `dp[i][j] = min(...) + grid[i][j]` |

## 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(1)（原地修改）或 O(n)（一维数组）

## 小结

最小路径和是网格DP的典型应用：
- 计数变成求最值
- 转移从加法变成取min

这种"路径最优"的问题模式很常见。
