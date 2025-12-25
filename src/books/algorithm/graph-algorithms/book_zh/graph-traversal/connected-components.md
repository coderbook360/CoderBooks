# 连通分量

## 什么是连通分量？

在无向图中，**连通分量**是一个极大连通子图。换句话说：
- 分量内的任意两点都可达
- 分量外的点与分量内的点不可达

```
图：
1 - 2    4 - 5
    |        |
    3        6

连通分量 1：{1, 2, 3}
连通分量 2：{4, 5, 6}
```

## 连通分量的性质

1. 每个节点恰好属于一个连通分量
2. 同一分量内任意两点有路径
3. 不同分量间没有边
4. 连通图只有一个连通分量

## 如何找连通分量？

### 方法一：DFS

```typescript
function findConnectedComponents(n: number, edges: number[][]): number[][] {
  // 建图
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  const components: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const component: number[] = [];
      dfs(i, graph, visited, component);
      components.push(component);
    }
  }
  
  return components;
}

function dfs(node: number, graph: number[][], visited: boolean[], component: number[]): void {
  visited[node] = true;
  component.push(node);
  
  for (const neighbor of graph[node]) {
    if (!visited[neighbor]) {
      dfs(neighbor, graph, visited, component);
    }
  }
}
```

### 方法二：BFS

```typescript
function findConnectedComponentsBFS(n: number, edges: number[][]): number[][] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  const components: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const component: number[] = [];
      const queue: number[] = [i];
      visited[i] = true;
      
      while (queue.length > 0) {
        const node = queue.shift()!;
        component.push(node);
        
        for (const neighbor of graph[node]) {
          if (!visited[neighbor]) {
            visited[neighbor] = true;
            queue.push(neighbor);
          }
        }
      }
      
      components.push(component);
    }
  }
  
  return components;
}
```

### 方法三：并查集

```typescript
class UnionFind {
  parent: number[];
  rank: number[];
  
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  
  union(x: number, y: number): void {
    const px = this.find(x), py = this.find(y);
    if (px === py) return;
    
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
    } else {
      this.parent[py] = px;
      this.rank[px]++;
    }
  }
}

function findConnectedComponentsUF(n: number, edges: number[][]): number[][] {
  const uf = new UnionFind(n);
  
  for (const [u, v] of edges) {
    uf.union(u, v);
  }
  
  // 收集各分量的节点
  const componentMap = new Map<number, number[]>();
  
  for (let i = 0; i < n; i++) {
    const root = uf.find(i);
    if (!componentMap.has(root)) {
      componentMap.set(root, []);
    }
    componentMap.get(root)!.push(i);
  }
  
  return Array.from(componentMap.values());
}
```

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| DFS | O(V + E) | O(V) | 静态图 |
| BFS | O(V + E) | O(V) | 静态图 |
| 并查集 | O(E × α(V)) | O(V) | 动态图（边在变化） |

## 应用：计算连通分量数量

```typescript
function countComponents(n: number, edges: number[][]): number {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  let count = 0;
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      dfs(i, graph, visited);
      count++;
    }
  }
  
  return count;
}

function dfs(node: number, graph: number[][], visited: boolean[]): void {
  visited[node] = true;
  for (const neighbor of graph[node]) {
    if (!visited[neighbor]) {
      dfs(neighbor, graph, visited);
    }
  }
}
```

## 应用：网格中的连通分量（岛屿数量）

```typescript
function numIslands(grid: string[][]): number {
  const m = grid.length, n = grid[0].length;
  let count = 0;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        dfsGrid(grid, i, j);
        count++;
      }
    }
  }
  
  return count;
}

function dfsGrid(grid: string[][], i: number, j: number): void {
  const m = grid.length, n = grid[0].length;
  
  if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== '1') {
    return;
  }
  
  grid[i][j] = '0';  // 标记为已访问
  
  dfsGrid(grid, i + 1, j);
  dfsGrid(grid, i - 1, j);
  dfsGrid(grid, i, j + 1);
  dfsGrid(grid, i, j - 1);
}
```

## 有向图中的连通分量

有向图有两种连通性：
1. **弱连通**：忽略边的方向后连通
2. **强连通**：正向反向都可达

弱连通分量与无向图相同。强连通分量需要专门的算法（Tarjan、Kosaraju）。

```typescript
// 弱连通分量：把有向图当无向图处理
function weaklyConnectedComponents(n: number, edges: number[][]): number {
  const graph: number[][] = Array.from({ length: n }, () => []);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);  // 忽略方向
  }
  
  // ... 同无向图
}
```

## 常见问题

### 判断图是否连通

```typescript
function isConnected(n: number, edges: number[][]): boolean {
  if (n === 0) return true;
  
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  dfs(0, graph, visited);
  
  return visited.every(v => v);
}
```

### 判断两点是否连通

```typescript
function areConnected(n: number, edges: number[][], a: number, b: number): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Set<number>();
  
  function dfs(node: number): boolean {
    if (node === b) return true;
    visited.add(node);
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      }
    }
    
    return false;
  }
  
  return dfs(a);
}
```

## 总结

连通分量的核心：

1. **定义**：极大连通子图
2. **计算方法**：DFS、BFS、并查集
3. **应用**：
   - 判断连通性
   - 计算分量数量
   - 找出各分量的节点
4. **复杂度**：O(V + E)
