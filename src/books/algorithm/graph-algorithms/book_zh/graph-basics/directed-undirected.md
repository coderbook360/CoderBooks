# 有向图与无向图的特性

## 核心区别

**无向图**：边没有方向，A-B 表示双向可达

**有向图**：边有方向，A→B 只表示 A 能到 B

```typescript
// 无向图：添加双向边
graph[u].push(v);
graph[v].push(u);

// 有向图：只添加单向边
graph[u].push(v);
```

## 无向图的特性

### 1. 对称性

如果 A 到 B 有边，那么 B 到 A 也有边。

邻接矩阵是对称矩阵：`matrix[i][j] === matrix[j][i]`

### 2. 度

每个顶点只有一个度数，表示相连的边数。

```typescript
function calculateDegree(graph: number[][]): number[] {
  return graph.map(neighbors => neighbors.length);
}
```

### 3. 连通性

- **连通图**：任意两点之间都有路径
- **连通分量**：最大连通子图的个数

```typescript
// 计算连通分量数
function countComponents(n: number, graph: number[][]): number {
  const visited = new Set<number>();
  let count = 0;
  
  function dfs(node: number): void {
    if (visited.has(node)) return;
    visited.add(node);
    for (const neighbor of graph[node]) {
      dfs(neighbor);
    }
  }
  
  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      dfs(i);
      count++;
    }
  }
  
  return count;
}
```

### 4. 欧拉路径与回路

- **欧拉路径**：经过每条边恰好一次的路径
  - 存在条件：恰有 0 或 2 个奇度顶点
- **欧拉回路**：起点和终点相同的欧拉路径
  - 存在条件：所有顶点都是偶度

### 5. 典型问题

- 岛屿数量（连通分量）
- 判断二分图
- 最小生成树
- 欧拉路径

## 有向图的特性

### 1. 非对称性

A→B 不意味着 B→A。

邻接矩阵可能不对称。

### 2. 入度与出度

- **入度**：指向该顶点的边数
- **出度**：从该顶点出发的边数

```typescript
function calculateInOutDegree(n: number, graph: number[][]): [number[], number[]] {
  const inDegree = new Array(n).fill(0);
  const outDegree = new Array(n).fill(0);
  
  for (let u = 0; u < n; u++) {
    outDegree[u] = graph[u].length;
    for (const v of graph[u]) {
      inDegree[v]++;
    }
  }
  
  return [inDegree, outDegree];
}
```

### 3. 可达性

A 能到 B，不代表 B 能到 A。

需要区分**单向可达**和**双向可达**。

### 4. 连通性

- **强连通**：任意两点双向可达
- **弱连通**：忽略方向后连通
- **强连通分量（SCC）**：最大的强连通子图

### 5. 有向无环图（DAG）

不存在环的有向图，是拓扑排序的基础。

```typescript
// 检测有向图是否有环（DFS 版本）
function hasCycle(n: number, graph: number[][]): boolean {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  
  function dfs(node: number): boolean {
    color[node] = GRAY;  // 正在访问
    
    for (const neighbor of graph[node]) {
      if (color[neighbor] === GRAY) return true;  // 发现环
      if (color[neighbor] === WHITE && dfs(neighbor)) return true;
    }
    
    color[node] = BLACK;  // 访问完成
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === WHITE && dfs(i)) {
      return true;
    }
  }
  
  return false;
}
```

### 6. 典型问题

- 课程表（环检测）
- 拓扑排序
- 最短路径（Dijkstra、Bellman-Ford）
- 强连通分量

## 对比总结

| 特性 | 无向图 | 有向图 |
|------|--------|--------|
| 边的方向 | 无 | 有 |
| 度 | 单一度数 | 入度 + 出度 |
| 连通性 | 连通/不连通 | 强连通/弱连通 |
| 环检测 | 并查集/DFS | 三色标记 |
| 典型算法 | MST、连通分量 | 拓扑排序、SCC |

## 无向图转有向图

某些问题中，无向边可以看作两条有向边：

```typescript
// 无向图
edges = [[0, 1], [1, 2]];

// 等价于有向图
directedEdges = [[0, 1], [1, 0], [1, 2], [2, 1]];
```

## 有向图反转

有时需要反转所有边的方向：

```typescript
function reverseGraph(n: number, graph: number[][]): number[][] {
  const reversed: number[][] = Array.from({ length: n }, () => []);
  
  for (let u = 0; u < n; u++) {
    for (const v of graph[u]) {
      reversed[v].push(u);  // 反转边 u→v 变成 v→u
    }
  }
  
  return reversed;
}
```

应用场景：
- 找到所有能到达终点的起点
- Kosaraju 算法求 SCC

## LeetCode 实战技巧

### 1. 识别图的类型

```typescript
// 看题目描述和边的表示
// edges[i] = [a, b] 通常是无向边
// edges[i] = [from, to] 通常是有向边
```

### 2. 正确建图

```typescript
// 无向图
for (const [u, v] of edges) {
  graph[u].push(v);
  graph[v].push(u);  // 别忘了！
}

// 有向图
for (const [from, to] of edges) {
  graph[from].push(to);  // 只有单向
}
```

### 3. 入度计算（拓扑排序必备）

```typescript
const inDegree = new Array(n).fill(0);
for (const [from, to] of edges) {
  graph[from].push(to);
  inDegree[to]++;  // 计算入度
}
```

## 总结

理解有向图和无向图的区别至关重要：

1. **建图时**：无向图加双向边，有向图加单向边
2. **度计算**：无向图一个度，有向图分入度出度
3. **连通性**：无向图判连通，有向图判强连通
4. **环检测**：无向图用并查集，有向图用三色标记

根据题目选择正确的图类型和算法。
