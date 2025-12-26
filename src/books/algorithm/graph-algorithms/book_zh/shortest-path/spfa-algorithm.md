# SPFA 算法详解

SPFA（Shortest Path Faster Algorithm）是 Bellman-Ford 算法的队列优化版本，平均时间复杂度为 O(E)，但最坏情况下仍为 O(VE)。

## 核心思想

Bellman-Ford 每轮遍历所有边，但实际上很多边的松弛是无效的（源端点距离未更新）。

**SPFA 的优化**：只有当某个顶点的距离被更新后，才需要用它去松弛邻居。使用队列维护"待处理"的顶点。

## 算法步骤

1. **初始化**：源点入队，距离为 0
2. **循环处理队列**：
   - 取出队首顶点 u
   - 用 u 松弛所有邻居 v
   - 如果 v 的距离被更新且 v 不在队列中，将 v 入队
3. **结束**：队列为空

## 代码实现

### 基础版

```python
from collections import deque, defaultdict

def spfa(n, graph, start):
    """
    SPFA 算法
    n: 顶点数
    graph: 邻接表，graph[u] = [(v, w), ...]
    start: 源点
    返回：(dist, has_negative_cycle)
    """
    INF = float('inf')
    dist = [INF] * n
    in_queue = [False] * n
    count = [0] * n  # 每个顶点入队次数，用于检测负环
    
    dist[start] = 0
    queue = deque([start])
    in_queue[start] = True
    count[start] = 1
    
    while queue:
        u = queue.popleft()
        in_queue[u] = False
        
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                
                if not in_queue[v]:
                    queue.append(v)
                    in_queue[v] = True
                    count[v] += 1
                    
                    # 负环检测：入队超过 V 次
                    if count[v] > n:
                        return dist, True
    
    return dist, False
```

### 记录路径版

```python
def spfa_with_path(n, graph, start):
    """返回最短距离、父节点数组和是否有负环"""
    INF = float('inf')
    dist = [INF] * n
    parent = [-1] * n
    in_queue = [False] * n
    count = [0] * n
    
    dist[start] = 0
    queue = deque([start])
    in_queue[start] = True
    count[start] = 1
    
    while queue:
        u = queue.popleft()
        in_queue[u] = False
        
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u
                
                if not in_queue[v]:
                    queue.append(v)
                    in_queue[v] = True
                    count[v] += 1
                    
                    if count[v] > n:
                        return dist, parent, True
    
    return dist, parent, False
```

## SLF 和 LLL 优化

### SLF（Small Label First）优化

将待入队顶点与队首比较，如果距离更小则插入队首：

```python
def spfa_slf(n, graph, start):
    """带 SLF 优化的 SPFA"""
    INF = float('inf')
    dist = [INF] * n
    in_queue = [False] * n
    
    dist[start] = 0
    queue = deque([start])
    in_queue[start] = True
    
    while queue:
        u = queue.popleft()
        in_queue[u] = False
        
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                
                if not in_queue[v]:
                    # SLF 优化：比队首小则插入队首
                    if queue and dist[v] < dist[queue[0]]:
                        queue.appendleft(v)
                    else:
                        queue.append(v)
                    in_queue[v] = True
    
    return dist
```

### LLL（Large Label Last）优化

只处理距离小于队列平均值的顶点，否则放到队尾：

```python
def spfa_lll(n, graph, start):
    """带 LLL 优化的 SPFA（需要维护队列和）"""
    INF = float('inf')
    dist = [INF] * n
    in_queue = [False] * n
    
    dist[start] = 0
    queue = deque([start])
    in_queue[start] = True
    queue_sum = 0  # 队列中距离之和
    
    while queue:
        # LLL：跳过大于平均值的顶点
        avg = queue_sum / len(queue) if queue else 0
        while queue and dist[queue[0]] > avg:
            queue.append(queue.popleft())
        
        u = queue.popleft()
        queue_sum -= dist[u]
        in_queue[u] = False
        
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                if in_queue[v]:
                    queue_sum -= dist[v]
                dist[v] = dist[u] + w
                
                if not in_queue[v]:
                    queue.append(v)
                    in_queue[v] = True
                queue_sum += dist[v]
    
    return dist
```

## 时间复杂度分析

- **最好情况**：O(E)，接近 BFS
- **平均情况**：O(kE)，k 是一个较小的常数
- **最坏情况**：O(VE)，与 Bellman-Ford 相同

**SPFA 的局限性**：在某些精心构造的图上（如网格图），SPFA 会退化到 O(VE)，甚至比 Dijkstra 更慢。

## 负环检测方法

### 方法一：入队次数判定

```python
if count[v] > n:
    return True  # 存在负环
```

如果某个顶点入队超过 V 次，说明存在负环。

### 方法二：路径长度判定

```python
def spfa_detect_negative_cycle_by_path(n, graph, start):
    """通过最短路径边数检测负环"""
    INF = float('inf')
    dist = [INF] * n
    path_len = [0] * n  # 最短路径的边数
    in_queue = [False] * n
    
    dist[start] = 0
    queue = deque([start])
    in_queue[start] = True
    
    while queue:
        u = queue.popleft()
        in_queue[u] = False
        
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                path_len[v] = path_len[u] + 1
                
                # 边数超过 V-1 说明有负环
                if path_len[v] >= n:
                    return True
                
                if not in_queue[v]:
                    queue.append(v)
                    in_queue[v] = True
    
    return False
```

## SPFA vs Dijkstra vs Bellman-Ford

| 算法 | 时间复杂度 | 负权边 | 负环检测 | 实际性能 |
|-----|-----------|--------|---------|---------|
| Dijkstra | O((V+E) log V) | ❌ | ❌ | 稳定 |
| Bellman-Ford | O(VE) | ✅ | ✅ | 稳定 |
| SPFA | 平均 O(E)，最坏 O(VE) | ✅ | ✅ | 不稳定 |

**选择建议**：

1. 无负权边 → **Dijkstra**
2. 有负权边，需要稳定性 → **Bellman-Ford**
3. 有负权边，随机图，追求效率 → **SPFA**（但要小心被卡）

## 小结

- SPFA 是 Bellman-Ford 的队列优化版本
- 核心思想：只有更新过的顶点才能松弛邻居
- 平均复杂度 O(E)，但可能退化到 O(VE)
- SLF 和 LLL 优化可以提升性能，但不改变最坏复杂度
- 在竞赛中需谨慎使用，可能被特殊数据卡掉
- 负环检测：入队次数 > V 或路径边数 ≥ V
