# 地图分析

LeetCode 1162. As Far from Land as Possible

## 题目描述

你现在手里有一份大小为 n x n 的网格 `grid`，上面的每个单元格都用 0 和 1 标记好了。其中 0 代表海洋格子，1 代表陆地格子。

请你找出一个海洋单元格，这个海洋单元格到离它最近的陆地单元格的距离是最大的，并返回该距离。如果网格上只有陆地或只有海洋，返回 -1。

## 示例

```
输入：grid = [[1,0,1],[0,0,0],[1,0,1]]

1 0 1
0 0 0
1 0 1

输出：2
解释：(1,1) 到最近陆地的距离是 2
```

## 思路分析

这是典型的多源 BFS 问题：
- 所有陆地 (1) 是源点
- 求每个海洋到最近陆地的距离
- 返回最大距离

暴力做法：对每个海洋格子 BFS 找最近陆地 → O(n⁴)
多源 BFS：从所有陆地同时出发 → O(n²)

## 代码实现

```typescript
function maxDistance(grid: number[][]): number {
  const n = grid.length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  // 所有陆地入队，记录距离
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(-1));
  const queue: Array<[number, number]> = [];
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) {
        dist[i][j] = 0;
        queue.push([i, j]);
      }
    }
  }
  
  // 边界情况：全是陆地或全是海洋
  if (queue.length === 0 || queue.length === n * n) {
    return -1;
  }
  
  let maxDist = 0;
  
  // 多源 BFS
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

## 执行过程

```
grid = [[1,0,1],[0,0,0],[1,0,1]]

初始：
dist = [[0,-1,0],[-1,-1,-1],[0,-1,0]]
queue = [(0,0), (0,2), (2,0), (2,2)]
maxDist = 0

第 1 轮：
处理 (0,0): 邻居 (0,1), (1,0) 距离设为 1
处理 (0,2): 邻居 (0,1)(已设), (1,2) 距离设为 1
处理 (2,0): 邻居 (1,0)(已设), (2,1) 距离设为 1
处理 (2,2): 邻居 (1,2)(已设), (2,1)(已设)
dist = [[0,1,0],[1,-1,1],[0,1,0]]
maxDist = 1

第 2 轮：
处理 (0,1): 邻居 (1,1) 距离设为 2
处理 (1,0): 邻居 (1,1)(已设)
处理 (1,2): 邻居 (1,1)(已设)
处理 (2,1): 邻居 (1,1)(已设)
dist = [[0,1,0],[1,2,1],[0,1,0]]
maxDist = 2

返回 2
```

## 为什么多源 BFS 是正确的？

当多个陆地同时向外扩展时：
- 每个海洋格子第一次被访问时，就是被最近的陆地访问到
- 这是因为 BFS 的层次特性：第 k 层的点距离源点都是 k

## 边界情况

```typescript
// 全是陆地
[[1,1],[1,1]]  // 返回 -1

// 全是海洋
[[0,0],[0,0]]  // 返回 -1

// 只有一个海洋
[[1,1],[1,0]]  // 返回 1
```

## 复杂度分析

- **时间复杂度**：O(n²)，每个格子最多访问一次
- **空间复杂度**：O(n²)，距离数组 + 队列

## 对比：暴力方法

```typescript
// 暴力 O(n⁴)：对每个海洋单独 BFS
function maxDistanceBruteForce(grid: number[][]): number {
  const n = grid.length;
  let maxDist = -1;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 0) {
        const dist = bfsToLand(grid, i, j);  // O(n²)
        maxDist = Math.max(maxDist, dist);
      }
    }
  }
  
  return maxDist;
}
```

多源 BFS 将 O(n⁴) 优化到 O(n²)。

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 1162 | 地图分析 | 中等 |
| 542 | 01 矩阵 | 中等 |
| 994 | 腐烂的橘子 | 中等 |
| 286 | 墙与门 | 中等 |
