# 多源 BFS

## 什么是多源 BFS？

普通 BFS 从一个起点开始搜索。多源 BFS 从**多个起点同时**开始搜索。

典型问题：求每个空地到最近海洋/障碍物/特殊点的距离。

## 核心思想

把所有源点同时放入队列，就像它们是一个"超级源点"的邻居：

```
普通 BFS：
    起点 → 层1 → 层2 → ...

多源 BFS：
    超级源点 → [源点1, 源点2, 源点3] → 层1 → 层2 → ...
```

## 为什么这样做是对的？

假设有两个源点 A 和 B，我们要求每个点到最近源点的距离。

如果 A 和 B 同时开始向外扩展：
- 第 1 轮后，距离为 1 的点被标记
- 第 2 轮后，距离为 2 的点被标记
- ...

每个点第一次被访问时，就是被最近的源点访问到的。

## 模板代码

```typescript
function multiSourceBFS(grid: number[][], sources: Array<[number, number]>): number[][] {
  const m = grid.length, n = grid[0].length;
  const dist: number[][] = Array.from({ length: m }, () => Array(n).fill(-1));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  // 所有源点同时入队
  const queue: Array<[number, number]> = [];
  for (const [i, j] of sources) {
    dist[i][j] = 0;
    queue.push([i, j]);
  }
  
  // 标准 BFS
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n && dist[ni][nj] === -1) {
        dist[ni][nj] = dist[i][j] + 1;
        queue.push([ni, nj]);
      }
    }
  }
  
  return dist;
}
```

## 经典例题：01 矩阵

LeetCode 542：给定一个由 0 和 1 组成的矩阵，求每个格子到最近 0 的距离。

### 思路

- 所有 0 是源点
- 求每个格子到最近源点的距离
- 典型的多源 BFS

### 代码

```typescript
function updateMatrix(mat: number[][]): number[][] {
  const m = mat.length, n = mat[0].length;
  const dist: number[][] = Array.from({ length: m }, () => Array(n).fill(-1));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  
  // 所有 0 作为源点
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (mat[i][j] === 0) {
        dist[i][j] = 0;
        queue.push([i, j]);
      }
    }
  }
  
  // BFS
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n && dist[ni][nj] === -1) {
        dist[ni][nj] = dist[i][j] + 1;
        queue.push([ni, nj]);
      }
    }
  }
  
  return dist;
}
```

## 经典例题：腐烂的橘子

LeetCode 994：网格中有新鲜橘子 (1) 和腐烂橘子 (2)，每分钟腐烂的橘子会把相邻的新鲜橘子变腐烂。求所有橘子腐烂的最短时间。

### 思路

- 所有腐烂橘子是源点
- 求最远的新鲜橘子到源点的距离
- 多源 BFS + 记录最大距离

### 代码

```typescript
function orangesRotting(grid: number[][]): number {
  const m = grid.length, n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  let fresh = 0;
  
  // 统计新鲜橘子，收集腐烂橘子
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 2) {
        queue.push([i, j]);
      } else if (grid[i][j] === 1) {
        fresh++;
      }
    }
  }
  
  if (fresh === 0) return 0;
  
  let minutes = 0;
  
  while (queue.length > 0) {
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
          grid[ni][nj] = 2;  // 变腐烂
          fresh--;
          queue.push([ni, nj]);
        }
      }
    }
    
    if (queue.length > 0) minutes++;
  }
  
  return fresh === 0 ? minutes : -1;
}
```

## 经典例题：地图分析

LeetCode 1162：在一个只有 0（海洋）和 1（陆地）的网格中，找到一个海洋格子，使得它到最近陆地的距离最大。

### 思路

- 所有陆地是源点
- 求每个海洋到最近陆地的距离
- 返回最大距离

### 代码

```typescript
function maxDistance(grid: number[][]): number {
  const n = grid.length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  const queue: Array<[number, number]> = [];
  
  // 陆地作为源点
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        dist[i][j] = 0;
        queue.push([i, j]);
      }
    }
  }
  
  // 没有陆地或没有海洋
  if (queue.length === 0 || queue.length === n * n) {
    return -1;
  }
  
  let maxDist = 0;
  
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      if (ni >= 0 && ni < n && nj >= 0 && nj < n && dist[ni][nj] === -1) {
        dist[ni][nj] = dist[i][j] + 1;
        maxDist = Math.max(maxDist, dist[ni][nj]);
        queue.push([ni, nj]);
      }
    }
  }
  
  return maxDist;
}
```

## 多源 BFS 的变体

### 变体 1：从边界开始

有些问题需要从边界向内搜索：

```typescript
function boundaryBFS(grid: number[][]): void {
  const m = grid.length, n = grid[0].length;
  const queue: Array<[number, number]> = [];
  
  // 上下边界
  for (let j = 0; j < n; j++) {
    queue.push([0, j]);
    queue.push([m - 1, j]);
  }
  
  // 左右边界（注意不要重复添加角落）
  for (let i = 1; i < m - 1; i++) {
    queue.push([i, 0]);
    queue.push([i, n - 1]);
  }
  
  // BFS...
}
```

### 变体 2：双向多源 BFS

两组源点同时扩展，判断能否相遇：

```typescript
function biDirectionalBFS(
  grid: number[][],
  sourcesA: Array<[number, number]>,
  sourcesB: Array<[number, number]>
): number {
  const m = grid.length, n = grid[0].length;
  const distA: number[][] = Array.from({ length: m }, () => Array(n).fill(-1));
  const distB: number[][] = Array.from({ length: m }, () => Array(n).fill(-1));
  
  // 初始化两组源点
  const queueA: Array<[number, number]> = [];
  const queueB: Array<[number, number]> = [];
  
  for (const [i, j] of sourcesA) {
    distA[i][j] = 0;
    queueA.push([i, j]);
  }
  
  for (const [i, j] of sourcesB) {
    distB[i][j] = 0;
    queueB.push([i, j]);
  }
  
  // 交替扩展两组，直到相遇
  // ...具体实现根据问题而定
  
  return -1;
}
```

## 时间复杂度分析

- 每个格子最多入队一次
- 每个格子最多被访问四次（四个方向）
- 总时间复杂度：O(m × n)

空间复杂度：O(m × n)（距离数组 + 队列）

## 常见错误

### 错误 1：从普通点开始 BFS

```typescript
// 错误：对每个格子单独 BFS
for (let i = 0; i < m; i++) {
  for (let j = 0; j < n; j++) {
    dist[i][j] = bfs(grid, i, j);  // O(m*n) 每次
  }
}
// 总复杂度 O((m*n)²)，太慢！

// 正确：多源 BFS，O(m*n)
```

### 错误 2：忘记初始化源点距离

```typescript
// 错误
for (const [i, j] of sources) {
  queue.push([i, j]);
  // 忘记设置 dist[i][j] = 0
}

// 正确
for (const [i, j] of sources) {
  dist[i][j] = 0;
  queue.push([i, j]);
}
```

## 何时使用多源 BFS？

1. 求每个点到**最近**特殊点的距离
2. 从多个起点**同时扩散**
3. 问题可以转化为：存在多个源点，求某种最值

常见关键词：
- "最近的"
- "到...的最短距离"
- "同时开始"
- "扩散/蔓延"

## 总结

多源 BFS 的核心：

1. **同时入队**：所有源点一起作为起点
2. **距离正确**：每个点第一次被访问就是最短距离
3. **时间优化**：O(m×n) vs O((m×n)²)
4. **代码简单**：只是初始化时多入队几个点

记住这个模式：
```typescript
// 收集所有源点
for (源点) {
  dist[源点] = 0;
  queue.push(源点);
}

// 标准 BFS
while (queue.length > 0) { ... }
```
