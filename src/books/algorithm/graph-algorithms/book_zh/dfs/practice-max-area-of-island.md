# 实战：岛屿的最大面积

## 题目描述

**LeetCode 695. Max Area of Island**

给你一个大小为 m x n 的二进制矩阵 grid。

岛屿是由一些相邻的 1 (代表土地) 构成的组合，这里的「相邻」要求两个 1 必须在水平或者竖直的四个方向上相邻。你可以假设 grid 的四个边缘都被 0（代表水）包围着。

岛屿的面积是岛上值为 1 的单元格的数目。

计算并返回 grid 中最大的岛屿面积。如果没有岛屿，则返回面积为 0。

**示例 1**：
```
输入：grid = [
  [0,0,1,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,0,0,0],
  [0,1,1,0,1,0,0,0,0,0,0,0,0],
  [0,1,0,0,1,1,0,0,1,0,1,0,0],
  [0,1,0,0,1,1,0,0,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,1,1,0,0,0,0]
]
输出：6
解释：答案不应该是 11，因为岛屿只能包含水平或垂直这四个方向上的 1。
```

**示例 2**：
```
输入：grid = [[0,0,0,0,0,0,0,0]]
输出：0
```

**约束**：
- `m == grid.length`
- `n == grid[i].length`
- `1 <= m, n <= 50`
- `grid[i][j]` 为 0 或 1

## 思路分析

与"岛屿数量"类似，但需要在 DFS 过程中统计每个岛屿的面积。

## 解法一：DFS 递归

```typescript
function maxAreaOfIsland(grid: number[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let maxArea = 0;
  
  function dfs(i: number, j: number): number {
    // 边界检查
    if (i < 0 || i >= m || j < 0 || j >= n) return 0;
    // 水域或已访问
    if (grid[i][j] !== 1) return 0;
    
    // 标记为已访问
    grid[i][j] = 0;
    
    // 当前格子面积为 1，加上四个方向的面积
    return 1 + dfs(i + 1, j) + dfs(i - 1, j) + dfs(i, j + 1) + dfs(i, j - 1);
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        maxArea = Math.max(maxArea, dfs(i, j));
      }
    }
  }
  
  return maxArea;
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)，递归栈深度

## 解法二：DFS 迭代

```typescript
function maxAreaOfIsland(grid: number[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let maxArea = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function dfs(startI: number, startJ: number): number {
    const stack: Array<[number, number]> = [[startI, startJ]];
    grid[startI][startJ] = 0;
    let area = 0;
    
    while (stack.length > 0) {
      const [i, j] = stack.pop()!;
      area++;
      
      for (const [di, dj] of dirs) {
        const ni = i + di;
        const nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
          grid[ni][nj] = 0;
          stack.push([ni, nj]);
        }
      }
    }
    
    return area;
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        maxArea = Math.max(maxArea, dfs(i, j));
      }
    }
  }
  
  return maxArea;
}
```

## 解法三：BFS

```typescript
function maxAreaOfIsland(grid: number[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let maxArea = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function bfs(startI: number, startJ: number): number {
    const queue: Array<[number, number]> = [[startI, startJ]];
    grid[startI][startJ] = 0;
    let area = 0;
    
    while (queue.length > 0) {
      const [i, j] = queue.shift()!;
      area++;
      
      for (const [di, dj] of dirs) {
        const ni = i + di;
        const nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
          grid[ni][nj] = 0;
          queue.push([ni, nj]);
        }
      }
    }
    
    return area;
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        maxArea = Math.max(maxArea, bfs(i, j));
      }
    }
  }
  
  return maxArea;
}
```

## 技巧：简洁写法

```typescript
function maxAreaOfIsland(grid: number[][]): number {
  const m = grid.length, n = grid[0].length;
  
  const dfs = (i: number, j: number): number => {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === 0) return 0;
    grid[i][j] = 0;
    return 1 + dfs(i+1,j) + dfs(i-1,j) + dfs(i,j+1) + dfs(i,j-1);
  };
  
  let max = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      max = Math.max(max, dfs(i, j));
    }
  }
  return max;
}
```

**技巧**：
- 即使 `grid[i][j] === 0`，`dfs(i, j)` 也直接返回 0，不会出错
- 这样可以简化主循环中的条件判断

## 与岛屿数量的对比

| 方面 | 岛屿数量 | 最大面积 |
|------|----------|----------|
| 目标 | 统计岛屿个数 | 找最大岛屿面积 |
| DFS 返回值 | void | 面积（整数） |
| 主循环 | 计数 | 取最大值 |

## 相关题目

| 题目 | 难度 | 变化点 |
|------|------|--------|
| [200. 岛屿数量](https://leetcode.cn/problems/number-of-islands/) | 中等 | 统计数量 |
| [463. 岛屿的周长](https://leetcode.cn/problems/island-perimeter/) | 简单 | 计算周长 |
| [827. 最大人工岛](https://leetcode.cn/problems/making-a-large-island/) | 困难 | 填一个格子 |

## 总结

最大面积问题的关键：
1. DFS 函数返回当前岛屿的面积
2. 每访问一个陆地格子，面积 +1
3. 递归累加四个方向的面积
4. 遍历时取所有岛屿面积的最大值
