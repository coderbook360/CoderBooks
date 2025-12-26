# Dijkstra 算法详解

Dijkstra 算法是解决**非负权图**单源最短路径问题的最经典算法，由荷兰计算机科学家 Edsger W. Dijkstra 于 1956 年发明。

## 核心思想

Dijkstra 算法基于**贪心策略**：每次从未确定最短路径的顶点中，选择距离源点最近的顶点，确定其最短路径，然后用它来松弛相邻顶点。

**为什么贪心有效？** 因为所有边权非负，一旦某个顶点被选中（当前距离最小），就不可能通过其他路径得到更短的距离。

## 算法步骤

1. **初始化**：
   - 源点距离设为 0，其他顶点距离设为无穷大
   - 所有顶点标记为"未访问"

2. **主循环**（重复 V 次）：
   - 从未访问顶点中选择距离最小的顶点 u
   - 将 u 标记为"已访问"
   - 对 u 的所有邻居 v 进行松弛操作

3. **结束**：所有顶点的最短距离都已确定

## 代码实现

### 基础版（邻接矩阵，O(V²)）

```python
def dijkstra_basic(graph, n, start):
    """
    基础版 Dijkstra，适用于稠密图
    graph: 邻接矩阵，graph[i][j] 表示边权，无边用 inf
    n: 顶点数
    start: 源点
    """
    INF = float('inf')
    dist = [INF] * n
    visited = [False] * n
    dist[start] = 0
    
    for _ in range(n):
        # 找未访问顶点中距离最小的
        u = -1
        min_dist = INF
        for i in range(n):
            if not visited[i] and dist[i] < min_dist:
                min_dist = dist[i]
                u = i
        
        if u == -1:  # 所有可达顶点都已访问
            break
        
        visited[u] = True
        
        # 松弛所有邻居
        for v in range(n):
            if graph[u][v] < INF and not visited[v]:
                new_dist = dist[u] + graph[u][v]
                if new_dist < dist[v]:
                    dist[v] = new_dist
    
    return dist
```

### 堆优化版（邻接表，O((V + E) log V)）

```python
import heapq
from collections import defaultdict

def dijkstra_heap(graph, n, start):
    """
    堆优化版 Dijkstra，适用于稀疏图
    graph: 邻接表，graph[u] = [(v, weight), ...]
    n: 顶点数
    start: 源点
    """
    INF = float('inf')
    dist = [INF] * n
    dist[start] = 0
    
    # 最小堆：(距离, 顶点)
    heap = [(0, start)]
    
    while heap:
        d, u = heapq.heappop(heap)
        
        # 跳过过时的条目
        if d > dist[u]:
            continue
        
        for v, weight in graph[u]:
            new_dist = dist[u] + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(heap, (new_dist, v))
    
    return dist
```

**关键优化**：使用最小堆替代线性查找，将查找最小距离的 O(V) 优化为 O(log V)。

### 记录路径版

```python
def dijkstra_with_path(graph, n, start):
    """返回最短距离和路径"""
    INF = float('inf')
    dist = [INF] * n
    parent = [-1] * n
    dist[start] = 0
    
    heap = [(0, start)]
    
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue
        
        for v, weight in graph[u]:
            new_dist = dist[u] + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                parent[v] = u
                heapq.heappush(heap, (new_dist, v))
    
    return dist, parent

def reconstruct_path(parent, start, end):
    """根据 parent 数组重建路径"""
    if parent[end] == -1 and end != start:
        return []  # 不可达
    
    path = []
    current = end
    while current != -1:
        path.append(current)
        current = parent[current]
    
    return path[::-1]
```

## 时间复杂度分析

| 实现方式 | 时间复杂度 | 适用场景 |
|---------|-----------|---------|
| 邻接矩阵 + 线性查找 | O(V²) | 稠密图（E ≈ V²） |
| 邻接表 + 二叉堆 | O((V + E) log V) | 稀疏图 |
| 邻接表 + 斐波那契堆 | O(E + V log V) | 理论最优 |

对于 LeetCode 中的大多数题目，**二叉堆优化版**是最佳选择。

## 为什么不能处理负权边？

考虑以下例子：

```
A --(1)--> B --(1)--> C
|                     ^
+------(-10)----------+
```

使用 Dijkstra：
1. 从 A 出发，dist[A] = 0
2. 更新 dist[B] = 1，dist[C] = -10
3. 取最小的 C（距离 -10），标记为已访问
4. 取 B，更新 C？但 C 已访问！

正确答案：A → B → C，距离 = 2
Dijkstra 答案：A → C，距离 = -10（但实际 A → B → C = 2 更优？不对...）

问题在于：当存在负权边时，"已确定最短路径"的假设不再成立。

## 常见问题与技巧

### 1. 如何处理无向图？

无向图需要双向建边：

```python
def build_undirected_graph(edges, n):
    graph = defaultdict(list)
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))
    return graph
```

### 2. 节点编号从 1 开始怎么办？

两种处理方式：

```python
# 方式1：数组多开一个位置
dist = [INF] * (n + 1)

# 方式2：编号转换
# 输入时 node - 1，输出时 node + 1
```

### 3. 如何判断是否可达？

```python
dist = dijkstra_heap(graph, n, start)
for i in range(n):
    if dist[i] == float('inf'):
        print(f"节点 {i} 不可达")
```

## 小结

- Dijkstra 算法是解决非负权图 SSSP 的首选算法
- 贪心策略：每次选择当前距离最小的未访问顶点
- 堆优化将复杂度从 O(V²) 降到 O((V + E) log V)
- **不能处理负权边**，负权场景使用 Bellman-Ford 或 SPFA
- 记住"跳过过时条目"这个堆优化的关键技巧
