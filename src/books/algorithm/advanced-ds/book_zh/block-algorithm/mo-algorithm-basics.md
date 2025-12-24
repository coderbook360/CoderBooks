# 莫队算法原理

莫队算法（Mo's Algorithm）是一种巧妙的离线查询优化技术，由中国竞赛选手莫涛发明。它将分块思想与查询排序相结合，能够高效处理一类"难以在线回答"的区间查询问题。

---

## 引入问题

考虑这样一个问题：

> 给定一个长度为 n 的数组和 q 个查询，每个查询要求回答区间 `[l, r]` 内有多少个**不同的数**。

这个问题有什么特点？

1. **没有简单的合并方式**：无法从 `distinct(a[0..5])` 和 `distinct(a[3..8])` 推出 `distinct(a[0..8])`
2. **前缀和失效**：`distinct(a[0..r]) - distinct(a[0..l-1])` 不等于 `distinct(a[l..r])`
3. **线段树难以维护**：两个区间合并时，需要去重，无法简单合并

### 暴力解法

最直接的做法：对每个查询，遍历 `[l, r]`，用集合统计不同数的个数。

```python
def count_distinct_brute(arr, queries):
    results = []
    for l, r in queries:
        results.append(len(set(arr[l:r+1])))
    return results
```

时间复杂度：O(q × n)。当 n, q 都是 10^5 级别时，这显然太慢了。

### 关键观察

如果我们已经知道 `[l, r]` 的答案，能否快速得到相邻区间的答案？

- `[l, r]` → `[l, r+1]`：加入 `arr[r+1]`，O(1) 更新
- `[l, r]` → `[l-1, r]`：加入 `arr[l-1]`，O(1) 更新
- `[l, r]` → `[l+1, r]`：移除 `arr[l]`，O(1) 更新
- `[l, r]` → `[l, r-1]`：移除 `arr[r]`，O(1) 更新

**核心思想**：维护一个"滑动窗口"，通过增删元素来更新答案。如果查询按照某种顺序排列，使得窗口的移动总距离最小，就能大幅优化效率。

这就是莫队算法的核心。

---

## 莫队算法的原理

### 查询排序策略

莫队算法的关键在于**对查询进行排序**，使得处理所有查询时，左右指针的总移动距离最小。

**排序规则**：
1. 按**左端点所在的块**排序
2. 同一块内，按**右端点**排序

```python
def mo_compare(query):
    l, r, idx = query
    block = l // block_size
    return (block, r)

queries.sort(key=mo_compare)
```

### 为什么这样排序？

**右端点的移动**：
- 同一块内的查询，右端点单调递增（因为按 r 排序）
- 右指针最多移动 n 次
- 共 √n 个块，所以右指针总移动 O(n × √n)

**左端点的移动**：
- 同一块内，左端点最多在块内移动，每次最多 √n
- 每个查询最多移动 √n，共 q 个查询
- 左指针总移动 O(q × √n)

**总复杂度**：O((n + q) × √n)

---

## 算法模板

```python
import math
from typing import List, Tuple

def mo_algorithm(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    莫队算法模板
    arr: 原数组
    queries: 查询列表，每个元素是 (left, right)
    返回: 每个查询的答案
    """
    n = len(arr)
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    block_size = max(1, int(math.sqrt(n)))
    
    # 为每个查询添加原始索引
    indexed_queries = [(l, r, i) for i, (l, r) in enumerate(queries)]
    
    # 按莫队规则排序
    def mo_key(query):
        l, r, _ = query
        block = l // block_size
        # 奇偶优化：奇数块按 r 递减，偶数块按 r 递增
        if block % 2 == 0:
            return (block, r)
        else:
            return (block, -r)
    
    indexed_queries.sort(key=mo_key)
    
    # 初始化
    results = [0] * q
    count = {}  # 每个值的出现次数
    distinct = 0  # 不同数的个数
    cur_l, cur_r = 0, -1  # 当前维护的区间
    
    def add(idx):
        """添加 arr[idx] 到当前区间"""
        nonlocal distinct
        val = arr[idx]
        if val not in count:
            count[val] = 0
        count[val] += 1
        if count[val] == 1:
            distinct += 1
    
    def remove(idx):
        """从当前区间移除 arr[idx]"""
        nonlocal distinct
        val = arr[idx]
        count[val] -= 1
        if count[val] == 0:
            distinct -= 1
            del count[val]
    
    # 处理每个查询
    for l, r, query_idx in indexed_queries:
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
        
        # 记录答案
        results[query_idx] = distinct
    
    return results
```

---

## 详细执行过程

让我们通过一个例子来理解莫队算法的执行过程：

```
数组：[1, 2, 1, 3, 2]
查询：[(0, 2), (2, 4), (1, 3), (0, 4)]
块大小 = √5 ≈ 2
```

**排序后的查询**（按块号和右端点）：

```
原索引 0: (0, 2) → 块 0，r = 2
原索引 2: (1, 3) → 块 0，r = 3
原索引 3: (0, 4) → 块 0，r = 4
原索引 1: (2, 4) → 块 1，r = 4
```

**执行过程**：

1. **处理 (0, 2)**：
   - 从空区间扩展到 [0, 2]
   - 加入 1, 2, 1 → distinct = 2
   - 答案[0] = 2

2. **处理 (1, 3)**：
   - 扩展右边界：[0, 2] → [0, 3]，加入 3 → distinct = 3
   - 收缩左边界：[0, 3] → [1, 3]，移除 1 → distinct = 3（因为 1 还在区间内）
   - 答案[2] = 3

3. **处理 (0, 4)**：
   - 扩展右边界：[1, 3] → [1, 4]，加入 2 → distinct = 3
   - 扩展左边界：[1, 4] → [0, 4]，加入 1 → distinct = 3
   - 答案[3] = 3

4. **处理 (2, 4)**：
   - 收缩左边界：[0, 4] → [2, 4]，移除 1, 2
   - 移除 1 后 distinct = 3（区间内还有 1）
   - 移除 2 后 distinct = 3（区间内还有 2）
   - 答案[1] = 3

最终答案：[2, 3, 3, 3]

---

## 奇偶优化

注意到在块边界处，右指针可能需要从很大的位置移回到很小的位置。奇偶优化可以减少这种浪费：

```python
def mo_key(query):
    l, r, _ = query
    block = l // block_size
    # 偶数块：r 递增
    # 奇数块：r 递减
    if block % 2 == 0:
        return (block, r)
    else:
        return (block, -r)
```

**原理**：相邻块之间，右指针方向相反，减少"折返"。

**效果**：常数级别的优化，实际运行时间减少约 30%。

---

## 复杂度分析

设 n 为数组长度，q 为查询数量，块大小 B = √n。

### 右指针移动

- 同一块内：右端点单调（递增或递减），移动 O(n)
- 共 √n 个块，切换块时最多移动 n
- 总移动：O(n × √n)

### 左指针移动

- 同一块内：左端点差距最多 B = √n
- 共 q 个查询
- 总移动：O(q × √n)

### 总复杂度

O((n + q) × √n)

如果 add 和 remove 操作是 O(1)，则整体复杂度为 O((n + q) × √n)。

### 块大小优化

实际上，最优块大小与 n 和 q 的比例有关：

```python
block_size = max(1, int(n / math.sqrt(q)))
```

当 q 和 n 接近时，这与 √n 差不多。

---

## 莫队的适用条件

莫队算法有以下适用条件：

### 必要条件

1. **离线**：可以先读取所有查询，再统一处理
2. **可增删**：能够 O(1) 或 O(log n) 地添加/移除一个元素，并更新答案

### 适合的问题类型

- 区间不同数个数
- 区间众数
- 区间内满足某条件的元素对数
- 区间 MEX（最小未出现正整数）

### 不适合的问题类型

- 需要在线回答
- add/remove 操作复杂度高
- 存在更优的数据结构解法

---

## 与其他方法的对比

| 方法 | 时间复杂度 | 空间复杂度 | 在线/离线 | 实现难度 |
|------|-----------|-----------|----------|---------|
| 暴力 | O(q × n) | O(n) | 在线 | 简单 |
| 分块预处理 | O(n√n + q√n) | O(n√n) | 在线 | 中等 |
| 莫队 | O((n+q)√n) | O(n) | 离线 | 简单 |
| 持久化数据结构 | O(q log n) | O(n log n) | 在线 | 困难 |

**莫队的优势**：
- 实现简单，思路清晰
- 空间效率高
- 适用范围广

**莫队的劣势**：
- 必须离线
- 复杂度有 √n 因子

---

## 实战示例：区间不同数计数

完整的可运行代码：

```python
import math
from typing import List, Tuple

def count_distinct_in_ranges(arr: List[int], queries: List[Tuple[int, int]]) -> List[int]:
    """
    对于每个查询 (l, r)，返回 arr[l..r] 中不同数的个数
    """
    n = len(arr)
    q = len(queries)
    if n == 0 or q == 0:
        return [0] * q
    
    # 块大小
    block_size = max(1, int(math.sqrt(n)))
    
    # 添加原始索引并排序
    indexed_queries = [(l, r, i) for i, (l, r) in enumerate(queries)]
    indexed_queries.sort(key=lambda x: (x[0] // block_size, x[1] if (x[0] // block_size) % 2 == 0 else -x[1]))
    
    # 初始化
    results = [0] * q
    count = [0] * (max(arr) + 1 if arr else 1)  # 假设值非负
    distinct = 0
    cur_l, cur_r = 0, -1
    
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
    
    for l, r, query_idx in indexed_queries:
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
        
        results[query_idx] = distinct
    
    return results


# 测试
if __name__ == "__main__":
    arr = [1, 2, 1, 3, 2, 1]
    queries = [(0, 2), (1, 4), (2, 5), (0, 5)]
    
    results = count_distinct_in_ranges(arr, queries)
    print(results)  # [2, 3, 3, 3]
```

---

## 本章小结

莫队算法是分块思想在离线查询中的精彩应用：

1. **核心思想**：
   - 维护一个"滑动窗口"，通过增删元素更新答案
   - 对查询排序，使窗口移动总距离最小

2. **排序规则**：
   - 按左端点所在的块排序
   - 同一块内按右端点排序
   - 可用奇偶优化进一步提升常数

3. **复杂度**：O((n + q) × √n)

4. **适用场景**：
   - 离线查询
   - add/remove 操作高效
   - 问题不具有简单的合并性质

在接下来的章节中，我们将看到莫队的多种变体：普通莫队、带修改莫队、树上莫队、回滚莫队等，它们将这一思想扩展到更广泛的问题中。
