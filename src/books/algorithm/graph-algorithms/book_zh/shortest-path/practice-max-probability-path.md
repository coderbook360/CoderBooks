# 实战：概率最大的路径

## 题目描述

**LeetCode 1514. Path with Maximum Probability**

给你一个由 n 个节点（下标从 0 开始）组成的无向加权图，该图由一个描述边的列表组成，其中 `edges[i] = [a, b]` 表示连接节点 a 和节点 b 的一条无向边，且该边遍历成功的概率为 `succProb[i]`。

指定两个节点分别作为起点 `start` 和终点 `end`，请你找出从起点到终点成功概率最大的路径，并返回其成功概率。

如果不存在从 start 到 end 的路径，请返回 0。

**示例**：

```
输入：n = 3, edges = [[0,1],[1,2],[0,2]], succProb = [0.5,0.5,0.2], start = 0, end = 2
输出：0.25
解释：从 0 到 2 有两条路径：
- 路径 0 -> 2，成功概率 = 0.2
- 路径 0 -> 1 -> 2，成功概率 = 0.5 * 0.5 = 0.25
最大概率是 0.25
```

## 问题分析

这道题要求**最大化**路径上所有边概率的**乘积**。

**关键转化**：
- 概率乘积最大 → 概率对数之和最大
- 取负后变为：负对数之和最小 → 标准最短路径问题

但实际上，我们可以直接修改 Dijkstra 算法：
- 将"最小距离"改为"最大概率"
- 将"松弛"操作改为"扩张"操作

## 解法一：改造 Dijkstra（最大堆）

```python
import heapq
from collections import defaultdict
from typing import List

class Solution:
    def maxProbability(self, n: int, edges: List[List[int]], 
                       succProb: List[float], start: int, end: int) -> float:
        # 构建邻接表
        graph = defaultdict(list)
        for i, (a, b) in enumerate(edges):
            prob = succProb[i]
            graph[a].append((b, prob))
            graph[b].append((a, prob))
        
        # 最大概率（初始为 0，起点为 1）
        max_prob = [0.0] * n
        max_prob[start] = 1.0
        
        # 最大堆（Python 只有最小堆，存负数）
        heap = [(-1.0, start)]  # (-概率, 节点)
        
        while heap:
            neg_prob, u = heapq.heappop(heap)
            prob = -neg_prob
            
            if u == end:
                return prob
            
            # 跳过过时的条目
            if prob < max_prob[u]:
                continue
            
            for v, edge_prob in graph[u]:
                new_prob = prob * edge_prob
                if new_prob > max_prob[v]:
                    max_prob[v] = new_prob
                    heapq.heappush(heap, (-new_prob, v))
        
        return 0.0
```

**复杂度分析**：
- 时间：O((V + E) log V)
- 空间：O(V + E)

## 解法二：对数转换 + 标准 Dijkstra

将乘法转换为加法：

```python
import heapq
import math
from collections import defaultdict

class Solution:
    def maxProbability(self, n: int, edges: List[List[int]], 
                       succProb: List[float], start: int, end: int) -> float:
        graph = defaultdict(list)
        for i, (a, b) in enumerate(edges):
            prob = succProb[i]
            if prob > 0:
                # 取负对数，转化为最短路径
                weight = -math.log(prob)
                graph[a].append((b, weight))
                graph[b].append((a, weight))
        
        # 标准 Dijkstra
        dist = [float('inf')] * n
        dist[start] = 0
        heap = [(0, start)]
        
        while heap:
            d, u = heapq.heappop(heap)
            
            if u == end:
                # 转换回概率
                return math.exp(-d)
            
            if d > dist[u]:
                continue
            
            for v, w in graph[u]:
                new_dist = dist[u] + w
                if new_dist < dist[v]:
                    dist[v] = new_dist
                    heapq.heappush(heap, (new_dist, v))
        
        return 0.0
```

**数学原理**：
- `P(path) = p1 × p2 × ... × pk`
- `log(P) = log(p1) + log(p2) + ... + log(pk)`
- 最大化 `P` ⟺ 最大化 `log(P)` ⟺ 最小化 `-log(P)`

## 解法三：Bellman-Ford

```python
class Solution:
    def maxProbability(self, n: int, edges: List[List[int]], 
                       succProb: List[float], start: int, end: int) -> float:
        max_prob = [0.0] * n
        max_prob[start] = 1.0
        
        for _ in range(n - 1):
            updated = False
            for i, (a, b) in enumerate(edges):
                prob = succProb[i]
                # 双向边
                if max_prob[a] * prob > max_prob[b]:
                    max_prob[b] = max_prob[a] * prob
                    updated = True
                if max_prob[b] * prob > max_prob[a]:
                    max_prob[a] = max_prob[b] * prob
                    updated = True
            
            if not updated:
                break
        
        return max_prob[end]
```

## 解法四：SPFA

```python
from collections import deque

class Solution:
    def maxProbability(self, n: int, edges: List[List[int]], 
                       succProb: List[float], start: int, end: int) -> float:
        graph = defaultdict(list)
        for i, (a, b) in enumerate(edges):
            prob = succProb[i]
            graph[a].append((b, prob))
            graph[b].append((a, prob))
        
        max_prob = [0.0] * n
        max_prob[start] = 1.0
        in_queue = [False] * n
        
        queue = deque([start])
        in_queue[start] = True
        
        while queue:
            u = queue.popleft()
            in_queue[u] = False
            
            for v, prob in graph[u]:
                new_prob = max_prob[u] * prob
                if new_prob > max_prob[v]:
                    max_prob[v] = new_prob
                    if not in_queue[v]:
                        queue.append(v)
                        in_queue[v] = True
        
        return max_prob[end]
```

## 为什么可以用 Dijkstra？

标准 Dijkstra 要求边权非负，这里我们求的是最大概率，概率在 (0, 1] 之间。

**贪心正确性**：
- 当前概率最大的节点，无法通过其他路径获得更大的概率
- 因为经过更多边只会让概率更小（每条边的概率 ≤ 1）

这与 Dijkstra 处理非负权边的道理相同。

## 注意事项

1. **概率为 0 的边**：这种边实际上不可通行，应该跳过或特殊处理
2. **浮点精度**：概率乘积可能很小，对数转换可以避免精度问题
3. **初始值**：起点概率为 1.0（肯定能到达自己），其他为 0.0

## 小结

1. 概率最大路径问题可转化为最短路径问题
2. 两种方法：直接改造 Dijkstra 或对数转换
3. 概率 ∈ (0, 1]，满足 Dijkstra 的贪心条件
4. 同样的思路可处理其他"乘积最值"问题
