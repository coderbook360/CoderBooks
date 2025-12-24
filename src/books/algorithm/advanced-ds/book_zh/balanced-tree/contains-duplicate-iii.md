# 存在重复元素 III

本章我们来解决一道结合了滑动窗口和范围查询的经典问题——**存在重复元素 III**。这道题完美展示了有序集合在"最近邻搜索"中的应用。

## 问题描述

**LeetCode 220. 存在重复元素 III (Contains Duplicate III)**

给你一个整数数组 `nums` 和两个整数 `indexDiff` 和 `valueDiff`。

找出是否存在两个不同的索引 `i` 和 `j`，满足：
- `abs(i - j) <= indexDiff`
- `abs(nums[i] - nums[j]) <= valueDiff`

如果存在，返回 `true`；否则，返回 `false`。

**示例 1**：
```
输入: nums = [1,2,3,1], indexDiff = 3, valueDiff = 0
输出: true
解释: i = 0, j = 3，满足条件
```

**示例 2**：
```
输入: nums = [1,5,9,1,5,9], indexDiff = 2, valueDiff = 3
输出: false
```

**提示**：
- 2 <= nums.length <= 10^5
- -10^9 <= nums[i] <= 10^9
- 1 <= indexDiff <= nums.length
- 0 <= valueDiff <= 10^9

## 思路分析

### 核心问题转换

条件 `abs(i - j) <= indexDiff` 意味着我们只需关注一个**大小为 indexDiff 的滑动窗口**。

条件 `abs(nums[i] - nums[j]) <= valueDiff` 意味着对于当前元素 `nums[i]`，我们需要在窗口中查找是否存在元素落在 `[nums[i] - valueDiff, nums[i] + valueDiff]` 范围内。

这就是一个**范围查询**问题：在动态变化的窗口中，快速判断是否存在某个范围内的元素。

### 为什么有序集合是最佳选择？

我们需要的操作：
1. **插入**：新元素进入窗口
2. **删除**：旧元素离开窗口
3. **范围查询**：查找是否存在满足条件的元素

有序集合完美支持以上所有操作，每个操作 O(log n)。

## 解法一：有序集合

```python
from sortedcontainers import SortedList

class Solution:
    def containsNearbyAlmostDuplicate(self, nums: list[int], indexDiff: int, valueDiff: int) -> bool:
        window = SortedList()
        
        for i, x in enumerate(nums):
            # 查找是否存在满足条件的元素
            # 需要找 >= x - valueDiff 的最小元素
            idx = window.bisect_left(x - valueDiff)
            
            # 如果找到了，检查它是否 <= x + valueDiff
            if idx < len(window) and window[idx] <= x + valueDiff:
                return True
            
            # 加入当前元素
            window.add(x)
            
            # 维护窗口大小
            if i >= indexDiff:
                window.remove(nums[i - indexDiff])
        
        return False
```

### 执行过程演示

以 `nums = [1, 5, 9, 1, 5, 9], indexDiff = 2, valueDiff = 3` 为例：

| i | x | 查询范围 | window | 找到? |
|---|---|---------|--------|-------|
| 0 | 1 | [-2, 4] | [] | No |
| 1 | 5 | [2, 8] | [1] | No (1 < 2) |
| 2 | 9 | [6, 12] | [1, 5] | No (5 < 6) |
| 3 | 1 | [-2, 4] | [5, 9] | No (5 > 4) |
| 4 | 5 | [2, 8] | [1, 9] | No |
| 5 | 9 | [6, 12] | [1, 5] | No |

最终返回 `false`。

**时间复杂度**：O(n log k)，k = indexDiff
**空间复杂度**：O(k)

## 解法二：桶排序思想

这道题还有一个精妙的 O(n) 解法，利用**桶**的思想。

### 核心观察

如果两个数的差不超过 `valueDiff`，那么将数除以 `(valueDiff + 1)` 后：
- 要么在同一个桶内
- 要么在相邻桶内

例如，`valueDiff = 3`，桶大小 = 4：
- 0-3 在桶 0
- 4-7 在桶 1
- 8-11 在桶 2

如果两个数在同一个桶，差值最大是 3，满足条件。
如果在相邻桶，需要额外检查差值。

### 实现

```python
class Solution:
    def containsNearbyAlmostDuplicate(self, nums: list[int], indexDiff: int, valueDiff: int) -> bool:
        if valueDiff < 0:
            return False
        
        buckets = {}
        bucket_size = valueDiff + 1
        
        def get_bucket_id(x):
            # 处理负数：需要偏移
            return x // bucket_size
        
        for i, x in enumerate(nums):
            bucket_id = get_bucket_id(x)
            
            # 检查同一个桶
            if bucket_id in buckets:
                return True
            
            # 检查相邻桶
            if bucket_id - 1 in buckets and abs(x - buckets[bucket_id - 1]) <= valueDiff:
                return True
            if bucket_id + 1 in buckets and abs(x - buckets[bucket_id + 1]) <= valueDiff:
                return True
            
            # 加入当前元素
            buckets[bucket_id] = x
            
            # 维护窗口大小
            if i >= indexDiff:
                old_bucket_id = get_bucket_id(nums[i - indexDiff])
                del buckets[old_bucket_id]
        
        return False
```

### 为什么每个桶只有一个元素？

如果同一个桶已经有元素，说明找到了满足条件的对，直接返回 `true`。

所以在算法运行过程中，每个桶最多只有一个元素。

**时间复杂度**：O(n)
**空间复杂度**：O(k)

## 解法对比

| 维度 | 有序集合 | 桶排序 |
|------|---------|--------|
| 时间复杂度 | O(n log k) | O(n) |
| 空间复杂度 | O(k) | O(k) |
| 实现难度 | 简单 | 中等 |
| 边界处理 | 自动 | 需要注意负数 |

虽然桶排序理论上更快，但在实际 LeetCode 提交中，两种方法的运行时间差异不大，因为 log k 的常数因子很小。

## 边界情况

### valueDiff = 0

当 `valueDiff = 0` 时，问题简化为：是否存在窗口内的重复元素。

```python
# 可以用 set 优化
if valueDiff == 0:
    window = set()
    for i, x in enumerate(nums):
        if x in window:
            return True
        window.add(x)
        if i >= indexDiff:
            window.remove(nums[i - indexDiff])
    return False
```

### 负数处理

桶排序中，Python 的整数除法对负数的处理需要注意：

```python
>>> -1 // 4
-1  # 在 Python 中
>>> -5 // 4
-2  # 在 Python 中

# 这正好满足我们的需求：
# -1 到 -4 在桶 -1
# -5 到 -8 在桶 -2
```

Python 的地板除法在这里恰好正确。但在 C++/Java 中需要特殊处理。

### 整数溢出

在某些语言中，`x - valueDiff` 或 `x + valueDiff` 可能溢出。Python 不存在这个问题。

## 常见错误

### 错误一：窗口大小判断

```python
# 错误：应该是 >= 而不是 >
if i > indexDiff:
    window.remove(nums[i - indexDiff])
```

**正确**：当 `i >= indexDiff` 时，`nums[i - indexDiff]` 已经超出窗口。

### 错误二：bisect 方向错误

```python
# 错误：bisect_right 找的是 > x - valueDiff 的位置
idx = window.bisect_right(x - valueDiff)

# 正确：bisect_left 找的是 >= x - valueDiff 的位置
idx = window.bisect_left(x - valueDiff)
```

### 错误三：先删后查

```python
# 错误：先删除可能导致窗口过小
if i >= indexDiff:
    window.remove(nums[i - indexDiff])

# 然后查询...
```

**正确顺序**：先查询，再加入，最后删除过期元素。

## 变体问题

### 变体一：统计满足条件的数对数量

```python
def countNearbyAlmostDuplicates(nums, indexDiff, valueDiff):
    window = SortedList()
    count = 0
    
    for i, x in enumerate(nums):
        # 统计 [x - valueDiff, x + valueDiff] 范围内的元素个数
        left = window.bisect_left(x - valueDiff)
        right = window.bisect_right(x + valueDiff)
        count += right - left
        
        window.add(x)
        
        if i >= indexDiff:
            window.remove(nums[i - indexDiff])
    
    return count
```

### 变体二：找最小的 valueDiff

给定 `indexDiff`，找使得条件成立的最小 `valueDiff`。

这可以用二分搜索 + 本题的判断函数解决。

## 本章小结

存在重复元素 III 展示了有序集合在"范围最近邻搜索"中的应用。

**核心要点**：

1. **问题转换**：将两个条件转化为滑动窗口 + 范围查询
2. **有序集合解法**：`bisect_left` 找到可能的候选，再验证范围
3. **桶排序解法**：O(n) 时间复杂度，但需要注意边界情况
4. **正确的操作顺序**：先查询，再加入，最后删除

**举一反三**：
- 需要在动态集合中做范围查询 → 有序集合
- 能将问题转化为"离散的桶" → 考虑桶排序
- 需要找"最近的"满足条件的元素 → 二分查找

下一章我们将探索一个不同风格的数据结构设计问题——最大频率栈。
