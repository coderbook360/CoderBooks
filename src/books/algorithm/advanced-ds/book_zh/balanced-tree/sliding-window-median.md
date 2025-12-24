# 滑动窗口中位数

上一章我们解决了数据流的中位数问题，只需要支持插入和查询。本章的难度更上一层——**滑动窗口中位数**。核心挑战在于：窗口滑动时，需要同时支持**插入新元素**和**删除旧元素**。

## 问题描述

**LeetCode 480. 滑动窗口中位数 (Sliding Window Median)**

给你一个数组 `nums`，有一个大小为 `k` 的滑动窗口从数组的最左侧移动到最右侧。你只可以看到在滑动窗口内的 `k` 个数字。滑动窗口每次只向右移动一位。

返回每个窗口的中位数组成的数组。

**示例**：
```
输入: nums = [1,3,-1,-3,5,3,6,7], k = 3
输出: [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]
解释: 
窗口位置                     中位数
---------------              -----
[1  3  -1] -3  5  3  6  7      1
 1 [3  -1  -3] 5  3  6  7     -1
 1  3 [-1  -3  5] 3  6  7     -1
 1  3  -1 [-3  5  3] 6  7      3
 1  3  -1  -3 [5  3  6] 7      5
 1  3  -1  -3  5 [3  6  7]     6
```

**提示**：
- 1 <= k <= nums.length <= 10^5
- -2^31 <= nums[i] <= 2^31 - 1

## 解法一：有序集合（推荐）

### 核心思想

有序集合天然支持 O(log n) 的插入、删除和索引访问，完美契合这道题的需求。

```python
from sortedcontainers import SortedList

class Solution:
    def medianSlidingWindow(self, nums: list[int], k: int) -> list[float]:
        window = SortedList()
        result = []
        
        for i, x in enumerate(nums):
            # 加入新元素
            window.add(x)
            
            # 移除窗口外的元素
            if i >= k:
                window.remove(nums[i - k])
            
            # 窗口满了，计算中位数
            if i >= k - 1:
                if k % 2 == 1:
                    median = float(window[k // 2])
                else:
                    median = (window[k // 2 - 1] + window[k // 2]) / 2
                result.append(median)
        
        return result
```

### 执行过程

以 `nums = [1, 3, -1, -3, 5], k = 3` 为例：

| i | 操作 | window | 中位数 |
|---|------|--------|--------|
| 0 | add(1) | [1] | - |
| 1 | add(3) | [1, 3] | - |
| 2 | add(-1) | [-1, 1, 3] | 1 |
| 3 | add(-3), remove(1) | [-3, -1, 3] | -1 |
| 4 | add(5), remove(3) | [-3, -1, 5] | -1 |

**时间复杂度**：O(n log k)
- 每个元素插入和删除各一次，每次 O(log k)

**空间复杂度**：O(k)

## 解法二：双堆 + 懒惰删除

如果不使用第三方库，可以用双堆法，但需要处理删除问题。

### 懒惰删除的思想

直接从堆中删除元素是 O(n) 的。我们采用**懒惰删除**：
1. 不真正删除元素，只是标记它"已删除"
2. 当堆顶是已删除的元素时，才真正移除

```python
import heapq
from collections import defaultdict

class Solution:
    def medianSlidingWindow(self, nums: list[int], k: int) -> list[float]:
        # max_heap: 较小的一半（用负数模拟）
        # min_heap: 较大的一半
        max_heap = []
        min_heap = []
        
        # delayed: 记录每个值被延迟删除的次数
        delayed = defaultdict(int)
        
        # max_size, min_size: 有效元素的数量（不含已删除的）
        max_size = 0
        min_size = 0
        
        def prune(heap, is_max_heap):
            """移除堆顶的已删除元素"""
            while heap:
                val = -heap[0] if is_max_heap else heap[0]
                if delayed[val] > 0:
                    delayed[val] -= 1
                    heapq.heappop(heap)
                else:
                    break
        
        def rebalance():
            """确保 max_size == min_size 或 max_size == min_size + 1"""
            nonlocal max_size, min_size
            
            if max_size > min_size + 1:
                # 从 max_heap 移到 min_heap
                val = -heapq.heappop(max_heap)
                heapq.heappush(min_heap, val)
                max_size -= 1
                min_size += 1
                prune(max_heap, True)
            elif min_size > max_size:
                # 从 min_heap 移到 max_heap
                val = heapq.heappop(min_heap)
                heapq.heappush(max_heap, -val)
                min_size -= 1
                max_size += 1
                prune(min_heap, False)
        
        def add(num):
            nonlocal max_size, min_size
            
            if not max_heap or num <= -max_heap[0]:
                heapq.heappush(max_heap, -num)
                max_size += 1
            else:
                heapq.heappush(min_heap, num)
                min_size += 1
            
            rebalance()
        
        def remove(num):
            nonlocal max_size, min_size
            
            delayed[num] += 1
            
            if num <= -max_heap[0]:
                max_size -= 1
                prune(max_heap, True)
            else:
                min_size -= 1
                prune(min_heap, False)
            
            rebalance()
        
        def get_median():
            if k % 2 == 1:
                return float(-max_heap[0])
            else:
                return (-max_heap[0] + min_heap[0]) / 2
        
        result = []
        
        for i in range(len(nums)):
            add(nums[i])
            
            if i >= k:
                remove(nums[i - k])
            
            if i >= k - 1:
                result.append(get_median())
        
        return result
```

### 懒惰删除的关键点

1. **delayed 计数器**：记录每个值被标记删除的次数
2. **prune 函数**：在访问堆顶时，移除已删除的元素
3. **有效大小**：`max_size` 和 `min_size` 追踪真实的元素数量

**时间复杂度**：O(n log k)
- 虽然删除是 O(1)，但 prune 操作总计是 O(n log k)

**空间复杂度**：O(n)（最坏情况下所有元素都在延迟删除表中）

## 解法对比

| 维度 | 有序集合 | 双堆 + 懒惰删除 |
|------|---------|----------------|
| 代码复杂度 | 简洁 | 复杂 |
| 时间复杂度 | O(n log k) | O(n log k) |
| 空间复杂度 | O(k) | O(n) |
| 依赖 | sortedcontainers | 仅标准库 |
| 适用场景 | LeetCode | 面试手写 |

**推荐**：如果可以用第三方库，优先选择有序集合；面试时如果要求手写，使用双堆 + 懒惰删除。

## 边界情况处理

### 整数溢出

中位数计算涉及两个整数相加：

```python
# 可能溢出（在非 Python 语言中）
median = (window[k // 2 - 1] + window[k // 2]) / 2

# 安全写法
median = window[k // 2 - 1] / 2 + window[k // 2] / 2
```

### 重复元素

`SortedList` 允许重复元素，`remove` 只移除一个实例，这正是我们需要的行为。

```python
window = SortedList([1, 1, 2])
window.remove(1)  # 移除一个 1
print(list(window))  # [1, 2]
```

### k = 1

当 k = 1 时，每个元素自己就是中位数：

```python
if k == 1:
    return [float(x) for x in nums]
```

## 性能优化

### 避免重复计算中位数位置

```python
# 预计算中位数位置
mid = k // 2
is_odd = k % 2 == 1

for i in range(len(nums)):
    # ...
    if is_odd:
        median = float(window[mid])
    else:
        median = (window[mid - 1] + window[mid]) / 2
```

### 使用元组处理重复元素（可选）

如果担心重复元素导致的歧义，可以用 `(value, index)` 元组：

```python
window = SortedList()

for i, x in enumerate(nums):
    window.add((x, i))
    
    if i >= k:
        window.remove((nums[i - k], i - k))
    
    if i >= k - 1:
        if k % 2 == 1:
            median = window[k // 2][0]
        else:
            median = (window[k // 2 - 1][0] + window[k // 2][0]) / 2
```

## 常见错误

### 错误一：错误的中位数索引

```python
# 错误：k=3 时中位数是 window[1]，不是 window[2]
median = window[k // 2]  # k=3 时返回 window[1]，正确！

# 但 k=4 时：
# 中位数 = (window[1] + window[2]) / 2
# 不是 (window[2] + window[3]) / 2
```

### 错误二：忘记转换为 float

```python
# 错误：整数除法
median = (window[k // 2 - 1] + window[k // 2]) // 2

# 正确：浮点除法
median = (window[k // 2 - 1] + window[k // 2]) / 2
```

### 错误三：懒惰删除后忘记 rebalance

```python
# 错误：只删除不平衡
def remove(num):
    delayed[num] += 1
    if num <= -max_heap[0]:
        max_size -= 1
    else:
        min_size -= 1
    # 忘记调用 rebalance()
```

## 扩展：滑动窗口第 K 大

如果改成求滑动窗口的第 K 大元素，有序集合的优势更加明显：

```python
def slidingWindowKth(nums: list[int], window_size: int, k: int) -> list[int]:
    from sortedcontainers import SortedList
    
    window = SortedList()
    result = []
    
    for i, x in enumerate(nums):
        window.add(x)
        
        if i >= window_size:
            window.remove(nums[i - window_size])
        
        if i >= window_size - 1:
            # 第 k 大就是倒数第 k 个
            result.append(window[-k])
    
    return result
```

## 本章小结

滑动窗口中位数展示了有序集合在需要删除操作时的强大能力。

**核心要点**：

1. **有序集合解法**：代码简洁，O(n log k) 时间复杂度
2. **双堆 + 懒惰删除**：不依赖第三方库，但实现复杂
3. **懒惰删除技巧**：不直接删除，而是在访问时检查并移除
4. **整数溢出**：两数相加时注意溢出问题

**选择建议**：
- 实际编程：使用 `SortedList`
- 面试手写：掌握懒惰删除技巧
- 理解本质：两种方法的时间复杂度相同，差别在于实现难度

下一章我们将探索另一个经典的有序集合应用——存在重复元素 III。
