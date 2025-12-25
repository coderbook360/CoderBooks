# 省份数量

LeetCode 547. Number of Provinces

## 题目描述

有 n 个城市，其中一些彼此相连，另一些没有相连。如果城市 a 与城市 b 直接相连，且城市 b 与城市 c 直接相连，那么城市 a 与城市 c 间接相连。

省份是一组直接或间接相连的城市，组内不含其他没有相连的城市。

给你一个 n x n 的矩阵 `isConnected`，其中 `isConnected[i][j] = 1` 表示第 i 个城市和第 j 个城市直接相连，否则为 0。

返回矩阵中省份的数量。

## 示例

```
输入：isConnected = [[1,1,0],[1,1,0],[0,0,1]]

  0 1 2
0 1 1 0     城市 0 和 1 相连
1 1 1 0     城市 2 独立
2 0 0 1

输出：2
解释：省份 1: {0, 1}，省份 2: {2}
```

## 思路分析

这是"连通分量数量"问题的直接应用。

输入是邻接矩阵，可以用：
1. DFS
2. BFS
3. 并查集

## 方法一：DFS

```typescript
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const visited = new Array(n).fill(false);
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      dfs(isConnected, visited, i);
      count++;
    }
  }
  
  return count;
}

function dfs(isConnected: number[][], visited: boolean[], node: number): void {
  visited[node] = true;
  
  for (let j = 0; j < isConnected.length; j++) {
    if (isConnected[node][j] === 1 && !visited[j]) {
      dfs(isConnected, visited, j);
    }
  }
}
```

## 方法二：BFS

```typescript
function findCircleNum(isConnected: number[][]): number {
  const n = isConnected.length;
  const visited = new Array(n).fill(false);
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const queue: number[] = [i];
      visited[i] = true;
      
      while (queue.length > 0) {
        const node = queue.shift()!;
        
        for (let j = 0; j < n; j++) {
          if (isConnected[node][j] === 1 && !visited[j]) {
            visited[j] = true;
            queue.push(j);
          }
        }
      }
      
      count++;
    }
  }
  
  return count;
}
```

## 方法三：并查集

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
    parent[find(x)] = find(y);
  }
  
  // 合并连通的城市
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (isConnected[i][j] === 1) {
        union(i, j);
      }
    }
  }
  
  // 统计不同的根节点数量
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (find(i) === i) {
      count++;
    }
  }
  
  return count;
}
```

## 执行过程

```
isConnected = [[1,1,0],[1,1,0],[0,0,1]]

DFS 过程：
i = 0: 未访问，开始 DFS
  访问 0，标记
  邻居 1 未访问，递归
    访问 1，标记
    邻居 0 已访问，跳过
  count = 1

i = 1: 已访问，跳过

i = 2: 未访问，开始 DFS
  访问 2，标记
  count = 2

返回 2
```

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| DFS | O(n²) | O(n) | 简单直观 |
| BFS | O(n²) | O(n) | 适合层次分析 |
| 并查集 | O(n² × α(n)) | O(n) | 适合动态连通性 |

## 复杂度分析

- **时间复杂度**：O(n²)，需要遍历整个邻接矩阵
- **空间复杂度**：O(n)，visited 数组或并查集

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 547 | 省份数量 | 中等 |
| 200 | 岛屿数量 | 中等 |
| 323 | 无向图中连通分量的数目 | 中等 |
| 684 | 冗余连接 | 中等 |
