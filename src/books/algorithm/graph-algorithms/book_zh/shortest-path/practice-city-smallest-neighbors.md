# 实战：阈值距离内邻居最少的城市

## 题目描述

**LeetCode 1334. Find the City With the Smallest Number of Neighbors at a Threshold Distance**

有 n 个城市，按从 0 到 n-1 编号。给你一个边数组 edges，其中 `edges[i] = [fromi, toi, weighti]` 代表 fromi 和 toi 两个城市之间的双向加权边，距离阈值是一个整数 distanceThreshold。

返回能通过某些路径到达其他城市数目最少、且路径距离**最大**为 distanceThreshold 的城市。如果有多个这样的城市，则返回编号最大的城市。

**示例**：

```
输入：n = 4, edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]], distanceThreshold = 4
输出：3
解释：
- 城市 0 能到达的城市：1（距离3）、2（距离4）
- 城市 1 能到达的城市：0（距离3）、2（距离1）、3（距离4）
- 城市 2 能到达的城市：0（距离4）、1（距离1）、3（距离1）
- 城市 3 能到达的城市：1（距离4）、2（距离1）

城市 0 和 3 都只能到达 2 个城市，返回编号最大的 3
```

## 问题分析

本题需要计算**每个城市**到其他所有城市的最短距离，然后统计阈值内可达的城市数。

这是一个**全源最短路径**问题，有两种主流解法：
1. **Floyd-Warshall**：O(V³)
2. **V 次 Dijkstra**：O(V × (V + E) log V)

对于稠密图（E ≈ V²），Floyd 更简洁；对于稀疏图，Dijkstra 更快。

## 解法一：Floyd-Warshall

```python
from typing import List

class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], 
                    distanceThreshold: int) -> int:
        INF = float('inf')
        
        # 初始化距离矩阵
        dist = [[INF] * n for _ in range(n)]
        for i in range(n):
            dist[i][i] = 0
        for u, v, w in edges:
            dist[u][v] = w
            dist[v][u] = w
        
        # Floyd-Warshall
        for k in range(n):
            for i in range(n):
                for j in range(n):
                    if dist[i][k] + dist[k][j] < dist[i][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
        
        # 统计每个城市在阈值内能到达的城市数
        result = -1
        min_count = n + 1
        
        for i in range(n):
            count = 0
            for j in range(n):
                if i != j and dist[i][j] <= distanceThreshold:
                    count += 1
            
            # 相同数量时取编号大的
            if count <= min_count:
                min_count = count
                result = i
        
        return result
```

**复杂度分析**：
- 时间：O(V³)
- 空间：O(V²)

## 解法二：多次 Dijkstra

```python
import heapq
from collections import defaultdict

class Solution:
    def findTheCity(self, n: int, edges: List[List[int]], 
                    distanceThreshold: int) -> int:
        # 构建邻接表
        graph = defaultdict(list)
        for u, v, w in edges:
            graph[u].append((v, w))
            graph[v].append((u, w))
        
        def dijkstra(start):
            """返回从 start 出发在阈值内可达的城市数"""
            INF = float('inf')
            dist = [INF] * n
            dist[start] = 0
            heap = [(0, start)]
            count = 0
            
            while heap:
                d, u = heapq.heappop(heap)
                
                if d > dist[u]:
                    continue
                
                if d > 0 and d <= distanceThreshold:
                    count += 1
                
                for v, w in graph[u]:
                    new_dist = d + w
                    if new_dist < dist[v] and new_dist <= distanceThreshold:
                        dist[v] = new_dist
                        heapq.heappush(heap, (new_dist, v))
            
            return count
        
        result = -1
        min_count = n + 1
        
        for i in range(n):
            count = dijkstra(i)
            if count <= min_count:
                min_count = count
                result = i
        
        return result
```

**复杂度分析**：
- 时间：O(V × (V + E) log V)
- 空间：O(V + E)

## 优化：提前终止

在 Dijkstra 中，如果当前距离已超过阈值，可以停止扩展：

```python
def dijkstra_pruned(start, threshold):
    dist = [float('inf')] * n
    dist[start] = 0
    heap = [(0, start)]
    count = 0
    
    while heap:
        d, u = heapq.heappop(heap)
        
        if d > threshold:  # 提前终止
            break
        
        if d > dist[u]:
            continue
        
        if u != start:
            count += 1
        
        for v, w in graph[u]:
            new_dist = d + w
            if new_dist < dist[v]:
                dist[v] = new_dist
                heapq.heappush(heap, (new_dist, v))
    
    return count
```

## 算法选择

| 条件 | 推荐算法 |
|-----|---------|
| n ≤ 100 | Floyd（代码简洁） |
| n > 100，图稀疏 | 多次 Dijkstra |
| n 很大，阈值小 | Dijkstra + 剪枝 |

## 变体问题

### 变体1：最大阈值问题

给定最大可达城市数 k，求最大的阈值 threshold：

```python
def maxThreshold(n, edges, k):
    # 二分答案
    INF = float('inf')
    
    # 预处理 Floyd
    dist = [[INF] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u, v, w in edges:
        dist[u][v] = w
        dist[v][u] = w
    for k in range(n):
        for i in range(n):
            for j in range(n):
                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])
    
    # 收集所有可能的阈值
    thresholds = set()
    for i in range(n):
        for j in range(i + 1, n):
            if dist[i][j] != INF:
                thresholds.add(dist[i][j])
    
    # 二分或遍历找最大阈值
    result = 0
    for t in sorted(thresholds):
        valid = True
        for i in range(n):
            count = sum(1 for j in range(n) if i != j and dist[i][j] <= t)
            if count > k:
                valid = False
                break
        if valid:
            result = t
        else:
            break
    
    return result
```

### 变体2：权重和限制

不是单条路径距离限制，而是限制经过的边数：

```python
def findCityWithKEdges(n, edges, k):
    """最多经过 k 条边能到达的城市数最少的城市"""
    # 使用 Bellman-Ford 或 BFS
    pass
```

## 小结

1. 本题是全源最短路径问题的应用
2. Floyd-Warshall 简洁，适合小规模或稠密图
3. 多次 Dijkstra 在稀疏图上更快
4. 相同可达城市数时，返回编号最大的城市
5. 可以通过阈值剪枝优化 Dijkstra
