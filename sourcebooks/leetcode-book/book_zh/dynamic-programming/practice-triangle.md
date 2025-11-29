# 实战：三角形最小路径和

自顶向下或自底向上的选择。

## 问题描述

给定一个三角形`triangle`，找出自顶向下的最小路径和。

每一步只能移动到下一行中相邻的结点上。

示例：
```
输入：triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]
   2
  3 4
 6 5 7
4 1 8 3
输出：11（路径 2→3→5→1）
```

## 思路分析

两种DP方向：
1. 自顶向下：`dp[i][j]` = 从顶部到`(i,j)`的最小和
2. 自底向上：`dp[i][j]` = 从`(i,j)`到底部的最小和

自底向上更简洁，因为不需要最后遍历最后一行找最小值。

## 解法1：自顶向下

```javascript
function minimumTotal(triangle) {
    const n = triangle.length;
    const dp = Array.from({length: n}, (_, i) => Array(i + 1).fill(0));
    
    dp[0][0] = triangle[0][0];
    
    for (let i = 1; i < n; i++) {
        // 左边界
        dp[i][0] = dp[i - 1][0] + triangle[i][0];
        // 中间
        for (let j = 1; j < i; j++) {
            dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j]) + triangle[i][j];
        }
        // 右边界
        dp[i][i] = dp[i - 1][i - 1] + triangle[i][i];
    }
    
    return Math.min(...dp[n - 1]);
}
```

## 解法2：自底向上（推荐）

```javascript
function minimumTotal(triangle) {
    const n = triangle.length;
    const dp = [...triangle[n - 1]];  // 从最后一行开始
    
    // 从倒数第二行往上
    for (let i = n - 2; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            dp[j] = Math.min(dp[j], dp[j + 1]) + triangle[i][j];
        }
    }
    
    return dp[0];
}
```

## 为什么自底向上更好

自顶向下需要：
1. 处理边界（左边只能从上面来，右边只能从左上来）
2. 最后遍历最后一行找最小值

自底向上：
1. 没有边界问题（每个位置都可以选下面两个）
2. 最终结果就是`dp[0]`

## 原地修改

```javascript
function minimumTotal(triangle) {
    for (let i = triangle.length - 2; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            triangle[i][j] += Math.min(triangle[i + 1][j], triangle[i + 1][j + 1]);
        }
    }
    return triangle[0][0];
}
```

## 复杂度分析

- **时间复杂度**：O(n²)
- **空间复杂度**：O(n)（一维数组）或 O(1)（原地修改）

## 小结

三角形最小路径和展示了：
- DP方向的选择影响代码复杂度
- 自底向上有时比自顶向下更简洁

选择合适的DP方向可以简化边界处理。
