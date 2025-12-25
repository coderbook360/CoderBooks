# 实战：最小路径和

最小路径和是二维 DP 的经典入门题，也是理解"从起点到终点"类问题的基础。

## 题目描述

给定一个包含非负整数的 `m x n` 网格 `grid`，请找出一条从左上角到右下角的路径，使得路径上的数字总和为最小。

**说明**：每次只能向下或者向右移动一步。

📎 [LeetCode 64. 最小路径和](https://leetcode.cn/problems/minimum-path-sum/)

**示例**：

```
输入：grid = [[1,3,1],
              [1,5,1],
              [4,2,1]]
输出：7
解释：路径 1→3→1→1→1 的总和最小
```

**约束**：
- `m == grid.length`
- `n == grid[i].length`
- `1 <= m, n <= 200`
- `0 <= grid[i][j] <= 200`

## 思路分析

### 为什么是动态规划？

1. **最优子结构**：到达 (i, j) 的最小路径和，取决于到达 (i-1, j) 和 (i, j-1) 的最小路径和
2. **重叠子问题**：计算不同终点时，会重复计算中间格子的最小路径和

### 状态定义

- **状态**：`dp[i][j]` = 从 (0, 0) 到 (i, j) 的最小路径和
- **转移**：`dp[i][j] = min(dp[i-1][j], dp[i][j-1]) + grid[i][j]`
- **边界**：
  - `dp[0][0] = grid[0][0]`
  - 第一行：`dp[0][j] = dp[0][j-1] + grid[0][j]`
  - 第一列：`dp[i][0] = dp[i-1][0] + grid[i][0]`
- **答案**：`dp[m-1][n-1]`

### 为什么边界这么处理？

第一行只能从左边来，第一列只能从上边来：

```
→→→→
↓
↓
↓
```

## 解法一：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(m * n)
 */
function minPathSum(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  const memo: number[][] = Array.from({ length: m }, () => new Array(n).fill(-1));
  
  function dp(i: number, j: number): number {
    // 越界
    if (i < 0 || j < 0) return Infinity;
    
    // 起点
    if (i === 0 && j === 0) return grid[0][0];
    
    // 检查备忘录
    if (memo[i][j] !== -1) return memo[i][j];
    
    // 从上方或左方来，取较小者
    memo[i][j] = Math.min(dp(i - 1, j), dp(i, j - 1)) + grid[i][j];
    return memo[i][j];
  }
  
  return dp(m - 1, n - 1);
}
```

## 解法二：递推（标准 DP）

```typescript
/**
 * 递推
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(m * n)
 */
function minPathSum(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  const dp: number[][] = Array.from({ length: m }, () => new Array(n));
  
  // 起点
  dp[0][0] = grid[0][0];
  
  // 第一行：只能从左边来
  for (let j = 1; j < n; j++) {
    dp[0][j] = dp[0][j - 1] + grid[0][j];
  }
  
  // 第一列：只能从上边来
  for (let i = 1; i < m; i++) {
    dp[i][0] = dp[i - 1][0] + grid[i][0];
  }
  
  // 其余格子
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
    }
  }
  
  return dp[m - 1][n - 1];
}
```

## 解法三：递推 + 空间优化

### 为什么可以优化？

计算 `dp[i][j]` 只依赖：
- `dp[i-1][j]`：上方
- `dp[i][j-1]`：左方

所以只需要保存当前行和上一行，甚至只需要一行！

```typescript
/**
 * 递推 + 一维空间
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(n)
 */
function minPathSum(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  const dp: number[] = new Array(n);
  
  // 第一行
  dp[0] = grid[0][0];
  for (let j = 1; j < n; j++) {
    dp[j] = dp[j - 1] + grid[0][j];
  }
  
  // 逐行更新
  for (let i = 1; i < m; i++) {
    dp[0] += grid[i][0];  // 更新第一列
    for (let j = 1; j < n; j++) {
      // dp[j] 此时还是上一行的值（dp[i-1][j]）
      // dp[j-1] 已经是当前行的值（dp[i][j-1]）
      dp[j] = Math.min(dp[j], dp[j - 1]) + grid[i][j];
    }
  }
  
  return dp[n - 1];
}
```

### 理解一维数组的技巧

```
更新前：dp = [a, b, c, d]  // 上一行的结果
更新中：dp = [a', b', c, d]  // 正在更新
           ↑已更新  ↑待更新

计算 dp[2] 时：
- dp[2] = c（还是上一行的值）= dp[i-1][j]
- dp[1] = b'（已经是当前行）= dp[i][j-1]
```

## 解法四：原地修改

如果允许修改输入数组，可以做到 O(1) 空间：

```typescript
/**
 * 原地修改
 * 时间复杂度：O(m * n)
 * 空间复杂度：O(1)
 */
function minPathSum(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  
  // 第一行
  for (let j = 1; j < n; j++) {
    grid[0][j] += grid[0][j - 1];
  }
  
  // 第一列
  for (let i = 1; i < m; i++) {
    grid[i][0] += grid[i - 1][0];
  }
  
  // 其余格子
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      grid[i][j] += Math.min(grid[i - 1][j], grid[i][j - 1]);
    }
  }
  
  return grid[m - 1][n - 1];
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 记忆化搜索 | O(m * n) | O(m * n) |
| 递推 | O(m * n) | O(m * n) |
| 一维优化 | O(m * n) | O(n) |
| 原地修改 | O(m * n) | O(1) |

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [62. 不同路径](https://leetcode.cn/problems/unique-paths/) | 中等 | 计数型，不是求最小 |
| [63. 不同路径 II](https://leetcode.cn/problems/unique-paths-ii/) | 中等 | 有障碍物 |
| [120. 三角形最小路径和](https://leetcode.cn/problems/triangle/) | 中等 | 从上到下的路径 |
| [931. 下降路径最小和](https://leetcode.cn/problems/minimum-falling-path-sum/) | 中等 | 可以斜着走 |

## 本章小结

1. **网格 DP 的标准模式**：
   - 状态：`dp[i][j]` = 从起点到 (i, j) 的最优值
   - 转移：从相邻格子转移过来
   - 边界：第一行/第一列特殊处理

2. **空间优化技巧**：
   - 二维 → 一维：只保存一行
   - 原地修改：直接在输入数组上计算

3. **理解依赖关系是优化的关键**：画出依赖图，找到真正需要的信息
