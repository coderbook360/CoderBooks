# 实战：太平洋大西洋水流问题

## 题目描述

**LeetCode 417. Pacific Atlantic Water Flow**

有一个 m × n 的矩形岛屿，与太平洋和大西洋相邻。"太平洋"处于大陆的左边界和上边界，而"大西洋"处于大陆的右边界和下边界。

这个岛被分割成一个由若干方形单元格组成的网格。给定一个 m x n 的整数矩阵 heights，heights[r][c] 表示坐标 (r, c) 上单元格高于海平面的高度。

岛上雨水较多，如果相邻单元格的高度小于或等于当前单元格的高度，雨水可以直接向北、南、东、西流向相邻单元格。水可以从海洋附近的任何单元格流入海洋。

返回网格坐标 result 的 2D 列表，其中 result[i] = [ri, ci] 表示雨水从单元格 (ri, ci) 流动，既可以流到太平洋，也可以流到大西洋。

**示例**：
```
输入：heights = [
  [1,2,2,3,5],
  [3,2,3,4,4],
  [2,4,5,3,1],
  [6,7,1,4,5],
  [5,1,1,2,4]
]
输出：[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]
```

## 思路分析

### 直接思路（超时）

从每个格子出发，判断能否同时到达两个海洋。复杂度 O(m²n²)。

### 逆向思维

**从海洋出发，反向找能流到的格子**。

- 从太平洋边界出发，标记所有能流到太平洋的格子
- 从大西洋边界出发，标记所有能流到大西洋的格子
- 两个集合的交集就是答案

**反向流动条件**：从低处流向高处（或等高），即 `heights[next] >= heights[curr]`

## 解法：双向 DFS

```typescript
function pacificAtlantic(heights: number[][]): number[][] {
  if (!heights || heights.length === 0) return [];
  
  const m = heights.length;
  const n = heights[0].length;
  
  // 两个海洋能到达的格子
  const pacific = Array.from({ length: m }, () => Array(n).fill(false));
  const atlantic = Array.from({ length: m }, () => Array(n).fill(false));
  
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function dfs(i: number, j: number, visited: boolean[][]): void {
    visited[i][j] = true;
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n 
          && !visited[ni][nj]
          && heights[ni][nj] >= heights[i][j]) {  // 反向流动
        dfs(ni, nj, visited);
      }
    }
  }
  
  // 从太平洋边界出发（上边界和左边界）
  for (let i = 0; i < m; i++) dfs(i, 0, pacific);
  for (let j = 0; j < n; j++) dfs(0, j, pacific);
  
  // 从大西洋边界出发（下边界和右边界）
  for (let i = 0; i < m; i++) dfs(i, n - 1, atlantic);
  for (let j = 0; j < n; j++) dfs(m - 1, j, atlantic);
  
  // 找交集
  const result: number[][] = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (pacific[i][j] && atlantic[i][j]) {
        result.push([i, j]);
      }
    }
  }
  
  return result;
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)

## BFS 解法

```typescript
function pacificAtlantic(heights: number[][]): number[][] {
  if (!heights || heights.length === 0) return [];
  
  const m = heights.length;
  const n = heights[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function bfs(starts: Array<[number, number]>): boolean[][] {
    const visited = Array.from({ length: m }, () => Array(n).fill(false));
    const queue = [...starts];
    
    for (const [i, j] of starts) {
      visited[i][j] = true;
    }
    
    while (queue.length > 0) {
      const [i, j] = queue.shift()!;
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        
        if (ni >= 0 && ni < m && nj >= 0 && nj < n
            && !visited[ni][nj]
            && heights[ni][nj] >= heights[i][j]) {
          visited[ni][nj] = true;
          queue.push([ni, nj]);
        }
      }
    }
    
    return visited;
  }
  
  // 太平洋边界
  const pacificStarts: Array<[number, number]> = [];
  for (let i = 0; i < m; i++) pacificStarts.push([i, 0]);
  for (let j = 1; j < n; j++) pacificStarts.push([0, j]);
  
  // 大西洋边界
  const atlanticStarts: Array<[number, number]> = [];
  for (let i = 0; i < m; i++) atlanticStarts.push([i, n - 1]);
  for (let j = 0; j < n - 1; j++) atlanticStarts.push([m - 1, j]);
  
  const pacific = bfs(pacificStarts);
  const atlantic = bfs(atlanticStarts);
  
  const result: number[][] = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (pacific[i][j] && atlantic[i][j]) {
        result.push([i, j]);
      }
    }
  }
  
  return result;
}
```

## 图解

```
heights:
1 2 2 3 [5]  ← 太平洋（上）
3 2 3 [4] 4
2 4 [5] 3 1
[6][7] 1 4 5
[5] 1 1 2 [4]
↑           ↑
太平洋      大西洋
（左）      （右）
            ↓ 大西洋（下）

从太平洋可达：      从大西洋可达：      交集：
1 1 1 1 1          0 0 0 1 1          0 0 0 0 1
1 1 1 1 1          0 0 1 1 1          0 0 0 1 1
1 1 1 1 1          0 1 1 1 1          0 0 1 0 0
1 1 0 1 1          1 1 0 1 1          1 1 0 0 0
1 0 0 1 1          1 1 1 1 1          1 0 0 0 0

答案：(0,4), (1,3), (1,4), (2,2), (3,0), (3,1), (4,0)
```

## 关键点

### 1. 逆向思维

正向：从每个格子出发，看能否到达边界 → O(m²n²)

逆向：从边界出发，看能到达哪些格子 → O(mn)

### 2. 反向流动条件

正向：水往低处流，`heights[next] <= heights[curr]`

逆向：从低处往高处走，`heights[next] >= heights[curr]`

### 3. 边界的划分

```
太平洋：上边界 (i=0) + 左边界 (j=0)
大西洋：下边界 (i=m-1) + 右边界 (j=n-1)
```

## 常见错误

### 1. 流动方向搞反

```typescript
// 错误：正向流动条件
if (heights[ni][nj] <= heights[i][j])  // 应该是 >=
```

### 2. 边界重复

```typescript
// 注意：四个角会被计算两次，需要去重或避免
for (let i = 0; i < m; i++) dfs(i, 0, pacific);
for (let j = 1; j < n; j++) dfs(0, j, pacific);  // j 从 1 开始
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [130. 被围绕的区域](https://leetcode.cn/problems/surrounded-regions/) | 边界 DFS |
| [1020. 飞地的数量](https://leetcode.cn/problems/number-of-enclaves/) | 边界 DFS |
| [542. 01 矩阵](https://leetcode.cn/problems/01-matrix/) | 多源 BFS |

## 总结

太平洋大西洋问题的要点：

1. **逆向思维**：从边界往内搜索
2. **双向搜索**：分别从两个海洋出发
3. **反向条件**：水往高处流（逆向）
4. **求交集**：两个可达集合的交集

这种"从目标出发反向搜索"的思想非常重要。
