# 实战：统计封闭岛屿的数目

## 题目描述

**LeetCode 1254. Number of Closed Islands**

二维矩阵 grid 由 0（土地）和 1（水）组成。岛是由最大的4个方向连通的 0 组成的群，封闭岛是一个完全由 1 包围（左、上、右、下）的岛。

请返回封闭岛屿的数目。

**示例 1**：
```
输入：grid = [
  [1,1,1,1,1,1,1,0],
  [1,0,0,0,0,1,1,0],
  [1,0,1,0,1,1,1,0],
  [1,0,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,0]
]
输出：2
解释：灰色区域的岛屿是封闭岛屿，因为这座岛屿完全被水域包围。
```

**示例 2**：
```
输入：grid = [
  [0,0,1,0,0],
  [0,1,0,1,0],
  [0,1,1,1,0]
]
输出：1
```

**约束**：
- `1 <= grid.length, grid[0].length <= 100`
- `0 <= grid[i][j] <= 1`

## 注意

**本题与其他岛屿题目的区别**：
- 0 表示陆地，1 表示水
- 与 LeetCode 200 等题目相反！

## 思路分析

封闭岛屿 = 不与边界相连的岛屿

思路：
1. 先从边界上的陆地（0）出发，沉没所有与边界相连的岛屿
2. 然后统计剩余的岛屿数量

## 解法一：两步 DFS

```typescript
function closedIsland(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  
  function dfs(i: number, j: number): void {
    if (i < 0 || i >= m || j < 0 || j >= n) return;
    if (grid[i][j] !== 0) return;  // 注意：0 是陆地
    
    grid[i][j] = 1;  // 沉岛
    
    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }
  
  // Step 1: 沉没与边界相连的岛屿
  for (let j = 0; j < n; j++) {
    dfs(0, j);
    dfs(m - 1, j);
  }
  for (let i = 0; i < m; i++) {
    dfs(i, 0);
    dfs(i, n - 1);
  }
  
  // Step 2: 统计封闭岛屿
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 0) {
        count++;
        dfs(i, j);  // 沉没这个岛屿
      }
    }
  }
  
  return count;
}
```

**复杂度分析**：
- 时间：O(mn)
- 空间：O(mn)

## 解法二：一次 DFS 判断

在 DFS 过程中判断是否触碰边界：

```typescript
function closedIsland(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  
  function dfs(i: number, j: number): boolean {
    // 越界 = 触碰边界
    if (i < 0 || i >= m || j < 0 || j >= n) return false;
    // 水域
    if (grid[i][j] !== 0) return true;
    
    grid[i][j] = 1;  // 标记
    
    // 必须遍历所有方向（不能短路）
    const down = dfs(i + 1, j);
    const up = dfs(i - 1, j);
    const right = dfs(i, j + 1);
    const left = dfs(i, j - 1);
    
    return down && up && right && left;
  }
  
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 0 && dfs(i, j)) {
        count++;
      }
    }
  }
  
  return count;
}
```

**关键点**：不能使用短路求值（`&&`），必须遍历所有方向后再判断。

```typescript
// 错误！会短路
return dfs(i+1,j) && dfs(i-1,j) && dfs(i,j+1) && dfs(i,j-1);

// 正确：先遍历再合并
const a = dfs(i+1,j);
const b = dfs(i-1,j);
const c = dfs(i,j+1);
const d = dfs(i,j-1);
return a && b && c && d;
```

## BFS 解法

```typescript
function closedIsland(grid: number[][]): number {
  const m = grid.length;
  const n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  function bfs(startI: number, startJ: number): boolean {
    const queue: Array<[number, number]> = [[startI, startJ]];
    grid[startI][startJ] = 1;
    let isClosed = true;
    
    while (queue.length > 0) {
      const [i, j] = queue.shift()!;
      
      // 检查是否在边界
      if (i === 0 || i === m - 1 || j === 0 || j === n - 1) {
        isClosed = false;
        // 不能直接返回，需要继续沉岛
      }
      
      for (const [di, dj] of dirs) {
        const ni = i + di, nj = j + dj;
        if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] === 0) {
          grid[ni][nj] = 1;
          queue.push([ni, nj]);
        }
      }
    }
    
    return isClosed;
  }
  
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 0 && bfs(i, j)) {
        count++;
      }
    }
  }
  
  return count;
}
```

## 图解

```
原始网格（0=陆地，1=水）：
1 1 1 1 1 1 1 0
1 0 0 0 0 1 1 0
1 0 1 0 1 1 1 0
1 0 0 0 0 1 0 1
1 1 1 1 1 1 1 0

Step 1: 沉没边界岛屿
右边界的 0 都被沉没

1 1 1 1 1 1 1 1
1 0 0 0 0 1 1 1
1 0 1 0 1 1 1 1
1 0 0 0 0 1 1 1
1 1 1 1 1 1 1 1

Step 2: 统计封闭岛屿
(1,1)-(3,4) 区域有两个独立的封闭岛屿：
- 左上：(1,1), (1,2), (1,3), (2,1), (2,3), (3,1), (3,2), (3,3)
- 但 (2,2) 是水，所以是两个岛屿

答案：2
```

## 易错点

### 1. 0 和 1 的含义

```typescript
// 本题：0 是陆地，1 是水
// 其他岛屿题：1 是陆地，0 是水
// 一定要看清题目！
```

### 2. 短路求值

```typescript
// 错误
return dfs(a) && dfs(b);  // 如果 dfs(a) 返回 false，dfs(b) 不会执行

// 正确
const x = dfs(a);
const y = dfs(b);
return x && y;  // 两个都会执行
```

## 相关题目

| 题目 | 说明 |
|------|------|
| [200. 岛屿数量](https://leetcode.cn/problems/number-of-islands/) | 统计所有岛屿 |
| [1020. 飞地的数量](https://leetcode.cn/problems/number-of-enclaves/) | 统计封闭区域格子数 |
| [130. 被围绕的区域](https://leetcode.cn/problems/surrounded-regions/) | 填充封闭区域 |

## 总结

封闭岛屿的要点：

1. **注意语义**：本题 0 是陆地，1 是水
2. **边界处理**：先沉没边界岛屿，再统计内部岛屿
3. **避免短路**：一次性 DFS 判断时，不能短路求值
4. **本质相同**：与其他边界 DFS 题目思路一致
