# 岛屿数量（并查集）

LeetCode 200. Number of Islands (Union-Find Solution)

## 题目描述

给你一个由 `'1'`（陆地）和 `'0'`（水）组成的二维网格，请你计算网格中岛屿的数量。

岛屿总是被水包围，并且每座岛屿只能由水平方向和/或竖直方向上相邻的陆地连接形成。

## 示例

```
输入：grid = [
  ["1","1","0","0","0"],
  ["1","1","0","0","0"],
  ["0","0","1","0","0"],
  ["0","0","0","1","1"]
]
输出：3
```

## 思路分析

虽然 DFS/BFS 是解决岛屿问题的常见方法，但并查集也可以优雅地解决：
1. 将每个陆地格子看作一个节点
2. 相邻陆地合并到同一集合
3. 最终统计集合数量

**坐标映射**：二维坐标 (i, j) → 一维索引 i * cols + j

## 代码实现

```typescript
function numIslands(grid: string[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // 并查集
  const parent: number[] = [];
  let count = 0;
  
  // 初始化：只有陆地才加入并查集
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const idx = i * cols + j;
      if (grid[i][j] === '1') {
        parent[idx] = idx;
        count++;
      } else {
        parent[idx] = -1;
      }
    }
  }
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  function union(x: number, y: number): void {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX !== rootY) {
      parent[rootX] = rootY;
      count--;
    }
  }
  
  // 遍历每个格子，合并相邻陆地
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === '1') {
        const idx = i * cols + j;
        
        // 只需要检查右边和下边（避免重复）
        if (j + 1 < cols && grid[i][j + 1] === '1') {
          union(idx, idx + 1);
        }
        if (i + 1 < rows && grid[i + 1][j] === '1') {
          union(idx, idx + cols);
        }
      }
    }
  }
  
  return count;
}
```

## 执行过程

```
grid = [
  ["1","1","0"],
  ["0","1","0"],
  ["0","0","1"]
]

坐标映射：
0 1 2
3 4 5
6 7 8

初始化：
陆地：0, 1, 4, 8
parent = [0, 1, -1, -1, 4, -1, -1, -1, 8]
count = 4

合并过程：
(0,0) 检查右边 (0,1)：都是陆地，union(0, 1)
  count = 3
(0,1) 检查下边 (1,1)：都是陆地，union(1, 4)
  count = 2
(2,2) 无相邻陆地

最终 count = 2? 

等等，应该是 2 个岛屿：
- 岛屿1：(0,0), (0,1), (1,1)
- 岛屿2：(2,2)

对，count = 2
```

## 与 DFS 方法对比

```typescript
// DFS 解法（对比）
function numIslandsDFS(grid: string[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  let count = 0;
  
  function dfs(i: number, j: number): void {
    if (i < 0 || i >= rows || j < 0 || j >= cols) return;
    if (grid[i][j] !== '1') return;
    
    grid[i][j] = '0';  // 标记已访问
    dfs(i - 1, j);
    dfs(i + 1, j);
    dfs(i, j - 1);
    dfs(i, j + 1);
  }
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === '1') {
        dfs(i, j);
        count++;
      }
    }
  }
  
  return count;
}
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------------|------------|------|
| 并查集 | O(mn · α(mn)) | O(mn) | 不修改原数组 |
| DFS | O(mn) | O(mn) 栈 | 会修改原数组 |

**选择建议**：
- 不能修改原数组 → 并查集
- 需要简洁代码 → DFS
- 动态添加陆地 → 并查集

## 动态场景：增量添加陆地

并查集的优势在于支持动态操作：

```typescript
class IslandCounter {
  private parent: number[];
  private cols: number;
  public count = 0;
  
  constructor(rows: number, cols: number) {
    this.cols = cols;
    this.parent = new Array(rows * cols).fill(-1);
  }
  
  private find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  private union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent[rootX] = rootY;
      this.count--;
    }
  }
  
  // 动态添加陆地
  addLand(i: number, j: number): number {
    const idx = i * this.cols + j;
    if (this.parent[idx] !== -1) return this.count;  // 已经是陆地
    
    this.parent[idx] = idx;
    this.count++;
    
    // 检查四个方向的邻居
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      const nidx = ni * this.cols + nj;
      if (ni >= 0 && nj >= 0 && this.parent[nidx] !== undefined && this.parent[nidx] !== -1) {
        this.union(idx, nidx);
      }
    }
    
    return this.count;
  }
}
```

## 复杂度分析

- **时间复杂度**：O(mn · α(mn))，其中 m × n 是网格大小
- **空间复杂度**：O(mn)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 200 | 岛屿数量 | 中等 |
| 305 | 岛屿数量 II | 困难 |
| 547 | 省份数量 | 中等 |
| 695 | 岛屿的最大面积 | 中等 |
