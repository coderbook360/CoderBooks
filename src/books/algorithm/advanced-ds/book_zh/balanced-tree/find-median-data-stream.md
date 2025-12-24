# 数据流的中位数

本章我们来解决一道经典的数据结构设计题——**数据流的中位数**。这道题是理解"动态维护排序结构"的绝佳案例，我们将对比多种解法，深入理解它们的权衡。

## 问题描述

**LeetCode 295. 数据流的中位数 (Find Median from Data Stream)**

设计一个支持以下两种操作的数据结构：
- `addNum(int num)`：从数据流中添加一个整数到数据结构中
- `findMedian()`：返回目前所有元素的中位数

中位数是有序列表中间的数。如果列表长度是偶数，中位数是中间两个数的平均值。

**示例**：
```
addNum(1)
addNum(2)
findMedian() -> 1.5
addNum(3) 
findMedian() -> 2
```

**进阶**：
- 如果数据流中所有整数都在 0 到 100 范围内，你将如何优化你的算法？
- 如果数据流中 99% 的整数都在 0 到 100 范围内，你将如何优化你的算法？

## 思路分析

### 朴素解法

最直接的想法：维护一个有序数组，每次插入后二分查找位置，然后插入。

```python
class MedianFinder:
    def __init__(self):
        self.nums = []
    
    def addNum(self, num: int) -> None:
        import bisect
        bisect.insort(self.nums, num)  # O(n) 插入
    
    def findMedian(self) -> float:
        n = len(self.nums)
        if n % 2 == 1:
            return self.nums[n // 2]
        else:
            return (self.nums[n // 2 - 1] + self.nums[n // 2]) / 2
```

时间复杂度：`addNum` O(n)，`findMedian` O(1)。

对于大量插入操作，这个方案太慢了。

## 解法一：双堆法

### 核心思想

中位数将数据分成两半：较小的一半和较大的一半。如果我们能分别维护这两半，那么中位数就唾手可得。

- **最大堆**（max heap）：存储较小的一半，堆顶是这一半的最大值
- **最小堆**（min heap）：存储较大的一半，堆顶是这一半的最小值

中位数就是：
- 如果两堆大小相等：两个堆顶的平均值
- 如果最大堆多一个：最大堆的堆顶

### 平衡策略

为了保证两堆大小平衡（差不超过 1），我们规定：
- 最大堆的大小 >= 最小堆的大小
- 最大堆的大小 - 最小堆的大小 <= 1

插入时：
1. 先将新元素加入最大堆
2. 将最大堆堆顶移到最小堆（保证有序性）
3. 如果最小堆比最大堆大，将最小堆堆顶移回最大堆（保证平衡）

### 实现

```python
import heapq

class MedianFinder:
    def __init__(self):
        # 最大堆（Python 没有原生最大堆，用负数模拟）
        self.max_heap = []  # 较小的一半
        # 最小堆
        self.min_heap = []  # 较大的一半
    
    def addNum(self, num: int) -> None:
        # 1. 先加入最大堆
        heapq.heappush(self.max_heap, -num)
        
        # 2. 将最大堆堆顶移到最小堆（保证有序性）
        max_val = -heapq.heappop(self.max_heap)
        heapq.heappush(self.min_heap, max_val)
        
        # 3. 如果最小堆比最大堆大，移回一个（保证平衡）
        if len(self.min_heap) > len(self.max_heap):
            min_val = heapq.heappop(self.min_heap)
            heapq.heappush(self.max_heap, -min_val)
    
    def findMedian(self) -> float:
        if len(self.max_heap) > len(self.min_heap):
            return -self.max_heap[0]
        else:
            return (-self.max_heap[0] + self.min_heap[0]) / 2
```

### 执行过程演示

添加序列 `[1, 2, 3, 4, 5]`：

| 操作 | max_heap | min_heap | 中位数 |
|------|----------|----------|--------|
| add(1) | [-1] | [] | 1 |
| add(2) | [-1] | [2] | 1.5 |
| add(3) | [-2, -1] | [3] | 2 |
| add(4) | [-2, -1] | [3, 4] | 2.5 |
| add(5) | [-3, -1, -2] | [4, 5] | 3 |

**复杂度分析**：
- `addNum`：O(log n)
- `findMedian`：O(1)

## 解法二：有序集合

使用有序集合（如 `SortedList`），直接维护有序结构：

```python
from sortedcontainers import SortedList

class MedianFinder:
    def __init__(self):
        self.nums = SortedList()
    
    def addNum(self, num: int) -> None:
        self.nums.add(num)  # O(log n)
    
    def findMedian(self) -> float:
        n = len(self.nums)
        if n % 2 == 1:
            return self.nums[n // 2]
        else:
            return (self.nums[n // 2 - 1] + self.nums[n // 2]) / 2
```

**复杂度分析**：
- `addNum`：O(log n)
- `findMedian`：O(1)（SortedList 支持 O(1) 索引访问）

### 对比双堆法

| 维度 | 双堆法 | 有序集合 |
|------|--------|---------|
| 代码量 | 较多 | 简洁 |
| 标准库支持 | 原生 heapq | 需要 sortedcontainers |
| 删除任意元素 | 困难 | O(log n) |
| 实际性能 | 常数因子小 | 常数因子较大 |

在这道题中，两种方法效率相当。但如果需要支持删除操作（如"滑动窗口中位数"），有序集合更有优势。

## 解法三：平衡二叉搜索树

如果面试要求手写，可以使用 Treap 或其他平衡树：

```python
# 伪代码
class MedianFinder:
    def __init__(self):
        self.tree = Treap()  # 支持 O(1) 查询大小和 O(log n) 查询第 k 小
    
    def addNum(self, num: int) -> None:
        self.tree.insert(num)
    
    def findMedian(self) -> float:
        n = self.tree.size()
        if n % 2 == 1:
            return self.tree.kth_element(n // 2 + 1)
        else:
            return (self.tree.kth_element(n // 2) + 
                    self.tree.kth_element(n // 2 + 1)) / 2
```

这种方法的优势是完全自主可控，但实现复杂度高。

## 进阶问题解答

### 数据范围 [0, 100]

如果所有整数都在 0 到 100 范围内，可以使用**计数排序**的思想：

```python
class MedianFinder:
    def __init__(self):
        self.count = [0] * 101  # count[i] = 值为 i 的元素个数
        self.total = 0
    
    def addNum(self, num: int) -> None:
        self.count[num] += 1
        self.total += 1
    
    def findMedian(self) -> float:
        # 找第 total//2 和 total//2 + 1 小的元素
        if self.total % 2 == 1:
            target = self.total // 2 + 1
            return self._find_kth(target)
        else:
            left = self._find_kth(self.total // 2)
            right = self._find_kth(self.total // 2 + 1)
            return (left + right) / 2
    
    def _find_kth(self, k: int) -> int:
        """找第 k 小的元素"""
        cumsum = 0
        for i in range(101):
            cumsum += self.count[i]
            if cumsum >= k:
                return i
        return 100
```

**复杂度**：
- `addNum`：O(1)
- `findMedian`：O(101) = O(1)

### 99% 数据在 [0, 100]

对于这种情况，可以结合两种方法：

```python
class MedianFinder:
    def __init__(self):
        self.count = [0] * 101        # [0, 100] 的计数
        self.below = SortedList()     # < 0 的数
        self.above = SortedList()     # > 100 的数
        self.total = 0
    
    def addNum(self, num: int) -> None:
        if 0 <= num <= 100:
            self.count[num] += 1
        elif num < 0:
            self.below.add(num)
        else:
            self.above.add(num)
        self.total += 1
    
    def findMedian(self) -> float:
        # 实现略，需要综合考虑三个部分
        pass
```

这样，99% 的插入是 O(1)，只有 1% 是 O(log n)。

## 常见错误

### 错误一：堆的平衡逻辑错误

```python
# 错误：直接比较大小决定加入哪个堆
if num < -self.max_heap[0]:
    heapq.heappush(self.max_heap, -num)
else:
    heapq.heappush(self.min_heap, num)
# 这可能导致严重的不平衡
```

**正确做法**：按固定流程先加入再平衡。

### 错误二：空堆时访问堆顶

```python
# 错误：没有检查堆是否为空
return (-self.max_heap[0] + self.min_heap[0]) / 2
```

**正确做法**：根据两堆大小判断返回哪个值。

### 错误三：Python 最大堆的处理

```python
# 错误：忘记取负
heapq.heappush(self.max_heap, num)  # 应该是 -num
return self.max_heap[0]              # 应该是 -self.max_heap[0]
```

## 扩展：支持删除的中位数

如果需要支持删除操作，双堆法会变得复杂（需要懒惰删除）。有序集合则天然支持：

```python
from sortedcontainers import SortedList

class MedianFinder:
    def __init__(self):
        self.nums = SortedList()
    
    def addNum(self, num: int) -> None:
        self.nums.add(num)
    
    def removeNum(self, num: int) -> None:
        self.nums.remove(num)  # O(log n)
    
    def findMedian(self) -> float:
        n = len(self.nums)
        if n % 2 == 1:
            return self.nums[n // 2]
        else:
            return (self.nums[n // 2 - 1] + self.nums[n // 2]) / 2
```

下一章"滑动窗口中位数"就需要这种删除能力。

## 本章小结

数据流的中位数是理解动态排序结构的经典问题。

**核心要点**：

1. **双堆法**：将数据分成较小和较大两半，用最大堆和最小堆分别维护
2. **平衡策略**：每次插入后确保两堆大小差不超过 1
3. **有序集合**：代码更简洁，支持删除操作
4. **针对特定数据范围优化**：计数排序可以达到 O(1) 复杂度

**解法选择**：
- 只需插入和查询：双堆法或有序集合
- 需要删除：有序集合
- 数据范围有限：计数排序

下一章我们将处理更复杂的场景——滑动窗口中位数，那里需要高效的删除操作。
