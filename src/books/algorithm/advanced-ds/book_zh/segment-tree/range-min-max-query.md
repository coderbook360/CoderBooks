# 区间最值问题

## 线段树的通用性

前一章我们学习了用线段树解决区间求和问题。现在思考一个问题：**线段树能否解决其他类型的区间查询？**

答案是肯定的。线段树的核心思想是**分治 + 预处理**，这种思想适用于所有满足**结合律**的操作：
- 加法：`(a + b) + c = a + (b + c)`
- 乘法：`(a × b) × c = a × (b × c)`
- 最大值：`max(max(a, b), c) = max(a, max(b, c))`
- 最小值：`min(min(a, b), c) = min(a, min(b, c))`
- GCD：`gcd(gcd(a, b), c) = gcd(a, gcd(b, c))`
- XOR：`(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)`

只要修改**合并逻辑**和**单位元**，就能将线段树应用于不同的区间统计问题。

## 问题场景：区间最大值/最小值

给定一个数组 `nums`，支持以下操作：
- `queryMax(left, right)`：返回区间 `[left, right]` 的最大值
- `queryMin(left, right)`：返回区间 `[left, right]` 的最小值
- `update(index, val)`：将 `nums[index]` 的值修改为 `val`

这是线段树的经典变体，展示了线段树的**通用性**和**灵活性**。

## 实现思路：修改合并逻辑

### 核心修改点

从区间求和到区间最值，只需修改两处：

| 操作 | 区间求和 | 区间最大值 | 区间最小值 |
|------|---------|-----------|-----------|
| **合并逻辑** | `left + right` | `max(left, right)` | `min(left, right)` |
| **查询单位元** | `0` | `-∞` | `+∞` |

**为什么需要单位元？**

查询时，当区间不相交需要返回一个"不影响结果"的值：
- 求和：`sum + 0 = sum`，单位元是 0
- 最大值：`max(val, -∞) = val`，单位元是负无穷
- 最小值：`min(val, +∞) = val`，单位元是正无穷

## 区间最大值实现

### 完整代码

```python
class SegmentTreeMax:
    """区间最大值线段树"""
    
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [float('-inf')] * (4 * self.n)
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        """构建线段树"""
        if start == end:
            self.tree[node] = nums[start]
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)
        self._build(nums, right_child, mid + 1, end)
        
        # 核心修改：合并取最大值
        self.tree[node] = max(self.tree[left_child], self.tree[right_child])
    
    def query(self, left, right):
        """查询区间 [left, right] 的最大值"""
        return self._query(1, 0, self.n - 1, left, right)
    
    def _query(self, node, start, end, left, right):
        """递归查询"""
        # 区间不相交，返回负无穷（不影响最大值）
        if right < start or left > end:
            return float('-inf')
        
        # 当前区间完全包含在查询区间内
        if left <= start and end <= right:
            return self.tree[node]
        
        # 部分重叠，递归查询左右子树
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        left_max = self._query(left_child, start, mid, left, right)
        right_max = self._query(right_child, mid + 1, end, left, right)
        
        # 核心修改：合并取最大值
        return max(left_max, right_max)
    
    def update(self, index, val):
        """更新索引 index 的值为 val"""
        self._update(1, 0, self.n - 1, index, val)
    
    def _update(self, node, start, end, index, val):
        """递归更新"""
        if start == end:
            self.tree[node] = val
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        if index <= mid:
            self._update(left_child, start, mid, index, val)
        else:
            self._update(right_child, mid + 1, end, index, val)
        
        # 核心修改：合并取最大值
        self.tree[node] = max(self.tree[left_child], self.tree[right_child])
```

### 使用示例

```python
# 初始化
nums = [3, 1, 7, 4, 9, 2]
seg_max = SegmentTreeMax(nums)

# 查询最大值
print(seg_max.query(0, 2))  # 输出: 7
print(seg_max.query(2, 5))  # 输出: 9

# 更新元素
seg_max.update(1, 10)  # 将 nums[1] 从 1 改为 10

# 再次查询
print(seg_max.query(0, 2))  # 输出: 10
```

## 区间最小值实现

### 完整代码

区间最小值的实现几乎完全相同，只需将 `max` 改为 `min`，单位元改为 `float('inf')`：

```python
class SegmentTreeMin:
    """区间最小值线段树"""
    
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [float('inf')] * (4 * self.n)
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        if start == end:
            self.tree[node] = nums[start]
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)
        self._build(nums, right_child, mid + 1, end)
        
        # 核心修改：合并取最小值
        self.tree[node] = min(self.tree[left_child], self.tree[right_child])
    
    def query(self, left, right):
        return self._query(1, 0, self.n - 1, left, right)
    
    def _query(self, node, start, end, left, right):
        # 区间不相交，返回正无穷（不影响最小值）
        if right < start or left > end:
            return float('inf')
        
        if left <= start and end <= right:
            return self.tree[node]
        
        mid = (start + end) // 2
        left_min = self._query(2 * node, start, mid, left, right)
        right_min = self._query(2 * node + 1, mid + 1, end, left, right)
        
        # 核心修改：合并取最小值
        return min(left_min, right_min)
    
    def update(self, index, val):
        self._update(1, 0, self.n - 1, index, val)
    
    def _update(self, node, start, end, index, val):
        if start == end:
            self.tree[node] = val
            return
        
        mid = (start + end) // 2
        if index <= mid:
            self._update(2 * node, start, mid, index, val)
        else:
            self._update(2 * node + 1, mid + 1, end, index, val)
        
        # 核心修改：合并取最小值
        self.tree[node] = min(self.tree[2 * node], self.tree[2 * node + 1])
```

## 同时支持最大值和最小值

如果需要同时查询最大值和最小值，可以在每个节点存储一个元组：

```python
class SegmentTreeMinMax:
    """同时支持最大值和最小值查询"""
    
    def __init__(self, nums):
        self.n = len(nums)
        # 每个节点存储 (min, max)
        self.tree = [(float('inf'), float('-inf'))] * (4 * self.n)
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        if start == end:
            self.tree[node] = (nums[start], nums[start])
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)
        self._build(nums, right_child, mid + 1, end)
        
        # 合并：分别取最小值和最大值
        left_min, left_max = self.tree[left_child]
        right_min, right_max = self.tree[right_child]
        self.tree[node] = (min(left_min, right_min), max(left_max, right_max))
    
    def query(self, left, right):
        """返回区间 [left, right] 的 (最小值, 最大值)"""
        return self._query(1, 0, self.n - 1, left, right)
    
    def _query(self, node, start, end, left, right):
        if right < start or left > end:
            return (float('inf'), float('-inf'))
        
        if left <= start and end <= right:
            return self.tree[node]
        
        mid = (start + end) // 2
        left_result = self._query(2 * node, start, mid, left, right)
        right_result = self._query(2 * node + 1, mid + 1, end, left, right)
        
        # 合并结果
        min_val = min(left_result[0], right_result[0])
        max_val = max(left_result[1], right_result[1])
        return (min_val, max_val)
    
    def update(self, index, val):
        self._update(1, 0, self.n - 1, index, val)
    
    def _update(self, node, start, end, index, val):
        if start == end:
            self.tree[node] = (val, val)
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        if index <= mid:
            self._update(left_child, start, mid, index, val)
        else:
            self._update(right_child, mid + 1, end, index, val)
        
        # 合并左右子树
        left_min, left_max = self.tree[left_child]
        right_min, right_max = self.tree[right_child]
        self.tree[node] = (min(left_min, right_min), max(left_max, right_max))
```

### 使用示例

```python
nums = [3, 1, 7, 4, 9, 2]
seg_tree = SegmentTreeMinMax(nums)

# 查询区间 [1, 4] 的最小值和最大值
min_val, max_val = seg_tree.query(1, 4)
print(f"区间 [1, 4] 的最小值: {min_val}, 最大值: {max_val}")
# 输出: 区间 [1, 4] 的最小值: 1, 最大值: 9
```

## 抽象通用线段树

为了避免重复代码，可以抽象出一个通用的线段树类：

```python
class SegmentTree:
    """通用线段树"""
    
    def __init__(self, nums, merge_func, identity):
        """
        Args:
            nums: 原始数组
            merge_func: 合并函数，如 max, min, operator.add
            identity: 单位元，如 float('-inf'), float('inf'), 0
        """
        self.n = len(nums)
        self.merge = merge_func
        self.identity = identity
        self.tree = [identity] * (4 * self.n)
        if self.n > 0:
            self._build(nums, 1, 0, self.n - 1)
    
    def _build(self, nums, node, start, end):
        if start == end:
            self.tree[node] = nums[start]
            return
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        self._build(nums, left_child, start, mid)
        self._build(nums, right_child, mid + 1, end)
        self.tree[node] = self.merge(self.tree[left_child], self.tree[right_child])
    
    def query(self, left, right):
        return self._query(1, 0, self.n - 1, left, right)
    
    def _query(self, node, start, end, left, right):
        if right < start or left > end:
            return self.identity
        if left <= start and end <= right:
            return self.tree[node]
        
        mid = (start + end) // 2
        left_result = self._query(2 * node, start, mid, left, right)
        right_result = self._query(2 * node + 1, mid + 1, end, left, right)
        return self.merge(left_result, right_result)
    
    def update(self, index, val):
        self._update(1, 0, self.n - 1, index, val)
    
    def _update(self, node, start, end, index, val):
        if start == end:
            self.tree[node] = val
            return
        
        mid = (start + end) // 2
        if index <= mid:
            self._update(2 * node, start, mid, index, val)
        else:
            self._update(2 * node + 1, mid + 1, end, index, val)
        
        self.tree[node] = self.merge(self.tree[2 * node], self.tree[2 * node + 1])
```

### 使用通用类

```python
import operator

# 区间求和
seg_sum = SegmentTree(nums, operator.add, 0)

# 区间最大值
seg_max = SegmentTree(nums, max, float('-inf'))

# 区间最小值
seg_min = SegmentTree(nums, min, float('inf'))

# 区间 GCD
import math
seg_gcd = SegmentTree(nums, math.gcd, 0)

# 区间 XOR
seg_xor = SegmentTree(nums, operator.xor, 0)
```

## 性能分析

区间最值问题与区间求和问题的性能完全相同：

| 操作 | 时间复杂度 | 空间复杂度 |
|------|----------|----------|
| 构建 | O(N) | O(N) |
| 查询 | O(logN) | - |
| 更新 | O(logN) | - |

**为什么性能相同？**

因为线段树的性能只与**树的结构**有关，与具体的合并操作无关。无论是求和、最大值、还是最小值，都是：
- 构建：访问每个节点一次
- 查询/更新：沿树路径访问 O(logN) 个节点

## 稀疏表（Sparse Table）对比

对于**静态数组**（没有修改操作）的区间最值查询，还有一种更快的数据结构：**稀疏表（Sparse Table）**。

| 特性 | 线段树 | 稀疏表 |
|------|--------|--------|
| **构建** | O(N) | O(N logN) |
| **查询** | O(logN) | **O(1)** |
| **更新** | O(logN) | **不支持** |
| **空间** | O(N) | O(N logN) |

**稀疏表的核心思想**：
- 预处理所有长度为 2^k 的区间的最值
- 查询时将任意区间拆分成两个重叠的 2^k 区间
- 适用于满足**幂等性**的操作（max、min、gcd）

**选择建议**：
- 静态数组 + 区间最值 → 稀疏表（O(1) 查询）
- 需要修改操作 → 线段树
- 求和、XOR等非幂等操作 → 只能用线段树

## 常见陷阱

### 1. 单位元选择错误

**错误示例**：
```python
# 查询最大值时返回 0 作为单位元（错误）
if right < start or left > end:
    return 0  # 如果数组全是负数，会返回错误结果
```

**正确做法**：
```python
return float('-inf')  # 保证不影响最大值
```

### 2. 初始化数组时使用错误的默认值

```python
# 错误：最大值线段树初始化为 0
self.tree = [0] * (4 * self.n)

# 正确：初始化为负无穷
self.tree = [float('-inf')] * (4 * self.n)
```

### 3. 忘记处理空数组

```python
def __init__(self, nums):
    self.n = len(nums)
    self.tree = [float('-inf')] * (4 * self.n)
    if self.n > 0:  # 必须检查
        self._build(nums, 1, 0, self.n - 1)
```

## 扩展应用

### 区间 GCD

```python
import math

seg_gcd = SegmentTree(nums, math.gcd, 0)
```

**应用场景**：
- 查询区间所有数的最大公约数
- 优化因数分解
- 数论问题

### 区间 XOR

```python
import operator

seg_xor = SegmentTree(nums, operator.xor, 0)
```

**应用场景**：
- 查询区间异或和
- 位运算问题
- 子数组异或相关问题

### 区间位与/位或

```python
seg_and = SegmentTree(nums, operator.and_, (1 << 31) - 1)  # 全1作为单位元
seg_or = SegmentTree(nums, operator.or_, 0)
```

## 总结

区间最值问题展示了线段树的**通用性**和**灵活性**。

**核心要点**：
1. **修改合并逻辑**：将 `+` 改为 `max/min`
2. **修改单位元**：将 `0` 改为 `-∞/+∞`
3. **通用框架**：抽象出合并函数和单位元，支持任意满足结合律的操作
4. **性能一致**：无论何种操作，时间复杂度都是 O(logN)
5. **适用场景**：需要修改操作时用线段树，静态数组最值可考虑稀疏表

线段树的强大之处在于其**可扩展性**：只要操作满足结合律，就能用线段树高效处理。这种设计思想体现了**抽象**和**复用**的编程智慧。

下一章我们将学习线段树的核心进阶技术——**懒惰传播（Lazy Propagation）**，它能将区间修改的复杂度从 O(N) 优化到 O(logN)，进一步释放线段树的威力。
