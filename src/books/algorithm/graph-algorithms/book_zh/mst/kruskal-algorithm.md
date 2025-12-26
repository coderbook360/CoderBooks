# Kruskal 算法详解

Kruskal 算法是求解最小生成树的经典算法之一，基于**边的贪心策略**：将边按权重排序，依次选择不形成环的最小边。

## 核心思想

1. 将所有边按权重从小到大排序
2. 依次考虑每条边：
   - 如果这条边连接的两个顶点不在同一连通分量中，选择这条边
   - 否则跳过（会形成环）
3. 选够 V - 1 条边时停止

**关键问题**：如何快速判断两个顶点是否在同一连通分量？

**答案**：使用**并查集（Union-Find）**！

## 并查集回顾

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
    
    def find(self, x):
        """路径压缩"""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        """按秩合并，返回是否成功合并"""
        px, py = self.find(x), self.find(y)
        if px == py:
            return False  # 已在同一集合
        
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True
```

## Kruskal 算法实现

```python
from typing import List, Tuple

def kruskal(n: int, edges: List[Tuple[int, int, int]]) -> Tuple[int, List[Tuple[int, int, int]]]:
    """
    Kruskal 算法求最小生成树
    n: 顶点数（编号 0 到 n-1）
    edges: 边列表 [(u, v, weight), ...]
    返回: (MST 总权重, MST 边列表)
    """
    # 按边权排序
    sorted_edges = sorted(edges, key=lambda x: x[2])
    
    uf = UnionFind(n)
    mst_weight = 0
    mst_edges = []
    
    for u, v, w in sorted_edges:
        if uf.union(u, v):  # 成功合并，说明不在同一集合
            mst_weight += w
            mst_edges.append((u, v, w))
            
            if len(mst_edges) == n - 1:  # 已选够 n-1 条边
                break
    
    # 检查是否成功构建 MST（图可能不连通）
    if len(mst_edges) < n - 1:
        return -1, []  # 不连通
    
    return mst_weight, mst_edges
```

## 正确性证明

**定理**：Kruskal 算法产生的是最小生成树。

**证明**（使用切割性质）：

考虑 Kruskal 选择边 e = (u, v) 的时刻：
- 此时 u 和 v 在不同的连通分量中
- 设 S 为包含 u 的连通分量，V - S 包含 v
- (S, V - S) 形成一个切割
- e 是横跨这个切割的最小边（因为更小的边要么不存在，要么已被选择或会形成环）
- 根据切割性质，e 属于某棵 MST

因此 Kruskal 选择的每条边都属于 MST，最终得到的就是 MST。

## 时间复杂度分析

| 步骤 | 复杂度 |
|-----|--------|
| 边排序 | O(E log E) |
| 并查集操作（E 次） | O(E α(V)) ≈ O(E) |
| **总复杂度** | **O(E log E)** |

由于 E ≤ V²，所以 O(E log E) = O(E log V)。

## 完整代码示例

```python
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


def solve_mst(n: int, edges: List[List[int]]) -> int:
    """
    求 n 个顶点的图的 MST 总权重
    edges: [[u, v, w], ...]
    """
    sorted_edges = sorted(edges, key=lambda x: x[2])
    uf = UnionFind(n)
    
    total_weight = 0
    edges_used = 0
    
    for u, v, w in sorted_edges:
        if uf.union(u, v):
            total_weight += w
            edges_used += 1
            if edges_used == n - 1:
                break
    
    return total_weight if edges_used == n - 1 else -1
```

## 变体：最大生成树

只需将边权取反或按降序排序：

```python
def max_spanning_tree(n, edges):
    # 按权重降序排序
    sorted_edges = sorted(edges, key=lambda x: -x[2])
    
    uf = UnionFind(n)
    total = 0
    count = 0
    
    for u, v, w in sorted_edges:
        if uf.union(u, v):
            total += w
            count += 1
            if count == n - 1:
                break
    
    return total if count == n - 1 else -1
```

## 处理边界情况

### 1. 图不连通

```python
if edges_used < n - 1:
    return -1  # 无法构建生成树
```

### 2. 自环

自环永远不会被选中（u == v 时 union 返回 False）。

### 3. 重边

保留权重最小的边即可（排序后自然处理）。

## 小结

- Kruskal 基于边的贪心：排序后依次选择不成环的最小边
- 使用并查集高效判断连通性
- 时间复杂度 O(E log E)，适合稀疏图
- 切割性质保证了算法的正确性
- 变体：最大生成树只需改变排序顺序
