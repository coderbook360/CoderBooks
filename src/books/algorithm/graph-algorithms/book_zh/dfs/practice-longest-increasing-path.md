# 实战：矩阵中的最长递增路径

## 题目描述

**LeetCode 329. Longest Increasing Path in a Matrix**

给定一个 m x n 整数矩阵 matrix，找出其中最长递增路径的长度。

对于每个单元格，你可以往上，下，左，右四个方向移动。你不能在对角线方向上移动或移动到边界外（即不允许环绕）。

**示例 1**：
```
输入：matrix = [
  [9,9,4],
  [6,6,8],
  [2,1,1]
]
输出：4
解释：最长递增路径为 [1, 2, 6, 9]。
```

**示例 2**：
```
输入：matrix = [
  [3,4,5],
  [3,2,6],
  [2,2,1]
]
输出：4
解释：最长递增路径是 [3, 4, 5, 6]。注意不允许在对角线方向上移动。
```

**约束**：
- `m == matrix.length`
- `n == matrix[i].length`
- `1 <= m, n <= 200`
- `0 <= matrix[i][j] <= 2³¹ - 1`

## 思路分析

### 暴力 DFS（超时）

从每个格子出发，DFS 找最长递增路径。

问题：大量重复计算，同一个格子的最长路径会被计算多次。

### 记忆化搜索

`dp[i][j]` = 从格子 (i, j) 出发的最长递增路径长度

关键洞察：由于路径必须**严格递增**，不会形成环，可以用记忆化搜索。

## 解法：DFS + 记忆化

```typescript
function longestIncreasingPath(matrix: number[][]): number {
  if (!matrix || matrix.length === 0) return 0;
  
  const m = matrix.length;
  const n = matrix[0].length;
  const memo: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function dfs(i: number, j: number): number {
    // 已计算过
    if (memo[i][j] !== 0) return memo[i][j];
    
    let maxLen = 1;  // 至少包含自己
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      // 边界内且严格递增
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

**复杂度分析**：
- 时间：O(mn)，每个格子只计算一次
- 空间：O(mn)，记忆化数组 + 递归栈

## 为什么不需要 visited？

普通 DFS 需要 visited 防止重复访问。但本题：

1. **路径严格递增**：不可能回到已访问的格子（值更小）
2. **天然无环**：严格递增保证了拓扑顺序

所以只需要记忆化，不需要 visited。

## 拓扑排序 + BFS 解法

另一种思路：把问题看作 DAG 上的最长路径。

```typescript
function longestIncreasingPath(matrix: number[][]): number {
  const m = matrix.length;
  const n = matrix[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  // 计算出度（可以走向多少个更大的格子）
  const outDegree: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        if (ni >= 0 && ni < m && nj >= 0 && nj < n 
            && matrix[ni][nj] > matrix[i][j]) {
          outDegree[i][j]++;
        }
      }
    }
  }
  
  // 从出度为 0 的格子开始（局部最大值）
  const queue: Array<[number, number]> = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (outDegree[i][j] === 0) {
        queue.push([i, j]);
      }
    }
  }
  
  // 反向 BFS
  let length = 0;
  while (queue.length > 0) {
    length++;
    const size = queue.length;
    
    for (let k = 0; k < size; k++) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        // 反向：找比当前格子小的邻居
        if (ni >= 0 && ni < m && nj >= 0 && nj < n 
            && matrix[ni][nj] < matrix[i][j]) {
          outDegree[ni][nj]--;
          if (outDegree[ni][nj] === 0) {
            queue.push([ni, nj]);
          }
        }
      }
    }
  }
  
  return length;
}
```

**思路**：
1. 从"终点"（局部最大值）反向搜索
2. 层次遍历的层数就是最长路径长度

## 图解

```
matrix:
9 9 4
6 6 8
2 1 1

从 1 出发的路径：
1 → 2 → 6 → 9
长度 = 4

记忆化过程：
dfs(2,1) = 1 + dfs(2,0) = 1 + (1 + dfs(1,0)) = 1 + (1 + (1 + dfs(0,0))) = 4
               ↓
            dfs(2,0) = 1 + dfs(1,0) = 1 + (1 + dfs(0,0)) = 3
                          ↓
                       dfs(1,0) = 1 + dfs(0,0) = 2
                                     ↓
                                  dfs(0,0) = 1（无更大邻居）
```

## 优化：按值排序

```typescript
function longestIncreasingPath(matrix: number[][]): number {
  const m = matrix.length;
  const n = matrix[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  // 按值排序所有格子
  const cells: Array<[number, number, number]> = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      cells.push([i, j, matrix[i][j]]);
    }
  }
  cells.sort((a, b) => a[2] - b[2]);  // 按值升序
  
  // DP
  const dp: number[][] = Array.from({ length: m }, () => Array(n).fill(1));
  
  for (const [i, j] of cells) {
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      // 从更小的格子转移
      if (ni >= 0 && ni < m && nj >= 0 && nj < n 
          && matrix[ni][nj] < matrix[i][j]) {
        dp[i][j] = Math.max(dp[i][j], dp[ni][nj] + 1);
      }
    }
  }
  
  return Math.max(...dp.flat());
}
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [62. 不同路径](https://leetcode.cn/problems/unique-paths/) | 网格 DP |
| [64. 最小路径和](https://leetcode.cn/problems/minimum-path-sum/) | 网格 DP |
| [1575. 统计所有可行路径](https://leetcode.cn/problems/count-all-possible-routes/) | 记忆化搜索 |

## 总结

最长递增路径的要点：

1. **记忆化搜索**：避免重复计算
2. **无需 visited**：严格递增保证无环
3. **多种方法**：DFS 记忆化、拓扑排序 + BFS、排序 + DP
4. **时间复杂度**：O(mn)

这道题展示了记忆化搜索在网格问题中的强大威力。
