# 实战：找到最小生成树里的关键边和伪关键边

## 题目描述

**LeetCode 1489. Find Critical and Pseudo-Critical Edges in Minimum Spanning Tree**

给你一个 n 个点的带权无向连通图，节点编号为 0 到 n-1，再给你一个数组 edges，其中 `edges[i] = [ai, bi, weighti]` 表示在 ai 和 bi 之间有一条带权无向边。

最小生成树（MST）是给定图中边的一个子集，它连接了所有节点且没有环，而且这些边的权重之和最小。

如果删除某条边后，MST 的权重增加，或者无法形成 MST，那么这条边是**关键边**。

如果某条边在某些 MST 中出现，但不在所有 MST 中都出现，那么这条边是**伪关键边**。

请返回所有关键边和伪关键边的索引。

**示例**：

```
输入：n = 5, edges = [[0,1,1],[1,2,1],[2,3,2],[0,3,2],[0,4,3],[3,4,3],[1,4,6]]
输出：[[0,1],[2,3,4,5]]
解释：边 [0,1,1] 和 [1,2,1] 是关键边
      边 [2,3,2], [0,3,2], [0,4,3], [3,4,3] 是伪关键边
```

## 问题分析

**关键边**：删除后 MST 权重增加或无法形成 MST
**伪关键边**：可以出现在某些 MST 中，但不是所有 MST 都必须包含

判断方法：
1. **先求出标准 MST 权重 W**
2. **判断关键边**：删除这条边后再求 MST，如果权重 > W 或无解，则为关键边
3. **判断伪关键边**：强制包含这条边后求 MST，如果权重 = W，则可能是伪关键边（且不是关键边）

## 解法：枚举边 + Kruskal

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
    def findCriticalAndPseudoCriticalEdges(self, n: int, edges: List[List[int]]) -> List[List[int]]:
        m = len(edges)
        
        # 给每条边加上索引
        indexed_edges = [(i, u, v, w) for i, (u, v, w) in enumerate(edges)]
        indexed_edges.sort(key=lambda x: x[3])  # 按权重排序
        
        def kruskal(exclude_idx=-1, include_idx=-1):
            """
            exclude_idx: 排除的边索引
            include_idx: 强制包含的边索引
            返回 MST 权重，无解返回 inf
            """
            uf = UnionFind(n)
            weight = 0
            edges_used = 0
            
            # 如果有强制包含的边，先加入
            if include_idx != -1:
                u, v, w = edges[include_idx]
                if uf.union(u, v):
                    weight += w
                    edges_used += 1
            
            # Kruskal
            for i, u, v, w in indexed_edges:
                if i == exclude_idx or i == include_idx:
                    continue
                if uf.union(u, v):
                    weight += w
                    edges_used += 1
                    if edges_used == n - 1:
                        break
            
            return weight if edges_used == n - 1 else float('inf')
        
        # 标准 MST 权重
        mst_weight = kruskal()
        
        critical = []
        pseudo_critical = []
        
        for i in range(m):
            # 判断关键边：删除后权重增加或无解
            if kruskal(exclude_idx=i) > mst_weight:
                critical.append(i)
            # 判断伪关键边：强制包含后权重不变，且不是关键边
            elif kruskal(include_idx=i) == mst_weight:
                pseudo_critical.append(i)
        
        return [critical, pseudo_critical]
```

**复杂度分析**：
- 时间：O(m² × α(n))，m 条边，每条边调用两次 Kruskal
- 空间：O(m + n)

## 优化思路

### 优化1：预排序 + 分组

边已按权重排序，相同权重的边一起处理。

### 优化2：LCA + 树上路径最大值

更高效的方法：
1. 求出一棵 MST
2. 对于每条非树边 (u, v)，它形成一个环
3. 如果环上的最大树边 < 非树边权重，那条树边是关键边
4. 如果环上最大树边 = 非树边权重，非树边是伪关键边

这需要用 LCA + 树上路径查询，复杂度 O((m + n) log n)。

## 简化实现（面试级别）

```python
class Solution:
    def findCriticalAndPseudoCriticalEdges(self, n: int, edges: List[List[int]]) -> List[List[int]]:
        m = len(edges)
        
        # 添加边索引并排序
        edge_with_idx = sorted(enumerate(edges), key=lambda x: x[1][2])
        
        def get_mst_weight(banned=-1, forced=-1):
            uf = UnionFind(n)
            weight = 0
            cnt = 0
            
            if forced >= 0:
                u, v, w = edges[forced]
                uf.union(u, v)
                weight += w
                cnt += 1
            
            for idx, (u, v, w) in edge_with_idx:
                if idx == banned or idx == forced:
                    continue
                if uf.union(u, v):
                    weight += w
                    cnt += 1
            
            return weight if cnt == n - 1 else float('inf')
        
        base = get_mst_weight()
        critical, pseudo = [], []
        
        for i in range(m):
            if get_mst_weight(banned=i) > base:
                critical.append(i)
            elif get_mst_weight(forced=i) == base:
                pseudo.append(i)
        
        return [critical, pseudo]
```

## 关键理解

### 为什么强制包含后权重相等就是伪关键边？

- 如果强制包含边 e 后仍能得到权重为 W 的 MST
- 说明存在一棵包含 e 的 MST
- 如果 e 不是关键边（删除后权重不变），说明也存在不包含 e 的 MST
- 因此 e 可以出现在某些 MST 中，但不是所有 → 伪关键边

### 为什么删除后权重增加就是关键边？

- 如果删除 e 后权重增加或无解
- 说明所有 MST 都必须包含 e
- 这正是关键边的定义

## 小结

1. 本题需要识别 MST 中的关键边和伪关键边
2. **关键边**：删除后无法得到原 MST 权重
3. **伪关键边**：强制包含后能得到原 MST 权重，且不是关键边
4. 暴力方法：枚举每条边，复杂度 O(m² α(n))
5. 优化方法：使用 LCA 和树上路径查询，复杂度 O((m+n) log n)
