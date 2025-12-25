# 可达性分析

## 什么是可达性？

在图中，如果从节点 A 出发能够到达节点 B，则称 B 对 A 可达。

可达性是图论中最基本的问题之一，是很多高级算法的基础。

## 单源可达性

从一个起点出发，哪些节点可达？

### DFS 实现

```typescript
function reachableFrom(n: number, edges: number[][], start: number): Set<number> {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const reachable = new Set<number>();
  
  function dfs(node: number): void {
    reachable.add(node);
    
    for (const neighbor of graph[node]) {
      if (!reachable.has(neighbor)) {
        dfs(neighbor);
      }
    }
  }
  
  dfs(start);
  return reachable;
}
```

### BFS 实现

```typescript
function reachableFromBFS(n: number, edges: number[][], start: number): Set<number> {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const reachable = new Set<number>([start]);
  const queue: number[] = [start];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    
    for (const neighbor of graph[node]) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return reachable;
}
```

## 两点可达性

判断从 A 能否到达 B：

```typescript
function canReach(n: number, edges: number[][], start: number, end: number): boolean {
  if (start === end) return true;
  
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    
    for (const neighbor of graph[node]) {
      if (neighbor === end) return true;
      
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return false;
}
```

## 多源可达性

从多个起点出发，能到达哪些节点？

```typescript
function reachableFromMultiple(
  n: number, 
  edges: number[][], 
  starts: number[]
): Set<number> {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const reachable = new Set<number>(starts);
  const queue: number[] = [...starts];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    
    for (const neighbor of graph[node]) {
      if (!reachable.has(neighbor)) {
        reachable.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return reachable;
}
```

## 反向可达性

哪些节点可以到达目标节点？

思路：在反向图上从目标节点出发搜索。

```typescript
function canReachTarget(n: number, edges: number[][], target: number): Set<number> {
  // 建立反向图
  const reverseGraph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    reverseGraph[v].push(u);  // 反向
  }
  
  // 从 target 出发在反向图上搜索
  const canReach = new Set<number>([target]);
  const queue: number[] = [target];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    
    for (const neighbor of reverseGraph[node]) {
      if (!canReach.has(neighbor)) {
        canReach.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  
  return canReach;
}
```

## 应用：安全节点

LeetCode 802：找所有"安全节点"——从该节点出发最终不会进入环。

```typescript
function eventualSafeNodes(graph: number[][]): number[] {
  const n = graph.length;
  
  // 建立反向图
  const reverseGraph: number[][] = Array.from({ length: n }, () => []);
  const outDegree = new Array(n).fill(0);
  
  for (let u = 0; u < n; u++) {
    outDegree[u] = graph[u].length;
    for (const v of graph[u]) {
      reverseGraph[v].push(u);
    }
  }
  
  // 出度为 0 的节点是安全的（终点）
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (outDegree[i] === 0) {
      queue.push(i);
    }
  }
  
  const safe = new Set<number>();
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    safe.add(node);
    
    // 所有能到达这个安全节点的节点
    for (const prev of reverseGraph[node]) {
      outDegree[prev]--;
      if (outDegree[prev] === 0) {
        queue.push(prev);
      }
    }
  }
  
  return Array.from(safe).sort((a, b) => a - b);
}
```

## 应用：网格可达性

```typescript
function canReachBorder(grid: number[][], startI: number, startJ: number): boolean {
  const m = grid.length, n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  
  const visited = new Set<string>();
  visited.add(`${startI},${startJ}`);
  const queue: Array<[number, number]> = [[startI, startJ]];
  
  while (queue.length > 0) {
    const [i, j] = queue.shift()!;
    
    // 检查是否到达边界
    if (i === 0 || i === m - 1 || j === 0 || j === n - 1) {
      return true;
    }
    
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      const key = `${ni},${nj}`;
      
      if (ni >= 0 && ni < m && nj >= 0 && nj < n 
          && grid[ni][nj] === 1 && !visited.has(key)) {
        visited.add(key);
        queue.push([ni, nj]);
      }
    }
  }
  
  return false;
}
```

## 传递闭包

计算所有点对之间的可达性。

```typescript
function transitiveClosure(n: number, edges: number[][]): boolean[][] {
  // 初始化
  const reachable: boolean[][] = Array.from(
    { length: n }, 
    () => new Array(n).fill(false)
  );
  
  // 自己到自己可达
  for (let i = 0; i < n; i++) {
    reachable[i][i] = true;
  }
  
  // 直接相连的点可达
  for (const [u, v] of edges) {
    reachable[u][v] = true;
  }
  
  // Floyd-Warshall 计算传递闭包
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        reachable[i][j] = reachable[i][j] || (reachable[i][k] && reachable[k][j]);
      }
    }
  }
  
  return reachable;
}
```

**复杂度**：O(V³)

对于稀疏图，可以对每个点做一次 BFS/DFS，复杂度 O(V × (V + E))。

## 在线可达性查询

如果需要频繁查询可达性，可以预处理：

```typescript
class ReachabilityOracle {
  private reachable: Map<number, Set<number>>;
  
  constructor(n: number, edges: number[][]) {
    const graph: number[][] = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
      graph[u].push(v);
    }
    
    this.reachable = new Map();
    
    // 预处理每个节点的可达集合
    for (let i = 0; i < n; i++) {
      this.reachable.set(i, this.computeReachable(i, graph));
    }
  }
  
  private computeReachable(start: number, graph: number[][]): Set<number> {
    const result = new Set<number>([start]);
    const queue: number[] = [start];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      
      for (const neighbor of graph[node]) {
        if (!result.has(neighbor)) {
          result.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }
  
  canReach(from: number, to: number): boolean {
    return this.reachable.get(from)?.has(to) ?? false;
  }
}
```

## 复杂度总结

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 单源可达 | O(V + E) | O(V) |
| 两点可达 | O(V + E) | O(V) |
| 多源可达 | O(V + E) | O(V) |
| 传递闭包 | O(V³) 或 O(V(V+E)) | O(V²) |

## 总结

可达性分析是图论的基础：

1. **单源/两点**：简单的 DFS/BFS
2. **反向可达**：在反向图上搜索
3. **传递闭包**：Floyd-Warshall 或多次 BFS
4. **实际应用**：网络可达性、依赖分析、游戏 AI
