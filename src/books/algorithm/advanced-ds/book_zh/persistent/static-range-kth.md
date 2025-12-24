# 静态区间第 K 小

**静态区间第 K 小**是主席树的经典应用：给定一个不变的数组，多次查询任意区间 [l, r] 内第 k 小的元素。

---

## 问题描述

给定长度为 n 的数组 a 和 q 次查询，每次查询给出 l, r, k，求 a[l..r] 中第 k 小的元素。

**约束**：
- 1 ≤ n, q ≤ 10^5
- 数组元素范围可能很大

```
输入:
  a = [5, 2, 6, 3, 1]
  查询: (0, 4, 2) → 输出 2 (排序后 [1,2,3,5,6]，第2小是2)
  查询: (1, 3, 3) → 输出 6 (排序后 [2,3,6]，第3小是6)
```

---

## 解题思路

### 核心观察

用主席树，版本 i 表示包含 a[0..i-1] 的权值线段树。

区间 [l, r] 的权值线段树 = 版本 r+1 - 版本 l

### 算法步骤

1. **离散化**：将值域压缩到 [0, m-1]
2. **建树**：依次插入每个元素，产生 n+1 个版本
3. **查询**：用两个版本的差，在权值线段树上二分

---

## 完整实现

```python
from typing import List

class StaticRangeKth:
    """静态区间第 K 小查询"""
    
    def __init__(self, nums: List[int]):
        self.n = len(nums)
        
        # 离散化
        sorted_vals = sorted(set(nums))
        self.m = len(sorted_vals)
        self.val_to_idx = {v: i for i, v in enumerate(sorted_vals)}
        self.idx_to_val = sorted_vals
        
        # 节点存储
        max_nodes = 40 * self.n  # 安全估计
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.cnt = [0] * max_nodes
        self.tot = 0
        
        # 版本根节点
        self.roots = [0] * (self.n + 1)
        
        # 建立空树
        self.roots[0] = self._build(0, self.m - 1)
        
        # 依次插入
        for i, x in enumerate(nums):
            idx = self.val_to_idx[x]
            self.roots[i + 1] = self._insert(self.roots[i], 0, self.m - 1, idx)
    
    def _new_node(self) -> int:
        self.tot += 1
        return self.tot
    
    def _build(self, l: int, r: int) -> int:
        node = self._new_node()
        if l < r:
            mid = (l + r) // 2
            self.left[node] = self._build(l, mid)
            self.right[node] = self._build(mid + 1, r)
        return node
    
    def _insert(self, prev: int, l: int, r: int, idx: int) -> int:
        node = self._new_node()
        self.left[node] = self.left[prev]
        self.right[node] = self.right[prev]
        self.cnt[node] = self.cnt[prev] + 1
        
        if l < r:
            mid = (l + r) // 2
            if idx <= mid:
                self.left[node] = self._insert(self.left[prev], l, mid, idx)
            else:
                self.right[node] = self._insert(self.right[prev], mid + 1, r, idx)
        
        return node
    
    def query(self, l: int, r: int, k: int) -> int:
        """
        查询区间 [l, r]（0-indexed）的第 k 小元素
        k 从 1 开始
        """
        return self._query(self.roots[l], self.roots[r + 1], 0, self.m - 1, k)
    
    def _query(self, u: int, v: int, l: int, r: int, k: int) -> int:
        if l == r:
            return self.idx_to_val[l]
        
        mid = (l + r) // 2
        left_count = self.cnt[self.left[v]] - self.cnt[self.left[u]]
        
        if k <= left_count:
            return self._query(self.left[u], self.left[v], l, mid, k)
        else:
            return self._query(self.right[u], self.right[v], mid + 1, r, k - left_count)
```

### 使用示例

```python
# 测试
nums = [5, 2, 6, 3, 1]
solver = StaticRangeKth(nums)

# 查询
print(solver.query(0, 4, 1))  # 1 (最小)
print(solver.query(0, 4, 2))  # 2
print(solver.query(0, 4, 3))  # 3
print(solver.query(0, 4, 5))  # 6 (最大)

print(solver.query(1, 3, 1))  # 2 ([2,6,3] 最小)
print(solver.query(1, 3, 2))  # 3
print(solver.query(1, 3, 3))  # 6

print(solver.query(2, 4, 2))  # 3 ([6,3,1] 第2小)
```

---

## 详细执行过程

以 `nums = [5, 2, 6, 3, 1]` 为例：

### 离散化

```
原数组: [5, 2, 6, 3, 1]
排序去重: [1, 2, 3, 5, 6]
映射: {1:0, 2:1, 3:2, 5:3, 6:4}
映射后: [3, 1, 4, 2, 0]
```

### 建树过程

```
版本 0: 空树
        0
       / \
      0   0
     / \ / \
    0 0 0 0 0  (5个叶子，对应值 1,2,3,5,6)

版本 1: 插入 5 (索引 3)
        1
       / \
      0   1
     / \ / \
    0 0 0 1 0

版本 2: 插入 2 (索引 1)
        2
       / \
      1   1 (复用)
     / \ 
    0 1   

版本 3: 插入 6 (索引 4)
        3
       / \
      1   2
     / \ / \
    0 1 0 1 1

... 以此类推
```

### 查询过程

查询 [0, 4] 第 2 小：

```
使用版本 0 和版本 5 的差

版本 5 - 版本 0:
        5            0
       / \    -     / \
      2   3        0   0
     / \         / \
    1 1 ...    0 0 ...

左子树元素数 = 2 - 0 = 2
k = 2 <= 2，在左子树继续

左子树的左部分: 1 - 0 = 1
k = 2 > 1，去右部分找第 2-1=1 小

右部分只有值 2，返回 idx_to_val[1] = 2
```

---

## 复杂度分析

- **预处理时间**：O(n log n)
  - 离散化：O(n log n)
  - 建树：O(n log n)

- **单次查询时间**：O(log n)

- **空间复杂度**：O(n log n)
  - 每次插入 O(log n) 个新节点

---

## LeetCode 相关题目

### 洛谷 P3834

这是静态区间第 K 小的模板题，主席树的经典应用。

### 变体问题

1. **区间第 K 大**：查询时用 (r - l + 1 - k + 1) 小
2. **区间中位数**：k = (r - l + 2) / 2
3. **区间小于 X 的元素个数**：在主席树上查询

---

## 查询排名和前驱后继

主席树还可以支持其他查询：

```python
def count_less(self, l: int, r: int, x: int) -> int:
    """区间 [l, r] 内小于 x 的元素个数"""
    if x not in self.val_to_idx:
        # 找到最大的小于 x 的离散化值
        idx = self._lower_bound(x) - 1
        if idx < 0:
            return 0
    else:
        idx = self.val_to_idx[x] - 1
        if idx < 0:
            return 0
    
    return self._count_prefix(self.roots[l], self.roots[r + 1], 0, self.m - 1, idx)

def _count_prefix(self, u: int, v: int, l: int, r: int, idx: int) -> int:
    """统计 <= idx 的元素个数"""
    if r <= idx:
        return self.cnt[v] - self.cnt[u]
    
    mid = (l + r) // 2
    result = self._count_prefix(self.left[u], self.left[v], l, mid, idx)
    if idx > mid:
        result += self._count_prefix(self.right[u], self.right[v], mid + 1, r, idx)
    
    return result

def _lower_bound(self, x: int) -> int:
    """二分查找离散化后的下界"""
    left, right = 0, self.m
    while left < right:
        mid = (left + right) // 2
        if self.idx_to_val[mid] < x:
            left = mid + 1
        else:
            right = mid
    return left
```

---

## 优化：无需建空树

可以省略建空树的步骤，直接从版本 0 = 空开始：

```python
class StaticRangeKthOptimized:
    def __init__(self, nums: List[int]):
        self.n = len(nums)
        
        sorted_vals = sorted(set(nums))
        self.m = len(sorted_vals)
        self.val_to_idx = {v: i for i, v in enumerate(sorted_vals)}
        self.idx_to_val = sorted_vals
        
        max_nodes = 40 * self.n
        self.left = [0] * max_nodes
        self.right = [0] * max_nodes
        self.cnt = [0] * max_nodes
        self.tot = 0
        
        self.roots = [0] * (self.n + 1)
        self.roots[0] = 0  # 版本 0 是空（用节点 0 表示）
        
        for i, x in enumerate(nums):
            idx = self.val_to_idx[x]
            self.roots[i + 1] = self._insert(self.roots[i], 0, self.m - 1, idx)
    
    def _new_node(self) -> int:
        self.tot += 1
        return self.tot
    
    def _insert(self, prev: int, l: int, r: int, idx: int) -> int:
        node = self._new_node()
        self.left[node] = self.left[prev] if prev else 0
        self.right[node] = self.right[prev] if prev else 0
        self.cnt[node] = (self.cnt[prev] if prev else 0) + 1
        
        if l < r:
            mid = (l + r) // 2
            if idx <= mid:
                self.left[node] = self._insert(self.left[prev] if prev else 0, l, mid, idx)
            else:
                self.right[node] = self._insert(self.right[prev] if prev else 0, mid + 1, r, idx)
        
        return node
    
    def query(self, l: int, r: int, k: int) -> int:
        return self._query(self.roots[l], self.roots[r + 1], 0, self.m - 1, k)
    
    def _query(self, u: int, v: int, l: int, r: int, k: int) -> int:
        if l == r:
            return self.idx_to_val[l]
        
        mid = (l + r) // 2
        left_u = self.left[u] if u else 0
        left_v = self.left[v] if v else 0
        left_count = self.cnt[left_v] - self.cnt[left_u]
        
        if k <= left_count:
            return self._query(left_u, left_v, l, mid, k)
        else:
            right_u = self.right[u] if u else 0
            right_v = self.right[v] if v else 0
            return self._query(right_u, right_v, mid + 1, r, k - left_count)
```

---

## 与其他方法对比

| 方法 | 预处理 | 单次查询 | 空间 | 支持修改 |
|------|--------|---------|------|---------|
| 排序 | O(n log n) | O(k) | O(n) | 否 |
| 归并树 | O(n log n) | O(log³ n) | O(n log n) | 否 |
| 主席树 | O(n log n) | O(log n) | O(n log n) | 否 |
| 树套树 | O(n log n) | O(log² n) | O(n log n) | 是 |

主席树是静态区间第 K 小的最优解法。

---

## 本章小结

本章详细讲解了静态区间第 K 小问题：

1. **问题定义**：多次查询 [l, r] 内第 k 小元素

2. **主席树解法**
   - 版本 i 表示前 i 个元素的权值线段树
   - 区间 = 版本差
   - 查询时在差上二分

3. **实现要点**
   - 离散化压缩值域
   - 正确的版本索引（l 和 r+1）
   - 足够的节点空间

4. **复杂度**
   - 预处理 O(n log n)
   - 查询 O(log n)
   - 空间 O(n log n)

5. **扩展查询**
   - 区间排名
   - 区间内小于 X 的个数
   - 区间中位数

下一章我们将学习如何支持修改：**动态区间第 K 小**。
