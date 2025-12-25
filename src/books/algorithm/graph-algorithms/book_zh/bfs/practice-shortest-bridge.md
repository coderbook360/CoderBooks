# 最短的桥

LeetCode 934. Shortest Bridge

## 题目描述

在给定的 01 矩阵 `grid` 中，存在两座岛屿。岛屿是由四面相连的 1 形成的一个最大组。

你可以将任意数量的 0 变为 1，从而将两座岛屿连接起来。

返回必须翻转的 0 的最小数目。

## 示例

```
输入：grid = [[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]]

1 1 1 1 1
1 0 0 0 1
1 0 1 0 1
1 0 0 0 1
1 1 1 1 1

输出：1
解释：翻转中间的 0 即可连接两座岛屿
```

## 思路分析

两步走：
1. **找到第一座岛**：用 DFS/BFS 找到第一座岛的所有格子
2. **扩展到第二座岛**：用多源 BFS，从第一座岛的所有边界向外扩展，直到碰到第二座岛

为什么是多源 BFS？
- 第一座岛的所有格子同时作为源点
- BFS 保证最先到达第二座岛的路径最短

## 代码实现

```typescript
function shortestBridge(grid: number[][]): number {
  const n = grid.length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  
  // 第一步：DFS 找到第一座岛，并标记为 2
  let found = false;
  
  for (let i = 0; i < n && !found; i++) {
    for (let j = 0; j < n && !found; j++) {
      if (grid[i][j] === 1) {
        dfs(grid, i, j, queue);
        found = true;
      }
    }
  }
  
  // 第二步：多源 BFS 扩展到第二座岛
  let steps = 0;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
          if (grid[ni][nj] === 1) {
            return steps;  // 找到第二座岛
          }
          
          if (grid[ni][nj] === 0) {
            grid[ni][nj] = 2;  // 标记为已访问
            queue.push([ni, nj]);
          }
        }
      }
    }
    
    steps++;
  }
  
  return steps;
}

function dfs(grid: number[][], i: number, j: number, queue: Array<[number, number]>): void {
  const n = grid.length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  if (i < 0 || i >= n || j < 0 || j >= n || grid[i][j] !== 1) {
    return;
  }
  
  grid[i][j] = 2;  // 标记为第一座岛
  queue.push([i, j]);
  
  for (const [di, dj] of dirs) {
    dfs(grid, i + di, j + dj, queue);
  }
}
```

## 执行过程

```
grid = [[0,1],[1,0]]

第一步：DFS 找第一座岛
找到 (0,1)，标记为 2
grid = [[0,2],[1,0]]
queue = [(0,1)]

第二步：BFS 扩展
步骤 0：
  从 (0,1) 扩展
  (0,0) 是 0，标记为 2，入队
  (1,1) 是 0，标记为 2，入队
  grid = [[2,2],[1,2]]
  queue = [(0,0), (1,1)]

步骤 1：
  从 (0,0) 扩展
  (1,0) 是 1 ！找到第二座岛
  返回 1
```

## 优化：只从边界开始 BFS

不需要把整座岛都放入 BFS 队列，只需要边界上的格子：

```typescript
function shortestBridge(grid: number[][]): number {
  const n = grid.length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const boundary: Array<[number, number]> = [];
  
  // DFS 找第一座岛，只收集边界格子
  function dfs(i: number, j: number): void {
    if (i < 0 || i >= n || j < 0 || j >= n || grid[i][j] !== 1) {
      return;
    }
    
    grid[i][j] = 2;
    
    let isBoundary = false;
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || ni >= n || nj < 0 || nj >= n || grid[ni][nj] === 0) {
        isBoundary = true;
      }
    }
    
    if (isBoundary) {
      boundary.push([i, j]);
    }
    
    for (const [di, dj] of dirs) {
      dfs(i + di, j + dj);
    }
  }
  
  // 找到第一座岛
  outer: for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        dfs(i, j);
        break outer;
      }
    }
  }
  
  // BFS
  let steps = 0;
  const queue = boundary;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
          if (grid[ni][nj] === 1) return steps;
          
          if (grid[ni][nj] === 0) {
            grid[ni][nj] = 2;
            queue.push([ni, nj]);
          }
        }
      }
    }
    
    steps++;
  }
  
  return steps;
}
```

## 为什么这个问题用多源 BFS？

如果从第一座岛的某个点 A 到第二座岛的某个点 B 是最短的：
- 从 A 出发 BFS：一定能找到最短路径
- 从整座岛出发 BFS：等价于从每个点出发，取最小值
- BFS 的层次特性保证正确性

## 复杂度分析

- **时间复杂度**：O(n²)
  - DFS 找岛：O(n²)
  - BFS 扩展：O(n²)
- **空间复杂度**：O(n²)
  - 最坏情况队列中有所有格子

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 934 | 最短的桥 | 中等 |
| 994 | 腐烂的橘子 | 中等 |
| 542 | 01 矩阵 | 中等 |
| 1162 | 地图分析 | 中等 |
| 200 | 岛屿数量 | 中等 |
