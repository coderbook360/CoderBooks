# 省份数量

LeetCode 547. Number of Provinces

## 题目描述

有 `n` 个城市，其中一些彼此相连，另一些没有相连。如果城市 `a` 与城市 `b` 直接相连，且城市 `b` 与城市 `c` 直接相连，那么城市 `a` 与城市 `c` 间接相连。

**省份** 是一组直接或间接相连的城市，组内不含其他没有相连的城市。

给你一个 `n x n` 的矩阵 `isConnected`，其中 `isConnected[i][j] = 1` 表示第 `i` 个城市和第 `j` 个城市直接相连，`isConnected[i][j] = 0` 表示二者不直接相连。

返回矩阵中省份的数量。

## 示例

```
输入：isConnected = [[1,1,0],[1,1,0],[0,0,1]]
输出：2
解释：
城市 0 和城市 1 相连，构成一个省份
城市 2 独立，构成另一个省份
```

## 思路分析

这是经典的**连通分量计数**问题：
- 每个省份就是一个连通分量
- 用并查集维护连通性，最终统计根节点数量

## 并查集解法

```typescript
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  
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
    }
  }
  
  // 遍历邻接矩阵，合并相连的城市
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isConnected[i][j] === 1) {
        union(i, j);
      }
    }
  }
  
  // 统计根节点数量（即省份数量）
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (find(i) === i) {
      count++;
    }
  }
  
  return count;
}
```

## 优化：在并查集中维护 count

```typescript
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  let count = n;  // 初始时每个城市是独立的省份
  
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
      count--;  // 合并时减少省份数
    }
  }
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isConnected[i][j] === 1) {
        union(i, j);
      }
    }
  }
  
  return count;
}
```

## 执行过程

```
isConnected = [[1,1,0],[1,1,0],[0,0,1]]

初始：parent = [0, 1, 2], count = 3

处理 (0,1)：isConnected[0][1] = 1
  union(0, 1): parent = [1, 1, 2], count = 2

处理 (0,2)：isConnected[0][2] = 0，跳过
处理 (1,2)：isConnected[1][2] = 0，跳过

最终 count = 2
```

## DFS 对比解法

```typescript
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const visited = new Array(n).fill(false);
  let count = 0;
  
  function dfs(city: number): void {
    visited[city] = true;
    for (let j = 0; j < n; j++) {
      if (isConnected[city][j] === 1 && !visited[j]) {
        dfs(j);
      }
    }
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      dfs(i);
      count++;
    }
  }
  
  return count;
}
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|------------|------------|------|
| 并查集 | O(n² · α(n)) | O(n) | 支持动态添加边 |
| DFS | O(n²) | O(n) | 代码简洁 |

## 复杂度分析

- **时间复杂度**：O(n² · α(n))，遍历矩阵 O(n²)，每次 Union/Find O(α(n))
- **空间复杂度**：O(n)，存储 parent 数组

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 547 | 省份数量 | 中等 |
| 200 | 岛屿数量 | 中等 |
| 684 | 冗余连接 | 中等 |
| 1319 | 连通网络的操作次数 | 中等 |
