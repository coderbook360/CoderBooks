# 01 矩阵

LeetCode 542. 01 Matrix

## 题目描述

给定一个由 0 和 1 组成的矩阵 `mat`，请输出一个大小相同的矩阵，其中每一个格子是 `mat` 中对应位置元素到最近的 0 的距离。

两个相邻元素间的距离为 1。

## 示例

```
输入：mat = [[0,0,0],[0,1,0],[1,1,1]]

0 0 0      0 0 0
0 1 0  →   0 1 0
1 1 1      1 2 1

输出：[[0,0,0],[0,1,0],[1,2,1]]
```

## 思路分析

这是"多源 BFS"的经典应用：

- 所有 0 是源点
- 求每个格子到最近 0 的距离

关键洞察：从 0 出发比从 1 出发更高效
- 从 1 出发：每个 1 都要搜索，O(mn × mn)
- 从 0 出发：一次 BFS 搞定，O(mn)

## 代码实现

```typescript
function updateMatrix(mat: number[][]): number[][] {
  const m = mat.length, n = mat[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  // 初始化距离矩阵
  const dist: number[][] = Array.from({ length: m }, () => Array(n).fill(-1));
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
  
  // 多源 BFS
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

## 执行过程

```
mat = [[0,0,0],[0,1,0],[1,1,1]]

初始：
dist = [[0,0,0],[0,-1,0],[-1,-1,-1]]
queue = [(0,0), (0,1), (0,2), (1,0), (1,2)]

处理 (0,0): 无新邻居
处理 (0,1): 无新邻居
处理 (0,2): 无新邻居
处理 (1,0): 邻居 (2,0) 距离设为 1
处理 (1,2): 邻居 (2,2) 距离设为 1
dist = [[0,0,0],[0,-1,0],[1,-1,1]]
queue = [(2,0), (2,2)]

处理 (2,0): 邻居 (2,1) 距离设为 2
处理 (2,2): 邻居 (2,1) 已设
dist = [[0,0,0],[0,-1,0],[1,2,1]]
queue = [(2,1)]

处理 (2,1): 邻居 (1,1) 距离设为 3? 
等等，(1,1) 还没处理！
...

实际上 (1,1) 会被 (0,1), (1,0), (1,2) 中的某个处理：
处理 (0,1) 时，(1,1) 距离设为 1

最终：dist = [[0,0,0],[0,1,0],[1,2,1]]
```

## 动态规划解法

另一种思路：两次遍历

```typescript
function updateMatrix(mat: number[][]): number[][] {
  const m = mat.length, n = mat[0].length;
  const INF = m + n;  // 最大可能距离
  
  const dist: number[][] = Array.from(
    { length: m }, 
    () => Array(n).fill(INF)
  );
  
  // 第一遍：从左上到右下
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (mat[i][j] === 0) {
        dist[i][j] = 0;
      } else {
        if (i > 0) dist[i][j] = Math.min(dist[i][j], dist[i-1][j] + 1);
        if (j > 0) dist[i][j] = Math.min(dist[i][j], dist[i][j-1] + 1);
      }
    }
  }
  
  // 第二遍：从右下到左上
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (i < m - 1) dist[i][j] = Math.min(dist[i][j], dist[i+1][j] + 1);
      if (j < n - 1) dist[i][j] = Math.min(dist[i][j], dist[i][j+1] + 1);
    }
  }
  
  return dist;
}
```

为什么两次遍历就够了？
- 第一遍处理"从左上方来"的最短路径
- 第二遍处理"从右下方来"的最短路径
- 两遍覆盖了所有方向

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 优势 |
|------|-----------|-----------|------|
| BFS | O(mn) | O(mn) | 直观，通用 |
| DP | O(mn) | O(1)* | 空间更优 |

*DP 可以原地修改（如果允许修改输入）

## 常见错误

### 错误 1：从 1 出发搜索

```typescript
// 错误：O(mn × mn)
for (let i = 0; i < m; i++) {
  for (let j = 0; j < n; j++) {
    if (mat[i][j] === 1) {
      dist[i][j] = bfsToZero(mat, i, j);  // 每次 O(mn)
    }
  }
}
```

### 错误 2：用 -1 表示未访问但忘记初始化 0

```typescript
// 错误
const dist = Array.from({ length: m }, () => Array(n).fill(-1));
// 忘记设置 0 的距离为 0
```

## 复杂度分析

- **时间复杂度**：O(m × n)
- **空间复杂度**：O(m × n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 542 | 01 矩阵 | 中等 |
| 994 | 腐烂的橘子 | 中等 |
| 1162 | 地图分析 | 中等 |
| 286 | 墙与门 | 中等 |
