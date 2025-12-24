# 树上路径修改

上一章讨论了路径查询，本章将讨论**路径修改**操作，包括路径加、路径赋值、边权修改等。

---

## 路径修改类型

| 修改类型 | 描述 | 线段树要求 |
|---------|------|-----------|
| 路径加 | 路径上所有节点加 val | 区间加 + 懒标记 |
| 路径赋值 | 路径上所有节点赋值为 val | 区间赋值 + 懒标记 |
| 单点修改 | 修改某个节点的值 | 单点更新 |
| 边权修改 | 修改某条边的权值 | 单点更新（边权下放） |

---

## 路径加

```python
def path_add(self, u: int, v: int, val: int) -> None:
    """路径上所有节点加 val"""
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        self._range_add(self.dfn[self.chain_top[u]], self.dfn[u], val)
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    self._range_add(self.dfn[u], self.dfn[v], val)

def _range_add(self, l: int, r: int, val: int) -> None:
    """线段树区间加"""
    self._range_add_impl(1, 0, self.n - 1, l, r, val)

def _range_add_impl(self, node: int, nl: int, nr: int, l: int, r: int, val: int) -> None:
    if l <= nl and nr <= r:
        self.tree[node] += val * (nr - nl + 1)
        self.lazy_add[node] += val
        return
    
    self._pushdown(node, nl, nr)
    mid = (nl + nr) // 2
    
    if l <= mid:
        self._range_add_impl(node * 2, nl, mid, l, r, val)
    if r > mid:
        self._range_add_impl(node * 2 + 1, mid + 1, nr, l, r, val)
    
    self._pushup(node)
```

---

## 路径赋值

```python
def path_set(self, u: int, v: int, val: int) -> None:
    """路径上所有节点赋值为 val"""
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        self._range_set(self.dfn[self.chain_top[u]], self.dfn[u], val)
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    self._range_set(self.dfn[u], self.dfn[v], val)

def _range_set(self, l: int, r: int, val: int) -> None:
    """线段树区间赋值"""
    self._range_set_impl(1, 0, self.n - 1, l, r, val)

def _range_set_impl(self, node: int, nl: int, nr: int, l: int, r: int, val: int) -> None:
    if l <= nl and nr <= r:
        self.tree[node] = val * (nr - nl + 1)
        self.lazy_set[node] = val
        self.lazy_add[node] = 0  # 清除加法标记
        self.has_set[node] = True
        return
    
    self._pushdown(node, nl, nr)
    mid = (nl + nr) // 2
    
    if l <= mid:
        self._range_set_impl(node * 2, nl, mid, l, r, val)
    if r > mid:
        self._range_set_impl(node * 2 + 1, mid + 1, nr, l, r, val)
    
    self._pushup(node)
```

---

## 双懒标记处理

当同时支持区间加和区间赋值时，需要处理标记优先级：

```python
def _pushdown(self, node: int, l: int, r: int) -> None:
    """下推懒标记"""
    mid = (l + r) // 2
    left_len = mid - l + 1
    right_len = r - mid
    
    # 先处理赋值标记（优先级高）
    if self.has_set[node]:
        val = self.lazy_set[node]
        
        # 左子节点
        self.tree[node * 2] = val * left_len
        self.lazy_set[node * 2] = val
        self.lazy_add[node * 2] = 0
        self.has_set[node * 2] = True
        
        # 右子节点
        self.tree[node * 2 + 1] = val * right_len
        self.lazy_set[node * 2 + 1] = val
        self.lazy_add[node * 2 + 1] = 0
        self.has_set[node * 2 + 1] = True
        
        # 清除当前节点的赋值标记
        self.has_set[node] = False
        self.lazy_set[node] = 0
    
    # 再处理加法标记
    if self.lazy_add[node]:
        add = self.lazy_add[node]
        
        self.tree[node * 2] += add * left_len
        self.lazy_add[node * 2] += add
        
        self.tree[node * 2 + 1] += add * right_len
        self.lazy_add[node * 2 + 1] += add
        
        self.lazy_add[node] = 0
```

---

## 单点修改

```python
def point_update(self, u: int, val: int) -> None:
    """将节点 u 的值修改为 val"""
    self._point_update_impl(1, 0, self.n - 1, self.dfn[u], val)

def _point_update_impl(self, node: int, l: int, r: int, pos: int, val: int) -> None:
    if l == r:
        self.tree[node] = val
        return
    
    self._pushdown(node, l, r)
    mid = (l + r) // 2
    
    if pos <= mid:
        self._point_update_impl(node * 2, l, mid, pos, val)
    else:
        self._point_update_impl(node * 2 + 1, mid + 1, r, pos, val)
    
    self._pushup(node)

def point_add(self, u: int, val: int) -> None:
    """将节点 u 的值加 val"""
    self._point_add_impl(1, 0, self.n - 1, self.dfn[u], val)

def _point_add_impl(self, node: int, l: int, r: int, pos: int, val: int) -> None:
    if l == r:
        self.tree[node] += val
        return
    
    self._pushdown(node, l, r)
    mid = (l + r) // 2
    
    if pos <= mid:
        self._point_add_impl(node * 2, l, mid, pos, val)
    else:
        self._point_add_impl(node * 2 + 1, mid + 1, r, pos, val)
    
    self._pushup(node)
```

---

## 边权修改

边权存储在儿子节点上，修改边权即修改儿子节点的值。

```python
def edge_update(self, u: int, v: int, val: int) -> None:
    """修改边 (u, v) 的权值为 val"""
    # 确定哪个是儿子
    if self.parent[u] == v:
        child = u
    elif self.parent[v] == u:
        child = v
    else:
        raise ValueError("不是合法的边")
    
    self._point_update_impl(1, 0, self.n - 1, self.dfn[child], val)
```

---

## 子树修改

子树修改利用 DFS 序的连续性：

```python
def subtree_add(self, u: int, val: int) -> None:
    """子树所有节点加 val"""
    left = self.dfn[u]
    right = self.dfn[u] + self.size[u] - 1
    self._range_add(left, right, val)

def subtree_set(self, u: int, val: int) -> None:
    """子树所有节点赋值为 val"""
    left = self.dfn[u]
    right = self.dfn[u] + self.size[u] - 1
    self._range_set(left, right, val)
```

---

## 完整模板

```python
from typing import List, Tuple

class HLDFullFeature:
    """树链剖分完整版：支持路径/子树的查询和修改"""
    
    INF = float('inf')
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], 
                 values: List[int], root: int = 0):
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
        
        # 线段树
        self.tree = [0] * (4 * n)
        self.lazy_add = [0] * (4 * n)
        self.lazy_set = [0] * (4 * n)
        self.has_set = [False] * (4 * n)
        self._build(1, 0, n - 1)
    
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
        
        if self.heavy_son[node] != -1:
            self._dfs2(self.heavy_son[node], top)
        
        for child in self.adj[node]:
            if child != self.parent[node] and child != self.heavy_son[node]:
                self._dfs2(child, child)
    
    def _build(self, node: int, l: int, r: int) -> None:
        if l == r:
            self.tree[node] = self.values[self.dfn_to_node[l]]
            return
        
        mid = (l + r) // 2
        self._build(node * 2, l, mid)
        self._build(node * 2 + 1, mid + 1, r)
        self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]
    
    def _pushup(self, node: int) -> None:
        self.tree[node] = self.tree[node * 2] + self.tree[node * 2 + 1]
    
    def _pushdown(self, node: int, l: int, r: int) -> None:
        mid = (l + r) // 2
        left_len = mid - l + 1
        right_len = r - mid
        
        if self.has_set[node]:
            val = self.lazy_set[node]
            
            self.tree[node * 2] = val * left_len
            self.lazy_set[node * 2] = val
            self.lazy_add[node * 2] = 0
            self.has_set[node * 2] = True
            
            self.tree[node * 2 + 1] = val * right_len
            self.lazy_set[node * 2 + 1] = val
            self.lazy_add[node * 2 + 1] = 0
            self.has_set[node * 2 + 1] = True
            
            self.has_set[node] = False
        
        if self.lazy_add[node]:
            add = self.lazy_add[node]
            
            self.tree[node * 2] += add * left_len
            self.lazy_add[node * 2] += add
            
            self.tree[node * 2 + 1] += add * right_len
            self.lazy_add[node * 2 + 1] += add
            
            self.lazy_add[node] = 0
    
    # 区间操作（内部）
    def _range_add(self, node: int, l: int, r: int, ql: int, qr: int, val: int) -> None:
        if ql <= l and r <= qr:
            self.tree[node] += val * (r - l + 1)
            self.lazy_add[node] += val
            return
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        
        if ql <= mid:
            self._range_add(node * 2, l, mid, ql, qr, val)
        if qr > mid:
            self._range_add(node * 2 + 1, mid + 1, r, ql, qr, val)
        
        self._pushup(node)
    
    def _range_query(self, node: int, l: int, r: int, ql: int, qr: int) -> int:
        if ql <= l and r <= qr:
            return self.tree[node]
        
        self._pushdown(node, l, r)
        mid = (l + r) // 2
        result = 0
        
        if ql <= mid:
            result += self._range_query(node * 2, l, mid, ql, qr)
        if qr > mid:
            result += self._range_query(node * 2 + 1, mid + 1, r, ql, qr)
        
        return result
    
    # 路径操作
    def path_add(self, u: int, v: int, val: int) -> None:
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            self._range_add(1, 0, self.n - 1, self.dfn[self.chain_top[u]], self.dfn[u], val)
            u = self.parent[self.chain_top[u]]
        
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        self._range_add(1, 0, self.n - 1, self.dfn[u], self.dfn[v], val)
    
    def path_query(self, u: int, v: int) -> int:
        result = 0
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            result += self._range_query(1, 0, self.n - 1, self.dfn[self.chain_top[u]], self.dfn[u])
            u = self.parent[self.chain_top[u]]
        
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        result += self._range_query(1, 0, self.n - 1, self.dfn[u], self.dfn[v])
        return result
    
    # 子树操作
    def subtree_add(self, u: int, val: int) -> None:
        self._range_add(1, 0, self.n - 1, self.dfn[u], self.dfn[u] + self.size[u] - 1, val)
    
    def subtree_query(self, u: int) -> int:
        return self._range_query(1, 0, self.n - 1, self.dfn[u], self.dfn[u] + self.size[u] - 1)
    
    # LCA
    def lca(self, u: int, v: int) -> int:
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            u = self.parent[self.chain_top[u]]
        return u if self.depth[u] <= self.depth[v] else v
```

---

## 复杂度分析

| 操作 | 时间复杂度 |
|------|-----------|
| 路径加/查询 | O(log² n) |
| 子树加/查询 | O(log n) |
| 单点修改 | O(log n) |

---

## 本章小结

本章讨论了树上路径修改：

1. **基础修改**
   - 路径加、路径赋值
   - 单点修改

2. **双懒标记**
   - 赋值标记优先级高于加法标记
   - pushdown 时先处理赋值

3. **子树修改**
   - 利用 DFS 序连续性

4. **完整模板**
   - 支持路径/子树的查询和修改

下一章我们将专门讨论最近公共祖先（LCA）问题。
