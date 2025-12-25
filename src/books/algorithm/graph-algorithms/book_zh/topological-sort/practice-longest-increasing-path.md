# 矩阵中的最长递增路径

LeetCode 329. Longest Increasing Path in a Matrix

## 题目描述

给定一个 m x n 整数矩阵 `matrix`，找出其中最长递增路径的长度。

对于每个单元格，你可以往上、下、左、右四个方向移动。不能对角线方向移动或移动到边界外。

## 示例

```
输入：matrix = [[9,9,4],[6,6,8],[2,1,1]]

9 9 4
6 6 8
2 1 1

输出：4
解释：最长递增路径是 [1, 2, 6, 9]
```

## 思路分析

这道题可以用多种方法解决：

1. **DFS + 记忆化**
2. **拓扑排序**

把矩阵看作一个有向图：
- 每个格子是一个节点
- 如果 matrix[i][j] < matrix[ni][nj]，则有一条从 (i,j) 到 (ni,nj) 的边
- 求最长路径

这是一个 DAG（有向无环图），因为边总是从小值指向大值，不可能有环。

## 方法一：DFS + 记忆化

```typescript
function longestIncreasingPath(matrix: number[][]): number {
  const m = matrix.length, n = matrix[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const memo: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  
  function dfs(i: number, j: number): number {
    if (memo[i][j] !== 0) return memo[i][j];
    
    let maxLen = 1;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n 
          && matrix[ni][nj] > matrix[i][j]) {
        maxLen = Math.max(maxLen, 1 + dfs(ni, nj));
      }
    }
    
    memo[i][j] = maxLen;
    return maxLen;
  }
  
  let result = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      result = Math.max(result, dfs(i, j));
    }
  }
  
  return result;
}
```

## 方法二：拓扑排序

```typescript
function longestIncreasingPath(matrix: number[][]): number {
  const m = matrix.length, n = matrix[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  // 计算每个格子的"出度"（有多少个更大的邻居）
  const outdegree: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        if (ni >= 0 && ni < m && nj >= 0 && nj < n 
            && matrix[ni][nj] > matrix[i][j]) {
          outdegree[i][j]++;
        }
      }
    }
  }
  
  // 出度为 0 的格子是路径的终点（局部最大值）
  let queue: Array<[number, number]> = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (outdegree[i][j] === 0) {
        queue.push([i, j]);
      }
    }
  }
  
  // 反向 BFS，计算层数
  let layers = 0;
  
  while (queue.length > 0) {
    layers++;
    const nextQueue: Array<[number, number]> = [];
    
    for (const [i, j] of queue) {
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        // 反向：从大值走向小值
        if (ni >= 0 && ni < m && nj >= 0 && nj < n 
            && matrix[ni][nj] < matrix[i][j]) {
          outdegree[ni][nj]--;
          if (outdegree[ni][nj] === 0) {
            nextQueue.push([ni, nj]);
          }
        }
      }
    }
    
    queue = nextQueue;
  }
  
  return layers;
}
```

## 执行过程

```
matrix = [[9,9,4],[6,6,8],[2,1,1]]

DFS 方法：

dfs(2,1) = 1 (值为 1，没有更大的邻居... 等等，1<2, 1<6)
dfs(2,1):
  邻居 (2,0)=2 > 1, 递归 dfs(2,0)
  dfs(2,0):
    邻居 (1,0)=6 > 2, 递归 dfs(1,0)
    dfs(1,0):
      邻居 (0,0)=9 > 6, 递归 dfs(0,0)
      dfs(0,0):
        邻居都 <= 9，返回 1
      返回 1 + 1 = 2
    返回 1 + 2 = 3
  返回 1 + 3 = 4

最长路径：1 → 2 → 6 → 9，长度 4
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| DFS + 记忆化 | O(mn) | O(mn) | 更直观 |
| 拓扑排序 | O(mn) | O(mn) | 显式利用 DAG 性质 |

## 为什么记忆化有效？

因为图是 DAG：
- 从任意节点出发的最长路径是固定的
- 不存在环，不会重复访问
- 每个节点只需计算一次

## 复杂度分析

- **时间复杂度**：O(mn)，每个格子最多访问一次
- **空间复杂度**：O(mn)，记忆化数组

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 329 | 矩阵中的最长递增路径 | 困难 |
| 2328 | 网格图中递增路径的数目 | 困难 |
| 1631 | 最小体力消耗路径 | 中等 |
