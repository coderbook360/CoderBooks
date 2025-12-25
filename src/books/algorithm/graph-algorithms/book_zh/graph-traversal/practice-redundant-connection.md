# 冗余连接

LeetCode 684. Redundant Connection

## 题目描述

树是一个连通且无环的无向图。给定一个往一棵 `n` 个节点的树中添加一条边后形成的图，找出那条被添加的边。

添加的边的两个顶点应包含在 `1` 到 `n` 中，且这条边不属于树中已存在的边。

如果有多个答案，返回数组 `edges` 中最后出现的边。

## 示例

```
输入：edges = [[1,2],[1,3],[2,3]]

1 — 2
 \ /
  3

输出：[2,3]
解释：原本是 1-2, 1-3 的树，加上 2-3 形成环
```

## 思路分析

这是**环检测**问题的变体：找出形成环的那条边。

关键洞察：
- 树有 n 个节点，n-1 条边
- 给定图有 n 条边
- 形成环的边就是"冗余"的边

使用并查集：加边时如果两端已经连通，这条边就是冗余的。

## 方法一：并查集

```typescript
function findRedundantConnection(edges: number[][]): number[] {
  const n = edges.length;
  const parent = Array.from({ length: n + 1 }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  for (const [u, v] of edges) {
    const pu = find(u), pv = find(v);
    
    if (pu === pv) {
      // 两端已经连通，这条边是冗余的
      return [u, v];
    }
    
    parent[pu] = pv;
  }
  
  return [];
}
```

## 方法二：DFS

```typescript
function findRedundantConnection(edges: number[][]): number[] {
  const n = edges.length;
  const graph: number[][] = Array.from({ length: n + 1 }, () => []);
  
  for (const [u, v] of edges) {
    // 加边前检查是否已经连通
    if (isConnected(graph, u, v, n)) {
      return [u, v];
    }
    
    graph[u].push(v);
    graph[v].push(u);
  }
  
  return [];
}

function isConnected(graph: number[][], start: number, end: number, n: number): boolean {
  if (start === end) return true;
  
  const visited = new Array(n + 1).fill(false);
  const stack: number[] = [start];
  visited[start] = true;
  
  while (stack.length > 0) {
    const node = stack.pop()!;
    
    if (node === end) return true;
    
    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        stack.push(neighbor);
      }
    }
  }
  
  return false;
}
```

## 执行过程

```
edges = [[1,2],[1,3],[2,3]]

并查集过程：
初始：parent = [0, 1, 2, 3]

处理 [1,2]：
  find(1) = 1, find(2) = 2
  不相等，合并
  parent = [0, 2, 2, 3]

处理 [1,3]：
  find(1) = 2, find(3) = 3
  不相等，合并
  parent = [0, 2, 2, 2]

处理 [2,3]：
  find(2) = 2, find(3) = 2
  相等！返回 [2,3]
```

## 进阶：冗余连接 II

LeetCode 685：有向图版本，更复杂。

有向图中多了一种情况：某个节点有两个父节点。

```typescript
function findRedundantDirectedConnection(edges: number[][]): number[] {
  const n = edges.length;
  const parent: number[] = new Array(n + 1).fill(0);
  
  // 找入度为 2 的节点
  let candidate1: number[] = [], candidate2: number[] = [];
  
  for (const [u, v] of edges) {
    if (parent[v] !== 0) {
      // v 已有父节点，记录两条候选边
      candidate1 = [parent[v], v];
      candidate2 = [u, v];
      break;
    }
    parent[v] = u;
  }
  
  // 并查集检测环
  const uf = Array.from({ length: n + 1 }, (_, i) => i);
  
  function find(x: number): number {
    if (uf[x] !== x) uf[x] = find(uf[x]);
    return uf[x];
  }
  
  for (const [u, v] of edges) {
    // 跳过 candidate2（暂时不加这条边）
    if (u === candidate2[0] && v === candidate2[1]) continue;
    
    const pu = find(u), pv = find(v);
    
    if (pu === pv) {
      // 有环
      return candidate1.length > 0 ? candidate1 : [u, v];
    }
    
    uf[pv] = pu;
  }
  
  return candidate2;
}
```

## 两种方法对比

| 方法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 并查集 | O(n × α(n)) | O(n) |
| DFS | O(n²) | O(n) |

并查集更高效。

## 复杂度分析

- **时间复杂度**：O(n × α(n)) ≈ O(n)
- **空间复杂度**：O(n)

## 相关题目

| 题号 | 题目 | 难度 |
|------|------|------|
| 684 | 冗余连接 | 中等 |
| 685 | 冗余连接 II | 困难 |
| 261 | 以图判树 | 中等 |
| 1319 | 连通网络的操作次数 | 中等 |
