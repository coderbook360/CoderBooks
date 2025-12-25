# 实战：飞地的数量

## 题目描述

**LeetCode 1020. Number of Enclaves**

给你一个大小为 m x n 的二进制矩阵 grid，其中 0 表示一个海洋单元格、1 表示一个陆地单元格。

一次移动是指从一个陆地单元格走到另一个相邻（上、下、左、右）的陆地单元格或跨过 grid 的边界。

返回网格中无法在任意次数的移动中离开网格边界的陆地单元格的数量。

**示例 1**：
```
输入：grid = [
  [0,0,0,0],
  [1,0,1,0],
  [0,1,1,0],
  [0,0,0,0]
]
输出：3
解释：有三个 1 被 0 包围。一个 1 没有被包围，因为它在边界上。
```

**示例 2**：
```
输入：grid = [
  [0,1,1,0],
  [0,0,1,0],
  [0,0,1,0],
  [0,0,0,0]
]
输出：0
解释：所有 1 都可以到达边界或已在边界上。
```

**约束**：
- `m == grid.length`
- `n == grid[i].length`
- `1 <= m, n <= 500`
- `grid[i][j]` 的值为 0 或 1

## 思路分析

"飞地"是指**无法到达边界的陆地**。

思路：
1. 从边界上的陆地出发，标记所有能到达边界的陆地
2. 统计未被标记的陆地数量

这与"被围绕的区域"思路一致。

## 解法：边界 DFS

```typescript
function numEnclaves(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  
  function dfs(i: number, j: number): void {
    if (i < 0 || i >= m || j < 0 || j >= n) return;
    if (grid[i][j] !== 1) return;
    
    grid[i][j] = 0;  // 标记为已访问（沉岛）
    
    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }
  
  // Step 1: 从边界陆地开始沉岛
  for (let j = 0; j < n; j++) {
    dfs(0, j);
    dfs(m - 1, j);
  }
  for (let i = 0; i < m; i++) {
    dfs(i, 0);
    dfs(i, n - 1);
  }
  
  // Step 2: 统计剩余的陆地（飞地）
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        count++;
      }
    }
  }
  
  return count;
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)，递归栈

## BFS 解法

```typescript
function numEnclaves(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  
  // 收集边界上的陆地
  for (let j = 0; j < n; j++) {
    if (grid[0][j] === 1) {
      queue.push([0, j]);
      grid[0][j] = 0;
    }
    if (grid[m-1][j] === 1) {
      queue.push([m-1, j]);
      grid[m-1][j] = 0;
    }
  }
  for (let i = 1; i < m - 1; i++) {
    if (grid[i][0] === 1) {
      queue.push([i, 0]);
      grid[i][0] = 0;
    }
    if (grid[i][n-1] === 1) {
      queue.push([i, n-1]);
      grid[i][n-1] = 0;
    }
  }
  
  // BFS 沉岛
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
        grid[ni][nj] = 0;
        queue.push([ni, nj]);
      }
    }
  }
  
  // 统计飞地
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      count += grid[i][j];
    }
  }
  
  return count;
}
```

## 并查集解法

```typescript
class UnionFind {
  parent: number[];
  size: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootX] = rootY;
      this.size[rootY] += this.size[rootX];
    }
  }
  
  getSize(x: number): number {
    return this.size[this.find(x)];
  }
}

function numEnclaves(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  const uf = new UnionFind(m * n + 1);
  const dummy = m * n;
  
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  let total = 0;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        total++;
        const id = i * n + j;
        
        // 边界陆地连接到 dummy
        if (i === 0 || i === m - 1 || j === 0 || j === n - 1) {
          uf.union(id, dummy);
        }
        
        // 与相邻陆地合并
        for (const [di, dj] of dirs) {
          const ni = i + di, nj = j + dj;
          if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
            uf.union(id, ni * n + nj);
          }
        }
      }
    }
  }
  
  // 与 dummy 相连的陆地数量
  const borderConnected = uf.getSize(dummy) - 1;  // 减去 dummy 自己
  
  return total - borderConnected;
}
```

## 图解

```
grid:
0 0 0 0
1 0 1 0
0 1 1 0
0 0 0 0

Step 1: 边界 DFS
边界上只有 (1,0) 是陆地
从 (1,0) 开始沉岛：沉没 (1,0)

0 0 0 0
0 0 1 0
0 1 1 0
0 0 0 0

Step 2: 统计剩余陆地
(1,2), (2,1), (2,2) 是飞地

答案：3
```

## 与相关题目对比

| 题目 | 目标 | 输出 |
|------|------|------|
| 岛屿数量 | 统计连通分量 | 岛屿个数 |
| 被围绕的区域 | 填充飞地 | 修改后的矩阵 |
| 飞地的数量 | 统计飞地 | 飞地格子数 |

## 总结

飞地数量的要点：

1. **从边界出发**：标记所有能到达边界的陆地
2. **沉岛技巧**：直接将访问过的陆地改为 0
3. **统计剩余**：未被沉没的陆地就是飞地
4. **多种方法**：DFS、BFS、并查集都可以
