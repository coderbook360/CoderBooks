# 实战：被围绕的区域

## 题目描述

**LeetCode 130. Surrounded Regions**

给你一个 m x n 的矩阵 board，由若干字符 'X' 和 'O' 组成，找到所有被 'X' 围绕的区域，并将这些区域里所有的 'O' 用 'X' 填充。

**示例 1**：
```
输入：board = [
  ["X","X","X","X"],
  ["X","O","O","X"],
  ["X","X","O","X"],
  ["X","O","X","X"]
]
输出：[
  ["X","X","X","X"],
  ["X","X","X","X"],
  ["X","X","X","X"],
  ["X","O","X","X"]
]
解释：被围绕的区间不会存在于边界上，换句话说，任何边界上的 'O' 都不会被填充为 'X'。
任何不在边界上，或不与边界上的 'O' 相连的 'O' 最终都会被填充为 'X'。
```

**约束**：
- `m == board.length`
- `n == board[i].length`
- `1 <= m, n <= 200`
- `board[i][j]` 为 'X' 或 'O'

## 思路分析

### 关键洞察

不被围绕的 'O' 有什么特点？**与边界上的 'O' 相连**。

### 逆向思维

不直接找"被围绕的 O"，而是：
1. 从边界上的 'O' 出发，标记所有相连的 'O'
2. 遍历整个矩阵：
   - 标记过的 'O'：不被围绕，保留
   - 未标记的 'O'：被围绕，改成 'X'

## 解法：DFS + 标记

```typescript
function solve(board: string[][]): void {
  if (!board || board.length === 0) return;
  
  const m = board.length;
  const n = board[0].length;
  
  // DFS: 标记与边界相连的 'O'
  function dfs(i: number, j: number): void {
    if (i < 0 || i >= m || j < 0 || j >= n) return;
    if (board[i][j] !== 'O') return;
    
    board[i][j] = '#';  // 临时标记
    
    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }
  
  // Step 1: 从边界上的 'O' 开始 DFS
  // 第一行和最后一行
  for (let j = 0; j < n; j++) {
    dfs(0, j);
    dfs(m - 1, j);
  }
  // 第一列和最后一列
  for (let i = 0; i < m; i++) {
    dfs(i, 0);
    dfs(i, n - 1);
  }
  
  // Step 2: 遍历整个矩阵
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] === 'O') {
        board[i][j] = 'X';  // 被围绕，填充
      } else if (board[i][j] === '#') {
        board[i][j] = 'O';  // 恢复
      }
    }
  }
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)，递归栈

## BFS 解法

```typescript
function solve(board: string[][]): void {
  if (!board || board.length === 0) return;
  
  const m = board.length;
  const n = board[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const queue: Array<[number, number]> = [];
  
  // Step 1: 收集边界上的 'O'
  for (let j = 0; j < n; j++) {
    if (board[0][j] === 'O') queue.push([0, j]);
    if (board[m-1][j] === 'O') queue.push([m-1, j]);
  }
  for (let i = 1; i < m - 1; i++) {
    if (board[i][0] === 'O') queue.push([i, 0]);
    if (board[i][n-1] === 'O') queue.push([i, n-1]);
  }
  
  // BFS 标记
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    if (board[i][j] !== 'O') continue;
    
    board[i][j] = '#';
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      if (ni >= 0 && ni < m && nj >= 0 && nj < n && board[ni][nj] === 'O') {
        queue.push([ni, nj]);
      }
    }
  }
  
  // Step 2: 还原
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] === 'O') board[i][j] = 'X';
      else if (board[i][j] === '#') board[i][j] = 'O';
    }
  }
}
```

## 并查集解法

```typescript
class UnionFind {
  parent: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    this.parent[this.find(x)] = this.find(y);
  }
  
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }
}

function solve(board: string[][]): void {
  if (!board || board.length === 0) return;
  
  const m = board.length;
  const n = board[0].length;
  const uf = new UnionFind(m * n + 1);
  const dummy = m * n;  // 虚拟节点，代表边界
  
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] === 'O') {
        const id = i * n + j;
        
        // 边界上的 'O' 连接到 dummy
        if (i === 0 || i === m - 1 || j === 0 || j === n - 1) {
          uf.union(id, dummy);
        }
        
        // 与相邻的 'O' 合并
        for (const [di, dj] of dirs) {
          const ni = i + di, nj = j + dj;
          if (ni >= 0 && ni < m && nj >= 0 && nj < n && board[ni][nj] === 'O') {
            uf.union(id, ni * n + nj);
          }
        }
      }
    }
  }
  
  // 不与 dummy 相连的 'O' 就是被围绕的
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] === 'O' && !uf.connected(i * n + j, dummy)) {
        board[i][j] = 'X';
      }
    }
  }
}
```

## 图解

```
原始矩阵：
X X X X
X O O X
X X O X
X O X X

Step 1: 从边界 'O' 开始标记
只有 (3,1) 是边界上的 'O'
标记 (3,1) 为 '#'

X X X X
X O O X
X X O X
X # X X

Step 2: 还原
- (1,1), (1,2), (2,2) 是未标记的 'O'，改为 'X'
- (3,1) 是 '#'，改回 'O'

最终：
X X X X
X X X X
X X X X
X O X X
```

## 易错点

### 1. 边界遍历不完整

```typescript
// 错误：漏掉了角落
for (let j = 1; j < n - 1; j++) {  // 应该从 0 开始
  dfs(0, j);
}
```

### 2. 标记后继续判断

```typescript
// 错误
if (board[i][j] === 'O') {
  board[i][j] = '#';
}
if (board[i][j] === '#') {  // 刚刚才标记的！
  // ...
}
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [200. 岛屿数量](https://leetcode.cn/problems/number-of-islands/) | 基础网格 DFS |
| [1020. 飞地的数量](https://leetcode.cn/problems/number-of-enclaves/) | 类似思路 |
| [417. 太平洋大西洋水流问题](https://leetcode.cn/problems/pacific-atlantic-water-flow/) | 边界 DFS |

## 总结

被围绕的区域的关键：

1. **逆向思维**：不找被围绕的，找不被围绕的
2. **边界出发**：从边界 'O' 开始标记
3. **两步处理**：先标记后还原
4. **三种方法**：DFS、BFS、并查集
