# Bellman-Ford 算法详解

Bellman-Ford 算法可以处理**带负权边**的图，并能**检测负环**。虽然时间复杂度较高，但它的通用性使其成为处理复杂图问题的重要工具。

## 核心思想

Bellman-Ford 基于**动态规划**思想：

- 最短路径最多包含 V-1 条边（否则存在环）
- 经过 k 轮松弛后，dist[v] 表示从源点到 v 最多经过 k 条边的最短距离
- 经过 V-1 轮松弛后，所有最短路径都已确定

## 算法步骤

1. **初始化**：源点距离为 0，其他顶点距离为无穷大
2. **松弛 V-1 轮**：每轮遍历所有边进行松弛
3. **检测负环**：再进行一轮松弛，如果还能更新，则存在负环

## 代码实现

### 基础版

```python
def bellman_ford(n, edges, start):
    """
    Bellman-Ford 算法
    n: 顶点数
    edges: 边列表，每条边 (u, v, w) 表示从 u 到 v 权重为 w
    start: 源点
    返回：(dist, has_negative_cycle)
    """
    INF = float('inf')
    dist = [INF] * n
    dist[start] = 0
    
    # 松弛 V-1 轮
    for i in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated = True
        
        # 提前终止优化：如果某轮没有更新，后续也不会更新
        if not updated:
            break
    
    # 检测负环：再松弛一轮
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return dist, True  # 存在负环
    
    return dist, False
```

### 记录路径版

```python
def bellman_ford_with_path(n, edges, start):
    """返回最短距离、父节点数组和是否有负环"""
    INF = float('inf')
    dist = [INF] * n
    parent = [-1] * n
    dist[start] = 0
    
    for _ in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                updated = True
        if not updated:
            break
    
    # 检测负环
    for u, v, w in edges:
        if dist[u] != INF and dist[u] + w < dist[v]:
            return dist, parent, True
    
    return dist, parent, False
```

## 正确性证明

**引理**：对于没有负环的图，从源点 s 到任意顶点 v 的最短路径最多包含 V-1 条边。

**证明**：
- 最短路径不会重复经过同一顶点（否则可以删除环减少距离）
- 不重复顶点的路径最多有 V 个顶点，即 V-1 条边

**定理**：经过 k 轮松弛后，如果存在从 s 到 v 的最短路径 s → v₁ → v₂ → ... → vₖ = v（k 条边），则 dist[v] 等于该最短路径长度。

**归纳证明**：
- k = 0：dist[s] = 0，正确
- 假设 k-1 轮后 dist[vₖ₋₁] 正确，第 k 轮松弛边 (vₖ₋₁, vₖ) 后 dist[vₖ] 正确

## 时间复杂度

- **时间**：O(VE)
- **空间**：O(V)

与 Dijkstra 的 O((V+E) log V) 相比较慢，但能处理负权边。

## 负环检测详解

**为什么第 V 轮还能更新说明有负环？**

- 如果没有负环，V-1 轮后所有最短路径已确定
- 如果第 V 轮还能更新某个 dist[v]，说明存在一条超过 V-1 条边的"更短路径"
- 超过 V-1 条边必然有重复顶点，即存在环
- 这个环能让距离变小，所以是负环

### 找出负环上的节点

```python
def find_negative_cycle(n, edges):
    """找出负环上的所有节点"""
    INF = float('inf')
    dist = [0] * n  # 注意：初始化为 0，检测任意负环
    parent = [-1] * n
    
    cycle_node = -1
    
    for i in range(n):
        cycle_node = -1
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                if i == n - 1:  # 第 V 轮还能更新
                    cycle_node = v
    
    if cycle_node == -1:
        return []  # 无负环
    
    # 回溯 n 次确保在环上
    for _ in range(n):
        cycle_node = parent[cycle_node]
    
    # 收集环上的节点
    cycle = []
    current = cycle_node
    while True:
        cycle.append(current)
        current = parent[current]
        if current == cycle_node:
            break
    
    return cycle[::-1]
```

## 限制边数的最短路径

Bellman-Ford 可以自然地解决"最多经过 k 条边的最短路径"问题：

```python
def shortest_path_k_edges(n, edges, start, k):
    """最多经过 k 条边的最短路径"""
    INF = float('inf')
    dist = [INF] * n
    dist[start] = 0
    
    for _ in range(k):
        # 必须使用上一轮的 dist 值，避免同一轮内传递
        new_dist = dist.copy()
        for u, v, w in edges:
            if dist[u] != INF and dist[u] + w < new_dist[v]:
                new_dist[v] = dist[u] + w
        dist = new_dist
    
    return dist
```

**关键点**：必须使用上一轮的距离值，否则一轮内可能松弛多条边。

## Dijkstra vs Bellman-Ford

| 特性 | Dijkstra | Bellman-Ford |
|-----|----------|--------------|
| 时间复杂度 | O((V+E) log V) | O(VE) |
| 负权边 | ❌ 不支持 | ✅ 支持 |
| 负环检测 | ❌ | ✅ |
| 限制边数 | 需要改造 | 自然支持 |
| 实现难度 | 中等 | 简单 |

## 小结

- Bellman-Ford 通过 V-1 轮松弛求解单源最短路径
- 核心优势：**处理负权边**和**检测负环**
- 时间复杂度 O(VE)，比 Dijkstra 慢
- 自然支持"最多 k 条边"的限制
- 提前终止优化：某轮无更新则后续也无更新
