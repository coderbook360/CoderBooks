# 区间不同数个数

"区间不同数个数"是莫队算法最经典的应用问题。本章将完整实现这个问题，并探讨多种优化技巧和变体。

---

## 问题定义

> 给定一个长度为 n 的数组 arr，有 q 个查询，每次询问区间 [l, r] 内有多少个不同的数。
> 
> **约束**：
> - 1 ≤ n, q ≤ 10^5
> - 1 ≤ arr[i] ≤ 10^9（值域很大，需要离散化）

---

## 方法一：莫队算法

### 完整实现

```python
import math
from typing import List, Tuple

def count_distinct_mo(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    使用莫队算法解决区间不同数个数问题
    
    时间复杂度：O((n + q) * sqrt(n))
    空间复杂度：O(n)
    """
    n = len(arr)
    q = len(queries)
    
    if n == 0 or q == 0:
        return [0] * q
    
    # Step 1: 离散化
    sorted_vals = sorted(set(arr))
    val_to_id = {v: i for i, v in enumerate(sorted_vals)}
    mapped = [val_to_id[v] for v in arr]
    M = len(sorted_vals)  # 离散化后的值域大小
    
    # Step 2: 确定块大小
    block_size = max(1, int(math.sqrt(n)))
    
    # Step 3: 对查询排序
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    
    def mo_key(query):
        l, r, _ = query
        block = l // block_size
        # 奇偶优化
        if block % 2 == 0:
            return (block, r)
        else:
            return (block, -r)
    
    indexed.sort(key=mo_key)
    
    # Step 4: 初始化计数数组和答案
    count = [0] * M
    distinct = 0
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    # Step 5: 定义 add 和 remove 操作
    def add(idx):
        nonlocal distinct
        val = mapped[idx]
        if count[val] == 0:
            distinct += 1
        count[val] += 1
    
    def remove(idx):
        nonlocal distinct
        val = mapped[idx]
        count[val] -= 1
        if count[val] == 0:
            distinct -= 1
    
    # Step 6: 处理每个查询
    for l, r, qi in indexed:
        # 扩展右边界
        while cur_r < r:
            cur_r += 1
            add(cur_r)
        
        # 收缩右边界
        while cur_r > r:
            remove(cur_r)
            cur_r -= 1
        
        # 扩展左边界
        while cur_l > l:
            cur_l -= 1
            add(cur_l)
        
        # 收缩左边界
        while cur_l < l:
            remove(cur_l)
            cur_l += 1
        
        results[qi] = distinct
    
    return results
```

### 测试用例

```python
def test_count_distinct():
    # 测试用例 1：基础测试
    arr = [1, 2, 1, 3, 2]
    queries = [(0, 2), (1, 4), (0, 4)]
    expected = [2, 3, 3]
    assert count_distinct_mo(arr, queries) == expected
    
    # 测试用例 2：单元素查询
    arr = [5, 5, 5, 5]
    queries = [(0, 0), (1, 2), (0, 3)]
    expected = [1, 1, 1]
    assert count_distinct_mo(arr, queries) == expected
    
    # 测试用例 3：全不同
    arr = [1, 2, 3, 4, 5]
    queries = [(0, 4), (1, 3), (2, 2)]
    expected = [5, 3, 1]
    assert count_distinct_mo(arr, queries) == expected
    
    print("All tests passed!")

test_count_distinct()
```

---

## 方法二：离线 + 树状数组

除了莫队，这个问题还有另一种经典的离线解法：按右端点排序 + 树状数组。

### 核心思想

对于每个位置 i，记录 `last[arr[i]]` = 值 arr[i] 上一次出现的位置。

关键观察：对于查询 [l, r]，一个值对答案有贡献当且仅当它在 [l, r] 内的**最后一次**出现位置在这个区间内。

更具体地说：如果 `last[arr[i]] < l`，那么位置 i 贡献 1。

### 算法步骤

1. 按右端点排序所有查询
2. 从左到右扫描数组，维护每个位置是否"有效"
3. 对于位置 i：
   - 如果 arr[i] 之前出现过（在位置 j），将位置 j 标记为"无效"
   - 将位置 i 标记为"有效"
4. 查询 [l, r] 的答案 = [l, r] 内"有效"位置的数量

使用树状数组维护"有效"标记的前缀和。

### 完整实现

```python
from typing import List, Tuple

class BIT:
    """树状数组"""
    def __init__(self, n: int):
        self.n = n
        self.tree = [0] * (n + 1)
    
    def update(self, i: int, delta: int) -> None:
        i += 1  # 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def query(self, i: int) -> int:
        i += 1  # 1-indexed
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= i & (-i)
        return result
    
    def range_query(self, l: int, r: int) -> int:
        if l > r:
            return 0
        if l == 0:
            return self.query(r)
        return self.query(r) - self.query(l - 1)


def count_distinct_bit(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    使用树状数组解决区间不同数个数问题
    
    时间复杂度：O((n + q) * log(n))
    空间复杂度：O(n)
    """
    n = len(arr)
    q = len(queries)
    
    if n == 0 or q == 0:
        return [0] * q
    
    # 离散化
    sorted_vals = sorted(set(arr))
    val_to_id = {v: i for i, v in enumerate(sorted_vals)}
    mapped = [val_to_id[v] for v in arr]
    M = len(sorted_vals)
    
    # 按右端点排序查询
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: x[1])
    
    # last[v] = 值 v 上一次出现的位置
    last = [-1] * M
    
    # 树状数组：bit[i] = 1 表示位置 i 对答案有贡献
    bit = BIT(n)
    
    results = [0] * q
    cur = 0  # 当前处理到的数组位置
    
    for l, r, qi in indexed:
        # 处理 [cur, r] 范围内的元素
        while cur <= r:
            val = mapped[cur]
            if last[val] != -1:
                # 取消之前位置的贡献
                bit.update(last[val], -1)
            # 当前位置贡献 +1
            bit.update(cur, 1)
            last[val] = cur
            cur += 1
        
        # 查询 [l, r] 的答案
        results[qi] = bit.range_query(l, r)
    
    return results
```

### 复杂度对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|------|-----------|-----------|------|
| 莫队 | O((n+q)√n) | O(n) | 实现简单，常数小 |
| 树状数组 | O((n+q)log n) | O(n) | 复杂度更优，但实现稍复杂 |

---

## 方法三：主席树（在线）

如果需要**在线**回答查询，可以使用主席树（可持久化线段树）。

### 核心思想

类似方法二，但预先构建所有版本的线段树：
- 第 i 个版本表示只考虑前 i 个元素时的"有效"标记状态
- 查询 [l, r]：在版本 r 上查询 [l, r] 的有效位置数

### 复杂度

- 预处理：O(n log n)
- 每次查询：O(log n)
- 空间：O(n log n)

（主席树的具体实现将在后续章节详细介绍）

---

## 变体问题

### 变体 1：区间不同数之和

> 查询 [l, r] 内所有不同的数的**和**。

只需修改 add/remove 操作：

```python
def add(idx):
    nonlocal distinct_sum
    val = mapped[idx]
    original_val = arr[idx]  # 原始值（非离散化）
    if count[val] == 0:
        distinct_sum += original_val
    count[val] += 1

def remove(idx):
    nonlocal distinct_sum
    val = mapped[idx]
    original_val = arr[idx]
    count[val] -= 1
    if count[val] == 0:
        distinct_sum -= original_val
```

### 变体 2：区间 MEX

> 查询 [l, r] 内最小的未出现正整数。

MEX (Minimum Excludant) 问题也可以用莫队解决：

```python
def add(idx):
    val = arr[idx]
    if val > 0:
        count[val] += 1

def remove(idx):
    val = arr[idx]
    if val > 0:
        count[val] -= 1

def get_mex():
    mex = 1
    while count[mex] > 0:
        mex += 1
    return mex
```

但这样每次查询需要 O(答案) 时间找 MEX。可以用值域分块优化到 O(√MAX_VAL)。

### 变体 3：区间出现次数 ≥ k 的数的个数

```python
def add(idx):
    nonlocal cnt_ge_k
    val = mapped[idx]
    if count[val] == k - 1:
        cnt_ge_k += 1
    count[val] += 1

def remove(idx):
    nonlocal cnt_ge_k
    val = mapped[idx]
    if count[val] == k:
        cnt_ge_k -= 1
    count[val] -= 1
```

---

## 优化技巧

### 1. 奇偶优化

```python
def mo_key(query):
    l, r, _ = query
    block = l // block_size
    if block % 2 == 0:
        return (block, r)
    else:
        return (block, -r)
```

减少右指针在块边界处的"折返"。

### 2. 块大小调优

```python
# 标准
block_size = int(math.sqrt(n))

# 针对查询数量调整
block_size = max(1, int(n / math.sqrt(q)))
```

### 3. 使用数组替代字典

```python
# 慢（字典）
count = defaultdict(int)

# 快（数组，需要离散化）
count = [0] * M
```

### 4. 内联 add/remove

在性能敏感的场景，将 add/remove 内联可以减少函数调用开销：

```python
for l, r, qi in indexed:
    while cur_r < r:
        cur_r += 1
        val = mapped[cur_r]
        if count[val] == 0:
            distinct += 1
        count[val] += 1
    # ... 其他操作类似
```

---

## 完整的优化版本

```python
import math
from typing import List, Tuple

def count_distinct_optimized(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """优化版本的区间不同数计数"""
    n = len(arr)
    q = len(queries)
    
    if n == 0 or q == 0:
        return [0] * q
    
    # 离散化
    sorted_vals = sorted(set(arr))
    val_to_id = {v: i for i, v in enumerate(sorted_vals)}
    mapped = [val_to_id[v] for v in arr]
    M = len(sorted_vals)
    
    # 优化块大小
    block_size = max(1, int(n / math.sqrt(q)) + 1)
    
    # 排序（奇偶优化）
    indexed = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    count = [0] * M
    distinct = 0
    cur_l, cur_r = 0, -1
    results = [0] * q
    
    for l, r, qi in indexed:
        # 内联操作以提升性能
        while cur_r < r:
            cur_r += 1
            val = mapped[cur_r]
            if count[val] == 0:
                distinct += 1
            count[val] += 1
        
        while cur_r > r:
            val = mapped[cur_r]
            count[val] -= 1
            if count[val] == 0:
                distinct -= 1
            cur_r -= 1
        
        while cur_l > l:
            cur_l -= 1
            val = mapped[cur_l]
            if count[val] == 0:
                distinct += 1
            count[val] += 1
        
        while cur_l < l:
            val = mapped[cur_l]
            count[val] -= 1
            if count[val] == 0:
                distinct -= 1
            cur_l += 1
        
        results[qi] = distinct
    
    return results
```

---

## 本章小结

本章深入探讨了"区间不同数个数"问题的多种解法：

1. **莫队算法**：
   - 时间 O((n+q)√n)，空间 O(n)
   - 实现简单，适合快速编码
   
2. **树状数组离线**：
   - 时间 O((n+q)log n)，空间 O(n)
   - 复杂度更优，但思路稍复杂
   
3. **主席树在线**：
   - 预处理 O(n log n)，查询 O(log n)
   - 支持在线查询

4. **优化技巧**：
   - 奇偶优化
   - 块大小调优
   - 数组替代字典
   - 内联操作

这个问题是学习莫队算法的绝佳起点，掌握它将为解决更复杂的区间统计问题打下坚实基础。

下一章我们将探讨另一个经典问题：**区间众数查询**。
