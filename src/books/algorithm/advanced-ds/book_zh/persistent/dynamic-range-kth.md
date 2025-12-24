# 动态区间第 K 小

上一章我们学习了静态区间第 K 小，但主席树无法高效支持**修改**操作。本章将介绍支持修改的解法：**树状数组套主席树**（BIT + 主席树）。

---

## 问题描述

给定数组 a，支持两种操作：
1. **修改**：将 a[i] 改为 v
2. **查询**：求区间 [l, r] 内第 k 小的元素

---

## 为什么主席树不支持修改？

主席树的核心是**前缀和思想**：版本 i 包含前 i 个元素。

如果修改 a[i]，则版本 i+1, i+2, ..., n 都需要更新，时间复杂度 O(n log n)，无法接受。

---

## 解决方案：树状数组套主席树

### 核心思想

将"前缀和"替换为"树状数组"：

- 普通主席树：版本 i = 前 i 个元素的权值线段树
- 树状数组套主席树：维护 log n 棵权值线段树，通过树状数组方式组合

### 树状数组回顾

树状数组支持：
- 单点修改：O(log n)
- 前缀查询：O(log n)

树状数组的思想：将前缀和分解为 O(log n) 个区间的和。

### 应用到权值线段树

对于位置 i，维护一棵权值线段树 T[i]，它包含：
- a[i - lowbit(i) + 1], a[i - lowbit(i) + 2], ..., a[i]

查询 [l, r] 时：
- 计算 prefix(r) - prefix(l-1)
- 每个 prefix 由 O(log n) 棵树贡献

---

## 数据结构

```python
from typing import List

class DynamicRangeKth:
    """树状数组套主席树：支持修改的区间第 K 小"""
    
    def __init__(self, nums: List[int]):
        self.n = len(nums)
        self.nums = nums[:]
        
        # 离散化（需要预留修改值的空间）
        # 在线处理时，需要动态离散化或预先收集所有值
        self.all_vals = sorted(set(nums))
        self.m = len(self.all_vals)
        self.val_to_idx = {v: i for i, v in enumerate(self.all_vals)}
        self.idx_to_val = self.all_vals
        
        # 每个 BIT 位置一棵权值线段树的根
        self.roots = [0] * (self.n + 1)
        
        # 节点池
        max_nodes = 40 * self.n * 20  # 每次修改可能产生 log(n) * log(m) 个节点
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.cnt = [0] * max_nodes
        self.tot = 0
        
        # 初始化：插入所有元素
        for i, x in enumerate(nums):
            self._add(i + 1, self.val_to_idx[x], 1)
    
    def _new_node(self) -> int:
        self.tot += 1
        return self.tot
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def _insert(self, prev: int, l: int, r: int, idx: int, delta: int) -> int:
        """在权值线段树中插入/删除"""
        node = self._new_node()
        self.left[node] = self.left[prev]
        self.right[node] = self.right[prev]
        self.cnt[node] = self.cnt[prev] + delta
        
        if l < r:
            mid = (l + r) // 2
            if idx <= mid:
                self.left[node] = self._insert(self.left[prev], l, mid, idx, delta)
            else:
                self.right[node] = self._insert(self.right[prev], mid + 1, r, idx, delta)
        
        return node
    
    def _add(self, pos: int, val_idx: int, delta: int) -> None:
        """在 BIT 的位置 pos 加入/删除值"""
        while pos <= self.n:
            self.roots[pos] = self._insert(
                self.roots[pos], 0, self.m - 1, val_idx, delta
            )
            pos += self._lowbit(pos)
    
    def update(self, i: int, v: int) -> None:
        """将 a[i] 修改为 v"""
        if v not in self.val_to_idx:
            # 需要动态扩展离散化（简化处理，实际需要更复杂的逻辑）
            raise ValueError("值不在预定义范围内")
        
        old_val = self.nums[i]
        if old_val == v:
            return
        
        old_idx = self.val_to_idx[old_val]
        new_idx = self.val_to_idx[v]
        
        # 在 BIT 中删除旧值，加入新值
        self._add(i + 1, old_idx, -1)
        self._add(i + 1, new_idx, 1)
        
        self.nums[i] = v
    
    def query(self, l: int, r: int, k: int) -> int:
        """查询区间 [l, r] 第 k 小"""
        # 收集参与的树根
        self.use_l = []
        self.use_r = []
        
        # prefix(r+1) 的树
        pos = r + 1
        while pos > 0:
            self.use_r.append(self.roots[pos])
            pos -= self._lowbit(pos)
        
        # prefix(l) 的树
        pos = l
        while pos > 0:
            self.use_l.append(self.roots[pos])
            pos -= self._lowbit(pos)
        
        return self._query_kth(0, self.m - 1, k)
    
    def _query_kth(self, l: int, r: int, k: int) -> int:
        """在多棵树的差中查询第 k 小"""
        if l == r:
            return self.idx_to_val[l]
        
        mid = (l + r) // 2
        
        # 计算左子树的元素个数差
        left_count = 0
        for root in self.use_r:
            left_count += self.cnt[self.left[root]]
        for root in self.use_l:
            left_count -= self.cnt[self.left[root]]
        
        if k <= left_count:
            # 更新根到左子节点
            for i in range(len(self.use_r)):
                self.use_r[i] = self.left[self.use_r[i]]
            for i in range(len(self.use_l)):
                self.use_l[i] = self.left[self.use_l[i]]
            return self._query_kth(l, mid, k)
        else:
            # 更新根到右子节点
            for i in range(len(self.use_r)):
                self.use_r[i] = self.right[self.use_r[i]]
            for i in range(len(self.use_l)):
                self.use_l[i] = self.right[self.use_l[i]]
            return self._query_kth(mid + 1, r, k - left_count)
```

---

## 关键操作解析

### 修改操作

修改 a[i] 从 old 变为 new：

1. 在 BIT 中，删除 old（delta = -1）
2. 在 BIT 中，加入 new（delta = +1）

每次操作影响 O(log n) 个权值线段树，每棵树的更新是 O(log m)。

**时间复杂度**：O(log n × log m)

### 查询操作

查询 [l, r] 第 k 小：

1. 用 BIT 方式，收集 prefix(r+1) 的所有树根（O(log n) 棵）
2. 用 BIT 方式，收集 prefix(l) 的所有树根（O(log n) 棵）
3. 在这些树的"差"上进行二分查找

**时间复杂度**：O(log n × log m)

---

## 处理动态离散化

上面的实现假设所有可能出现的值都已知。如果需要动态处理新值：

### 方法 1：预收集所有值

如果查询离线，先收集所有修改中的值：

```python
def preprocess(nums: List[int], operations: List) -> DynamicRangeKth:
    all_vals = set(nums)
    for op in operations:
        if op[0] == 'update':
            all_vals.add(op[2])  # 新值
    
    # 用所有可能的值初始化
    solver = DynamicRangeKth(nums, sorted(all_vals))
    return solver
```

### 方法 2：动态开点

使用动态开点技术，在需要时创建节点：

```python
def _insert_dynamic(self, prev: int, l: int, r: int, idx: int, delta: int) -> int:
    node = self._new_node()
    
    if prev:
        self.left[node] = self.left[prev]
        self.right[node] = self.right[prev]
        self.cnt[node] = self.cnt[prev]
    
    self.cnt[node] += delta
    
    if l < r:
        mid = (l + r) // 2
        if idx <= mid:
            self.left[node] = self._insert_dynamic(
                self.left[node] if node else 0, l, mid, idx, delta
            )
        else:
            self.right[node] = self._insert_dynamic(
                self.right[node] if node else 0, mid + 1, r, idx, delta
            )
    
    return node
```

---

## 复杂度分析

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 初始化 | O(n log n log m) | O(n log n log m) |
| 单次修改 | O(log n log m) | O(log n log m) |
| 单次查询 | O(log n log m) | O(log n) |

其中 n 是数组大小，m 是值域大小（离散化后）。

---

## 与其他方法对比

| 方法 | 修改 | 查询 | 空间 | 实现难度 |
|------|------|------|------|---------|
| 主席树 | 不支持 | O(log n) | O(n log n) | 中等 |
| BIT + 主席树 | O(log² n) | O(log² n) | O(n log² n) | 困难 |
| 块状数组 | O(√n) | O(√n log n) | O(n) | 简单 |
| 整体二分 | 离线 | O(log n) | O(n) | 中等 |

---

## 替代方案：整体二分

如果查询可以离线处理，**整体二分**是更简洁的解法：

```python
def parallel_binary_search(nums: List[int], queries: List) -> List[int]:
    """
    整体二分求动态区间第 K 小
    
    思路：
    1. 对答案二分
    2. 将所有查询按答案分成两组
    3. 递归处理
    """
    # 将所有操作（初始插入、修改、查询）按时间排序
    # 二分答案值 v
    # 对于每个查询，判断答案 <= v 还是 > v
    # 递归处理两个子问题
    
    # 具体实现较复杂，此处略
    pass
```

整体二分的优势：
- 时间 O((n + q) log n log V)
- 空间 O(n + q)
- 代码相对简洁

---

## 实战模板

```python
class DynamicKthTemplate:
    """树状数组套权值线段树模板"""
    
    def __init__(self, n: int, m: int):
        """n: 数组大小, m: 值域大小"""
        self.n = n
        self.m = m
        
        max_nodes = n * 400  # 足够大
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.cnt = [0] * max_nodes
        self.tot = 0
        
        self.roots = [0] * (n + 1)
        self.use_l = []
        self.use_r = []
    
    def _new_node(self) -> int:
        self.tot += 1
        return self.tot
    
    def _lowbit(self, x: int) -> int:
        return x & (-x)
    
    def _update(self, prev: int, l: int, r: int, pos: int, val: int) -> int:
        node = self._new_node()
        self.left[node] = self.left[prev]
        self.right[node] = self.right[prev]
        self.cnt[node] = self.cnt[prev] + val
        
        if l < r:
            mid = (l + r) // 2
            if pos <= mid:
                self.left[node] = self._update(self.left[prev], l, mid, pos, val)
            else:
                self.right[node] = self._update(self.right[prev], mid + 1, r, pos, val)
        
        return node
    
    def add(self, x: int, v: int, delta: int):
        """在位置 x 加入/删除值 v"""
        while x <= self.n:
            self.roots[x] = self._update(self.roots[x], 1, self.m, v, delta)
            x += self._lowbit(x)
    
    def query_kth(self, l: int, r: int, k: int) -> int:
        """查询 [l, r] 第 k 小"""
        self.use_l.clear()
        self.use_r.clear()
        
        x = r
        while x:
            self.use_r.append(self.roots[x])
            x -= self._lowbit(x)
        
        x = l - 1
        while x:
            self.use_l.append(self.roots[x])
            x -= self._lowbit(x)
        
        lo, hi = 1, self.m
        while lo < hi:
            mid = (lo + hi) // 2
            
            cnt = 0
            for root in self.use_r:
                cnt += self.cnt[self.left[root]]
            for root in self.use_l:
                cnt -= self.cnt[self.left[root]]
            
            if cnt >= k:
                hi = mid
                for i in range(len(self.use_r)):
                    self.use_r[i] = self.left[self.use_r[i]]
                for i in range(len(self.use_l)):
                    self.use_l[i] = self.left[self.use_l[i]]
            else:
                lo = mid + 1
                k -= cnt
                for i in range(len(self.use_r)):
                    self.use_r[i] = self.right[self.use_r[i]]
                for i in range(len(self.use_l)):
                    self.use_l[i] = self.right[self.use_l[i]]
        
        return lo
```

---

## 本章小结

本章学习了动态区间第 K 小问题：

1. **问题**：支持修改的区间第 K 小查询

2. **解决方案**：树状数组套主席树
   - BIT 管理前缀
   - 每个 BIT 位置一棵权值线段树
   - 查询时组合 O(log n) 棵树

3. **复杂度**
   - 修改：O(log n × log m)
   - 查询：O(log n × log m)
   - 空间：O(n log n × log m)

4. **替代方案**
   - 整体二分（离线）
   - 块状数组（简单但较慢）

下一章我们将学习另一个重要的可持久化数据结构：**可持久化并查集**。
