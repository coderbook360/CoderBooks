# 实战：岛屿数量

## 题目描述

**LeetCode 200. Number of Islands**

给你一个由 '1'（陆地）和 '0'（水）组成的二维网格，请你计算网格中岛屿的数量。

岛屿总是被水包围，并且每座岛屿只能由水平方向和/或竖直方向上相邻的陆地连接形成。

此外，你可以假设该网格的四条边均被水包围。

**示例 1**：
```
输入：grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]
输出：1
```

**示例 2**：
```
输入：grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
输出：3
```

**约束**：
- `m == grid.length`
- `n == grid[i].length`
- `1 <= m, n <= 300`
- `grid[i][j]` 为 '0' 或 '1'

## 思路分析

这是一道经典的网格 DFS 问题。

核心思想：
1. 遍历网格，找到一个 '1'（陆地）
2. 从这个陆地出发，用 DFS 将所有相连的陆地标记为已访问
3. 每次找到新的未访问陆地，岛屿数量 +1

## 解法一：DFS（递归）

```typescript
function numIslands(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  
  function dfs(i: number, j: number): void {
    // 边界检查
    if (i < 0 || i >= m || j < 0 || j >= n) return;
    // 水域或已访问
    if (grid[i][j] !== '1') return;
    
    // 标记为已访问（沉岛）
    grid[i][j] = '0';
    
    // 四个方向递归
    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);  // 将整个岛屿沉没
      }
    }
  }
  
  return count;
}
```

**复杂度分析**：
- 时间：O(mn)，每个格子最多访问一次
- 空间：O(mn)，递归栈深度（最坏情况整个网格都是陆地）

## 解法二：DFS（迭代）

```typescript
function numIslands(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function dfs(startI: number, startJ: number): void {
    const stack: Array<[number, number]> = [[startI, startJ]];
    grid[startI][startJ] = '0';
    
    while (stack.length > 0) {
      const [i, j] = stack.pop()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di;
        const nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === '1') {
          grid[ni][nj] = '0';  // 先标记再入栈
          stack.push([ni, nj]);
        }
      }
    }
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }
  
  return count;
}
```

## 解法三：BFS

```typescript
function numIslands(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  let count = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function bfs(startI: number, startJ: number): void {
    const queue: Array<[number, number]> = [[startI, startJ]];
    grid[startI][startJ] = '0';
    
    while (queue.length > 0) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di;
        const nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === '1') {
          grid[ni][nj] = '0';
          queue.push([ni, nj]);
        }
      }
    }
  }
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        bfs(i, j);
      }
    }
  }
  
  return count;
}
```

## 解法四：并查集

```typescript
class UnionFind {
  parent: number[];
  rank: number[];
  count: number;
  
  constructor(grid: string[][]) {
    const m = grid.length;
    const n = grid[0].length;
    this.parent = new Array(m * n);
    this.rank = new Array(m * n).fill(0);
    this.count = 0;
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (grid[i][j] === '1') {
          const id = i * n + j;
          this.parent[id] = id;
          this.count++;
        }
      }
    }
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
      if (this.rank[rootX] < this.rank[rootY]) {
        this.parent[rootX] = rootY;
      } else if (this.rank[rootX] > this.rank[rootY]) {
        this.parent[rootY] = rootX;
      } else {
        this.parent[rootY] = rootX;
        this.rank[rootX]++;
      }
      this.count--;
    }
  }
}

function numIslands(grid: string[][]): number {
  if (!grid || grid.length === 0) return 0;
  
  const m = grid.length;
  const n = grid[0].length;
  const uf = new UnionFind(grid);
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        const id = i * n + j;
        
        // 只需要向右和向下合并，避免重复
        if (j + 1 < n && grid[i][j + 1] === '1') {
          uf.union(id, id + 1);
        }
        if (i + 1 < m && grid[i + 1][j] === '1') {
          uf.union(id, id + n);
        }
      }
    }
  }
  
  return uf.count;
}
```

**复杂度**：
- 时间：O(mn × α(mn))，α 是阿克曼函数的反函数，近似 O(1)
- 空间：O(mn)

## 图解

```
初始网格：
1 1 0 0 0
1 1 0 0 0
0 0 1 0 0
0 0 0 1 1

DFS 过程：
1. 从 (0,0) 开始，找到第一块陆地
2. DFS 将连通的 (0,0), (0,1), (1,0), (1,1) 全部沉没
3. 继续遍历，找到 (2,2)，沉没
4. 继续遍历，找到 (3,3)，沉没 (3,3), (3,4)

最终：3 个岛屿
```

## 常见错误

### 1. 忘记标记

```typescript
// 错误：会无限循环
function dfs(i: number, j: number): void {
  if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== '1') return;
  // 忘记标记 grid[i][j] = '0'
  dfs(i + 1, j);
  // ...
}
```

### 2. 标记时机错误

```typescript
// 错误：可能重复访问
function bfs(startI: number, startJ: number): void {
  const queue = [[startI, startJ]];
  // 忘记在入队时标记
  
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    grid[i][j] = '0';  // 太晚了！
    // ...
  }
}
```

## 变体问题

| 题目 | 变化点 |
|------|--------|
| 岛屿的最大面积 | 返回最大岛屿的格子数 |
| 被围绕的区域 | 只沉没不靠边的岛屿 |
| 飞地的数量 | 统计不靠边的陆地数 |
| 统计封闭岛屿的数目 | 被水完全包围的岛屿 |

## 总结

岛屿数量是网格 DFS 的入门题：

1. **本质**：计算连通分量数
2. **方法**：遍历 + DFS/BFS 沉岛
3. **关键**：及时标记已访问，避免重复
4. **扩展**：并查集也可以解决

这道题的模板可以直接应用于很多网格搜索问题。
