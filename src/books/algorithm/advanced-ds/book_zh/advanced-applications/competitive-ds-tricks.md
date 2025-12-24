# 竞赛中的数据结构技巧

本章总结算法竞赛中常用的数据结构技巧和优化方法。

---

## 技巧一：离散化

将大值域映射到小值域，节省空间。

```python
from typing import List

def discretize(arr: List[int]) -> tuple:
    """
    离散化：将任意整数映射到 [0, k) 的连续整数
    返回：(映射后的数组, 原始值列表)
    """
    sorted_unique = sorted(set(arr))
    val_to_idx = {v: i for i, v in enumerate(sorted_unique)}
    mapped = [val_to_idx[v] for v in arr]
    return mapped, sorted_unique

def discretize_with_rank(arr: List[int]) -> tuple:
    """
    保持相对顺序的离散化
    """
    indexed = [(v, i) for i, v in enumerate(arr)]
    indexed.sort()
    
    result = [0] * len(arr)
    rank = 0
    for i, (v, orig_idx) in enumerate(indexed):
        if i > 0 and v != indexed[i-1][0]:
            rank += 1
        result[orig_idx] = rank
    
    return result

# 使用示例
arr = [1000000, 1, 50000, 1, 1000000]
mapped, vals = discretize(arr)
# mapped: [2, 0, 1, 0, 2]
# vals: [1, 50000, 1000000]
```

**适用场景**：
- 值域很大（10⁹）但元素个数少（10⁵）
- 主席树、权值线段树等需要值域作为下标的结构

---

## 技巧二：动态开点

按需分配节点，节省空间。

```python
class DynamicSegTree:
    """动态开点线段树"""
    
    def __init__(self, lo: int, hi: int):
        self.lo = lo
        self.hi = hi
        self.root = self._new_node()
    
    def _new_node(self) -> dict:
        return {'sum': 0, 'left': None, 'right': None}
    
    def update(self, pos: int, delta: int) -> None:
        self._update(self.root, self.lo, self.hi, pos, delta)
    
    def _update(self, node: dict, l: int, r: int, pos: int, delta: int) -> None:
        node['sum'] += delta
        if l == r:
            return
        
        mid = (l + r) // 2
        if pos <= mid:
            if node['left'] is None:
                node['left'] = self._new_node()
            self._update(node['left'], l, mid, pos, delta)
        else:
            if node['right'] is None:
                node['right'] = self._new_node()
            self._update(node['right'], mid + 1, r, pos, delta)
    
    def query(self, ql: int, qr: int) -> int:
        return self._query(self.root, self.lo, self.hi, ql, qr)
    
    def _query(self, node: dict, l: int, r: int, ql: int, qr: int) -> int:
        if node is None or qr < l or ql > r:
            return 0
        if ql <= l and r <= qr:
            return node['sum']
        
        mid = (l + r) // 2
        return (self._query(node['left'], l, mid, ql, qr) +
                self._query(node['right'], mid + 1, r, ql, qr))

# 支持 10^9 值域
tree = DynamicSegTree(0, 10**9)
tree.update(500000000, 1)
tree.update(999999999, 2)
print(tree.query(0, 10**9))  # 3
```

**空间复杂度**：O(q log V)，其中 q 是操作次数，V 是值域大小。

---

## 技巧三：懒标记下传

区间修改的核心技巧。

```python
class LazySegTree:
    """带懒标记的线段树"""
    
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)  # 懒标记：待加的值
        self._build(arr, 1, 0, self.n - 1)
    
    def _build(self, arr: List[int], node: int, l: int, r: int) -> None:
        if l == r:
            self.tree[node] = arr[l]
            return
        mid = (l + r) // 2
        self._build(arr, 2 * node, l, mid)
        self._build(arr, 2 * node + 1, mid + 1, r)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
    
    def _push_down(self, node: int, l: int, r: int) -> None:
        """下传懒标记"""
        if self.lazy[node] != 0:
            mid = (l + r) // 2
            # 更新左子节点
            self.tree[2 * node] += self.lazy[node] * (mid - l + 1)
            self.lazy[2 * node] += self.lazy[node]
            # 更新右子节点
            self.tree[2 * node + 1] += self.lazy[node] * (r - mid)
            self.lazy[2 * node + 1] += self.lazy[node]
            # 清空当前懒标记
            self.lazy[node] = 0
    
    def range_add(self, ql: int, qr: int, val: int) -> None:
        """区间加"""
        self._range_add(1, 0, self.n - 1, ql, qr, val)
    
    def _range_add(self, node: int, l: int, r: int, ql: int, qr: int, val: int) -> None:
        if qr < l or ql > r:
            return
        if ql <= l and r <= qr:
            self.tree[node] += val * (r - l + 1)
            self.lazy[node] += val
            return
        
        self._push_down(node, l, r)
        mid = (l + r) // 2
        self._range_add(2 * node, l, mid, ql, qr, val)
        self._range_add(2 * node + 1, mid + 1, r, ql, qr, val)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
    
    def range_sum(self, ql: int, qr: int) -> int:
        """区间求和"""
        return self._range_sum(1, 0, self.n - 1, ql, qr)
    
    def _range_sum(self, node: int, l: int, r: int, ql: int, qr: int) -> int:
        if qr < l or ql > r:
            return 0
        if ql <= l and r <= qr:
            return self.tree[node]
        
        self._push_down(node, l, r)
        mid = (l + r) // 2
        return (self._range_sum(2 * node, l, mid, ql, qr) +
                self._range_sum(2 * node + 1, mid + 1, r, ql, qr))
```

---

## 技巧四：树状数组差分

树状数组实现区间修改。

```python
class BITWithRangeUpdate:
    """支持区间修改的树状数组"""
    
    def __init__(self, n: int):
        self.n = n
        self.d1 = [0] * (n + 2)  # 差分数组
        self.d2 = [0] * (n + 2)  # i * d[i]
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def _add(self, arr: List[int], i: int, delta: int) -> None:
        while i <= self.n:
            arr[i] += delta
            i += self._lowbit(i)
    
    def _prefix(self, arr: List[int], i: int) -> int:
        s = 0
        while i > 0:
            s += arr[i]
            i -= self._lowbit(i)
        return s
    
    def range_add(self, l: int, r: int, delta: int) -> None:
        """区间 [l, r] 加 delta"""
        self._add(self.d1, l, delta)
        self._add(self.d1, r + 1, -delta)
        self._add(self.d2, l, l * delta)
        self._add(self.d2, r + 1, -(r + 1) * delta)
    
    def prefix_sum(self, i: int) -> int:
        """前缀和 [1, i]"""
        return (i + 1) * self._prefix(self.d1, i) - self._prefix(self.d2, i)
    
    def range_sum(self, l: int, r: int) -> int:
        """区间和 [l, r]"""
        return self.prefix_sum(r) - self.prefix_sum(l - 1)
```

---

## 技巧五：根号分治

将问题按阈值分为两类处理。

```python
from math import isqrt
from collections import defaultdict

def sqrt_decomposition_query(arr: List[int], queries: List[tuple]) -> List[int]:
    """
    问题：对于每个查询 (l, r, x)，统计区间 [l, r] 中 x 的出现次数
    
    根号分治：
    - 出现次数 >= √n 的元素：预处理前缀和
    - 出现次数 < √n 的元素：暴力统计
    """
    n = len(arr)
    threshold = isqrt(n)
    
    # 统计每个元素的出现次数
    count = defaultdict(int)
    for v in arr:
        count[v] += 1
    
    # 频繁元素预处理前缀和
    frequent = {v for v, c in count.items() if c >= threshold}
    prefix = {v: [0] * (n + 1) for v in frequent}
    
    for i, v in enumerate(arr):
        for f in frequent:
            prefix[f][i + 1] = prefix[f][i] + (1 if v == f else 0)
    
    # 处理查询
    results = []
    for l, r, x in queries:
        if x in frequent:
            # 使用预处理的前缀和
            results.append(prefix[x][r + 1] - prefix[x][l])
        else:
            # 暴力统计
            results.append(sum(1 for i in range(l, r + 1) if arr[i] == x))
    
    return results
```

**复杂度**：O(n√n) 预处理，O(1) 或 O(√n) 查询。

---

## 技巧六：启发式合并

小集合合并到大集合，保证总操作次数。

```python
def heuristic_merge(sets: List[set]) -> set:
    """启发式合并多个集合"""
    while len(sets) > 1:
        # 按大小排序，每次合并最小的两个
        sets.sort(key=len)
        smaller = sets.pop(0)
        larger = sets.pop(0)
        
        # 小的合并到大的
        for elem in smaller:
            larger.add(elem)
        
        sets.append(larger)
    
    return sets[0] if sets else set()

# 并查集中的启发式合并
class UnionFindHeuristic:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.data = [set() for _ in range(n)]  # 每个集合的数据
    
    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x: int, y: int) -> None:
        px, py = self.find(x), self.find(y)
        if px == py:
            return
        
        # 按秩合并
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        
        self.parent[py] = px
        
        # 启发式合并数据
        if len(self.data[py]) > len(self.data[px]):
            self.data[px], self.data[py] = self.data[py], self.data[px]
        
        for elem in self.data[py]:
            self.data[px].add(elem)
        self.data[py].clear()
        
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
```

**关键性质**：每个元素最多被移动 O(log n) 次。

---

## 技巧七：线段树分裂与合并

```python
class MergeableSegTree:
    """可合并线段树"""
    
    def __init__(self):
        self.nodes = []
        self.root = None
    
    def merge(self, u: int, v: int, l: int, r: int) -> int:
        """合并两棵线段树"""
        if u == -1:
            return v
        if v == -1:
            return u
        
        if l == r:
            self.nodes[u]['val'] += self.nodes[v]['val']
            return u
        
        mid = (l + r) // 2
        self.nodes[u]['left'] = self.merge(
            self.nodes[u]['left'], self.nodes[v]['left'], l, mid)
        self.nodes[u]['right'] = self.merge(
            self.nodes[u]['right'], self.nodes[v]['right'], mid + 1, r)
        
        self._push_up(u)
        return u
    
    def split(self, u: int, l: int, r: int, ql: int, qr: int) -> tuple:
        """分裂线段树：将 [ql, qr] 范围分离出来"""
        if u == -1 or qr < l or ql > r:
            return u, -1
        
        if ql <= l and r <= qr:
            return -1, u
        
        v = self._new_node()
        mid = (l + r) // 2
        
        self.nodes[u]['left'], self.nodes[v]['left'] = self.split(
            self.nodes[u]['left'], l, mid, ql, qr)
        self.nodes[u]['right'], self.nodes[v]['right'] = self.split(
            self.nodes[u]['right'], mid + 1, r, ql, qr)
        
        self._push_up(u)
        self._push_up(v)
        return u, v
```

---

## 技巧八：势能分析

利用势能证明复杂度均摊。

### 区间开方

```python
class SqrtSegTree:
    """支持区间开方的线段树"""
    
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self.max_val = [0] * (4 * self.n)
        self._build(arr, 1, 0, self.n - 1)
    
    def _build(self, arr, node, l, r):
        if l == r:
            self.tree[node] = arr[l]
            self.max_val[node] = arr[l]
            return
        mid = (l + r) // 2
        self._build(arr, 2 * node, l, mid)
        self._build(arr, 2 * node + 1, mid + 1, r)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
        self.max_val[node] = max(self.max_val[2 * node], self.max_val[2 * node + 1])
    
    def range_sqrt(self, ql: int, qr: int) -> None:
        """区间开方（向下取整）"""
        self._range_sqrt(1, 0, self.n - 1, ql, qr)
    
    def _range_sqrt(self, node: int, l: int, r: int, ql: int, qr: int) -> None:
        if qr < l or ql > r:
            return
        
        # 剪枝：如果最大值 <= 1，开方无效果
        if self.max_val[node] <= 1:
            return
        
        if l == r:
            self.tree[node] = int(self.tree[node] ** 0.5)
            self.max_val[node] = self.tree[node]
            return
        
        mid = (l + r) // 2
        self._range_sqrt(2 * node, l, mid, ql, qr)
        self._range_sqrt(2 * node + 1, mid + 1, r, ql, qr)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
        self.max_val[node] = max(self.max_val[2 * node], self.max_val[2 * node + 1])
```

**势能分析**：
- 每个元素最多被开方 O(log log V) 次（之后变成 0 或 1）
- 总操作次数：O(n log log V)

---

## 竞赛常用模板

### 快速读入（Python）

```python
import sys
input = sys.stdin.readline

def read_ints():
    return list(map(int, input().split()))
```

### 模运算

```python
MOD = 10**9 + 7

def mod_add(a, b):
    return (a + b) % MOD

def mod_mul(a, b):
    return (a * b) % MOD

def mod_pow(base, exp, mod=MOD):
    result = 1
    while exp > 0:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result

def mod_inv(a, mod=MOD):
    return mod_pow(a, mod - 2, mod)
```

---

## 本章小结

本章介绍了竞赛中的数据结构技巧：

1. **空间优化**
   - 离散化：压缩值域
   - 动态开点：按需分配

2. **区间操作**
   - 懒标记：区间修改
   - 差分树状数组

3. **分治思想**
   - 根号分治
   - 启发式合并

4. **高级技巧**
   - 线段树合并/分裂
   - 势能分析

下一章我们将通过 **LeetCode 困难题实战**来综合应用这些技巧。
