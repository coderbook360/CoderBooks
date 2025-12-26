# Prim 算法详解

Prim 算法是另一个求解最小生成树的经典算法，基于**顶点的贪心策略**：从一个顶点出发，每次选择连接已选顶点集合与未选顶点集合的最小边。

## 核心思想

1. 从任意顶点开始，加入已选集合
2. 重复以下步骤直到所有顶点都被选中：
   - 找到连接已选集合与未选集合的最小边
   - 将这条边和对应的未选顶点加入已选集合
3. 选中的边构成 MST

**与 Dijkstra 的相似性**：
- 都是贪心扩展
- 都使用优先队列优化
- 但 Prim 更新的是"到已选集合的距离"，Dijkstra 更新的是"到源点的距离"

## 两种实现

### 实现一：邻接矩阵（O(V²)）

适合稠密图：

```python
def prim_matrix(n: int, graph: List[List[int]]) -> int:
    """
    Prim 算法（邻接矩阵版）
    graph[i][j] = 边权，无边用 inf
    返回 MST 总权重
    """
    INF = float('inf')
    
    # 到已选集合的最小距离
    min_dist = [INF] * n
    in_mst = [False] * n
    
    # 从顶点 0 开始
    min_dist[0] = 0
    total_weight = 0
    
    for _ in range(n):
        # 找未选顶点中距离最小的
        u = -1
        for i in range(n):
            if not in_mst[i] and (u == -1 or min_dist[i] < min_dist[u]):
                u = i
        
        if min_dist[u] == INF:
            return -1  # 图不连通
        
        in_mst[u] = True
        total_weight += min_dist[u]
        
        # 更新邻居到已选集合的距离
        for v in range(n):
            if not in_mst[v] and graph[u][v] < min_dist[v]:
                min_dist[v] = graph[u][v]
    
    return total_weight
```

### 实现二：堆优化（O(E log V)）

适合稀疏图：

```python
import heapq
from typing import List, Tuple

def prim_heap(n: int, graph: List[List[Tuple[int, int]]]) -> int:
    """
    Prim 算法（堆优化版）
    graph[u] = [(v, weight), ...]
    返回 MST 总权重
    """
    INF = float('inf')
    
    in_mst = [False] * n
    min_dist = [INF] * n
    min_dist[0] = 0
    
    # (距离, 顶点)
    heap = [(0, 0)]
    total_weight = 0
    edges_used = 0
    
    while heap and edges_used < n:
        dist, u = heapq.heappop(heap)
        
        if in_mst[u]:
            continue
        
        in_mst[u] = True
        total_weight += dist
        edges_used += 1
        
        for v, weight in graph[u]:
            if not in_mst[v] and weight < min_dist[v]:
                min_dist[v] = weight
                heapq.heappush(heap, (weight, v))
    
    return total_weight if edges_used == n else -1
```

## 完整代码（带路径记录）

```python
import heapq
from collections import defaultdict
from typing import List, Tuple

def prim_with_edges(n: int, edges: List[Tuple[int, int, int]]) -> Tuple[int, List[Tuple[int, int, int]]]:
    """
    返回 MST 总权重和边列表
    """
    # 构建邻接表
    graph = defaultdict(list)
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))
    
    INF = float('inf')
    in_mst = [False] * n
    min_dist = [INF] * n
    min_edge = [(-1, -1, -1)] * n  # 记录最小边
    min_dist[0] = 0
    
    heap = [(0, 0, -1)]  # (距离, 顶点, 来源顶点)
    total_weight = 0
    mst_edges = []
    
    while heap:
        dist, u, from_u = heapq.heappop(heap)
        
        if in_mst[u]:
            continue
        
        in_mst[u] = True
        total_weight += dist
        
        if from_u != -1:
            mst_edges.append((from_u, u, dist))
        
        for v, weight in graph[u]:
            if not in_mst[v] and weight < min_dist[v]:
                min_dist[v] = weight
                heapq.heappush(heap, (weight, v, u))
    
    if len(mst_edges) < n - 1:
        return -1, []
    
    return total_weight, mst_edges
```

## 正确性证明

**定理**：Prim 算法产生的是最小生成树。

**证明**（使用切割性质）：

每一步，Prim 选择连接已选集合 S 与未选集合 V - S 的最小边。

(S, V - S) 形成一个切割，根据切割性质，横跨切割的最小边一定属于某棵 MST。

因此 Prim 选择的每条边都属于 MST。

## 时间复杂度对比

| 实现方式 | 时间复杂度 | 适用场景 |
|---------|-----------|---------|
| 邻接矩阵 | O(V²) | 稠密图（E ≈ V²） |
| 二叉堆 | O(E log V) | 稀疏图 |
| 斐波那契堆 | O(E + V log V) | 理论最优 |

## Prim vs Kruskal

| 特性 | Prim | Kruskal |
|-----|------|---------|
| 策略 | 顶点扩展 | 边排序 |
| 数据结构 | 优先队列 | 并查集 |
| 稠密图 | O(V²) 更优 | O(E log E) |
| 稀疏图 | O(E log V) | O(E log E) 相当 |
| 实现 | 类似 Dijkstra | 更简单 |

**选择建议**：
- 稀疏图：两者皆可，Kruskal 实现更简单
- 稠密图：Prim (O(V²)) 更优
- 需要动态更新：Prim 更容易修改

## 常见错误

### 错误1：堆中的过时条目

```python
# 必须跳过已加入 MST 的顶点
if in_mst[u]:
    continue
```

### 错误2：更新距离时的判断

```python
# Prim：到已选集合的距离
if weight < min_dist[v]:  # 正确

# 不是 Dijkstra 的累加
if dist + weight < min_dist[v]:  # 错误！
```

### 错误3：忘记处理不连通的情况

```python
if edges_used < n:
    return -1  # 图不连通
```

## 小结

- Prim 基于顶点扩展的贪心策略
- 每次选择连接已选集合与未选集合的最小边
- 堆优化版时间复杂度 O(E log V)
- 与 Dijkstra 类似，但更新的是到集合的距离而非到源点的距离
- 稠密图用邻接矩阵版，稀疏图用堆优化版
