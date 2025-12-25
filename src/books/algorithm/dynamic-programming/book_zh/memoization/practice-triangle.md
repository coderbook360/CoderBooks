# 实战：三角形最小路径和

三角形最小路径和是另一道经典的路径型 DP 问题，与最小路径和类似但有自己的特点。

## 题目描述

给定一个三角形 `triangle`，找出自顶向下的最小路径和。每一步只能移动到下一行中相邻的节点上。

📎 [LeetCode 120. 三角形最小路径和](https://leetcode.cn/problems/triangle/)

**示例**：

```
输入：triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]

     2
    3 4
   6 5 7
  4 1 8 3

输出：11
解释：路径 2→3→5→1 的总和最小
```

**约束**：
- `1 <= triangle.length <= 200`
- `triangle[i].length == i + 1`
- `-10^4 <= triangle[i][j] <= 10^4`

**进阶**：你可以只使用 O(n) 的额外空间吗？

## 思路分析

### 与最小路径和的区别

| 特点 | 最小路径和 | 三角形 |
|-----|-----------|-------|
| 形状 | 矩形网格 | 三角形 |
| 移动方向 | 右或下 | 左下或右下 |
| 每行长度 | 固定 | 递增 |
| 终点 | 右下角 | 最后一行任意位置 |

### 状态定义

**从上到下**：
- **状态**：`dp[i][j]` = 从顶部到位置 (i, j) 的最小路径和
- **转移**：`dp[i][j] = min(dp[i-1][j-1], dp[i-1][j]) + triangle[i][j]`
- **边界**：`dp[0][0] = triangle[0][0]`
- **答案**：`min(dp[n-1][0], dp[n-1][1], ..., dp[n-1][n-1])`

**从下到上**（更简洁）：
- **状态**：`dp[i][j]` = 从位置 (i, j) 到底部的最小路径和
- **转移**：`dp[i][j] = min(dp[i+1][j], dp[i+1][j+1]) + triangle[i][j]`
- **边界**：最后一行直接是 `triangle[n-1][j]`
- **答案**：`dp[0][0]`

从下到上更优雅：不需要在最后遍历找最小值。

## 解法一：从上到下递推

```typescript
/**
 * 从上到下递推
 * 时间复杂度：O(n^2)
 * 空间复杂度：O(n^2)
 */
function minimumTotal(triangle: number[][]): number {
  const n = triangle.length;
  const dp: number[][] = Array.from({ length: n }, (_, i) => new Array(i + 1));
  
  // 起点
  dp[0][0] = triangle[0][0];
  
  // 逐行填充
  for (let i = 1; i < n; i++) {
    // 每行第一个：只能从上一行第一个来
    dp[i][0] = dp[i - 1][0] + triangle[i][0];
    
    // 中间元素：可以从左上或正上来
    for (let j = 1; j < i; j++) {
      dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j]) + triangle[i][j];
    }
    
    // 每行最后一个：只能从上一行最后一个来
    dp[i][i] = dp[i - 1][i - 1] + triangle[i][i];
  }
  
  // 找最后一行的最小值
  return Math.min(...dp[n - 1]);
}
```

## 解法二：从下到上递推（推荐）

```typescript
/**
 * 从下到上递推
 * 时间复杂度：O(n^2)
 * 空间复杂度：O(n^2)
 */
function minimumTotal(triangle: number[][]): number {
  const n = triangle.length;
  const dp: number[][] = Array.from({ length: n }, (_, i) => new Array(i + 1));
  
  // 最后一行初始化
  for (let j = 0; j < n; j++) {
    dp[n - 1][j] = triangle[n - 1][j];
  }
  
  // 从倒数第二行向上
  for (let i = n - 2; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      dp[i][j] = Math.min(dp[i + 1][j], dp[i + 1][j + 1]) + triangle[i][j];
    }
  }
  
  return dp[0][0];
}
```

### 为什么从下到上更好？

1. **不需要特殊处理边界**：每个位置都有两个选择
2. **答案直接在顶部**：不需要遍历最后一行找最小值
3. **空间优化更自然**：可以直接复用下一行的空间

## 解法三：空间优化

### 从下到上 + 一维数组

```typescript
/**
 * 从下到上 + 一维优化
 * 时间复杂度：O(n^2)
 * 空间复杂度：O(n)
 */
function minimumTotal(triangle: number[][]): number {
  const n = triangle.length;
  
  // dp[j] 表示从位置 (当前行, j) 到底部的最小路径和
  const dp: number[] = [...triangle[n - 1]];  // 最后一行初始化
  
  // 从倒数第二行向上
  for (let i = n - 2; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      dp[j] = Math.min(dp[j], dp[j + 1]) + triangle[i][j];
    }
  }
  
  return dp[0];
}
```

### 理解空间优化

```
     2          dp = [4, 1, 8, 3]  // 最后一行
    3 4         dp = [7, 6, 10, ?]  // 第3行
   6 5 7        dp = [9, 10, ?, ?]  // 第2行
  4 1 8 3       dp = [11, ?, ?, ?]  // 第1行
```

为什么从左到右更新是安全的？

因为计算 `dp[j]` 时需要 `dp[j]` 和 `dp[j+1]`，都是右边的元素。从左到右更新时，右边的还没被更新，正是我们需要的上一行的值。

## 解法四：记忆化搜索

```typescript
/**
 * 记忆化搜索
 * 时间复杂度：O(n^2)
 * 空间复杂度：O(n^2)
 */
function minimumTotal(triangle: number[][]): number {
  const n = triangle.length;
  const memo: Map<string, number> = new Map();
  
  function dp(i: number, j: number): number {
    // 越界
    if (j < 0 || j > i) return Infinity;
    
    // 到达最后一行
    if (i === n - 1) return triangle[i][j];
    
    const key = `${i},${j}`;
    if (memo.has(key)) return memo.get(key)!;
    
    const result = Math.min(dp(i + 1, j), dp(i + 1, j + 1)) + triangle[i][j];
    memo.set(key, result);
    return result;
  }
  
  return dp(0, 0);
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|-----|-----------|-----------|
| 从上到下 | O(n²) | O(n²) |
| 从下到上 | O(n²) | O(n²) |
| 一维优化 | O(n²) | O(n) |
| 记忆化搜索 | O(n²) | O(n²) |

## 相关题目

| 题目 | 难度 | 特点 |
|-----|------|------|
| [64. 最小路径和](https://leetcode.cn/problems/minimum-path-sum/) | 中等 | 矩形网格 |
| [931. 下降路径最小和](https://leetcode.cn/problems/minimum-falling-path-sum/) | 中等 | 可以斜着走 |
| [1289. 下降路径最小和 II](https://leetcode.cn/problems/minimum-falling-path-sum-ii/) | 困难 | 不能选同列 |

## 本章小结

1. **从下到上更优雅**：
   - 不需要处理边界
   - 答案直接在顶部
   - 空间优化更自然

2. **空间优化的关键**：
   - 理解更新顺序
   - 确保旧值在被覆盖前已使用

3. **三角形 DP 模板**：
   - 状态：到达某位置的最优值
   - 转移：从相邻位置转移
   - 终点不唯一时，考虑从终点反推
