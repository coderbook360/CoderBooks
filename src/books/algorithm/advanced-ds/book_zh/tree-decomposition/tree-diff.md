# 树上差分

**树上差分**是将序列差分技术扩展到树结构的方法。它可以高效处理**路径修改 + 单点查询**问题，与树链剖分的**单点修改 + 路径查询**形成互补。

---

## 回顾：序列差分

对于数组，如果需要进行多次区间加操作，最后统一查询，可以用差分：

```python
# 区间 [l, r] 加 val
diff[l] += val
diff[r + 1] -= val

# 最后求前缀和得到结果
```

---

## 树上差分的场景

**问题类型**：
1. 给定多条路径，对路径上所有节点加 val
2. 最后查询每个节点的值

**朴素方法**：每次操作遍历路径上所有节点，O(n) 每次操作。

**树上差分**：O(1) 每次操作，最后 O(n) 统一处理。

---

## 点差分

### 思路

对于路径 u → v，设 LCA(u, v) = l。

差分操作：
- diff[u] += val
- diff[v] += val
- diff[l] -= val
- diff[parent[l]] -= val（如果 l 不是根）

### 原理

DFS 时，对每个节点求子树内 diff 值的和，即为该节点的实际值。

```
        l
       / \
     ...  ...
    /        \
   u          v
```

- u 到 l 的路径：diff[u] 向上累加到 l
- v 到 l 的路径：diff[v] 向上累加到 l
- 但 l 被加了两次，所以 diff[l] -= val
- l 的祖先不应该受影响，所以 diff[parent[l]] -= val

### 实现

```python
from typing import List, Tuple

class TreeDiffNode:
    """树上点差分"""
    
    def __init__(self, n: int, edges: List[Tuple[int, int]], root: int = 0):
        self.n = n
        self.root = root
        
        # 建图
        self.adj = [[] for _ in range(n)]
        for u, v in edges:
            self.adj[u].append(v)
            self.adj[v].append(u)
        
        # 预处理
        self.parent = [-1] * n
        self.depth = [0] * n
        self._preprocess(root)
        
        # 差分数组
        self.diff = [0] * n
        
        # 初始化 LCA（使用简单的倍增）
        import math
        self.LOG = max(1, int(math.log2(n)) + 1)
        self.ancestor = [[-1] * self.LOG for _ in range(n)]
        self._init_lca()
    
    def _preprocess(self, root: int) -> None:
        from collections import deque
        queue = deque([root])
        visited = [False] * self.n
        visited[root] = True
        
        while queue:
            u = queue.popleft()
            for v in self.adj[u]:
                if not visited[v]:
                    visited[v] = True
                    self.parent[v] = u
                    self.depth[v] = self.depth[u] + 1
                    queue.append(v)
    
    def _init_lca(self) -> None:
        for u in range(self.n):
            self.ancestor[u][0] = self.parent[u] if self.parent[u] != -1 else u
        
        for k in range(1, self.LOG):
            for u in range(self.n):
                self.ancestor[u][k] = self.ancestor[self.ancestor[u][k-1]][k-1]
    
    def _lca(self, u: int, v: int) -> int:
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if (diff >> k) & 1:
                u = self.ancestor[u][k]
        
        if u == v:
            return u
        
        for k in range(self.LOG - 1, -1, -1):
            if self.ancestor[u][k] != self.ancestor[v][k]:
                u = self.ancestor[u][k]
                v = self.ancestor[v][k]
        
        return self.ancestor[u][0]
    
    def path_add(self, u: int, v: int, val: int) -> None:
        """路径 u-v 上所有节点加 val"""
        l = self._lca(u, v)
        
        self.diff[u] += val
        self.diff[v] += val
        self.diff[l] -= val
        if self.parent[l] != -1:
            self.diff[self.parent[l]] -= val
    
    def get_values(self) -> List[int]:
        """获取所有节点的值"""
        result = [0] * self.n
        
        # DFS 计算子树和
        def dfs(u: int, par: int) -> int:
            total = self.diff[u]
            for v in self.adj[u]:
                if v != par:
                    total += dfs(v, u)
            result[u] = total
            return total
        
        dfs(self.root, -1)
        return result
```

---

## 边差分

如果问题是对**边**而非节点进行操作，使用边差分。

### 边权下放

将边权存储在儿子节点上，然后使用类似的差分。

### 差分操作

对于路径 u → v（边差分）：
- diff[u] += val
- diff[v] += val
- diff[l] -= 2 × val

注意：LCA 本身不对应任何边，所以减 2 倍。

### 实现

```python
def edge_path_add(self, u: int, v: int, val: int) -> None:
    """路径 u-v 上所有边加 val"""
    l = self._lca(u, v)
    
    self.diff[u] += val
    self.diff[v] += val
    self.diff[l] -= 2 * val
```

---

## 应用实例

### 问题 1：最多经过的节点

给定若干条路径，求被经过次数最多的节点。

```python
def most_visited_node(n: int, edges: List[Tuple[int, int]], 
                      paths: List[Tuple[int, int]]) -> int:
    """求被经过次数最多的节点"""
    tree_diff = TreeDiffNode(n, edges)
    
    for u, v in paths:
        tree_diff.path_add(u, v, 1)
    
    values = tree_diff.get_values()
    return values.index(max(values))
```

### 问题 2：路径覆盖

判断哪些边被所有路径覆盖。

```python
def edges_covered_by_all_paths(n: int, edges: List[Tuple[int, int]], 
                                paths: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """求被所有路径覆盖的边"""
    tree_diff = TreeDiffNode(n, edges)
    num_paths = len(paths)
    
    for u, v in paths:
        tree_diff.edge_path_add(u, v, 1)
    
    values = tree_diff.get_values()
    
    # 边被覆盖次数 = 子节点的值（边权下放）
    result = []
    for u, v in edges:
        # 确定哪个是子节点
        if tree_diff.parent[u] == v:
            child = u
        else:
            child = v
        
        if values[child] == num_paths:
            result.append((u, v))
    
    return result
```

### 问题 3：子树加

子树加也可以用差分处理：

```python
def subtree_add(self, u: int, val: int) -> None:
    """子树 u 中所有节点加 val"""
    self.diff[u] += val
```

因为 DFS 时会自动累加到子树所有节点。

---

## 点差分 vs 边差分 vs 树链剖分

| 方法 | 适用操作 | 单次操作 | 总时间 |
|------|---------|---------|--------|
| 点差分 | 多次路径加 + 最后查询 | O(log n) | O(n + q log n) |
| 边差分 | 多次路径加 + 最后查询 | O(log n) | O(n + q log n) |
| 树链剖分 | 单点改 + 路径查询 | O(log² n) | O(q log² n) |

**选择依据**：
- 先修改后查询 → 差分
- 修改和查询交替 → 树链剖分

---

## 带权树上差分

如果需要对路径加不同的值：

```python
def weighted_path_add(self, u: int, v: int, val_u: int, val_v: int, delta: int):
    """
    路径 u-v 上，从 u 开始权值为 val_u，每走一步加 delta
    到 v 时权值为 val_v
    """
    # 需要使用更复杂的差分技术
    # 维护两个差分数组：常数项和一次项
    pass
```

这种情况下，可能需要**等差数列差分**或其他高级技术。

---

## 常见错误

### 错误 1：忘记减去 parent[lca]

```python
# 错误：lca 以上的祖先也被加了
self.diff[u] += val
self.diff[v] += val
self.diff[l] -= val  # 只减了一次

# 正确
self.diff[l] -= val
if self.parent[l] != -1:
    self.diff[self.parent[l]] -= val
```

### 错误 2：边差分用错公式

```python
# 错误：用了点差分的公式
self.diff[l] -= val

# 正确：边差分减 2 倍
self.diff[l] -= 2 * val
```

---

## 复杂度分析

| 操作 | 时间复杂度 |
|------|-----------|
| 预处理 | O(n log n) |
| 单次路径加 | O(log n)（LCA） |
| 统计结果 | O(n) |

总复杂度：O(n log n + q log n + n) = O((n + q) log n)

---

## 本章小结

本章介绍了树上差分技术：

1. **点差分**
   - diff[u] += val, diff[v] += val
   - diff[lca] -= val, diff[parent[lca]] -= val

2. **边差分**
   - diff[u] += val, diff[v] += val
   - diff[lca] -= 2 × val

3. **应用**
   - 路径覆盖统计
   - 被经过最多的节点/边

4. **特点**
   - 适合"先修改后查询"场景
   - 与树链剖分互补

下一章我们将学习**树上启发式合并**。
