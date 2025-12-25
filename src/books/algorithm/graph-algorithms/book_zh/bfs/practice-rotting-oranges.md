# 腐烂的橘子

LeetCode 994. Rotting Oranges

## 题目描述

在给定的 m x n 网格 `grid` 中，每个单元格可以有以下三个值之一：

- 0：空单元格
- 1：新鲜橘子
- 2：腐烂橘子

每分钟，腐烂的橘子会使其四个相邻（上下左右）的新鲜橘子腐烂。

返回直到所有橘子都腐烂所需的最小分钟数。如果不可能，返回 -1。

## 示例

```
输入：grid = [[2,1,1],[1,1,0],[0,1,1]]

2 1 1      2 2 1      2 2 2      2 2 2      2 2 2
1 1 0  →   2 1 0  →   2 2 0  →   2 2 0  →   2 2 0
0 1 1      0 1 1      0 1 1      0 2 1      0 2 2

  0分        1分        2分        3分        4分

输出：4
```

## 思路分析

这是典型的多源 BFS 问题：

1. 所有腐烂橘子是源点
2. 每一轮 BFS 扩展代表 1 分钟
3. 求所有新鲜橘子被感染的最短时间

关键洞察：
- 多个腐烂橘子同时扩散
- 需要计算总共的轮数
- 要处理不可达的情况

## 代码实现

```typescript
function orangesRotting(grid: number[][]): number {
  const m = grid.length, n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  let fresh = 0;
  
  // 收集所有腐烂橘子，统计新鲜橘子数量
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 2) {
        queue.push([i, j]);
      } else if (grid[i][j] === 1) {
        fresh++;
      }
    }
  }
  
  // 边界情况：没有新鲜橘子
  if (fresh === 0) return 0;
  
  let minutes = 0;
  
  // 多源 BFS
  while (queue.length > 0) {
    const size = queue.length;
    let rotted = false;  // 本轮是否有新的橘子腐烂
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
          grid[ni][nj] = 2;  // 变腐烂
          fresh--;
          queue.push([ni, nj]);
          rotted = true;
        }
      }
    }
    
    if (rotted) minutes++;
  }
  
  // 如果还有新鲜橘子，说明不可达
  return fresh === 0 ? minutes : -1;
}
```

## 执行过程

```
初始状态：
2 1 1     queue = [(0,0)]
1 1 0     fresh = 6
0 1 1

第 1 分钟：
2 2 1     queue = [(0,1), (1,0)]
2 1 0     fresh = 4
0 1 1

第 2 分钟：
2 2 2     queue = [(0,2), (1,1)]
2 2 0     fresh = 2
0 1 1

第 3 分钟：
2 2 2     queue = [(2,1)]
2 2 0     fresh = 1
0 2 1

第 4 分钟：
2 2 2     queue = [(2,2)]
2 2 0     fresh = 0
0 2 2

queue 为空，fresh = 0，返回 4
```

## 简化版本

```typescript
function orangesRotting(grid: number[][]): number {
  const m = grid.length, n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  let fresh = 0;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 2) queue.push([i, j]);
      else if (grid[i][j] === 1) fresh++;
    }
  }
  
  if (fresh === 0) return 0;
  
  let minutes = -1;  // 注意这里是 -1
  
  while (queue.length > 0) {
    minutes++;
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 1) {
          grid[ni][nj] = 2;
          fresh--;
          queue.push([ni, nj]);
        }
      }
    }
  }
  
  return fresh === 0 ? minutes : -1;
}
```

为什么 `minutes = -1`？因为 BFS 会先处理初始的腐烂橘子（第 0 轮），但这一轮不算时间。

## 边界情况

1. **没有新鲜橘子**：直接返回 0
2. **没有腐烂橘子但有新鲜橘子**：返回 -1
3. **存在孤岛（不可达的新鲜橘子）**：返回 -1

```typescript
// 没有腐烂橘子
[[1,1,1]]  // 返回 -1

// 存在孤岛
[[2,0,1]]  // 返回 -1（右边的 1 被 0 隔开）
```

## 复杂度分析

- **时间复杂度**：O(m × n)，每个格子最多访问一次
- **空间复杂度**：O(m × n)，最坏情况队列中有所有格子

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 994 | 腐烂的橘子 | 中等 |
| 542 | 01 矩阵 | 中等 |
| 1162 | 地图分析 | 中等 |
| 286 | 墙与门 | 中等 |
| 934 | 最短的桥 | 中等 |
