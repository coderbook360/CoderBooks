# 在线查询优化

**在线查询优化**是指必须按顺序即时响应查询时，如何设计高效数据结构的技术。与离线查询不同，在线查询无法预知后续请求。

---

## 在线查询的挑战

| 挑战 | 描述 |
|------|------|
| 即时响应 | 每个查询必须立即返回结果 |
| 未知未来 | 无法预知后续查询模式 |
| 状态维护 | 必须实时维护数据结构 |
| 最坏情况 | 必须应对任意查询序列 |

---

## 技术一：分块预处理

预处理所有块间信息，查询时只需处理边界。

### 区间最值（分块 + 预处理）

```python
from typing import List
from math import isqrt

class SparseTableBlocks:
    """
    分块 + ST 表：O(1) 区间最值查询
    """
    
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        self.arr = arr
        self.block_size = max(1, isqrt(self.n))
        self.num_blocks = (self.n + self.block_size - 1) // self.block_size
        
        # 预处理每个块内的最值
        self.block_max = []
        for i in range(0, self.n, self.block_size):
            self.block_max.append(max(arr[i:i + self.block_size]))
        
        # 对块间建立 ST 表
        self._build_sparse_table()
    
    def _build_sparse_table(self) -> None:
        """块间 ST 表"""
        m = len(self.block_max)
        self.LOG = max(1, m.bit_length())
        self.st = [[0] * m for _ in range(self.LOG)]
        self.st[0] = self.block_max[:]
        
        for k in range(1, self.LOG):
            for i in range(m - (1 << k) + 1):
                self.st[k][i] = max(self.st[k-1][i], 
                                   self.st[k-1][i + (1 << (k-1))])
    
    def query(self, l: int, r: int) -> int:
        """O(1) 区间最大值查询"""
        bl = l // self.block_size
        br = r // self.block_size
        
        if bl == br:
            # 同一块内，暴力查询
            return max(self.arr[l:r+1])
        
        # 左边界不完整块
        left_max = max(self.arr[l:(bl + 1) * self.block_size])
        
        # 右边界不完整块
        right_max = max(self.arr[br * self.block_size:r + 1])
        
        # 中间完整块
        if bl + 1 < br:
            k = (br - bl - 1).bit_length() - 1
            mid_max = max(self.st[k][bl + 1], 
                         self.st[k][br - (1 << k)])
            return max(left_max, mid_max, right_max)
        
        return max(left_max, right_max)
```

---

## 技术二：动态数据结构

支持在线修改和查询的平衡数据结构。

### 动态区间第 K 小（树套树）

```python
class TreeOfTrees:
    """
    线段树套平衡树：动态区间第 K 小
    外层：区间线段树
    内层：每个节点维护一棵平衡树
    """
    
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        self.arr = arr[:]
        self.trees = [None] * (4 * self.n)  # 每个节点一棵平衡树
        self._build(1, 0, self.n - 1)
    
    def _build(self, node: int, l: int, r: int) -> None:
        # 创建当前节点的平衡树
        self.trees[node] = SortedList()
        for i in range(l, r + 1):
            self.trees[node].add(self.arr[i])
        
        if l < r:
            mid = (l + r) // 2
            self._build(2 * node, l, mid)
            self._build(2 * node + 1, mid + 1, r)
    
    def update(self, pos: int, val: int) -> None:
        """单点修改"""
        self._update(1, 0, self.n - 1, pos, val)
        self.arr[pos] = val
    
    def _update(self, node: int, l: int, r: int, pos: int, val: int) -> None:
        # 从平衡树中删除旧值，插入新值
        self.trees[node].remove(self.arr[pos])
        self.trees[node].add(val)
        
        if l < r:
            mid = (l + r) // 2
            if pos <= mid:
                self._update(2 * node, l, mid, pos, val)
            else:
                self._update(2 * node + 1, mid + 1, r, pos, val)
    
    def query_kth(self, ql: int, qr: int, k: int) -> int:
        """查询区间 [ql, qr] 的第 k 小"""
        # 二分答案
        lo, hi = min(self.arr), max(self.arr)
        while lo < hi:
            mid = (lo + hi) // 2
            cnt = self._count_less_equal(1, 0, self.n - 1, ql, qr, mid)
            if cnt >= k:
                hi = mid
            else:
                lo = mid + 1
        return lo
    
    def _count_less_equal(self, node: int, l: int, r: int, 
                          ql: int, qr: int, val: int) -> int:
        """统计区间内 <= val 的元素个数"""
        if qr < l or ql > r:
            return 0
        if ql <= l and r <= qr:
            # 在平衡树中二分
            return self.trees[node].bisect_right(val)
        
        mid = (l + r) // 2
        return (self._count_less_equal(2 * node, l, mid, ql, qr, val) +
                self._count_less_equal(2 * node + 1, mid + 1, r, ql, qr, val))

# 需要 from sortedcontainers import SortedList
```

**复杂度**：
- 修改：O(log² n)
- 查询：O(log³ n)

---

## 技术三：可持久化

保留历史版本，支持历史查询。

### 可持久化线段树（主席树）

```python
class PersistentSegTree:
    """可持久化线段树：在线区间第 K 小"""
    
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        
        # 离散化
        sorted_vals = sorted(set(arr))
        self.val_map = {v: i for i, v in enumerate(sorted_vals)}
        self.vals = sorted_vals
        self.m = len(sorted_vals)
        
        # 节点池
        self.left = [0] * (self.n * 40)
        self.right = [0] * (self.n * 40)
        self.count = [0] * (self.n * 40)
        self.node_cnt = 0
        
        # 每个前缀的根节点
        self.roots = [0] * (self.n + 1)
        self.roots[0] = self._build(0, self.m - 1)
        
        for i, v in enumerate(arr):
            rank = self.val_map[v]
            self.roots[i + 1] = self._update(self.roots[i], 0, self.m - 1, rank)
    
    def _new_node(self) -> int:
        self.node_cnt += 1
        return self.node_cnt
    
    def _build(self, l: int, r: int) -> int:
        node = self._new_node()
        if l < r:
            mid = (l + r) // 2
            self.left[node] = self._build(l, mid)
            self.right[node] = self._build(mid + 1, r)
        return node
    
    def _update(self, prev: int, l: int, r: int, pos: int) -> int:
        node = self._new_node()
        self.left[node] = self.left[prev]
        self.right[node] = self.right[prev]
        self.count[node] = self.count[prev] + 1
        
        if l < r:
            mid = (l + r) // 2
            if pos <= mid:
                self.left[node] = self._update(self.left[prev], l, mid, pos)
            else:
                self.right[node] = self._update(self.right[prev], mid + 1, r, pos)
        
        return node
    
    def query_kth(self, ql: int, qr: int, k: int) -> int:
        """查询区间 [ql, qr] 的第 k 小（0-indexed）"""
        return self._query(self.roots[ql], self.roots[qr + 1], 0, self.m - 1, k)
    
    def _query(self, u: int, v: int, l: int, r: int, k: int) -> int:
        if l == r:
            return self.vals[l]
        
        mid = (l + r) // 2
        left_cnt = self.count[self.left[v]] - self.count[self.left[u]]
        
        if left_cnt >= k:
            return self._query(self.left[u], self.left[v], l, mid, k)
        else:
            return self._query(self.right[u], self.right[v], mid + 1, r, k - left_cnt)
```

**复杂度**：
- 构建：O(n log n)
- 查询：O(log n)
- 空间：O(n log n)

---

## 技术四：倍增 LCA

在线 LCA 查询的标准方法。

```python
class OnlineLCA:
    """倍增法在线 LCA"""
    
    def __init__(self, n: int, edges: List[tuple], root: int = 0):
        self.n = n
        self.LOG = max(1, n.bit_length())
        
        # 建图
        adj = [[] for _ in range(n)]
        for u, v in edges:
            adj[u].append(v)
            adj[v].append(u)
        
        # 预处理
        self.depth = [0] * n
        self.parent = [[-1] * n for _ in range(self.LOG)]
        self._dfs(adj, root, -1, 0)
        self._build_sparse()
    
    def _dfs(self, adj: List[list], u: int, par: int, d: int) -> None:
        self.depth[u] = d
        self.parent[0][u] = par
        for v in adj[u]:
            if v != par:
                self._dfs(adj, v, u, d + 1)
    
    def _build_sparse(self) -> None:
        for k in range(1, self.LOG):
            for u in range(self.n):
                if self.parent[k-1][u] != -1:
                    self.parent[k][u] = self.parent[k-1][self.parent[k-1][u]]
    
    def query(self, u: int, v: int) -> int:
        """O(log n) LCA 查询"""
        if self.depth[u] < self.depth[v]:
            u, v = v, u
        
        # 将 u 提升到与 v 同深度
        diff = self.depth[u] - self.depth[v]
        for k in range(self.LOG):
            if diff & (1 << k):
                u = self.parent[k][u]
        
        if u == v:
            return u
        
        # 同时向上跳
        for k in range(self.LOG - 1, -1, -1):
            if self.parent[k][u] != self.parent[k][v]:
                u = self.parent[k][u]
                v = self.parent[k][v]
        
        return self.parent[0][u]
```

---

## 技术五：缓存与记忆化

利用查询的局部性进行优化。

```python
from functools import lru_cache

class CachedQueries:
    """带缓存的查询系统"""
    
    def __init__(self, data):
        self.data = data
        self.cache = {}
    
    def query(self, *args) -> int:
        key = args
        if key in self.cache:
            return self.cache[key]
        
        result = self._compute(*args)
        
        # LRU 策略：缓存大小限制
        if len(self.cache) > 10000:
            self.cache.pop(next(iter(self.cache)))
        
        self.cache[key] = result
        return result
    
    def _compute(self, *args) -> int:
        # 实际计算逻辑
        pass
    
    def invalidate(self, *affected_keys) -> None:
        """当数据修改时，使相关缓存失效"""
        for key in list(self.cache.keys()):
            if self._is_affected(key, affected_keys):
                del self.cache[key]
```

---

## 方法对比

| 技术 | 适用场景 | 查询复杂度 | 修改支持 |
|------|---------|-----------|---------|
| 分块预处理 | 区间 RMQ | O(1) | 不支持 |
| ST 表 | 静态 RMQ | O(1) | 不支持 |
| 树套树 | 动态区间第 K 小 | O(log³ n) | 支持 |
| 主席树 | 静态区间第 K 小 | O(log n) | 不支持 |
| 倍增 LCA | 树上 LCA | O(log n) | 不支持 |

---

## 应用实例

### 问题 1：动态中位数

```python
from sortedcontainers import SortedList

class OnlineMedian:
    """在线动态中位数"""
    
    def __init__(self):
        self.data = SortedList()
    
    def add(self, val: int) -> None:
        self.data.add(val)
    
    def remove(self, val: int) -> None:
        self.data.remove(val)
    
    def get_median(self) -> float:
        n = len(self.data)
        if n % 2 == 1:
            return self.data[n // 2]
        else:
            return (self.data[n // 2 - 1] + self.data[n // 2]) / 2
```

### 问题 2：滑动窗口最大值

```python
from collections import deque

def sliding_window_max(arr: List[int], k: int) -> List[int]:
    """单调队列实现滑动窗口最大值"""
    dq = deque()  # 存储索引，对应值单调递减
    result = []
    
    for i, v in enumerate(arr):
        # 移除超出窗口的元素
        while dq and dq[0] <= i - k:
            dq.popleft()
        
        # 保持单调递减
        while dq and arr[dq[-1]] <= v:
            dq.pop()
        
        dq.append(i)
        
        if i >= k - 1:
            result.append(arr[dq[0]])
    
    return result
```

---

## 常见错误

1. **树套树空间爆炸**
   ```python
   # 错误：每个节点复制完整数据
   
   # 正确：使用动态开点或压缩
   ```

2. **主席树节点数估计不足**
   ```python
   # 错误：节点数 = 4 * n
   
   # 正确：节点数 = n * log(n) * 常数
   self.nodes = [0] * (n * 40)  # 40 ≈ log(n) * 2
   ```

3. **缓存失效不完整**
   ```python
   # 错误：只清除直接相关的缓存
   
   # 正确：清除所有可能受影响的缓存
   ```

---

## 本章小结

本章介绍了在线查询优化技术：

1. **预处理方法**
   - 分块 + ST 表
   - O(1) 查询

2. **动态数据结构**
   - 树套树
   - 支持修改和查询

3. **可持久化**
   - 主席树
   - 历史版本查询

4. **选择建议**
   - 静态 RMQ → ST 表
   - 区间第 K 小 → 主席树
   - 需要修改 → 树套树
   - 树上 LCA → 倍增

下一章我们将学习**数据结构选型指南**。
