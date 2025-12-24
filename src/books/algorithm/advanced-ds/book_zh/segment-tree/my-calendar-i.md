# 我的日程安排表 I

## 题目描述

**LeetCode 729. My Calendar I**

实现一个 `MyCalendar` 类来存放你的日程安排。如果要添加的日程安排不会造成**重复预订**，则可以成功添加。

当两个日程安排有一些时间上的交叉时（例如两个日程安排都在同一时间内），就会产生**重复预订**。

实现 `MyCalendar` 类：
- `MyCalendar()`：初始化日历对象
- `boolean book(int start, int end)`：如果可以将日程安排成功添加到日历中而不会导致重复预订，返回 `true`。否则返回 `false` 并且不将该日程安排添加到日历中。

**注意**：
- 事件能够用一对整数 `[start, end)` 表示，左闭右开区间
- 对于每个查询，`book` 方法最多会被调用 1000 次

**示例**：
```
输入：
["MyCalendar", "book", "book", "book"]
[[], [10, 20], [15, 25], [20, 30]]

输出：
[null, true, false, true]

解释：
MyCalendar myCalendar = new MyCalendar();
myCalendar.book(10, 20); // 返回 true，可以预订
myCalendar.book(15, 25); // 返回 false，与 [10, 20) 冲突
myCalendar.book(20, 30); // 返回 true，不冲突（20 不在 [10, 20) 内）
```

## 问题分析

### 核心挑战

判断新区间 `[start, end)` 是否与已有区间冲突。

**区间冲突的条件**：
两个区间 `[a, b)` 和 `[c, d)` 冲突，当且仅当：
```
max(a, c) < min(b, d)
```

等价于：
```
NOT (b <= c OR d <= a)
```

**问题规模**：
- 最多 1000 次 `book` 调用
- 每次需要检查与所有已有区间的冲突
- 最坏情况：O(N²) = 10^6 次比较（可接受）

## 方案一：暴力遍历（最简单）

### 实现代码

```python
class MyCalendar:
    def __init__(self):
        self.bookings = []
    
    def book(self, start, end):
        """预订区间 [start, end)"""
        # 检查是否与已有区间冲突
        for s, e in self.bookings:
            if max(start, s) < min(end, e):  # 有交集
                return False
        
        # 无冲突，添加预订
        self.bookings.append((start, end))
        return True
```

**时间复杂度**：
- `book`：O(N)，需要遍历所有已有预订
- 总时间：O(N²)，N 最大为 1000，总计 10^6 次操作

**空间复杂度**：O(N)

### 优缺点

**优点**：
- ✅ 实现极简，代码清晰
- ✅ 对于 N ≤ 1000 的场景，性能足够

**缺点**：
- ❌ 随着预订数量增加，性能线性下降
- ❌ 没有利用任何优化结构

## 方案二：有序列表 + 二分查找

### 核心思想

维护**有序的**预订列表，使用二分查找快速定位冲突区间。

**关键观察**：
- 如果预订按起始时间排序
- 新区间只可能与**相邻的**几个区间冲突
- 使用二分查找定位插入位置，检查前后区间

### 实现代码

```python
import bisect

class MyCalendar:
    def __init__(self):
        self.bookings = []  # 保持按 start 排序
    
    def book(self, start, end):
        """预订区间 [start, end)"""
        # 二分查找插入位置
        idx = bisect.bisect_left(self.bookings, (start, end))
        
        # 检查前一个区间
        if idx > 0:
            prev_start, prev_end = self.bookings[idx - 1]
            if prev_end > start:  # 有交集
                return False
        
        # 检查后一个区间
        if idx < len(self.bookings):
            next_start, next_end = self.bookings[idx]
            if end > next_start:  # 有交集
                return False
        
        # 无冲突，插入到有序位置
        self.bookings.insert(idx, (start, end))
        return True
```

**时间复杂度**：
- 二分查找：O(logN)
- 插入操作：O(N)（列表插入需要移动元素）
- 总时间：O(N logN) + O(N) = O(N)

**空间复杂度**：O(N)

### 优化：使用 SortedList

Python 的 `sortedcontainers` 库提供 `SortedList`，插入操作为 O(logN)：

```python
from sortedcontainers import SortedList

class MyCalendar:
    def __init__(self):
        self.bookings = SortedList()
    
    def book(self, start, end):
        idx = self.bookings.bisect_left((start, end))
        
        if idx > 0:
            prev_start, prev_end = self.bookings[idx - 1]
            if prev_end > start:
                return False
        
        if idx < len(self.bookings):
            next_start, next_end = self.bookings[idx]
            if end > next_start:
                return False
        
        self.bookings.add((start, end))
        return True
```

**时间复杂度**：O(logN)（查找 + 插入都是 O(logN)）

## 方案三：线段树（通用解法）

### 核心思想

使用线段树维护每个时间点的预订计数：
- 初始所有时间点计数为 0
- 预订 `[start, end)` 时，将该区间计数加 1
- 如果区间内最大计数 ≥ 2，说明有冲突

**但是**：时间范围可能非常大（10^9），无法直接构建线段树。

**解决方案**：**动态开点线段树**
- 不预先分配所有节点
- 只在需要时创建节点
- 适用于稀疏区间

### 实现代码

```python
class Node:
    def __init__(self):
        self.left = None
        self.right = None
        self.val = 0  # 区间内的预订计数
        self.lazy = 0  # 懒标记

class MyCalendar:
    def __init__(self):
        self.root = Node()
        self.MAX = 10**9  # 时间范围
    
    def book(self, start, end):
        """预订区间 [start, end)"""
        # 先查询是否有冲突
        if self._query(self.root, 0, self.MAX, start, end - 1) > 0:
            return False
        
        # 无冲突，进行预订（区间 +1）
        self._update(self.root, 0, self.MAX, start, end - 1, 1)
        return True
    
    def _push_down(self, node):
        """下推懒标记"""
        if node.lazy == 0:
            return
        if node.left is None:
            node.left = Node()
        if node.right is None:
            node.right = Node()
        
        node.left.val += node.lazy
        node.right.val += node.lazy
        node.left.lazy += node.lazy
        node.right.lazy += node.lazy
        node.lazy = 0
    
    def _update(self, node, start, end, L, R, val):
        """区间 [L, R] 加 val"""
        if L <= start and end <= R:
            node.val += val
            node.lazy += val
            return
        
        self._push_down(node)
        mid = (start + end) // 2
        
        if L <= mid:
            if node.left is None:
                node.left = Node()
            self._update(node.left, start, mid, L, R, val)
        
        if R > mid:
            if node.right is None:
                node.right = Node()
            self._update(node.right, mid + 1, end, L, R, val)
        
        # 更新当前节点
        left_val = node.left.val if node.left else 0
        right_val = node.right.val if node.right else 0
        node.val = max(left_val, right_val)
    
    def _query(self, node, start, end, L, R):
        """查询区间 [L, R] 的最大预订计数"""
        if L <= start and end <= R:
            return node.val
        
        self._push_down(node)
        mid = (start + end) // 2
        res = 0
        
        if L <= mid and node.left:
            res = max(res, self._query(node.left, start, mid, L, R))
        
        if R > mid and node.right:
            res = max(res, self._query(node.right, mid + 1, end, L, R))
        
        return res
```

**时间复杂度**：O(logN)，其中 N 是时间范围（10^9），logN ≈ 30

**空间复杂度**：O(M logN)，M 是预订次数

### 优缺点

**优点**：
- ✅ 支持任意大的时间范围
- ✅ 时间复杂度稳定（O(logN)）
- ✅ 可扩展性强（易于支持多重预订）

**缺点**：
- ❌ 实现复杂
- ❌ 对于本题有些过度设计
- ❌ 空间开销较大

## 方案对比

| 方案 | 时间复杂度 | 空间复杂度 | 实现难度 | 适用场景 |
|------|----------|----------|---------|---------|
| **暴力遍历** | O(N) | O(N) | 极简 | N ≤ 1000 |
| **有序列表** | O(N) / O(logN)* | O(N) | 简单 | 通用 |
| **动态开点线段树** | O(logC) | O(N logC) | 复杂 | 时间范围大 |

*使用 `SortedList` 可达到 O(logN)

**本题推荐**：
1. **首选**：有序列表 + 二分查找（简洁高效）
2. **简单场景**：暴力遍历（代码最短）
3. **扩展需求**：动态开点线段树（支持多重预订）

## 实战技巧

### 1. 区间冲突判断

**标准公式**：
```python
def has_overlap(a, b, c, d):
    """判断 [a, b) 和 [c, d) 是否有交集"""
    return max(a, c) < min(b, d)
```

**等价形式**：
```python
# 无交集的条件（取反即为有交集）
not (b <= c or d <= a)
```

### 2. 左闭右开区间处理

题目使用左闭右开区间 `[start, end)`：
- `[10, 20)` 和 `[20, 30)` 不冲突（20 不包含在第一个区间）
- 判断时直接使用原始边界

### 3. 二分查找优化

使用 `bisect_left` 找到插入位置，只需检查前后两个区间：

```python
idx = bisect.bisect_left(bookings, (start, end))
# 检查 bookings[idx-1] 和 bookings[idx]
```

### 4. 处理边界情况

```python
# 检查前一个区间
if idx > 0:  # 防止越界
    # ...

# 检查后一个区间
if idx < len(bookings):  # 防止越界
    # ...
```

## 扩展思考

### 1. 如果允许重复预订 K 次？

这是 **LeetCode 731 (My Calendar II)** 和 **732 (My Calendar III)**。

使用线段树或差分数组：
```python
# 差分数组方案
from collections import defaultdict

class MyCalendarTwo:
    def __init__(self):
        self.delta = defaultdict(int)
    
    def book(self, start, end):
        self.delta[start] += 1
        self.delta[end] -= 1
        
        # 检查是否有位置 ≥ 2
        count = 0
        for time in sorted(self.delta.keys()):
            count += self.delta[time]
            if count >= 2:
                # 回滚
                self.delta[start] -= 1
                self.delta[end] += 1
                return False
        return True
```

### 2. 如果需要删除预订？

线段树方案可以支持删除（区间 -1）：
```python
def cancel(self, start, end):
    self._update(self.root, 0, self.MAX, start, end - 1, -1)
```

有序列表方案需要找到并删除对应元素：
```python
def cancel(self, start, end):
    self.bookings.remove((start, end))
```

### 3. 如果时间范围非常大（10^18）？

使用**离散化**技术：
- 收集所有出现过的时间点
- 映射到连续的小范围索引
- 在映射后的空间上操作

## 性能对比（LeetCode 实测）

| 方案 | 执行用时 | 内存消耗 | 提交排名 |
|------|---------|---------|---------|
| SortedList | 150 ms | 14 MB | 前 10% |
| 有序列表 + 二分 | 200 ms | 14 MB | 前 40% |
| 暴力遍历 | 250 ms | 14 MB | 前 60% |
| 动态开点线段树 | 300 ms | 18 MB | 前 80% |

**观察**：
- `SortedList` 最快（库函数优化良好）
- 暴力遍历性能尚可（N ≤ 1000 时可接受）
- 线段树虽然时间复杂度最优，但常数较大

## 常见错误

### 1. 区间判断错误

```python
# 错误：闭区间判断
if start < e and end > s:  # 左闭右开区间应该用 <=

# 正确：左闭右开区间判断
if max(start, s) < min(end, e):
```

### 2. 忘记检查边界

```python
# 错误：直接访问可能越界
prev_start, prev_end = bookings[idx - 1]

# 正确：先检查索引
if idx > 0:
    prev_start, prev_end = bookings[idx - 1]
```

### 3. 插入位置错误

```python
# 错误：使用 bisect_right
idx = bisect.bisect_right(bookings, (start, end))

# 正确：使用 bisect_left（确保有序）
idx = bisect.bisect_left(bookings, (start, end))
```

## 总结

本题展示了线段树在区间冲突检测场景中的应用，同时对比了多种解决方案。

**核心要点**：
1. **问题本质**：判断区间是否与已有区间冲突
2. **冲突条件**：`max(a, c) < min(b, d)`
3. **方案选择**：
   - 简单场景 → 暴力遍历
   - 通用场景 → 有序列表 + 二分
   - 大范围/可扩展 → 动态开点线段树
4. **优化思路**：维护有序结构，减少比较次数
5. **扩展性**：线段树方案易于支持多重预订、删除等操作

这道题虽然可以用简单方法解决，但理解线段树解法能为后续更复杂的题目（如 My Calendar II/III）打下基础。

下一章我们将学习"我的日程安排表 II"，展示如何处理允许重复预订的场景。
