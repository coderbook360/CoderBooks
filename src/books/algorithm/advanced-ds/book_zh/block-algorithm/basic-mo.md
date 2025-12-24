# 普通莫队

上一章我们介绍了莫队算法的基本原理。本章将通过多个实战例题，深入掌握普通莫队的应用技巧。普通莫队是最基础的形式：**不带修改的离线区间查询**。

---

## 问题一：区间不同数个数

### 题目描述

给定一个长度为 n 的数组 `arr`，有 q 个查询，每次询问区间 `[l, r]` 内有多少个不同的数。

- 1 ≤ n, q ≤ 10^5
- 1 ≤ arr[i] ≤ 10^6

### 分析

这是莫队的经典入门题。我们需要：
1. 维护当前区间内每个值的出现次数
2. 维护不同数的个数

**add 操作**：如果这个值第一次出现，distinct++

**remove 操作**：如果这个值最后一次出现（次数变为 0），distinct--

### 完整代码

```python
import math
from typing import List, Tuple

def solve_distinct_count(n: int, arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    # 离散化（如果值域很大）
    # 本题值域 10^6，可以直接用数组
    MAX_VAL = max(arr) + 1
    
    block_size = max(1, int(math.sqrt(n)))
    
    # 添加索引并排序
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    count = [0] * MAX_VAL
    distinct = 0
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    def add(idx):
        nonlocal distinct
        val = arr[idx]
        if count[val] == 0:
            distinct += 1
        count[val] += 1
    
    def remove(idx):
        nonlocal distinct
        val = arr[idx]
        count[val] -= 1
        if count[val] == 0:
            distinct -= 1
    
    for l, r, qi in indexed:
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        results[qi] = distinct
    
    return results
```

### 复杂度分析

- 时间：O((n + q) × √n)
- 空间：O(n + MAX_VAL)

---

## 问题二：区间内出现次数恰好为 k 的数的个数

### 题目描述

给定数组和多个查询，每次询问区间 `[l, r]` 内有多少个数恰好出现了 k 次。

### 分析

在问题一的基础上，我们需要额外维护**出现次数等于 k 的数的个数**。

**add 操作**：
- 如果 count[val] == k，cnt_k-- （不再是恰好 k 次）
- count[val]++
- 如果 count[val] == k，cnt_k++ （变成恰好 k 次）

**remove 操作**：
- 如果 count[val] == k，cnt_k--
- count[val]--
- 如果 count[val] == k，cnt_k++

### 代码实现

```python
def solve_count_k_occurrences(n: int, arr: List[int], k: int, queries: List[Tuple[int, int]]) -> List[int]:
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    MAX_VAL = max(arr) + 1
    block_size = max(1, int(math.sqrt(n)))
    
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    count = [0] * MAX_VAL
    cnt_k = 0  # 出现次数恰好为 k 的数的个数
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    def add(idx):
        nonlocal cnt_k
        val = arr[idx]
        if count[val] == k:
            cnt_k -= 1
        count[val] += 1
        if count[val] == k:
            cnt_k += 1
    
    def remove(idx):
        nonlocal cnt_k
        val = arr[idx]
        if count[val] == k:
            cnt_k -= 1
        count[val] -= 1
        if count[val] == k:
            cnt_k += 1
    
    for l, r, qi in indexed:
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        results[qi] = cnt_k
    
    return results
```

---

## 问题三：区间逆序对计数

### 题目描述

给定一个数组，多次询问区间 `[l, r]` 内的逆序对数量。

逆序对定义：如果 i < j 且 arr[i] > arr[j]，则 (i, j) 是一个逆序对。

### 分析

这个问题稍微复杂，因为 add/remove 的代价不是 O(1)：
- 添加一个元素时，需要统计它与当前区间内其他元素形成的逆序对数量
- 移除一个元素时，需要减去它贡献的逆序对数量

**使用树状数组优化**：
- 维护一个树状数组，记录每个值在当前区间内出现的次数
- add(idx)：统计比 arr[idx] 大的数的个数（如果从右边加）或比 arr[idx] 小的数的个数（如果从左边加）
- remove(idx)：类似但需要先移除

由于 add/remove 变成 O(log n)，总复杂度变为 O((n + q) × √n × log n)。

### 代码框架

```python
class BIT:
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)
    
    def update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def query(self, i):
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)
        return s
    
    def range_query(self, l, r):
        if l > r:
            return 0
        return self.query(r) - self.query(l - 1)


def solve_inversions(n: int, arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    # 离散化
    sorted_vals = sorted(set(arr))
    val_to_rank = {v: i + 1 for i, v in enumerate(sorted_vals)}
    ranked = [val_to_rank[v] for v in arr]
    MAX_RANK = len(sorted_vals)
    
    block_size = max(1, int(math.sqrt(n)))
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    bit = BIT(MAX_RANK)
    inversions = 0
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    def add_right(idx):
        """在右边添加元素"""
        nonlocal inversions
        val = ranked[idx]
        # 比 val 大的数在当前区间内有多少个
        inversions += bit.range_query(val + 1, MAX_RANK)
        bit.update(val, 1)
    
    def remove_right(idx):
        """从右边移除元素"""
        nonlocal inversions
        val = ranked[idx]
        bit.update(val, -1)
        inversions -= bit.range_query(val + 1, MAX_RANK)
    
    def add_left(idx):
        """在左边添加元素"""
        nonlocal inversions
        val = ranked[idx]
        # 比 val 小的数在当前区间内有多少个
        inversions += bit.query(val - 1)
        bit.update(val, 1)
    
    def remove_left(idx):
        """从左边移除元素"""
        nonlocal inversions
        val = ranked[idx]
        bit.update(val, -1)
        inversions -= bit.query(val - 1)
    
    for l, r, qi in indexed:
        while cur_r < r:
            cur_r += 1
            add_right(cur_r)
        while cur_r > r:
            remove_right(cur_r)
            cur_r -= 1
        while cur_l > l:
            cur_l -= 1
            add_left(cur_l)
        while cur_l < l:
            remove_left(cur_l)
            cur_l += 1
        
        results[qi] = inversions
    
    return results
```

### 关键点：添加方向的区分

**为什么需要区分左右？**

考虑区间 [2, 5]，当前元素为 [a[2], a[3], a[4], a[5]]。

- 从右边添加 a[6]：它与 a[2..5] 形成的逆序对中，a[6] 是右边那个。所以统计有多少个比 a[6] 大的数。
- 从左边添加 a[1]：它与 a[2..5] 形成的逆序对中，a[1] 是左边那个。所以统计有多少个比 a[1] 小的数。

---

## 问题四：区间内元素的平方和

### 题目描述

给定数组，查询区间 `[l, r]` 内所有不同元素的出现次数的平方和。

即：∑ count[v]² for all v appearing in [l, r]

### 分析

设某个值 v 在区间内出现 c 次，对答案的贡献是 c²。

**add 操作**：
- 移除旧贡献：answer -= count[v]²
- count[v]++
- 添加新贡献：answer += count[v]²

**remove 操作**：
- 移除旧贡献：answer -= count[v]²
- count[v]--
- 添加新贡献：answer += count[v]²

### 代码实现

```python
def solve_square_sum(n: int, arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    # 离散化（如果值域大）
    sorted_vals = sorted(set(arr))
    val_to_idx = {v: i for i, v in enumerate(sorted_vals)}
    mapped = [val_to_idx[v] for v in arr]
    M = len(sorted_vals)
    
    block_size = max(1, int(math.sqrt(n)))
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    count = [0] * M
    square_sum = 0
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    def add(idx):
        nonlocal square_sum
        val = mapped[idx]
        square_sum -= count[val] * count[val]
        count[val] += 1
        square_sum += count[val] * count[val]
    
    def remove(idx):
        nonlocal square_sum
        val = mapped[idx]
        square_sum -= count[val] * count[val]
        count[val] -= 1
        square_sum += count[val] * count[val]
    
    for l, r, qi in indexed:
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        results[qi] = square_sum
    
    return results
```

---

## 莫队的实现技巧

### 1. 指针移动顺序

推荐顺序：**先扩展，后收缩**

```python
# 推荐顺序
while cur_r < r: cur_r += 1; add(cur_r)
while cur_l > l: cur_l -= 1; add(cur_l)
while cur_r > r: remove(cur_r); cur_r -= 1
while cur_l < l: remove(cur_l); cur_l += 1
```

这样可以避免在收缩到空区间时出现问题。

### 2. 离散化

当值域很大时，需要离散化：

```python
sorted_vals = sorted(set(arr))
val_to_rank = {v: i for i, v in enumerate(sorted_vals)}
ranked = [val_to_rank[v] for v in arr]
```

### 3. 奇偶优化

```python
def mo_key(query):
    l, r, _ = query
    block = l // block_size
    if block % 2 == 0:
        return (block, r)
    else:
        return (block, -r)
```

### 4. 块大小调整

根据具体问题调整：

```python
# 标准
block_size = int(math.sqrt(n))

# 查询较多时
block_size = int(n / math.sqrt(q))

# 经验值
block_size = max(1, int(n / math.sqrt(q * 2 / 3)))
```

---

## 常见错误

### 1. 忘记处理空区间

初始化 `cur_l = 0, cur_r = -1` 表示空区间。

### 2. 边界处理错误

注意区间是 [l, r] 闭区间。

### 3. 结果顺序错乱

别忘了查询排序后需要按原索引存储答案。

### 4. 整数溢出

统计平方和等操作可能溢出，使用 Python 无此问题，C++ 需要用 `long long`。

---

## 本章小结

本章通过多个例题展示了普通莫队的应用：

1. **基础问题**：区间不同数计数、出现次数统计
2. **进阶问题**：区间逆序对（需要树状数组辅助）、平方和统计
3. **实现技巧**：
   - 奇偶优化
   - 先扩展后收缩
   - 离散化处理大值域
   - 块大小调优

普通莫队适用于**无修改的离线区间查询**。下一章我们将学习**带修改莫队**，处理存在单点修改的情况。
