# 实战：从第一个节点出发到最后一个节点的受限路径数

## 题目描述

**LeetCode 1786. Number of Restricted Paths From First to Last Node**

现有一个加权无向连通图。给你一个正整数 n，表示图中有 n 个节点，并按从 1 到 n 给节点编号；另给你一个数组 edges，其中每个 `edges[i] = [ui, vi, weighti]` 表示存在一条位于节点 ui 和 vi 之间的边，这条边的权重为 weighti。

从节点 u 出发到节点 v 的一条路径被称为**受限路径**，当且仅当路径中每一步都满足 `distanceToLastNode(当前节点) > distanceToLastNode(下一节点)`。

返回从节点 1 到节点 n 的受限路径数。由于数字可能很大，请返回对 10^9 + 7 取余的结果。

**示例**：

```
输入：n = 5, edges = [[1,2,3],[1,3,3],[2,3,1],[1,4,2],[5,2,2],[3,5,1],[5,4,10]]
输出：3
解释：每个圆圈表示节点的 distanceToLastNode
```

## 问题分析

这道题结合了两个问题：

1. **最短路径**：计算每个节点到节点 n 的最短距离
2. **路径计数**：在 DAG 上进行动态规划

**受限路径的本质**：沿着到终点距离严格递减的方向行走。这保证了图变成 DAG（无环），可以用 DP 计数。

## 解法：Dijkstra + 记忆化 DFS

### 步骤

1. 从节点 n 出发，用 Dijkstra 计算到所有节点的最短距离
2. 从节点 1 出发，用 DFS + 记忆化统计受限路径数

```python
import heapq
from collections import defaultdict
from functools import lru_cache
from typing import List

class Solution:
    def countRestrictedPaths(self, n: int, edges: List[List[int]]) -> int:
        MOD = 10 ** 9 + 7
        
        # 构建邻接表
        graph = defaultdict(list)
        for u, v, w in edges:
            graph[u].append((v, w))
            graph[v].append((u, w))
        
        # Step 1: Dijkstra 从节点 n 出发
        INF = float('inf')
        dist = [INF] * (n + 1)
        dist[n] = 0
        heap = [(0, n)]
        
        while heap:
            d, u = heapq.heappop(heap)
            if d > dist[u]:
                continue
            for v, w in graph[u]:
                new_dist = dist[u] + w
                if new_dist < dist[v]:
                    dist[v] = new_dist
                    heapq.heappush(heap, (new_dist, v))
        
        # Step 2: 记忆化 DFS 计数
        @lru_cache(maxsize=None)
        def dfs(u):
            if u == n:
                return 1
            
            total = 0
            for v, _ in graph[u]:
                # 受限条件：dist[u] > dist[v]
                if dist[u] > dist[v]:
                    total = (total + dfs(v)) % MOD
            
            return total
        
        return dfs(1)
```

**复杂度分析**：
- 时间：O((V + E) log V) for Dijkstra + O(V + E) for DFS = O((V + E) log V)
- 空间：O(V + E)

## 解法二：Dijkstra + 拓扑排序 DP

按 dist 从小到大排序处理（类似拓扑排序）：

```python
class Solution:
    def countRestrictedPaths(self, n: int, edges: List[List[int]]) -> int:
        MOD = 10 ** 9 + 7
        
        graph = defaultdict(list)
        for u, v, w in edges:
            graph[u].append((v, w))
            graph[v].append((u, w))
        
        # Dijkstra
        INF = float('inf')
        dist = [INF] * (n + 1)
        dist[n] = 0
        heap = [(0, n)]
        
        while heap:
            d, u = heapq.heappop(heap)
            if d > dist[u]:
                continue
            for v, w in graph[u]:
                if dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w
                    heapq.heappush(heap, (dist[v], v))
        
        # 按 dist 排序，从小到大处理
        nodes = list(range(1, n + 1))
        nodes.sort(key=lambda x: dist[x])
        
        # DP：ways[i] = 从节点 i 到节点 n 的受限路径数
        ways = [0] * (n + 1)
        ways[n] = 1
        
        for u in nodes:
            for v, _ in graph[u]:
                if dist[v] > dist[u]:  # v 可以走向 u（受限条件）
                    ways[v] = (ways[v] + ways[u]) % MOD
        
        return ways[1]
```

## 为什么是 DAG？

**定理**：如果只保留满足 `dist[u] > dist[v]` 的边 (u, v)，图变成 DAG。

**证明**：
- 假设存在环 v1 → v2 → ... → vk → v1
- 根据边的条件：dist[v1] > dist[v2] > ... > dist[vk] > dist[v1]
- 这导致 dist[v1] > dist[v1]，矛盾
- 因此不存在环，是 DAG

## 关键点

1. **两阶段算法**：
   - 阶段一：计算到终点的最短距离
   - 阶段二：在 DAG 上计数

2. **受限条件转化**：
   - `dist[u] > dist[v]` 定义了有向边 u → v
   - 形成了以节点 n 为汇点的 DAG

3. **为什么从 n 开始 Dijkstra**：
   - 需要计算到节点 n 的距离
   - 也可以反转边从 1 开始，但从 n 开始更直观

## 常见错误

### 错误1：忘记取模

```python
# 错误
total = total + dfs(v)

# 正确
total = (total + dfs(v)) % MOD
```

### 错误2：方向搞反

```python
# 错误：这是走远离终点的方向
if dist[u] < dist[v]:
    ...

# 正确：走向终点，距离应该减小
if dist[u] > dist[v]:
    ...
```

### 错误3：节点编号从 1 开始

```python
# 注意数组大小为 n+1
dist = [INF] * (n + 1)
ways = [0] * (n + 1)
```

## 相关问题

- **LeetCode 1976**：到达目的地的方案数（类似思路）
- **LeetCode 1857**：有向图中最大颜色值

## 小结

1. 本题将最短路径与路径计数结合
2. 利用"距离递减"条件将图转化为 DAG
3. 在 DAG 上可以用 DP 或记忆化 DFS 计数
4. 时间复杂度主要由 Dijkstra 决定：O((V + E) log V)
