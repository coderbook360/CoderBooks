# 环检测

## 为什么要检测环？

环（cycle）的存在会影响很多图算法：
- 拓扑排序：有向图有环则无法排序
- 最短路径：某些算法在负权环下失效
- 依赖分析：循环依赖是 bug
- 死锁检测：等待图有环说明存在死锁

## 无向图的环检测

### 思路

DFS 时，如果访问到一个已访问过的节点，并且这个节点不是父节点，说明有环。

```
1 - 2 - 3
    |   |
    +---+

DFS: 1 → 2 → 3 → 2（已访问，不是父节点）→ 有环！
```

### 代码实现

```typescript
function hasCycleUndirected(n: number, edges: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      if (dfs(i, -1, graph, visited)) {
        return true;
      }
    }
  }
  
  return false;
}

function dfs(node: number, parent: number, graph: number[][], visited: boolean[]): boolean {
  visited[node] = true;
  
  for (const neighbor of graph[node]) {
    if (!visited[neighbor]) {
      if (dfs(neighbor, node, graph, visited)) {
        return true;
      }
    } else if (neighbor !== parent) {
      // 访问到非父节点的已访问节点，有环
      return true;
    }
  }
  
  return false;
}
```

### 使用并查集检测

```typescript
function hasCycleUnionFind(n: number, edges: number[][]): boolean {
  const parent = Array.from({ length: n }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }
  
  for (const [u, v] of edges) {
    const pu = find(u), pv = find(v);
    
    // 如果两端已经在同一集合，加这条边会形成环
    if (pu === pv) return true;
    
    parent[pu] = pv;
  }
  
  return false;
}
```

## 有向图的环检测

### 思路：三色标记法

为每个节点标记三种状态：
- **白色 (0)**：未访问
- **灰色 (1)**：正在访问（在当前 DFS 路径上）
- **黑色 (2)**：已完成访问

如果遇到灰色节点，说明形成了环。

```
1 → 2 → 3
    ↑   ↓
    +---+

DFS: 1(灰) → 2(灰) → 3(灰) → 2(灰色！) → 有环
```

### 代码实现

```typescript
function hasCycleDirected(n: number, edges: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  // 0: 白色, 1: 灰色, 2: 黑色
  const color = new Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    if (color[i] === 0) {
      if (dfs(i, graph, color)) {
        return true;
      }
    }
  }
  
  return false;
}

function dfs(node: number, graph: number[][], color: number[]): boolean {
  color[node] = 1;  // 标记为灰色
  
  for (const neighbor of graph[node]) {
    if (color[neighbor] === 1) {
      // 遇到灰色节点，有环
      return true;
    }
    
    if (color[neighbor] === 0) {
      if (dfs(neighbor, graph, color)) {
        return true;
      }
    }
  }
  
  color[node] = 2;  // 标记为黑色
  return false;
}
```

### 使用拓扑排序检测

如果无法完成拓扑排序（不是所有节点都被处理），说明有环。

```typescript
function hasCycleTopological(n: number, edges: number[][]): boolean {
  const graph: number[][] = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  
  for (const [u, v] of edges) {
    graph[u].push(v);
    indegree[v]++;
  }
  
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) {
      queue.push(i);
    }
  }
  
  let count = 0;
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    count++;
    
    for (const neighbor of graph[node]) {
      indegree[neighbor]--;
      if (indegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  // 如果处理的节点数少于 n，说明有环
  return count < n;
}
```

## 为什么有向图不能用"父节点"方法？

```
1 → 2
↓   ↓
3 → 4

DFS: 1 → 2 → 4
     1 → 3 → 4（4 已访问，但不是环！）
```

在有向图中，节点可以被多条路径到达，这不是环。必须用三色标记来区分。

## 找出环中的节点

### 无向图

```typescript
function findCycle(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  
  const visited = new Array(n).fill(false);
  const parent = new Array(n).fill(-1);
  let cycleStart = -1, cycleEnd = -1;
  
  function dfs(node: number, par: number): boolean {
    visited[node] = true;
    parent[node] = par;
    
    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) {
        if (dfs(neighbor, node)) return true;
      } else if (neighbor !== par) {
        cycleStart = neighbor;
        cycleEnd = node;
        return true;
      }
    }
    
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited[i] && dfs(i, -1)) break;
  }
  
  if (cycleStart === -1) return [];  // 无环
  
  // 回溯找出环
  const cycle: number[] = [];
  let curr = cycleEnd;
  
  while (curr !== cycleStart) {
    cycle.push(curr);
    curr = parent[curr];
  }
  cycle.push(cycleStart);
  
  return cycle;
}
```

### 有向图

```typescript
function findCycleDirected(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
  }
  
  const color = new Array(n).fill(0);
  const parent = new Array(n).fill(-1);
  let cycleStart = -1, cycleEnd = -1;
  
  function dfs(node: number): boolean {
    color[node] = 1;
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === 1) {
        cycleStart = neighbor;
        cycleEnd = node;
        return true;
      }
      
      if (color[neighbor] === 0) {
        parent[neighbor] = node;
        if (dfs(neighbor)) return true;
      }
    }
    
    color[node] = 2;
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === 0 && dfs(i)) break;
  }
  
  if (cycleStart === -1) return [];
  
  const cycle: number[] = [cycleStart];
  let curr = cycleEnd;
  
  while (curr !== cycleStart) {
    cycle.push(curr);
    curr = parent[curr];
  }
  
  return cycle.reverse();
}
```

## 应用场景

1. **课程表问题**：判断课程是否可以完成
2. **编译依赖**：检测循环依赖
3. **死锁检测**：资源等待图
4. **图的有效性验证**：树必须无环

## 复杂度分析

- **时间复杂度**：O(V + E)
- **空间复杂度**：O(V)

## 总结

| 图类型 | 方法 | 关键点 |
|-------|------|-------|
| 无向图 | DFS + 父节点 | 遇到非父节点的已访问节点 |
| 无向图 | 并查集 | 边的两端已在同一集合 |
| 有向图 | 三色标记 | 遇到灰色节点 |
| 有向图 | 拓扑排序 | 无法处理所有节点 |
