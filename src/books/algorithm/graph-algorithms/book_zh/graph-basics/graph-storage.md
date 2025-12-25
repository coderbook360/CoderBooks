# 图的存储方式：邻接表与邻接矩阵

## 为什么需要讨论存储方式？

图的存储方式直接影响：
- **空间效率**：存储 n 个顶点、m 条边需要多少空间
- **时间效率**：判断两点是否相连、遍历邻居需要多长时间
- **代码复杂度**：实现各种算法的难易程度

两种主流存储方式：**邻接矩阵**和**邻接表**。

## 邻接矩阵

### 定义

用 n × n 的矩阵存储图，`matrix[i][j]` 表示顶点 i 到顶点 j 的边信息。

**无权图**：
```
matrix[i][j] = 1  表示存在边
matrix[i][j] = 0  表示不存在边
```

**有权图**：
```
matrix[i][j] = w  表示边的权重为 w
matrix[i][j] = ∞  表示不存在边
```

### 实现

```typescript
class AdjacencyMatrix {
  private matrix: number[][];
  private n: number;
  
  constructor(n: number) {
    this.n = n;
    // 初始化为 0（无边）或 Infinity（有权图）
    this.matrix = Array.from(
      { length: n },
      () => Array(n).fill(0)
    );
  }
  
  // 添加边（无向图）
  addEdge(u: number, v: number, weight: number = 1): void {
    this.matrix[u][v] = weight;
    this.matrix[v][u] = weight;  // 无向图
  }
  
  // 添加边（有向图）
  addDirectedEdge(u: number, v: number, weight: number = 1): void {
    this.matrix[u][v] = weight;
  }
  
  // 查询是否有边
  hasEdge(u: number, v: number): boolean {
    return this.matrix[u][v] !== 0;
  }
  
  // 获取边的权重
  getWeight(u: number, v: number): number {
    return this.matrix[u][v];
  }
  
  // 获取邻居
  getNeighbors(u: number): number[] {
    const neighbors: number[] = [];
    for (let v = 0; v < this.n; v++) {
      if (this.matrix[u][v] !== 0) {
        neighbors.push(v);
      }
    }
    return neighbors;
  }
}
```

### 优缺点

**优点**：
- O(1) 查询两点是否相连
- 实现简单直观
- 适合稠密图

**缺点**：
- 空间 O(n²)，对稀疏图浪费严重
- 遍历邻居需要 O(n)
- n 很大时内存占用大

## 邻接表

### 定义

为每个顶点维护一个列表，存储其所有邻居。

```typescript
// 顶点 0 的邻居：[1, 2, 3]
// 顶点 1 的邻居：[0, 2]
// ...
```

### 实现

```typescript
class AdjacencyList {
  private adj: Map<number, Array<[number, number]>>;
  private n: number;
  
  constructor(n: number) {
    this.n = n;
    this.adj = new Map();
    for (let i = 0; i < n; i++) {
      this.adj.set(i, []);
    }
  }
  
  // 添加边（无向图，带权重）
  addEdge(u: number, v: number, weight: number = 1): void {
    this.adj.get(u)!.push([v, weight]);
    this.adj.get(v)!.push([u, weight]);
  }
  
  // 添加边（有向图）
  addDirectedEdge(u: number, v: number, weight: number = 1): void {
    this.adj.get(u)!.push([v, weight]);
  }
  
  // 获取邻居
  getNeighbors(u: number): Array<[number, number]> {
    return this.adj.get(u) || [];
  }
  
  // 检查是否有边（需要遍历）
  hasEdge(u: number, v: number): boolean {
    for (const [neighbor] of this.adj.get(u) || []) {
      if (neighbor === v) return true;
    }
    return false;
  }
}
```

### 简化版本

实际刷题中，常用更简洁的形式：

```typescript
// 无权图
function buildGraph(n: number, edges: number[][]): number[][] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);  // 无向图
  }
  return graph;
}

// 有权图
function buildWeightedGraph(n: number, edges: number[][]): Array<Array<[number, number]>> {
  const graph: Array<Array<[number, number]>> = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    graph[u].push([v, w]);
    graph[v].push([u, w]);  // 无向图
  }
  return graph;
}

// 使用 Map（适合节点不是连续数字的情况）
function buildGraphMap(edges: number[][]): Map<number, number[]> {
  const graph = new Map<number, number[]>();
  for (const [u, v] of edges) {
    if (!graph.has(u)) graph.set(u, []);
    if (!graph.has(v)) graph.set(v, []);
    graph.get(u)!.push(v);
    graph.get(v)!.push(u);
  }
  return graph;
}
```

### 优缺点

**优点**：
- 空间 O(n + m)，对稀疏图效率高
- 遍历邻居 O(degree)
- 添加边 O(1)

**缺点**：
- 查询两点是否相连需要 O(degree)
- 实现稍复杂

## 对比总结

| 特性 | 邻接矩阵 | 邻接表 |
|------|----------|--------|
| 空间复杂度 | O(n²) | O(n + m) |
| 判断边是否存在 | O(1) | O(degree) |
| 遍历所有邻居 | O(n) | O(degree) |
| 添加边 | O(1) | O(1) |
| 删除边 | O(1) | O(degree) |
| 适用场景 | 稠密图、需要频繁查边 | 稀疏图、遍历为主 |

## 如何选择？

### 使用邻接矩阵

- 图比较小（n ≤ 1000）
- 图比较稠密（边数接近 n²）
- 需要频繁判断两点是否相连
- Floyd 等算法

### 使用邻接表

- 图比较大
- 图比较稀疏（m << n²）
- 以遍历为主（DFS、BFS）
- 大多数 LeetCode 图论题

## LeetCode 常见输入形式

### 1. 边列表

```typescript
// 输入：n = 4, edges = [[0,1],[1,2],[2,3]]
// 构建邻接表
function solve(n: number, edges: number[][]): void {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
}
```

### 2. 邻接矩阵

```typescript
// 输入：isConnected = [[1,1,0],[1,1,0],[0,0,1]]
// 直接使用或转换
function solve(isConnected: number[][]): void {
  const n = isConnected.length;
  // 直接使用
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (isConnected[i][j] === 1) {
        // i 和 j 相连
      }
    }
  }
}
```

### 3. 网格图

```typescript
// 输入：grid = [["1","1","0"],["1","1","0"],["0","0","1"]]
// 隐式图，不需要显式构建
function solve(grid: string[][]): void {
  const m = grid.length, n = grid[0].length;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  
  function getNeighbors(i: number, j: number): Array<[number, number]> {
    const neighbors: Array<[number, number]> = [];
    for (const [di, dj] of dirs) {
      const ni = i + di, nj = j + dj;
      if (ni >= 0 && ni < m && nj >= 0 && nj < n) {
        neighbors.push([ni, nj]);
      }
    }
    return neighbors;
  }
}
```

## 实战模板

```typescript
// 通用图构建模板
function buildGraph(n: number, edges: number[][], directed: boolean = false): number[][] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    if (!directed) {
      graph[v].push(u);
    }
  }
  
  return graph;
}

// DFS 模板
function dfs(graph: number[][], start: number): void {
  const visited = new Set<number>();
  
  function explore(node: number): void {
    if (visited.has(node)) return;
    visited.add(node);
    
    for (const neighbor of graph[node]) {
      explore(neighbor);
    }
  }
  
  explore(start);
}

// BFS 模板
function bfs(graph: number[][], start: number): void {
  const visited = new Set<number>([start]);
  const queue: number[] = [start];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}
```

## 总结

- **邻接矩阵**：空间换时间，适合小规模稠密图
- **邻接表**：LeetCode 主流选择，适合大多数场景
- **网格图**：隐式表示，不需要显式构建

选择存储方式要考虑：图的规模、稀疏程度、主要操作类型。
