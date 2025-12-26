# 实战：网络延迟时间

## 题目描述

**LeetCode 743. Network Delay Time**

有 `n` 个网络节点，标记为 `1` 到 `n`。给你一个列表 `times`，表示信号经过**有向边**的传递时间。`times[i] = (ui, vi, wi)`，其中 `ui` 是源节点，`vi` 是目标节点，`wi` 是信号从 `ui` 传递到 `vi` 的时间。

现在，从某个节点 `k` 发出一个信号。需要多久才能使所有节点都收到信号？如果不能使所有节点收到信号，返回 `-1`。

**示例**：

```
输入：times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2
输出：2
解释：从节点 2 发出信号，节点 1 和 3 在时间 1 收到，节点 4 在时间 2 收到
```

## 问题分析

这是一道典型的**单源最短路径**问题：

- 从节点 k 出发，求到所有其他节点的最短距离
- 所有边权为正（传递时间为正数）
- 答案是到达所有节点的最短距离中的**最大值**

由于边权非负，**Dijkstra 算法**是最佳选择。

## 解法一：Dijkstra（堆优化）

```python
import heapq
from collections import defaultdict
from typing import List

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        # 构建邻接表（注意节点编号从 1 开始）
        graph = defaultdict(list)
        for u, v, w in times:
            graph[u].append((v, w))
        
        # Dijkstra 算法
        dist = {i: float('inf') for i in range(1, n + 1)}
        dist[k] = 0
        heap = [(0, k)]  # (距离, 节点)
        
        while heap:
            d, u = heapq.heappop(heap)
            
            # 跳过过时的条目
            if d > dist[u]:
                continue
            
            for v, w in graph[u]:
                new_dist = dist[u] + w
                if new_dist < dist[v]:
                    dist[v] = new_dist
                    heapq.heappush(heap, (new_dist, v))
        
        # 找最大距离
        max_dist = max(dist.values())
        return max_dist if max_dist < float('inf') else -1
```

**复杂度分析**：
- 时间：O((V + E) log V)
- 空间：O(V + E)

## 解法二：Bellman-Ford

虽然本题边权非负，但 Bellman-Ford 也能解决：

```python
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        INF = float('inf')
        dist = [INF] * (n + 1)
        dist[k] = 0
        
        # 松弛 n-1 轮
        for _ in range(n - 1):
            updated = False
            for u, v, w in times:
                if dist[u] != INF and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    updated = True
            if not updated:
                break
        
        # 找 1~n 中的最大距离
        max_dist = max(dist[1:])
        return max_dist if max_dist < INF else -1
```

**复杂度分析**：
- 时间：O(VE)
- 空间：O(V)

## 解法三：Floyd-Warshall

如果需要多次查询不同源点，可以预处理 Floyd：

```python
class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        INF = float('inf')
        
        # 初始化距离矩阵
        dist = [[INF] * (n + 1) for _ in range(n + 1)]
        for i in range(n + 1):
            dist[i][i] = 0
        for u, v, w in times:
            dist[u][v] = w
        
        # Floyd
        for mid in range(1, n + 1):
            for i in range(1, n + 1):
                for j in range(1, n + 1):
                    if dist[i][mid] + dist[mid][j] < dist[i][j]:
                        dist[i][j] = dist[i][mid] + dist[mid][j]
        
        max_dist = max(dist[k][1:n+1])
        return max_dist if max_dist < INF else -1
```

**复杂度分析**：
- 时间：O(V³)
- 空间：O(V²)

## 解法四：SPFA

```python
from collections import deque

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        graph = defaultdict(list)
        for u, v, w in times:
            graph[u].append((v, w))
        
        INF = float('inf')
        dist = [INF] * (n + 1)
        dist[k] = 0
        in_queue = [False] * (n + 1)
        
        queue = deque([k])
        in_queue[k] = True
        
        while queue:
            u = queue.popleft()
            in_queue[u] = False
            
            for v, w in graph[u]:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    if not in_queue[v]:
                        queue.append(v)
                        in_queue[v] = True
        
        max_dist = max(dist[1:])
        return max_dist if max_dist < INF else -1
```

## 算法对比

| 算法 | 本题性能 | 代码复杂度 | 适用场景 |
|-----|---------|-----------|---------|
| Dijkstra（堆） | 最优 | 中等 | 非负权边首选 |
| Bellman-Ford | 较慢 | 简单 | 需要处理负权边时 |
| Floyd | 较慢 | 简单 | 多次查询 |
| SPFA | 中等 | 中等 | 随机图较快 |

## 关键点总结

1. 本题是标准的**单源最短路径**问题
2. 边权非负，**Dijkstra 是最佳选择**
3. 答案是所有最短距离的**最大值**
4. 如果有节点不可达（距离为无穷大），返回 -1
5. 注意节点编号从 1 开始
