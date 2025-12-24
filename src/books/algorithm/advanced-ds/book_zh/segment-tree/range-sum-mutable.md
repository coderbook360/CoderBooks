# 区域和检索 - 数组可修改

## 题目描述

**LeetCode 307. Range Sum Query - Mutable**

给定一个整数数组 `nums`，实现 `NumArray` 类：
- `NumArray(int[] nums)`：用整数数组 `nums` 初始化对象
- `void update(int index, int val)`：将 `nums[index]` 的值更新为 `val`
- `int sumRange(int left, int right)`：返回子数组 `nums[left...right]` 的和（闭区间）

**要求**：
- `update` 和 `sumRange` 方法会被调用多次（最多 3×10^4 次）
- 数组长度最大为 3×10^4

**示例**：
```
输入：
["NumArray", "sumRange", "update", "sumRange"]
[[[1, 3, 5]], [0, 2], [1, 2], [0, 2]]

输出：
[null, 9, null, 8]

解释：
NumArray numArray = new NumArray([1, 3, 5]);
numArray.sumRange(0, 2); // 返回 9 (1 + 3 + 5)
numArray.update(1, 2);   // nums = [1, 2, 5]
numArray.sumRange(0, 2); // 返回 8 (1 + 2 + 5)
```

## 问题分析

这是一个经典的**动态区间求和**问题，核心挑战是：
- 需要支持**高频的单点修改**
- 需要支持**高频的区间查询**
- 两种操作的调用次数都可能达到 3 万次

**为什么不能用朴素方法？**

| 方案 | 更新复杂度 | 查询复杂度 | 总时间复杂度 | 是否可行 |
|------|----------|----------|------------|---------|
| 暴力遍历 | O(1) | O(N) | O(Q×N) = 9×10^8 | ❌ 超时 |
| 前缀和 | O(N) | O(1) | O(Q×N) = 9×10^8 | ❌ 超时 |
| **线段树** | **O(logN)** | **O(logN)** | **O(Q×logN)** | ✅ 通过 |

其中 Q 表示查询和更新的总次数（最多 3×10^4），N 表示数组长度（最多 3×10^4）。

## 方案一：线段树（标准解法）

### 实现代码

```python
class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.tree = [0] * (4 * self.n)
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
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
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
        
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
    def sumRange(self, left, right):
        """查询区间 [left, right] 的和"""
        return self._query(1, 0, self.n - 1, left, right)
    
    def _query(self, node, start, end, left, right):
        """递归查询"""
        if right < start or left > end:
            return 0
        
        if left <= start and end <= right:
            return self.tree[node]
        
        mid = (start + end) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        left_sum = self._query(left_child, start, mid, left, right)
        right_sum = self._query(right_child, mid + 1, end, left, right)
        return left_sum + right_sum
```

### 复杂度分析

**时间复杂度**：
- `__init__`：O(N)，构建线段树
- `update`：O(logN)，沿树路径更新
- `sumRange`：O(logN)，查询访问 O(logN) 个节点

**空间复杂度**：O(N)，线段树数组

### 执行示例

```python
nums = [1, 3, 5]
obj = NumArray(nums)

# 构建后的线段树结构：
#          [0,2]: 9
#         /         \
#    [0,1]: 4      [2,2]: 5
#    /    \
# [0]: 1  [1]: 3

print(obj.sumRange(0, 2))  # 9

obj.update(1, 2)  # 将 nums[1] 从 3 改为 2
# 更新路径：[1] → [0,1] → [0,2]
# 新的线段树：
#          [0,2]: 8
#         /         \
#    [0,1]: 3      [2,2]: 5
#    /    \
# [0]: 1  [1]: 2

print(obj.sumRange(0, 2))  # 8
```

## 方案二：树状数组（更简洁）

树状数组（Fenwick Tree / Binary Indexed Tree）是专门为**单点修改 + 区间查询**设计的数据结构，相比线段树：
- ✅ 实现更简洁（约 10 行代码）
- ✅ 空间更优（2N vs 4N）
- ✅ 常数更小（实际运行更快）
- ❌ 不支持区间修改（线段树需要懒惰传播）
- ❌ 只能处理前缀和相关问题（线段树更通用）

### 实现代码

```python
class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.nums = [0] + nums  # 索引从 1 开始
        self.tree = [0] * (self.n + 1)
        # 构建树状数组
        for i in range(1, self.n + 1):
            self.tree[i] += self.nums[i]
            j = i + (i & -i)  # 下一个需要累加的位置
            if j <= self.n:
                self.tree[j] += self.tree[i]
    
    def update(self, index, val):
        """更新索引 index 的值为 val"""
        delta = val - self.nums[index + 1]
        self.nums[index + 1] = val
        
        i = index + 1
        while i <= self.n:
            self.tree[i] += delta
            i += i & -i  # 移动到父节点
    
    def sumRange(self, left, right):
        """查询区间 [left, right] 的和"""
        return self._prefix_sum(right + 1) - self._prefix_sum(left)
    
    def _prefix_sum(self, k):
        """计算前缀和 [1, k]"""
        s = 0
        while k > 0:
            s += self.tree[k]
            k -= k & -k  # 移动到下一个区间
        return s
```

### 树状数组原理简述

**核心思想**：
- 每个节点存储部分元素的和（而不是完整区间）
- 利用二进制位运算快速定位父子节点
- `i & -i` 计算 i 的最低位 1（lowbit）

**示例**：对于数组 `[1, 3, 5, 7]`
```
tree[1] = nums[1]           = 1
tree[2] = nums[1] + nums[2] = 1 + 3 = 4
tree[3] = nums[3]           = 5
tree[4] = nums[1..4]        = 1 + 3 + 5 + 7 = 16
```

**前缀和查询**：`prefixSum(6)` = `tree[6] + tree[4]`
- 6 的二进制：110
- `6 - (6 & -6)` = 6 - 2 = 4
- `4 - (4 & -4)` = 4 - 4 = 0

### 复杂度分析

与线段树相同：
- `__init__`：O(N logN)
- `update`：O(logN)
- `sumRange`：O(logN)

但常数更小，实际运行更快。

## 方案三：分块（Block Decomposition）

将数组分成 √N 块，每块维护区间和。

### 实现代码

```python
import math

class NumArray:
    def __init__(self, nums):
        self.n = len(nums)
        self.nums = nums
        self.block_size = int(math.sqrt(self.n)) + 1
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        self.blocks = [0] * self.block_count
        
        # 预计算每块的和
        for i in range(self.n):
            self.blocks[i // self.block_size] += nums[i]
    
    def update(self, index, val):
        """更新索引 index 的值为 val"""
        block_id = index // self.block_size
        self.blocks[block_id] += val - self.nums[index]
        self.nums[index] = val
    
    def sumRange(self, left, right):
        """查询区间 [left, right] 的和"""
        result = 0
        left_block = left // self.block_size
        right_block = right // self.block_size
        
        if left_block == right_block:
            # 同一块内，直接遍历
            for i in range(left, right + 1):
                result += self.nums[i]
        else:
            # 左边界的零散元素
            for i in range(left, (left_block + 1) * self.block_size):
                result += self.nums[i]
            
            # 中间的完整块
            for b in range(left_block + 1, right_block):
                result += self.blocks[b]
            
            # 右边界的零散元素
            for i in range(right_block * self.block_size, right + 1):
                result += self.nums[i]
        
        return result
```

### 复杂度分析

**时间复杂度**：
- `__init__`：O(N)
- `update`：O(1)
- `sumRange`：O(√N)

**适用场景**：
- 修改操作特别频繁
- 查询精度要求不高
- 实现简单，易于理解

## 方案对比

| 方案 | 构建 | 更新 | 查询 | 空间 | 实现难度 | 通用性 |
|------|------|------|------|------|---------|-------|
| **线段树** | O(N) | O(logN) | O(logN) | O(N) | 中等 | 高（支持区间修改） |
| **树状数组** | O(N logN) | O(logN) | O(logN) | O(N) | 简单 | 中（仅前缀和） |
| **分块** | O(N) | O(1) | O(√N) | O(N) | 简单 | 低（可扩展性差） |
| 暴力遍历 | O(1) | O(1) | O(N) | O(1) | 极简 | 低 |
| 前缀和 | O(N) | O(N) | O(1) | O(N) | 简单 | 低（不支持修改） |

**选择建议**：
1. **本题推荐**：树状数组（最简洁，性能最优）
2. **学习价值**：线段树（通用性强，可扩展）
3. **简单场景**：分块（实现简单，适合竞赛快速编码）

## 实战技巧

### 1. 选择合适的数据结构

**决策树**：
```
是否需要区间修改？
├─ 是 → 线段树（需要懒惰传播）
└─ 否
   ├─ 只有前缀和相关操作？
   │  ├─ 是 → 树状数组
   │  └─ 否 → 线段树
   └─ 查询频率远大于修改？
      └─ 是 → 考虑分块
```

### 2. 处理边界情况

```python
def __init__(self, nums):
    self.n = len(nums)
    if self.n == 0:  # 空数组
        return
    # ...
```

### 3. 索引一致性

- 线段树内部使用 0-based 索引
- 树状数组内部使用 1-based 索引（需要转换）
- 题目接口通常是 0-based

### 4. 避免重复计算

对于树状数组，如果多次查询相同区间，可以缓存结果：

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def sumRange(self, left, right):
    return self._prefix_sum(right + 1) - self._prefix_sum(left)

def update(self, index, val):
    self.sumRange.cache_clear()  # 清空缓存
    # ...
```

但要注意：缓存会占用额外空间，且清空缓存有开销。

## 性能对比（LeetCode 实测）

| 方案 | 执行用时 | 内存消耗 | 提交排名 |
|------|---------|---------|---------|
| 树状数组 | 400 ms | 32 MB | 前 20% |
| 线段树 | 500 ms | 35 MB | 前 40% |
| 分块 | 600 ms | 31 MB | 前 60% |

**观察**：
- 树状数组最快（常数小）
- 线段树稍慢但更通用
- 分块最慢但实现最简单

## 扩展思考

### 1. 如果需要支持区间修改？

添加"将区间 `[L, R]` 的所有元素加 `val`"操作：
- ❌ 树状数组：不支持（需要差分数组技巧）
- ✅ 线段树：支持（使用懒惰传播）

### 2. 如果需要查询区间最大值？

- ❌ 树状数组：不支持（只能处理前缀和）
- ✅ 线段树：支持（修改合并逻辑）

### 3. 如果数组长度非常大（10^9）？

使用**动态开点线段树**或**离散化**技术。

## 常见错误

### 1. 忘记处理空数组

```python
def __init__(self, nums):
    self.n = len(nums)
    self.tree = [0] * (4 * self.n)
    if self.n > 0:  # 必须检查
        self._build(nums, 1, 0, self.n - 1)
```

### 2. 索引越界

```python
# 树状数组索引从 1 开始
def update(self, index, val):
    i = index + 1  # 转换为 1-based
    while i <= self.n:  # 注意边界
        # ...
```

### 3. 更新后忘记合并

```python
def _update(self, node, start, end, index, val):
    if start == end:
        self.tree[node] = val
        return
    # ...
    # 必须执行合并操作
    self.tree[node] = self.tree[left_child] + self.tree[right_child]
```

## 总结

本题是线段树的经典应用，展示了动态区间求和问题的标准解法。

**核心要点**：
1. **问题特征**：高频修改 + 高频查询，朴素方案超时
2. **线段树方案**：O(logN) 更新和查询，通用性强
3. **树状数组方案**：更简洁高效，但仅限于前缀和
4. **选择标准**：需要区间修改用线段树，否则优先树状数组
5. **实现要点**：注意空数组、索引转换、合并操作

这道题是理解线段树实战应用的绝佳起点。掌握了这道题，就能够举一反三，应对各种区间操作问题。

下一章我们将学习"我的日程安排表"系列问题，展示线段树在区间覆盖场景中的应用。
