# 单点修改区间查询

## 标准模式回顾

上一章我们学习了树状数组的基本原理。这一章我们将这个模式应用于实际问题。

**单点修改区间查询（Point Update Range Query, PURQ）** 是树状数组最基本也是最常见的应用模式：

- `update(i, delta)`：将 `nums[i]` 增加 `delta`
- `query(l, r)`：查询区间 `[l, r]` 的和

这正是树状数组的「原生能力」，不需要任何额外技巧。

---

## 标准模板

```python
class BIT:
    """树状数组：单点修改 + 区间查询"""
    
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 1)
    
    def update(self, i, delta):
        """位置 i 增加 delta（1-indexed）"""
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def query(self, i):
        """查询 [1, i] 的前缀和"""
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= i & (-i)
        return result
    
    def range_query(self, l, r):
        """查询 [l, r] 的区间和"""
        return self.query(r) - self.query(l - 1)
```

---

## LeetCode 实战

### 307. 区域和检索 - 数组可修改

**LeetCode 307: Range Sum Query - Mutable**

给定一个整数数组 `nums`，实现：
- `update(index, val)`：将 `nums[index]` 更新为 `val`
- `sumRange(left, right)`：返回数组中 `[left, right]` 范围内元素的和

**注意**：题目是「更新为」而不是「增加」，我们需要计算差值。

```python
class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.nums = nums[:]  # 保存原数组，用于计算差值
        self.tree = [0] * (self.n + 1)
        
        # 初始化树状数组
        for i, num in enumerate(nums):
            self._update(i + 1, num)
    
    def _update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def _query(self, i):
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= i & (-i)
        return result
    
    def update(self, index, val):
        # 计算差值
        delta = val - self.nums[index]
        self.nums[index] = val
        self._update(index + 1, delta)
    
    def sumRange(self, left, right):
        return self._query(right + 1) - self._query(left)
```

**复杂度分析**：
- 初始化：O(N log N)
- 更新：O(log N)
- 查询：O(log N)

**优化：O(N) 构建**

```python
def __init__(self, nums):
    self.n = len(nums)
    self.nums = nums[:]
    self.tree = [0] * (self.n + 1)
    
    # O(N) 构建
    for i in range(1, self.n + 1):
        self.tree[i] += nums[i - 1]
        j = i + (i & (-i))
        if j <= self.n:
            self.tree[j] += self.tree[i]
```

---

### 更多类似问题

#### 变体一：多次查询前需要多次更新

```python
# 场景：先进行 M 次更新，再进行 K 次查询
updates = [(i1, delta1), (i2, delta2), ...]
queries = [(l1, r1), (l2, r2), ...]

bit = BIT(n)
for i, delta in updates:
    bit.update(i, delta)

for l, r in queries:
    print(bit.range_query(l, r))
```

#### 变体二：实时混合操作

```python
# 场景：更新和查询交替进行
operations = [
    ("update", 3, 5),
    ("query", 1, 5),
    ("update", 2, -3),
    ("query", 2, 4),
    ...
]

bit = BIT(n)
for op in operations:
    if op[0] == "update":
        bit.update(op[1], op[2])
    else:
        print(bit.range_query(op[1], op[2]))
```

---

## 进阶：离散化处理

当值域很大但元素个数有限时，需要离散化。

**示例**：元素值在 [-10^9, 10^9] 范围内，但只有 N 个元素。

```python
def solve_with_discretization(nums):
    # 1. 离散化
    sorted_unique = sorted(set(nums))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}  # 1-indexed
    
    n = len(sorted_unique)
    bit = BIT(n)
    
    # 2. 使用离散化后的排名
    for num in nums:
        r = rank[num]
        bit.update(r, 1)
    
    # 3. 查询时也使用排名
    # 例如：查询小于等于某个值的元素个数
    def count_le(val):
        if val not in rank:
            # 找到第一个 > val 的排名
            import bisect
            idx = bisect.bisect_right(sorted_unique, val)
            return bit.query(idx) if idx > 0 else 0
        return bit.query(rank[val])
```

---

## 应用场景总结

**单点修改区间查询**适用于：

| 场景 | 具体问题 |
|-----|---------|
| 动态求和 | 频繁修改元素值，频繁查询区间和 |
| 频率统计 | 统计某范围内元素的出现次数 |
| 动态排名 | 计算元素的排名（配合离散化）|
| 逆序对变体 | 统计满足某条件的元素对 |

---

## 代码模板（可直接使用）

```python
class BIT:
    """树状数组模板：单点修改 + 区间查询"""
    
    def __init__(self, n):
        """初始化大小为 n 的树状数组"""
        self.n = n
        self.tree = [0] * (n + 1)
    
    @classmethod
    def from_array(cls, arr):
        """从数组构建（O(N)）"""
        n = len(arr)
        bit = cls(n)
        for i in range(1, n + 1):
            bit.tree[i] += arr[i - 1]
            j = i + (i & (-i))
            if j <= n:
                bit.tree[j] += bit.tree[i]
        return bit
    
    def update(self, i, delta):
        """位置 i 增加 delta（1-indexed）"""
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def query(self, i):
        """查询 [1, i] 的前缀和"""
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= i & (-i)
        return result
    
    def range_query(self, l, r):
        """查询 [l, r] 的区间和"""
        if l > r:
            return 0
        return self.query(r) - self.query(l - 1)
```

---

## 本章小结

本章核心要点：

1. **PURQ 模式**：树状数组的原生能力，单点修改 + 区间查询

2. **关键技巧**：
   - 「更新为某值」需要计算差值
   - 值域大时需要离散化
   - O(N) 构建优于逐个插入

3. **LeetCode 307**：经典的动态区间和问题

4. **模板化**：掌握标准模板，遇到类似问题直接套用

下一章我们将学习**区间修改单点查询**，通过差分数组技巧，让树状数组支持更多操作类型。
