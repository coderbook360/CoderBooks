# 实战：不同路径II

网格中有障碍物的变体。

## 问题描述

网格中有障碍物，用`1`表示。求从左上角到右下角的不同路径数。

示例：
```
输入：[[0,0,0],[0,1,0],[0,0,0]]
输出：2
解释：路径在(1,1)处有障碍物
```

## 思路分析

与基础版本类似，但需要处理：
1. 障碍物格子路径数为0
2. 如果起点或终点是障碍物，返回0

## 解法

```javascript
function uniquePathsWithObstacles(obstacleGrid) {
    const m = obstacleGrid.length;
    const n = obstacleGrid[0].length;
    
    // 起点或终点是障碍物
    if (obstacleGrid[0][0] === 1 || obstacleGrid[m-1][n-1] === 1) {
        return 0;
    }
    
    const dp = Array(n).fill(0);
    dp[0] = 1;
    
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (obstacleGrid[i][j] === 1) {
                dp[j] = 0;  // 障碍物
            } else if (j > 0) {
                dp[j] = dp[j] + dp[j - 1];
            }
        }
    }
    
    return dp[n - 1];
}
```

## 二维DP版本

```javascript
function uniquePathsWithObstacles(obstacleGrid) {
    const m = obstacleGrid.length;
    const n = obstacleGrid[0].length;
    
    if (obstacleGrid[0][0] === 1) return 0;
    
    const dp = Array.from({length: m}, () => Array(n).fill(0));
    
    // 初始化第一列
    for (let i = 0; i < m; i++) {
        if (obstacleGrid[i][0] === 1) break;
        dp[i][0] = 1;
    }
    
    // 初始化第一行
    for (let j = 0; j < n; j++) {
        if (obstacleGrid[0][j] === 1) break;
        dp[0][j] = 1;
    }
    
    // 填充
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            if (obstacleGrid[i][j] === 0) {
                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
            }
        }
    }
    
    return dp[m - 1][n - 1];
}
```

## 第一行/列的初始化

第一行和第一列的特殊处理：
- 遇到障碍物后，后面的格子都无法到达
- 所以用`break`而不是`continue`

```
例如第一行：
0 0 1 0 0
1 1 0 0 0  ← 障碍物后面都是0
```

## 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(n)

## 小结

不同路径II展示了如何处理网格中的约束条件：
- 障碍物格子设为0
- 注意第一行/列的特殊情况

这种处理约束的方式在很多网格DP中都会用到。
