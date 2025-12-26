# 实战：最低成本连通所有城市

## 题目描述

**LeetCode 1135. Connecting Cities With Minimum Cost**

想象一下你是个城市基建规划者，地图上有 n 座城市，它们按以 1 到 n 的次序编号。

给你一个整数 n 和一个数组 conections，其中 `connections[i] = [xi, yi, costi]` 表示将城市 xi 和城市 yi 连接所要的成本。（连接是双向的）

返回连通所有城市的**最低成本**。如果无法连通所有城市，返回 -1。

**示例**：

```
输入：n = 3, connections = [[1,2,5],[1,3,6],[2,3,1]]
输出：6
解释：选择连接 [1,2] 和 [2,3]，成本为 5 + 1 = 6
```

## 问题分析

这是最标准的**最小生成树**问题：
- 给定边列表
- 求连接所有顶点的最小成本
- 如果无法连通返回 -1

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
    def minimumCost(self, n: int, connections: List[List[int]]) -> int:
        # 按成本排序
        connections.sort(key=lambda x: x[2])
        
        # 注意：城市编号从 1 开始
        uf = UnionFind(n + 1)
        
        total = 0
        edges_used = 0
        
        for x, y, cost in connections:
            if uf.union(x, y):
                total += cost
                edges_used += 1
                if edges_used == n - 1:
                    break
        
        return total if edges_used == n - 1 else -1
```

**复杂度分析**：
- 时间：O(E log E)
- 空间：O(V)

## 解法二：Prim 算法

```python
import heapq
from collections import defaultdict

class Solution:
    def minimumCost(self, n: int, connections: List[List[int]]) -> int:
        # 构建邻接表
        graph = defaultdict(list)
        for x, y, cost in connections:
            graph[x].append((y, cost))
            graph[y].append((x, cost))
        
        # Prim
        in_mst = set()
        min_dist = {i: float('inf') for i in range(1, n + 1)}
        min_dist[1] = 0
        
        heap = [(0, 1)]
        total = 0
        
        while heap and len(in_mst) < n:
            cost, u = heapq.heappop(heap)
            
            if u in in_mst:
                continue
            
            in_mst.add(u)
            total += cost
            
            for v, c in graph[u]:
                if v not in in_mst and c < min_dist[v]:
                    min_dist[v] = c
                    heapq.heappush(heap, (c, v))
        
        return total if len(in_mst) == n else -1
```

## 变体：添加新连接的最小成本

如果允许添加任意数量的边（每条边成本固定为 k），求最小总成本：

```python
def minCostWithNewEdges(n, connections, k):
    """
    可以用成本 k 连接任意两个城市
    """
    # 用 Kruskal 找出需要多少条"新边"
    connections.sort(key=lambda x: x[2])
    uf = UnionFind(n + 1)
    
    total = 0
    components = n  # 初始连通分量数
    
    for x, y, cost in connections:
        if cost <= k:  # 只有比新边便宜时才选择原有边
            if uf.union(x, y):
                total += cost
                components -= 1
    
    # 剩余的连通分量需要用新边连接
    if components > 1:
        total += (components - 1) * k
    
    return total
```

## 变体：必须包含某些边

如果某些边是必须选择的，其他边可选：

```python
def minCostWithMandatoryEdges(n, connections, mandatory):
    """
    mandatory: 必须选择的边列表 [(x, y, cost), ...]
    """
    uf = UnionFind(n + 1)
    total = 0
    edges_used = 0
    
    # 首先添加所有必选边
    for x, y, cost in mandatory:
        if not uf.union(x, y):
            return -1  # 必选边形成环，无解
        total += cost
        edges_used += 1
    
    # 然后按 Kruskal 添加可选边
    connections.sort(key=lambda x: x[2])
    for x, y, cost in connections:
        if uf.union(x, y):
            total += cost
            edges_used += 1
            if edges_used == n - 1:
                break
    
    return total if edges_used == n - 1 else -1
```

## 节点编号处理

本题城市编号从 1 到 n，有两种处理方式：

```python
# 方式1：并查集大小为 n+1
uf = UnionFind(n + 1)

# 方式2：编号转换
for x, y, cost in connections:
    x, y = x - 1, y - 1  # 转为 0-indexed
    if uf.union(x, y):
        ...
```

## 判断连通性的细节

```python
# 检查是否选够 n-1 条边
if edges_used == n - 1:
    return total
else:
    return -1  # 不连通

# 或者检查并查集中的连通分量数
def count_components(uf, n):
    roots = set()
    for i in range(1, n + 1):
        roots.add(uf.find(i))
    return len(roots)
```

## 小结

1. 本题是标准的 MST 问题，直接套用 Kruskal 或 Prim
2. 注意城市编号从 1 开始
3. 需要处理图不连通的情况
4. Kruskal 更简洁，推荐使用
5. 掌握 MST 的变体问题：强制包含边、添加新边等
