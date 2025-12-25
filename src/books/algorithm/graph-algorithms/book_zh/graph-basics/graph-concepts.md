# 图的基本概念与术语

## 什么是图？

**图（Graph）** 是一种非线性数据结构，由**顶点（Vertex）**和**边（Edge）**组成。图用于表示对象之间的关系。

```
G = (V, E)
```

- V：顶点集合
- E：边集合，每条边连接两个顶点

## 图的直观理解

生活中的图无处不在：

| 场景 | 顶点 | 边 |
|------|------|------|
| 社交网络 | 用户 | 好友关系 |
| 交通系统 | 城市 | 道路 |
| 互联网 | 网页 | 超链接 |
| 电路 | 元件 | 导线 |
| 依赖管理 | 包 | 依赖关系 |

## 核心术语

### 1. 顶点与边

```typescript
// 顶点：用数字或字符串标识
const vertices = [0, 1, 2, 3, 4];

// 边：连接两个顶点
const edges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];
```

### 2. 有向图与无向图

**无向图（Undirected Graph）**：边没有方向
```
A — B    表示 A 和 B 相互连接
```

**有向图（Directed Graph）**：边有方向
```
A → B    表示从 A 可以到 B，但 B 不一定能到 A
```

### 3. 权重

**无权图**：边只表示连接关系

**有权图（Weighted Graph）**：边带有数值权重
```
A —(5)— B    表示 A 到 B 的代价是 5
```

### 4. 度（Degree）

顶点的度 = 与该顶点相连的边数

**无向图**：每个顶点有一个度数

**有向图**：
- **入度（In-degree）**：指向该顶点的边数
- **出度（Out-degree）**：从该顶点出发的边数

```typescript
// 计算无向图的度
function calculateDegrees(n: number, edges: number[][]): number[] {
  const degrees = new Array(n).fill(0);
  for (const [u, v] of edges) {
    degrees[u]++;
    degrees[v]++;
  }
  return degrees;
}

// 计算有向图的入度和出度
function calculateInOutDegrees(n: number, edges: number[][]): [number[], number[]] {
  const inDegree = new Array(n).fill(0);
  const outDegree = new Array(n).fill(0);
  for (const [from, to] of edges) {
    outDegree[from]++;
    inDegree[to]++;
  }
  return [inDegree, outDegree];
}
```

### 5. 路径与环

**路径（Path）**：从一个顶点到另一个顶点经过的顶点序列

**简单路径**：不重复经过任何顶点的路径

**环（Cycle）**：起点和终点相同的路径

**无环图（Acyclic Graph）**：不包含环的图

**有向无环图（DAG）**：有向且无环的图，在拓扑排序中非常重要

### 6. 连通性

**无向图的连通性**：
- **连通图**：任意两个顶点都有路径相连
- **连通分量**：最大的连通子图

**有向图的连通性**：
- **强连通**：任意两个顶点互相可达
- **弱连通**：忽略方向后连通

### 7. 特殊的图

**完全图**：任意两个顶点都有边相连
- n 个顶点的完全图有 n(n-1)/2 条边

**稀疏图**：边数远小于 n²

**稠密图**：边数接近 n²

**树**：无环的连通图
- n 个顶点的树恰有 n-1 条边

**森林**：多棵不相连的树

**二分图**：顶点可以分成两组，边只在两组之间

## 图的重要性质

### 握手定理

无向图中，所有顶点的度数之和 = 2 × 边数

```
∑ degree(v) = 2|E|
```

### 有向图性质

所有顶点的入度之和 = 所有顶点的出度之和 = 边数

```
∑ in-degree(v) = ∑ out-degree(v) = |E|
```

### 树的性质

- n 个顶点，n-1 条边
- 任意两个顶点之间有且仅有一条路径
- 删除任意一条边，图不连通
- 添加任意一条边，图有环

## 图论问题分类

### 1. 遍历问题

- DFS、BFS
- 连通分量
- 岛屿问题

### 2. 路径问题

- 最短路径（Dijkstra、Bellman-Ford）
- 所有点对最短路径（Floyd）
- 最长路径

### 3. 连通性问题

- 并查集
- 强连通分量（Tarjan）
- 割点与桥

### 4. 排序问题

- 拓扑排序
- 关键路径

### 5. 匹配问题

- 二分图匹配
- 最大匹配

### 6. 生成树问题

- 最小生成树（Kruskal、Prim）

## LeetCode 中的图

LeetCode 图论题的输入形式多样：

### 1. 邻接表

```typescript
// edges[i] = [from, to] 表示从 from 到 to 的边
const edges = [[0,1], [1,2], [2,0]];
```

### 2. 邻接矩阵

```typescript
// isConnected[i][j] = 1 表示 i 和 j 相连
const isConnected = [
  [1, 1, 0],
  [1, 1, 0],
  [0, 0, 1]
];
```

### 3. 网格（隐式图）

```typescript
// 网格中每个格子是一个节点，上下左右是邻居
const grid = [
  ['1', '1', '0'],
  ['1', '1', '0'],
  ['0', '0', '1']
];
```

### 4. 图对象

```typescript
// 节点类
class Node {
  val: number;
  neighbors: Node[];
}
```

## 构建图的基本代码

```typescript
// 从边列表构建邻接表
function buildGraph(n: number, edges: number[][]): Map<number, number[]> {
  const graph = new Map<number, number[]>();
  
  // 初始化所有节点
  for (let i = 0; i < n; i++) {
    graph.set(i, []);
  }
  
  // 添加边
  for (const [u, v] of edges) {
    graph.get(u)!.push(v);
    // 如果是无向图，还需要添加反向边
    // graph.get(v)!.push(u);
  }
  
  return graph;
}
```

## 总结

图是表达关系的强大工具：

1. **核心元素**：顶点和边
2. **分类维度**：有向/无向、有权/无权
3. **重要概念**：度、路径、环、连通性
4. **问题类型**：遍历、路径、连通、排序、匹配

接下来我们将学习图的存储方式，然后深入各类图算法。
