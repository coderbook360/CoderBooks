# K 个最近的点

本章是平衡树与有序集合部分的最后一章。我们将通过"K 个最近的点"这道经典问题，对比多种解法——堆、快速选择、有序集合，帮助你在不同场景下做出最佳选择。

## 问题描述

**LeetCode 973. K 个最近的点 (K Closest Points to Origin)**

给定一个点数组 `points`，其中 `points[i] = [xi, yi]` 表示平面上的一个点。返回距离原点 `(0, 0)` 最近的 `k` 个点。

距离按欧几里得距离计算，即 `sqrt(x² + y²)`。

可以按**任意顺序**返回答案。

**示例**：
```
输入: points = [[1,3], [-2,2]], k = 1
输出: [[-2,2]]
解释: 
(1, 3) 到原点距离 = sqrt(10)
(-2, 2) 到原点距离 = sqrt(8)
(-2, 2) 更近
```

**提示**：
- 1 <= k <= points.length <= 10^4
- -10^4 <= xi, yi <= 10^4

## 解法概览

这道题有多种解法，各有优劣：

| 解法 | 时间复杂度 | 空间复杂度 | 稳定性 | 适用场景 |
|------|-----------|-----------|--------|---------|
| 排序 | O(n log n) | O(n) | 简单可靠 | n 较小或面试 |
| 最大堆 | O(n log k) | O(k) | 稳定 | k << n |
| 快速选择 | O(n) 期望 | O(1) | 不稳定 | 追求最优性能 |
| 有序集合 | O(n log k) | O(k) | 稳定 | 流式处理 |

## 解法一：排序

最直接的方法：按距离排序，取前 k 个。

```python
class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        # 按距离排序
        points.sort(key=lambda p: p[0] ** 2 + p[1] ** 2)
        return points[:k]
```

**注意**：不需要开方，因为比较大小时平方和开方是等价的。

**时间复杂度**：O(n log n)
**空间复杂度**：O(n)（排序的额外空间）或 O(1)（原地排序）

## 解法二：最大堆

如果 k 远小于 n，我们可以维护一个大小为 k 的**最大堆**。

思路：
1. 遍历所有点
2. 如果堆大小 < k，直接加入
3. 如果堆大小 = k 且当前点更近，弹出堆顶，加入当前点

```python
import heapq

class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        # 最大堆（用负距离模拟）
        heap = []
        
        for x, y in points:
            dist = -(x ** 2 + y ** 2)  # 负数实现最大堆
            
            if len(heap) < k:
                heapq.heappush(heap, (dist, x, y))
            elif dist > heap[0][0]:
                # 当前点更近（负距离更大）
                heapq.heapreplace(heap, (dist, x, y))
        
        return [[x, y] for _, x, y in heap]
```

**时间复杂度**：O(n log k)
**空间复杂度**：O(k)

**为什么用最大堆而不是最小堆？**

我们需要快速找到当前 k 个点中"最远的"那个，判断是否需要替换。最大堆的堆顶就是最远的点。

## 解法三：快速选择（Quick Select）

快速选择是快速排序的变体，可以在期望 O(n) 时间内找到第 k 小的元素。

```python
import random

class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        def distance(p):
            return p[0] ** 2 + p[1] ** 2
        
        def partition(left, right, pivot_idx):
            pivot_dist = distance(points[pivot_idx])
            
            # 将 pivot 移到末尾
            points[pivot_idx], points[right] = points[right], points[pivot_idx]
            
            store_idx = left
            for i in range(left, right):
                if distance(points[i]) < pivot_dist:
                    points[i], points[store_idx] = points[store_idx], points[i]
                    store_idx += 1
            
            # 将 pivot 放到最终位置
            points[store_idx], points[right] = points[right], points[store_idx]
            return store_idx
        
        def quick_select(left, right, k):
            if left == right:
                return
            
            pivot_idx = random.randint(left, right)
            pivot_idx = partition(left, right, pivot_idx)
            
            if pivot_idx == k:
                return
            elif pivot_idx < k:
                quick_select(pivot_idx + 1, right, k)
            else:
                quick_select(left, pivot_idx - 1, k)
        
        quick_select(0, len(points) - 1, k)
        return points[:k]
```

**时间复杂度**：O(n) 期望，O(n²) 最坏
**空间复杂度**：O(1)（原地操作）

## 解法四：有序集合

使用有序集合维护最近的 k 个点：

```python
from sortedcontainers import SortedList

class Solution:
    def kClosest(self, points: list[list[int]], k: int) -> list[list[int]]:
        # (distance, x, y)
        closest = SortedList()
        
        for x, y in points:
            dist = x ** 2 + y ** 2
            
            if len(closest) < k:
                closest.add((dist, x, y))
            elif dist < closest[-1][0]:
                closest.pop()  # 移除最远的
                closest.add((dist, x, y))
        
        return [[x, y] for _, x, y in closest]
```

**时间复杂度**：O(n log k)
**空间复杂度**：O(k)

## 解法对比与选择

### 什么时候用排序？

- 代码简洁最重要
- n 不是特别大
- 面试时作为保底方案

### 什么时候用堆？

- k 远小于 n
- 需要流式处理（数据逐个到来）
- 内存受限

### 什么时候用快速选择？

- 追求最优平均性能
- 可以接受最坏情况的风险
- 数据可以原地修改

### 什么时候用有序集合？

- 需要流式处理
- 需要同时支持插入和删除
- 代码可读性优先

## 流式处理场景

在流式处理中，数据逐个到来，我们需要随时报告当前的 top-k：

```python
class KClosestStream:
    def __init__(self, k: int):
        self.k = k
        self.heap = []  # 最大堆
    
    def add(self, x: int, y: int) -> list[list[int]]:
        dist = -(x ** 2 + y ** 2)
        
        if len(self.heap) < self.k:
            heapq.heappush(self.heap, (dist, x, y))
        elif dist > self.heap[0][0]:
            heapq.heapreplace(self.heap, (dist, x, y))
        
        return [[px, py] for _, px, py in self.heap]
```

## 边界情况

### k = n

所有点都要返回，直接返回原数组：

```python
if k >= len(points):
    return points
```

### 距离相等

如果多个点距离相同，题目允许返回任意 k 个。大多数解法自然处理这种情况。

### 坐标很大

`x² + y²` 可能很大，但在 Python 中不会溢出。在其他语言中可能需要 `long`。

## 常见错误

### 错误一：开方导致精度问题

```python
# 不推荐：浮点数比较有精度问题
dist = (x ** 2 + y ** 2) ** 0.5

# 推荐：直接比较平方和
dist = x ** 2 + y ** 2
```

### 错误二：最大堆方向错误

```python
# 错误：这是最小堆
heapq.heappush(heap, (dist, x, y))

# 正确：用负数实现最大堆
heapq.heappush(heap, (-dist, x, y))
```

### 错误三：快速选择没有随机化

```python
# 有风险：固定选择第一个可能导致 O(n²)
pivot_idx = left

# 更好：随机选择
pivot_idx = random.randint(left, right)
```

## 扩展问题

### 变体一：K 个最远的点

只需将比较方向反转：

```python
# 最小堆维护最远的 k 个
if len(heap) < k:
    heapq.heappush(heap, (dist, x, y))
elif dist > heap[0][0]:  # 当前点更远
    heapq.heapreplace(heap, (dist, x, y))
```

### 变体二：距离某个特定点最近

```python
def kClosest(self, points, k, target):
    tx, ty = target
    
    def distance(p):
        return (p[0] - tx) ** 2 + (p[1] - ty) ** 2
    
    # 其他逻辑相同
```

### 变体三：三维空间

```python
def distance(p):
    return p[0] ** 2 + p[1] ** 2 + p[2] ** 2
```

## 本章小结

K 个最近的点展示了多种解法的权衡。

**核心要点**：

1. **排序**：最简单，O(n log n)
2. **最大堆**：维护大小为 k 的堆，O(n log k)
3. **快速选择**：期望 O(n)，但有最坏情况风险
4. **有序集合**：适合流式处理

**选择建议**：
- 面试时首选堆或排序（代码简洁、容易解释）
- 追求性能选快速选择
- 流式处理选堆或有序集合

---

至此，平衡树与有序集合部分的十个章节全部完成。我们从平衡树的原理出发，探索了有序集合在各种问题中的应用——中位数、滑动窗口、范围查询、贪心、最值维护等。希望你已经掌握了何时以及如何使用这些强大的数据结构。

下一部分，我们将进入**分块与莫队算法**的世界，探索另一种处理区间查询的优雅技术。
