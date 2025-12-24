# 树链剖分原理

树链剖分（Heavy-Light Decomposition，HLD）是处理树上路径问题的强大技术。它将树分解为若干条链，使得任意两点间的路径可以分解为 O(log n) 条链，从而可以利用线段树等数据结构高效处理。

---

## 为什么需要树链剖分？

考虑问题：给定一棵树，支持以下操作：
1. 修改 u 到 v 路径上所有点的权值
2. 查询 u 到 v 路径上的权值和

直接处理的困难：
- 树没有连续的索引
- 路径可能分叉
- 每次操作可能 O(n)

树链剖分的思路：
- 把树"拉直"成若干条链
- 每条链上的节点编号连续
- 路径拆成 O(log n) 条链，用线段树处理

---

## 核心概念

### 轻重链剖分

**定义**：
- **重儿子**：子节点中子树最大的那个
- **轻儿子**：非重儿子的子节点
- **重边**：连接节点与其重儿子的边
- **轻边**：连接节点与其轻儿子的边
- **重链**：由重边连接的极大路径

### 直观理解

```
        1
      / | \
     2  3  4
    /|\    |
   5 6 7   8
  /|
 9 10
```

假设子树大小：
- size[2] = 6, size[3] = 1, size[4] = 2
- size[5] = 3, size[6] = 1, size[7] = 1

则：
- 节点 1 的重儿子是 2（size 最大）
- 节点 2 的重儿子是 5
- 节点 5 的重儿子是 9（假设）

重链：1 → 2 → 5 → 9

---

## 关键性质

### 性质 1：重链数量

从任意节点到根，最多经过 O(log n) 条轻边。

**证明**：每走一条轻边，子树大小至少减半。

### 性质 2：路径分解

任意两点间的路径，可以分解为 O(log n) 条重链上的区间。

### 性质 3：编号连续

同一条重链上的节点，DFS 序编号连续。

---

## 两遍 DFS

树链剖分通过两遍 DFS 完成：

### 第一遍 DFS

计算每个节点的：
- 深度 depth
- 父节点 parent
- 子树大小 size
- 重儿子 heavy_son

```python
from typing import List, Dict

def dfs1(node: int, parent: int, depth: int,
         adj: List[List[int]],
         depths: List[int],
         parents: List[int],
         sizes: List[int],
         heavy_sons: List[int]) -> None:
    """
    第一遍 DFS：计算基本信息
    """
    depths[node] = depth
    parents[node] = parent
    sizes[node] = 1
    
    max_son_size = 0
    
    for child in adj[node]:
        if child != parent:
            dfs1(child, node, depth + 1, adj, depths, parents, sizes, heavy_sons)
            sizes[node] += sizes[child]
            
            if sizes[child] > max_son_size:
                max_son_size = sizes[child]
                heavy_sons[node] = child
```

### 第二遍 DFS

计算每个节点的：
- DFS 序 dfn（用于线段树索引）
- 所在重链的链顶 chain_top

```python
def dfs2(node: int, top: int,
         adj: List[List[int]],
         parents: List[int],
         heavy_sons: List[int],
         dfn: List[int],
         chain_tops: List[int],
         timer: List[int]) -> None:
    """
    第二遍 DFS：计算 DFS 序和链顶
    """
    dfn[node] = timer[0]
    timer[0] += 1
    chain_tops[node] = top
    
    # 优先访问重儿子，保证重链编号连续
    if heavy_sons[node] != -1:
        dfs2(heavy_sons[node], top, adj, parents, heavy_sons, dfn, chain_tops, timer)
    
    # 再访问轻儿子，每个轻儿子开启新链
    for child in adj[node]:
        if child != parents[node] and child != heavy_sons[node]:
            dfs2(child, child, adj, parents, heavy_sons, dfn, chain_tops, timer)
```

---

## 完整实现

```python
from typing import List

class HeavyLightDecomposition:
    """轻重链剖分"""
    
    def __init__(self, n: int, edges: List[tuple], root: int = 0):
        self.n = n
        self.root = root
        
        # 建图
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        
        # 初始化数组
        self.depth = [0] * n
        self.parent = [-1] * n
        self.size = [0] * n
        self.heavy_son = [-1] * n
        self.dfn = [0] * n      # DFS 序
        self.chain_top = [0] * n  # 链顶
        self.dfn_to_node = [0] * n  # DFS 序反查节点
        
        # 第一遍 DFS
        self._dfs1(root, -1, 0)
        
        # 第二遍 DFS
        self._timer = 0
        self._dfs2(root, root)
    
    def _dfs1(self, node: int, par: int, dep: int) -> None:
        self.depth[node] = dep
        self.parent[node] = par
        self.size[node] = 1
        
        max_son_size = 0
        for child in self.adj[node]:
            if child != par:
                self._dfs1(child, node, dep + 1)
                self.size[node] += self.size[child]
                if self.size[child] > max_son_size:
                    max_son_size = self.size[child]
                    self.heavy_son[node] = child
    
    def _dfs2(self, node: int, top: int) -> None:
        self.dfn[node] = self._timer
        self.dfn_to_node[self._timer] = node
        self._timer += 1
        self.chain_top[node] = top
        
        # 优先重儿子
        if self.heavy_son[node] != -1:
            self._dfs2(self.heavy_son[node], top)
        
        # 轻儿子各自成链
        for child in self.adj[node]:
            if child != self.parent[node] and child != self.heavy_son[node]:
                self._dfs2(child, child)
    
    def get_path_ranges(self, u: int, v: int) -> List[tuple]:
        """
        获取 u 到 v 路径对应的 DFS 序区间列表
        返回: [(left1, right1), (left2, right2), ...]
        """
        ranges = []
        
        while self.chain_top[u] != self.chain_top[v]:
            # 让 u 所在链更深
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            
            # u 的链顶到 u 这段
            ranges.append((self.dfn[self.chain_top[u]], self.dfn[u]))
            
            # 跳到链顶的父节点
            u = self.parent[self.chain_top[u]]
        
        # u 和 v 在同一条链上
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        ranges.append((self.dfn[u], self.dfn[v]))
        
        return ranges
    
    def lca(self, u: int, v: int) -> int:
        """求 u 和 v 的最近公共祖先"""
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            u = self.parent[self.chain_top[u]]
        
        return u if self.depth[u] <= self.depth[v] else v
```

---

## 路径分解示例

假设树结构：

```
    0
   /|\
  1 2 3
 /|
4 5
```

边：(0,1), (0,2), (0,3), (1,4), (1,5)

子树大小：
- size[0] = 6, size[1] = 3, size[2] = 1, size[3] = 1
- size[4] = 1, size[5] = 1

重儿子：
- heavy_son[0] = 1
- heavy_son[1] = 4（假设 4 先遍历）

重链：0 → 1 → 4

DFS 序（优先重儿子）：
- dfn[0] = 0, dfn[1] = 1, dfn[4] = 2
- dfn[5] = 3（轻儿子）
- dfn[2] = 4, dfn[3] = 5

查询路径 4 到 3：
1. chain_top[4] = 0, chain_top[3] = 3
2. depth[0] = 0 < depth[3] = 1，所以先处理 3
3. 范围 (dfn[3], dfn[3]) = (5, 5)
4. 跳到 parent[3] = 0
5. 现在 chain_top[4] = 0 = chain_top[0]
6. 范围 (dfn[0], dfn[4]) = (0, 2)

路径分解：[(5, 5), (0, 2)]

---

## 复杂度分析

| 操作 | 时间复杂度 |
|------|-----------|
| 预处理 | O(n) |
| LCA | O(log n) |
| 路径分解 | O(log n) 条链 |

配合线段树：
- 路径查询：O(log² n)
- 路径修改：O(log² n)

---

## 本章小结

本章介绍了树链剖分的原理：

1. **核心思想**
   - 将树分解为 O(n) 条重链
   - 任意路径分解为 O(log n) 条链

2. **实现步骤**
   - 第一遍 DFS：计算 size、重儿子
   - 第二遍 DFS：计算 DFS 序、链顶

3. **关键性质**
   - 重链编号连续
   - 路径分解高效

下一章我们将详细实现树链剖分配合线段树的完整代码。
