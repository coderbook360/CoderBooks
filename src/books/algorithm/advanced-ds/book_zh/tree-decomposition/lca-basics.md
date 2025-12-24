# 最近公共祖先（LCA）

**最近公共祖先（Lowest Common Ancestor，LCA）**是树上问题的基础概念。给定树中两个节点 u 和 v，它们的 LCA 是同时作为 u 和 v 祖先的节点中，深度最大的那个。

---

## 定义与性质

### 定义

对于有根树 T 中的两个节点 u 和 v：
- **LCA(u, v)** = 同时是 u 和 v 祖先的节点中，深度最大的那个

### 基本性质

1. **自反性**：LCA(u, u) = u
2. **对称性**：LCA(u, v) = LCA(v, u)
3. **路径性质**：u 到 v 的路径必经过 LCA(u, v)
4. **距离公式**：dist(u, v) = depth[u] + depth[v] - 2 × depth[LCA(u, v)]

---

## 应用场景

1. **树上距离**：两点间的距离
2. **路径问题**：判断点是否在路径上
3. **树上差分**：配合差分处理路径修改
4. **图论问题**：判断树的结构

---

## 算法概览

| 算法 | 预处理 | 查询 | 空间 | 特点 |
|------|--------|------|------|------|
| 暴力法 | O(n) | O(n) | O(n) | 简单 |
| 倍增法 | O(n log n) | O(log n) | O(n log n) | 最常用 |
| 树链剖分 | O(n) | O(log n) | O(n) | 配合其他操作 |
| Tarjan 离线 | O(n + q) | O(1) 摊还 | O(n) | 离线处理 |
| RMQ（欧拉序）| O(n) | O(1) | O(n) | 最快查询 |

---

## 暴力法

最简单的方法：让两个节点同步向上走，直到相遇。

### 实现

```python
from typing import List

def lca_naive(u: int, v: int, depth: List[int], parent: List[int]) -> int:
    """
    暴力求 LCA
    时间：O(n)
    """
    # 让较深的节点先向上走到同一深度
    while depth[u] > depth[v]:
        u = parent[u]
    while depth[v] > depth[u]:
        v = parent[v]
    
    # 同步向上走
    while u != v:
        u = parent[u]
        v = parent[v]
    
    return u
```

### 复杂度

- **预处理**：O(n) —— 计算 depth 和 parent
- **查询**：O(n) —— 最坏情况下走遍整棵树

---

## 树链剖分求 LCA

利用树链剖分的链顶信息，可以 O(log n) 求 LCA。

### 实现

```python
def lca_hld(u: int, v: int, depth: List[int], parent: List[int], 
            chain_top: List[int]) -> int:
    """
    树链剖分求 LCA
    时间：O(log n)
    """
    while chain_top[u] != chain_top[v]:
        # 让链顶更深的节点跳到链顶的父节点
        if depth[chain_top[u]] < depth[chain_top[v]]:
            u, v = v, u
        u = parent[chain_top[u]]
    
    # 现在在同一条链上，深度小的是 LCA
    return u if depth[u] <= depth[v] else v
```

---

## 欧拉序 + RMQ

将 LCA 问题转化为 RMQ（区间最值查询）问题。

### 欧拉序

DFS 遍历时，每次进入和离开节点都记录一次：

```
        0
       /|\
      1 2 3
     /|
    4 5
```

欧拉序：0, 1, 4, 1, 5, 1, 0, 2, 0, 3, 0

### 思路

- LCA(u, v) = 欧拉序中 u 和 v 之间深度最小的节点
- 用 RMQ 数据结构（如稀疏表）支持 O(1) 查询

### 实现

```python
from typing import List, Tuple
import math

class LCA_RMQ:
    """欧拉序 + 稀疏表求 LCA"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], root: int = 0):
        self.n = n
        
        # 建图
        adj = [[] for _ in range(n)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        
        # 欧拉序
        self.euler = []      # 欧拉序列
        self.depth_seq = []  # 对应的深度序列
        self.first = [0] * n  # 每个节点在欧拉序中首次出现的位置
        self.visited = [False] * n
        
        self._dfs_euler(root, 0, adj)
        
        # 建立稀疏表
        self._build_sparse_table()
    
    def _dfs_euler(self, node: int, dep: int, adj: List[List[int]]) -> None:
        self.visited[node] = True
        self.first[node] = len(self.euler)
        self.euler.append(node)
        self.depth_seq.append(dep)
        
        for child in adj[node]:
            if not self.visited[child]:
                self._dfs_euler(child, dep + 1, adj)
                # 返回时再记录一次
                self.euler.append(node)
                self.depth_seq.append(dep)
    
    def _build_sparse_table(self) -> None:
        """建立稀疏表"""
        m = len(self.euler)
        self.log = [0] * (m + 1)
        for i in range(2, m + 1):
            self.log[i] = self.log[i // 2] + 1
        
        k = self.log[m] + 1
        self.sparse = [[0] * m for _ in range(k)]
        
        # sparse[0][i] = 位置 i 处的节点
        for i in range(m):
            self.sparse[0][i] = i
        
        # 递推
        for j in range(1, k):
            length = 1 << j
            for i in range(m - length + 1):
                left = self.sparse[j - 1][i]
                right = self.sparse[j - 1][i + (1 << (j - 1))]
                if self.depth_seq[left] <= self.depth_seq[right]:
                    self.sparse[j][i] = left
                else:
                    self.sparse[j][i] = right
    
    def _rmq(self, l: int, r: int) -> int:
        """区间最小深度的位置"""
        if l > r:
            l, r = r, l
        
        length = r - l + 1
        k = self.log[length]
        
        left = self.sparse[k][l]
        right = self.sparse[k][r - (1 << k) + 1]
        
        if self.depth_seq[left] <= self.depth_seq[right]:
            return left
        return right
    
    def query(self, u: int, v: int) -> int:
        """查询 LCA(u, v)"""
        pos_u = self.first[u]
        pos_v = self.first[v]
        
        min_pos = self._rmq(pos_u, pos_v)
        return self.euler[min_pos]
```

### 复杂度

- **预处理**：O(n log n)（稀疏表）或 O(n)（使用 ±1 RMQ）
- **查询**：O(1)

---

## LCA 的应用

### 应用 1：树上两点距离

```python
def tree_distance(u: int, v: int, depth: List[int]) -> int:
    """树上两点距离"""
    lca = query_lca(u, v)
    return depth[u] + depth[v] - 2 * depth[lca]
```

### 应用 2：判断点是否在路径上

```python
def is_on_path(x: int, u: int, v: int) -> bool:
    """判断节点 x 是否在 u 到 v 的路径上"""
    lca_uv = query_lca(u, v)
    lca_ux = query_lca(u, x)
    lca_xv = query_lca(x, v)
    
    # x 在路径上的条件：
    # 1. x 在 u 到 lca 的路径上：lca(u, x) = x 且 lca(x, lca_uv) = lca_uv
    # 2. 或 x 在 v 到 lca 的路径上
    
    # 简化判断
    return (lca_ux == x and query_lca(x, v) == lca_uv) or \
           (lca_xv == x and query_lca(x, u) == lca_uv)
```

### 应用 3：树上两条路径是否相交

```python
def paths_intersect(u1: int, v1: int, u2: int, v2: int) -> bool:
    """判断路径 (u1, v1) 和 (u2, v2) 是否相交"""
    lca1 = query_lca(u1, v1)
    lca2 = query_lca(u2, v2)
    
    # 路径 2 的端点是否在路径 1 上
    if is_on_path(u2, u1, v1) or is_on_path(v2, u1, v1):
        return True
    
    # 路径 1 的端点是否在路径 2 上
    if is_on_path(u1, u2, v2) or is_on_path(v1, u2, v2):
        return True
    
    return False
```

---

## 不同算法的选择

| 场景 | 推荐算法 |
|------|---------|
| 在线查询，多次 LCA | 倍增法 |
| 只有一次预处理，海量查询 | RMQ 法 |
| 离线处理所有查询 | Tarjan 离线 |
| 需要配合路径操作 | 树链剖分 |
| 快速实现，数据量小 | 暴力法 |

---

## 本章小结

本章介绍了 LCA 的基础知识：

1. **定义**
   - 两个节点的最近公共祖先

2. **算法概览**
   - 暴力法：O(n)
   - 倍增法：O(log n)
   - 树链剖分：O(log n)
   - RMQ：O(1)

3. **应用**
   - 树上距离
   - 路径判断
   - 路径相交

下一章我们将详细介绍最常用的 **倍增法求 LCA**。
