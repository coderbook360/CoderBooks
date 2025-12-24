# 轻重链剖分实现

上一章介绍了树链剖分的原理。本章将给出完整的实现，包括配合线段树处理路径查询和修改。

---

## 完整模板

```python
from typing import List, Tuple

class HLDWithSegmentTree:
    """树链剖分 + 线段树"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], 
                 values: List[int], root: int = 0):
        """
        n: 节点数
        edges: 边列表
        values: 节点权值
        root: 根节点
        """
        self.n = n
        self.root = root
        self.values = values[:]
        
        # 建图
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        
        # HLD 数组
        self.depth = [0] * n
        self.parent = [-1] * n
        self.size = [0] * n
        self.heavy_son = [-1] * n
        self.dfn = [0] * n
        self.chain_top = [0] * n
        self.dfn_to_node = [0] * n
        
        # 两遍 DFS
        self._dfs1(root, -1, 0)
        self._timer = 0
        self._dfs2(root, root)
        
        # 建线段树：按 DFS 序排列的权值
        self.tree = [0] * (4 * n)
        self.lazy = [0] * (4 * n)
        self._build(1, 0, n - 1)
    
    def _dfs1(self, node: int, par: int, dep: int) -> None:
        """第一遍 DFS：计算 size、重儿子"""
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
        """第二遍 DFS：计算 DFS 序、链顶"""
        self.dfn[node] = self._timer
        self.dfn_to_node[self._timer] = node
        self._timer += 1
        self.chain_top[node] = top
        
        if self.heavy_son[node] != -1:
            self._dfs2(self.heavy_son[node], top)
        
        for child in self.adj[node]:
            if child != self.parent[node] and child != self.heavy_son[node]:
                self._dfs2(child, child)
    
    # ==================== 线段树部分 ====================
    
    def _build(self, node: int, l: int, r: int) -> None:
        """建树"""
        if l == r:
            self.tree[node] = self.values[self.dfn_to_node[l]]
            return
        
        mid = (l + r) // 2
        self._build(node * 2, l, mid)
        self._build(node * 2 + 1, mid + 1, r)
        self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]
    
    def _pushdown(self, node: int, l: int, r: int) -> None:
        """下推懒标记"""
        if self.lazy[node]:
            mid = (l + r) // 2
            
            self.tree[node * 2] += self.lazy[node] * (mid - l + 1)
            self.lazy[node * 2] += self.lazy[node]
            
            self.tree[node * 2 + 1] += self.lazy[node] * (r - mid)
            self.lazy[node * 2 + 1] += self.lazy[node]
            
            self.lazy[node] = 0
    
    def _update_range(self, node: int, l: int, r: int, 
                      ql: int, qr: int, val: int) -> None:
        """区间加"""
        if ql <= l and r <= qr:
            self.tree[node] += val * (r - l + 1)
            self.lazy[node] += val
            return
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self._update_range(node * 2, l, mid, ql, qr, val)
        if qr > mid:
            self._update_range(node * 2 + 1, mid + 1, r, ql, qr, val)
        
        self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]
    
    def _query_range(self, node: int, l: int, r: int, 
                     ql: int, qr: int) -> int:
        """区间查询和"""
        if ql <= l and r <= qr:
            return self.tree[node]
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        result = 0
        
        if ql <= mid:
            result += self._query_range(node * 2, l, mid, ql, qr)
        if qr > mid:
            result += self._query_range(node * 2 + 1, mid + 1, r, ql, qr)
        
        return result
    
    # ==================== 路径操作 ====================
    
    def path_update(self, u: int, v: int, val: int) -> None:
        """路径加：u 到 v 路径上所有点加 val"""
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            
            self._update_range(1, 0, self.n - 1,
                              self.dfn[self.chain_top[u]], self.dfn[u], val)
            u = self.parent[self.chain_top[u]]
        
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        self._update_range(1, 0, self.n - 1, self.dfn[u], self.dfn[v], val)
    
    def path_query(self, u: int, v: int) -> int:
        """路径查询：u 到 v 路径上的权值和"""
        result = 0
        
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            
            result += self._query_range(1, 0, self.n - 1,
                                        self.dfn[self.chain_top[u]], self.dfn[u])
            u = self.parent[self.chain_top[u]]
        
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        result += self._query_range(1, 0, self.n - 1, self.dfn[u], self.dfn[v])
        
        return result
    
    # ==================== 子树操作 ====================
    
    def subtree_update(self, u: int, val: int) -> None:
        """子树加：u 的子树所有点加 val"""
        # 子树对应 DFS 序的连续区间
        left = self.dfn[u]
        right = self.dfn[u] + self.size[u] - 1
        self._update_range(1, 0, self.n - 1, left, right, val)
    
    def subtree_query(self, u: int) -> int:
        """子树查询：u 的子树权值和"""
        left = self.dfn[u]
        right = self.dfn[u] + self.size[u] - 1
        return self._query_range(1, 0, self.n - 1, left, right)
    
    # ==================== LCA ====================
    
    def lca(self, u: int, v: int) -> int:
        """最近公共祖先"""
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            u = self.parent[self.chain_top[u]]
        
        return u if self.depth[u] <= self.depth[v] else v
```

---

## 使用示例

```python
def example():
    """
    树结构：
        0
       /|\
      1 2 3
     /|
    4 5
    
    节点权值：[10, 20, 30, 40, 50, 60]
    """
    n = 6
    edges = [(0, 1), (0, 2), (0, 3), (1, 4), (1, 5)]
    values = [10, 20, 30, 40, 50, 60]
    
    hld = HLDWithSegmentTree(n, edges, values, root=0)
    
    # 查询路径 4 到 3 的权值和
    # 路径：4 -> 1 -> 0 -> 3
    # 权值：50 + 20 + 10 + 40 = 120
    print(f"路径 4→3 的和: {hld.path_query(4, 3)}")  # 120
    
    # 路径 4 到 3 加 5
    hld.path_update(4, 3, 5)
    print(f"路径 4→3 加5后的和: {hld.path_query(4, 3)}")  # 120 + 5*4 = 140
    
    # 查询子树 1 的权值和
    # 子树 1 包含：1, 4, 5
    # 权值：20+5, 50+5, 60 = 140
    print(f"子树 1 的和: {hld.subtree_query(1)}")
    
    # LCA
    print(f"LCA(4, 5) = {hld.lca(4, 5)}")  # 1
    print(f"LCA(4, 3) = {hld.lca(4, 3)}")  # 0


if __name__ == "__main__":
    example()
```

---

## 边权树链剖分

如果权值在边上而非节点上，有两种处理方式：

### 方法 1：边权下放

将每条边的权值存储在儿子节点上。

```python
class HLDEdgeWeight:
    """边权树链剖分"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int, int]], root: int = 0):
        """
        edges: [(u, v, weight), ...]
        """
        # ... 建图和 HLD 预处理同上 ...
        
        # 边权下放到儿子节点
        self.edge_weight = [0] * n
        for u, v, w in edges:
            # 确定谁是儿子
            if self.parent[u] == v:
                self.edge_weight[u] = w
            else:
                self.edge_weight[v] = w
    
    def path_query(self, u: int, v: int) -> int:
        """边权路径查询"""
        result = 0
        lca = self.lca(u, v)
        
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            
            result += self._query_range(1, 0, self.n - 1,
                                        self.dfn[self.chain_top[u]], self.dfn[u])
            u = self.parent[self.chain_top[u]]
        
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        
        # 注意：不包含 LCA 本身（它是父边的儿子端）
        if u != v:
            result += self._query_range(1, 0, self.n - 1, 
                                        self.dfn[u] + 1, self.dfn[v])
        
        return result
```

### 方法 2：边编号

给每条边分配编号，直接在边上操作。

---

## 常见变体

### 变体 1：路径最值

将线段树改为维护最大值：

```python
def _build_max(self, node: int, l: int, r: int) -> None:
    if l == r:
        self.tree[node] = self.values[self.dfn_to_node[l]]
        return
    
    mid = (l + r) // 2
    self._build_max(node * 2, l, mid)
    self._build_max(node * 2 + 1, mid + 1, r)
    self.tree[node] = max(self.tree[node * 2], self.tree[node * 2 + 1])

def path_max(self, u: int, v: int) -> int:
    """路径最大值"""
    result = float('-inf')
    
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        result = max(result, self._query_max(1, 0, self.n - 1,
                                             self.dfn[self.chain_top[u]], self.dfn[u]))
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    result = max(result, self._query_max(1, 0, self.n - 1, self.dfn[u], self.dfn[v]))
    
    return result
```

### 变体 2：单点修改

```python
def point_update(self, u: int, val: int) -> None:
    """单点修改"""
    self._point_update(1, 0, self.n - 1, self.dfn[u], val)

def _point_update(self, node: int, l: int, r: int, pos: int, val: int) -> None:
    if l == r:
        self.tree[node] = val
        return
    
    mid = (l + r) // 2
    if pos <= mid:
        self._point_update(node * 2, l, mid, pos, val)
    else:
        self._point_update(node * 2 + 1, mid + 1, r, pos, val)
    
    self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]
```

---

## 复杂度总结

| 操作 | 时间复杂度 |
|------|-----------|
| 预处理 | O(n) |
| 路径查询 | O(log² n) |
| 路径修改 | O(log² n) |
| 子树查询 | O(log n) |
| 子树修改 | O(log n) |
| LCA | O(log n) |

---

## 本章小结

本章给出了树链剖分的完整实现：

1. **两遍 DFS**
   - 计算 size、重儿子、DFS 序、链顶

2. **线段树配合**
   - 按 DFS 序建树
   - 路径分解为 O(log n) 个区间

3. **支持的操作**
   - 路径查询/修改
   - 子树查询/修改
   - LCA

4. **边权处理**
   - 边权下放到儿子节点

下一章我们将深入讨论树上路径查询的各种变体。
