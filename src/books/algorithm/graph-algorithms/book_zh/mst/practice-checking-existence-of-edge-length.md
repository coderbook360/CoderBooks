# 实战：检查边长度限制的路径是否存在

## 题目描述

**LeetCode 1697. Checking Existence of Edge Length Limited Paths**

给你一个 n 个点组成的无向图边集 edgeList，其中 `edgeList[i] = [ui, vi, disi]` 表示点 ui 和点 vi 之间有一条长度为 disi 的边。

同时给你一个查询数组 queries，其中 `queries[j] = [pj, qj, limitj]`，你的任务是对于每个查询 queries[j]，判断是否存在从 pj 到 qj 的路径，且这条路径上的每条边都**严格小于** limitj。

返回一个布尔数组 answer，其中 `answer[j]` 是第 j 个查询的答案。

**示例**：

```
输入：n = 3, edgeList = [[0,1,2],[1,2,4],[2,0,8],[1,0,16]], queries = [[0,1,2],[0,2,5]]
输出：[false,true]
解释：
- 查询 0：没有边权 < 2 的路径从 0 到 1
- 查询 1：存在边权都 < 5 的路径 0 -> 1 -> 2（边权 2 和 4）
```

## 问题分析

对于每个查询 (p, q, limit)，我们需要判断：在只使用边权 < limit 的边时，p 和 q 是否连通。

**暴力方法**：对每个查询，过滤边后用 BFS/DFS 判断连通性。复杂度 O(Q × E)，太慢。

**优化思路**：
- 将查询按 limit 排序
- 将边按权重排序
- 使用并查集，边权从小到大加入边
- 处理每个查询时，恰好加入了所有 < limit 的边

这是**离线查询**的经典技巧！

## 解法：离线查询 + 并查集

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
            return
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
    
    def connected(self, x, y):
        return self.find(x) == self.find(y)


class Solution:
    def distanceLimitedPathsExist(self, n: int, edgeList: List[List[int]], 
                                   queries: List[List[int]]) -> List[bool]:
        # 边按权重排序
        sorted_edges = sorted(edgeList, key=lambda x: x[2])
        
        # 查询按 limit 排序，同时记录原始索引
        q_count = len(queries)
        sorted_queries = sorted(range(q_count), key=lambda i: queries[i][2])
        
        uf = UnionFind(n)
        answer = [False] * q_count
        edge_idx = 0
        
        for q_idx in sorted_queries:
            p, q, limit = queries[q_idx]
            
            # 加入所有权重 < limit 的边
            while edge_idx < len(sorted_edges) and sorted_edges[edge_idx][2] < limit:
                u, v, _ = sorted_edges[edge_idx]
                uf.union(u, v)
                edge_idx += 1
            
            # 检查 p 和 q 是否连通
            answer[q_idx] = uf.connected(p, q)
        
        return answer
```

**复杂度分析**：
- 时间：O(E log E + Q log Q + (E + Q) × α(n))
- 空间：O(n)

## 为什么这是"离线"查询？

**在线查询**：每个查询独立处理，不能看到后续查询
**离线查询**：所有查询一次性给出，可以重新排序处理

离线查询允许我们：
1. 将查询按某种顺序排序
2. 利用之前查询的计算结果
3. 避免重复计算

本题的关键：查询按 limit 排序后，边可以**只加不删**，使用并查集高效维护连通性。

## 相关技巧：Kruskal 重构树

对于更复杂的"路径最大边权"问题，可以使用 **Kruskal 重构树**：

1. 按边权从小到大执行 Kruskal
2. 每次合并两个连通分量时，创建一个新节点
3. 新节点权值为这条边的权重
4. 原来两个连通分量的根成为新节点的子节点

这样构建的树有特殊性质：
- 两点间路径的最大边权 = LCA 的权值
- 可以用 LCA 的 O(log n) 在线回答查询

## 变体问题

### 变体1：路径最大边权的最小值

即：所有路径中，最大边权最小的路径

```python
def minMaxEdge(n, edges, start, end):
    """二分 + 判定"""
    weights = sorted(set(e[2] for e in edges))
    
    def canReach(limit):
        uf = UnionFind(n)
        for u, v, w in edges:
            if w <= limit:
                uf.union(u, v)
        return uf.connected(start, end)
    
    left, right = 0, len(weights) - 1
    while left < right:
        mid = (left + right) // 2
        if canReach(weights[mid]):
            right = mid
        else:
            left = mid + 1
    
    return weights[left] if canReach(weights[left]) else -1
```

### 变体2：多次查询路径最大边权的最小值

使用 Kruskal 重构树 + LCA，O((n + q) log n)。

## 小结

1. 本题是**离线查询 + 并查集**的经典应用
2. 核心思路：按限制排序查询，按权重排序边，边只加不删
3. 时间复杂度：O((E + Q) log(E + Q))
4. 这个技巧可以解决很多"限制下的连通性"问题
5. 更高级的方案：Kruskal 重构树，支持在线查询
