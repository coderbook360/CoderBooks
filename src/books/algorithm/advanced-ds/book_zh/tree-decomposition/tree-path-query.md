# 树上路径查询

树链剖分的核心应用之一是**树上路径查询**。本章将详细讨论各种路径查询问题及其解法。

---

## 查询类型总览

| 查询类型 | 描述 | 示例 |
|---------|------|------|
| 路径和 | u 到 v 路径的权值和 | 树上两点间的总代价 |
| 路径最值 | 最大/最小值 | 路径上的最大边权 |
| 路径计数 | 满足条件的节点数 | 路径上权值 > k 的节点数 |
| 路径异或 | 所有权值的异或 | 密码学应用 |
| 第 k 个节点 | 路径上的第 k 个节点 | 导航问题 |

---

## 路径和查询

最基础的路径查询。

### 实现

```python
def path_sum(self, u: int, v: int) -> int:
    """路径权值和"""
    result = 0
    
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        result += self._query_sum(self.dfn[self.chain_top[u]], self.dfn[u])
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    result += self._query_sum(self.dfn[u], self.dfn[v])
    
    return result
```

---

## 路径最大值查询

```python
def path_max(self, u: int, v: int) -> int:
    """路径最大值"""
    result = float('-inf')
    
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        result = max(result, self._query_max(self.dfn[self.chain_top[u]], self.dfn[u]))
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    result = max(result, self._query_max(self.dfn[u], self.dfn[v]))
    
    return result

def _query_max(self, l: int, r: int) -> int:
    """线段树区间最大值查询"""
    return self._query_max_impl(1, 0, self.n - 1, l, r)

def _query_max_impl(self, node: int, nl: int, nr: int, l: int, r: int) -> int:
    if l <= nl and nr <= r:
        return self.tree_max[node]
    
    mid = (nl + nr) // 2
    result = float('-inf')
    
    if l <= mid:
        result = max(result, self._query_max_impl(node * 2, nl, mid, l, r))
    if r > mid:
        result = max(result, self._query_max_impl(node * 2 + 1, mid + 1, nr, l, r))
    
    return result
```

---

## 路径异或查询

```python
def path_xor(self, u: int, v: int) -> int:
    """路径异或"""
    result = 0
    
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        result ^= self._query_xor(self.dfn[self.chain_top[u]], self.dfn[u])
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    result ^= self._query_xor(self.dfn[u], self.dfn[v])
    
    return result
```

---

## 路径上第 k 个节点

找从 u 到 v 路径上的第 k 个节点。

```python
def path_kth_node(self, u: int, v: int, k: int) -> int:
    """
    返回 u 到 v 路径上的第 k 个节点（1-indexed）
    """
    lca = self.lca(u, v)
    dist_u_lca = self.depth[u] - self.depth[lca]
    dist_v_lca = self.depth[v] - self.depth[lca]
    total = dist_u_lca + dist_v_lca + 1
    
    if k > total:
        return -1
    
    if k <= dist_u_lca + 1:
        # 在 u 到 lca 这段
        return self._kth_ancestor(u, k - 1)
    else:
        # 在 lca 到 v 这段
        steps_from_v = total - k
        return self._kth_ancestor(v, steps_from_v)

def _kth_ancestor(self, u: int, k: int) -> int:
    """返回 u 的第 k 个祖先"""
    while k > 0:
        # 到链顶的距离
        dist_to_top = self.depth[u] - self.depth[self.chain_top[u]]
        
        if k <= dist_to_top:
            # 在当前链上
            target_depth = self.depth[u] - k
            target_dfn = self.dfn[u] - k
            return self.dfn_to_node[target_dfn]
        
        # 跳到链顶的父节点
        k -= dist_to_top + 1
        u = self.parent[self.chain_top[u]]
    
    return u
```

---

## 路径上满足条件的节点

### 问题

查询路径上权值 >= k 的节点个数。

### 解法 1：在线查询

在线段树每个节点维护排序数组：

```python
class HLDWithMergeTree:
    """树链剖分 + 归并树"""
    
    def __init__(self, n: int, edges, values):
        # ... HLD 预处理 ...
        
        # 归并树：每个节点存储区间内的排序值
        self.merge_tree = [None] * (4 * n)
        self._build_merge(1, 0, n - 1)
    
    def _build_merge(self, node: int, l: int, r: int) -> None:
        if l == r:
            self.merge_tree[node] = [self.values[self.dfn_to_node[l]]]
            return
        
        mid = (l + r) // 2
        self._build_merge(node * 2, l, mid)
        self._build_merge(node * 2 + 1, mid + 1, r)
        
        # 归并
        self.merge_tree[node] = sorted(
            self.merge_tree[node * 2] + self.merge_tree[node * 2 + 1]
        )
    
    def _count_ge(self, node: int, nl: int, nr: int, l: int, r: int, k: int) -> int:
        """区间内 >= k 的个数"""
        if l <= nl and nr <= r:
            arr = self.merge_tree[node]
            # 二分找第一个 >= k 的位置
            import bisect
            pos = bisect.bisect_left(arr, k)
            return len(arr) - pos
        
        mid = (nl + nr) // 2
        result = 0
        
        if l <= mid:
            result += self._count_ge(node * 2, nl, mid, l, r, k)
        if r > mid:
            result += self._count_ge(node * 2 + 1, mid + 1, nr, l, r, k)
        
        return result
    
    def path_count_ge(self, u: int, v: int, k: int) -> int:
        """路径上 >= k 的节点数"""
        result = 0
        
        while self.chain_top[u] != self.chain_top[v]:
            if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
                u, v = v, u
            
            result += self._count_ge(1, 0, self.n - 1,
                                     self.dfn[self.chain_top[u]], self.dfn[u], k)
            u = self.parent[self.chain_top[u]]
        
        if self.dfn[u] > self.dfn[v]:
            u, v = v, u
        result += self._count_ge(1, 0, self.n - 1, self.dfn[u], self.dfn[v], k)
        
        return result
```

**复杂度**：O(log³ n)

### 解法 2：主席树

如果只需要静态查询，可以用主席树：

```python
# 对 DFS 序建主席树
# 查询区间 [dfn[u], dfn[v]] 中 >= k 的个数
```

---

## 路径上第 k 大

结合树链剖分和主席树。

```python
def path_kth_largest(self, u: int, v: int, k: int) -> int:
    """路径上第 k 大的权值"""
    # 收集路径对应的 DFS 序区间
    ranges = self.get_path_ranges(u, v)
    
    # 在多个区间上做主席树查询
    # 这需要更复杂的实现...
    pass
```

**更简单的方法**：树上主席树

```python
class TreeChairmanTree:
    """树上主席树：支持路径第 k 小"""
    
    def __init__(self, n: int, edges, values, root: int = 0):
        # ... 建图、DFS 预处理 ...
        
        # 对每个节点建立一个版本的主席树
        # 版本 u = 版本 parent[u] + 节点 u 的值
        pass
    
    def query_kth(self, u: int, v: int, k: int) -> int:
        """路径 u-v 上第 k 小"""
        lca = self.lca(u, v)
        # 版本 u + 版本 v - 版本 lca - 版本 parent[lca]
        pass
```

---

## 实战：货车运输

### 问题

给定一棵树，边有权值。多次查询：从 u 到 v，途中经过的边的最小权值的最大值是多少？

实际上是求最大生成树后，路径上的最小边权。

### 解法

1. 先建最大生成树
2. 树链剖分 + 区间最小值

```python
def path_min_edge(self, u: int, v: int) -> int:
    """路径上的最小边权"""
    result = float('inf')
    
    while self.chain_top[u] != self.chain_top[v]:
        if self.depth[self.chain_top[u]] < self.depth[self.chain_top[v]]:
            u, v = v, u
        
        # 边权下放到儿子节点
        result = min(result, self._query_min(self.dfn[self.chain_top[u]], self.dfn[u]))
        u = self.parent[self.chain_top[u]]
    
    if self.dfn[u] > self.dfn[v]:
        u, v = v, u
    
    # 注意：u 是 LCA，u 本身的边不在路径上
    if u != v:
        result = min(result, self._query_min(self.dfn[u] + 1, self.dfn[v]))
    
    return result
```

---

## 路径距离

树上两点距离 = depth[u] + depth[v] - 2 * depth[lca]

```python
def path_distance(self, u: int, v: int) -> int:
    """u 到 v 的距离（边数）"""
    lca = self.lca(u, v)
    return self.depth[u] + self.depth[v] - 2 * self.depth[lca]

def weighted_path_distance(self, u: int, v: int) -> int:
    """带权距离"""
    lca = self.lca(u, v)
    return self.dist[u] + self.dist[v] - 2 * self.dist[lca]
```

---

## 复杂度对比

| 查询类型 | 树链剖分 | 直接暴力 |
|---------|---------|---------|
| 路径和 | O(log² n) | O(n) |
| 路径最值 | O(log² n) | O(n) |
| 路径第 k 大 | O(log³ n) | O(n log n) |
| 路径距离 | O(log n) | O(n) |

---

## 本章小结

本章详细讨论了树上路径查询：

1. **基础查询**
   - 路径和、最值、异或

2. **高级查询**
   - 路径第 k 个节点
   - 路径上满足条件的节点数
   - 路径第 k 大

3. **实现技巧**
   - 边权下放
   - 配合不同的线段树变体

4. **复杂度**
   - 一般为 O(log² n) 每次查询

下一章我们将讨论树上路径修改操作。
