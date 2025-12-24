# 区间修改单点查询

## 新的需求

上一章我们学习了「单点修改 + 区间查询」。现在考虑相反的需求：

**区间修改单点查询（Range Update Point Query, RUPQ）**：
- `range_update(l, r, delta)`：将区间 `[l, r]` 内的每个元素增加 `delta`
- `point_query(i)`：查询位置 `i` 的当前值

如果用标准树状数组：
- 区间修改需要逐个更新，O(N)
- 单点查询是 O(log N)

如何让两个操作都达到 O(log N)？

---

## 核心思想：差分数组

### 差分数组的定义

对于数组 `nums`，定义差分数组 `diff`：

$$diff[i] = nums[i] - nums[i-1]$$

其中 `nums[0] = 0`（边界约定）。

**性质**：

$$nums[i] = \sum_{j=1}^{i} diff[j] = \text{prefix\_sum}(diff, i)$$

即：原数组的值 = 差分数组的前缀和。

### 差分数组的妙用

考虑对 `nums[l..r]` 区间加 `delta`：

**原始数组变化**：
```
nums[l] += delta
nums[l+1] += delta
...
nums[r] += delta
```

**差分数组变化**：
```
diff[l] += delta      # nums[l] 相对于 nums[l-1] 增加了 delta
diff[r+1] -= delta    # nums[r+1] 相对于 nums[r] 减少了 delta
                      # 其他位置的差分不变！
```

**惊人的发现**：区间修改变成了**两个单点修改**！

---

## 算法设计

### 操作对应关系

| 原始操作 | 在差分数组上的操作 |
|---------|------------------|
| 区间 `[l, r]` 加 `delta` | `update(l, delta)` + `update(r+1, -delta)` |
| 查询 `nums[i]` | `prefix_sum(diff, i)` |

### 与树状数组结合

我们用树状数组维护差分数组：

- **区间修改**：在差分数组上做两个单点更新 → O(log N)
- **单点查询**：在差分数组上做前缀和查询 → O(log N)

```python
class BIT_RUPQ:
    """树状数组：区间修改 + 单点查询"""
    
    def __init__(self, n):
        self.n = n
        self.tree = [0] * (n + 2)  # 多一个位置防止越界
    
    def _update(self, i, delta):
        """差分数组单点更新"""
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def _prefix_sum(self, i):
        """差分数组前缀和 = 原数组的值"""
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= i & (-i)
        return result
    
    def range_update(self, l, r, delta):
        """区间 [l, r] 每个元素加 delta"""
        self._update(l, delta)
        if r + 1 <= self.n:
            self._update(r + 1, -delta)
    
    def point_query(self, i):
        """查询位置 i 的值"""
        return self._prefix_sum(i)
```

---

## 执行流程可视化

```python
# 初始数组：nums = [0, 0, 0, 0, 0]（1-indexed）
# 差分数组：diff = [0, 0, 0, 0, 0]

bit = BIT_RUPQ(5)

# 操作1：区间 [2, 4] 加 3
bit.range_update(2, 4, 3)
# diff[2] += 3, diff[5] -= 3
# diff = [0, 3, 0, 0, -3]

# 查询 nums[3]：
# prefix_sum(diff, 3) = diff[1] + diff[2] + diff[3] = 0 + 3 + 0 = 3 ✓

# 操作2：区间 [1, 3] 加 2
bit.range_update(1, 3, 2)
# diff[1] += 2, diff[4] -= 2
# diff = [2, 3, 0, -2, -3]

# 查询 nums[2]：
# prefix_sum(diff, 2) = diff[1] + diff[2] = 2 + 3 = 5 ✓

# 验证：
# 经过两次操作后：
# nums[1] = 2（只受操作2影响）
# nums[2] = 3 + 2 = 5（两次操作都影响）
# nums[3] = 3 + 2 = 5
# nums[4] = 3（只受操作1影响）
# nums[5] = 0（都不影响）
```

---

## 带初始值的版本

如果数组有初始值，需要先将初始值转换为差分数组：

```python
class BIT_RUPQ_WithInit:
    """带初始值的区间修改单点查询"""
    
    def __init__(self, nums):
        """nums 是 0-indexed 的初始数组"""
        self.n = len(nums)
        self.tree = [0] * (self.n + 2)
        
        # 构建差分数组的树状数组
        # diff[i] = nums[i] - nums[i-1]
        for i in range(self.n):
            diff_val = nums[i] - (nums[i-1] if i > 0 else 0)
            self._update(i + 1, diff_val)
    
    def _update(self, i, delta):
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def _prefix_sum(self, i):
        result = 0
        while i > 0:
            result += self.tree[i]
            i -= i & (-i)
        return result
    
    def range_update(self, l, r, delta):
        """区间 [l, r] 加 delta（0-indexed）"""
        self._update(l + 1, delta)
        if r + 2 <= self.n:
            self._update(r + 2, -delta)
    
    def point_query(self, i):
        """查询位置 i 的值（0-indexed）"""
        return self._prefix_sum(i + 1)
```

---

## 应用场景

### 场景一：航班预订统计

**LeetCode 1109: Corporate Flight Bookings**

这里有 `n` 个航班，编号从 1 到 n。有一系列航班预订 `bookings`，其中 `bookings[i] = [first, last, seats]` 表示从 `first` 到 `last` 的每个航班预订了 `seats` 个座位。

返回每个航班的预订总数。

```python
class Solution:
    def corpFlightBookings(self, bookings, n):
        # 差分数组
        diff = [0] * (n + 2)
        
        for first, last, seats in bookings:
            diff[first] += seats
            diff[last + 1] -= seats
        
        # 前缀和还原
        result = []
        current = 0
        for i in range(1, n + 1):
            current += diff[i]
            result.append(current)
        
        return result
```

**注意**：这道题是静态的（所有修改在查询前完成），直接用差分数组即可，不需要树状数组。

### 场景二：动态区间修改

当区间修改和单点查询**交替进行**时，才需要树状数组：

```python
operations = [
    ("range_update", 2, 5, 3),
    ("point_query", 3),       # 需要返回结果
    ("range_update", 1, 4, 2),
    ("point_query", 2),
    ...
]

bit = BIT_RUPQ(n)
results = []

for op in operations:
    if op[0] == "range_update":
        bit.range_update(op[1], op[2], op[3])
    else:
        results.append(bit.point_query(op[1]))
```

---

## 差分技巧的本质

差分数组的核心思想：

> **将「区间操作」转化为「端点操作」**

这种转化在很多算法中都有应用：

| 应用场景 | 原始问题 | 转化后 |
|---------|---------|-------|
| 区间加法 | 修改 O(N) 个元素 | 修改 2 个端点 |
| 扫描线 | 处理 N 个矩形 | 处理 2N 个事件 |
| 括号匹配 | 整体平衡检查 | 逐字符增减 |

**核心原理**：利用「前缀和」与「差分」的互逆关系。

---

## 常见错误与陷阱

### 错误一：边界越界

```python
def range_update(self, l, r, delta):
    self._update(l, delta)
    self._update(r + 1, -delta)  # 当 r = n 时，r+1 越界！
```

**解决**：数组多开一个位置，或添加边界检查。

### 错误二：索引混乱

```python
# 0-indexed 和 1-indexed 混用
# 在转换时容易出错

# 建议：统一使用一种索引方式
# 内部用 1-indexed，接口做转换
```

### 错误三：初始化忘记构建差分

```python
# 错误：直接把 nums 当作差分数组
self.tree = nums[:]  # ← 错误！

# 正确：先计算差分，再构建树状数组
for i in range(n):
    diff = nums[i] - (nums[i-1] if i > 0 else 0)
    self._update(i + 1, diff)
```

---

## 本章小结

本章核心要点：

1. **差分数组**：`diff[i] = nums[i] - nums[i-1]`，原数组 = 差分数组的前缀和

2. **操作转化**：
   - 区间 `[l, r]` 加 delta → `diff[l] += delta, diff[r+1] -= delta`
   - 查询 `nums[i]` → `prefix_sum(diff, i)`

3. **与树状数组结合**：用树状数组维护差分数组，实现 O(log N) 的区间修改和单点查询

4. **应用场景**：动态区间加法 + 单点查询

**设计启示**：

差分是一种强大的「问题转化」技巧。它告诉我们：

> 有时候，正面解决问题很困难，但换一个视角（差分视角），问题就变得简单了。

下一章我们将学习**区间修改区间查询**，这需要更精巧的技巧来同时支持两种区间操作。
