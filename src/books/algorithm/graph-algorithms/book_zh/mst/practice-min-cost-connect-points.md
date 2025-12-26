# 实战：连接所有点的最小费用

## 题目描述

**LeetCode 1584. Min Cost to Connect All Points**

给你一个 points 数组，表示 2D 平面上的一些点，其中 `points[i] = [xi, yi]`。

连接点 `[xi, yi]` 和点 `[xj, yj]` 的费用为它们之间的**曼哈顿距离**：`|xi - xj| + |yi - yj|`。

请你返回将所有点连接的最小总费用。只有任意两点之间**有且仅有**一条简单路径时，才认为所有点都已连接。

**示例**：

```
输入：points = [[0,0],[2,2],[3,10],[5,2],[7,0]]
输出：20
```

## 问题分析

这是一道标准的**最小生成树**问题：
- 顶点：所有点
- 边：任意两点之间都有边，边权为曼哈顿距离
- 求 MST 的总权重

## 解法一：Kruskal 算法

```python
from typing import List

class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True


class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        
        # 生成所有边
        edges = []
        for i in range(n):
            for j in range(i + 1, n):
                dist = abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
                edges.append((dist, i, j))
        
        # 按边权排序
        edges.sort()
        
        # Kruskal
        uf = UnionFind(n)
        total = 0
        count = 0
        
        for dist, u, v in edges:
            if uf.union(u, v):
                total += dist
                count += 1
                if count == n - 1:
                    break
        
        return total
```

**复杂度分析**：
- 边数：O(V²)
- 时间：O(V² log V)（主要是排序）
- 空间：O(V²)（存储所有边）

## 解法二：Prim 算法（堆优化）

```python
import heapq

class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        
        def manhattan(i, j):
            return abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
        
        # Prim 算法
        in_mst = [False] * n
        min_dist = [float('inf')] * n
        min_dist[0] = 0
        
        heap = [(0, 0)]  # (距离, 点索引)
        total = 0
        
        while heap:
            dist, u = heapq.heappop(heap)
            
            if in_mst[u]:
                continue
            
            in_mst[u] = True
            total += dist
            
            # 更新所有未选点到已选集合的距离
            for v in range(n):
                if not in_mst[v]:
                    new_dist = manhattan(u, v)
                    if new_dist < min_dist[v]:
                        min_dist[v] = new_dist
                        heapq.heappush(heap, (new_dist, v))
        
        return total
```

**复杂度分析**：
- 时间：O(V² log V)（每个顶点可能入堆 V 次）
- 空间：O(V)

## 解法三：Prim 算法（朴素版）

对于稠密图，朴素 Prim 可能更快：

```python
class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        
        def manhattan(i, j):
            return abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1])
        
        in_mst = [False] * n
        min_dist = [float('inf')] * n
        min_dist[0] = 0
        
        total = 0
        
        for _ in range(n):
            # 找最小距离的未选点
            u = -1
            for i in range(n):
                if not in_mst[i] and (u == -1 or min_dist[i] < min_dist[u]):
                    u = i
            
            in_mst[u] = True
            total += min_dist[u]
            
            # 更新未选点的距离
            for v in range(n):
                if not in_mst[v]:
                    dist = manhattan(u, v)
                    if dist < min_dist[v]:
                        min_dist[v] = dist
        
        return total
```

**复杂度分析**：
- 时间：O(V²)
- 空间：O(V)

## 性能对比

对于本题（完全图）：
- **边数**：V(V-1)/2 ≈ V²/2
- **Kruskal**：O(V² log V) 排序 + O(V²) 并查集
- **Prim（堆）**：O(V² log V)
- **Prim（朴素）**：O(V²)

**朴素 Prim 在本题中最优**！

## 优化：曼哈顿距离最小生成树

对于曼哈顿距离，可以只保留 O(V) 条"有效边"，将复杂度降到 O(V log V)。

**基本思路**：
- 将平面分成 8 个区域
- 每个点只与每个区域中最近的点连边
- 这样只有 O(V) 条边

这个优化较为复杂，在竞赛中才需要使用。

## 常见错误

### 错误1：边的生成

```python
# 只生成 (i, j) 其中 i < j，避免重复边
for i in range(n):
    for j in range(i + 1, n):
        ...
```

### 错误2：Prim 中的距离更新

```python
# Prim：到已选集合的距离（单条边）
if manhattan(u, v) < min_dist[v]:
    min_dist[v] = manhattan(u, v)

# 不是累加！
# if min_dist[u] + manhattan(u, v) < min_dist[v]:  # 错误
```

## 小结

1. 本题是完全图上的 MST 问题
2. 完全图边数 O(V²)，稠密图特性
3. **朴素 Prim O(V²) 是最优选择**
4. Kruskal 需要 O(V²) 空间存储边，不推荐
5. 曼哈顿距离 MST 有特殊优化，可降到 O(V log V)
