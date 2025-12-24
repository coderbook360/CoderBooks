# 有序集合的应用

上一章我们了解了平衡树的原理。本章我们不再纠结于底层实现，而是专注于**有序集合**这个抽象数据类型的应用。无论底层是 AVL 树、红黑树还是跳表，它们都提供相似的接口，让我们能够高效地解决一类特定问题。

## 有序集合的核心操作

有序集合（Ordered Set / Sorted Container）支持以下核心操作，时间复杂度均为 O(log n)：

| 操作 | 描述 | Python (SortedList) | C++ (set) |
|------|------|---------------------|-----------|
| 插入 | 添加元素 | `add(x)` | `insert(x)` |
| 删除 | 移除元素 | `remove(x)` | `erase(x)` |
| 查找 | 检查是否存在 | `x in sl` | `find(x)` |
| 最小值 | 获取最小元素 | `sl[0]` | `*begin()` |
| 最大值 | 获取最大元素 | `sl[-1]` | `*rbegin()` |
| 前驱 | 小于 x 的最大元素 | `sl[sl.bisect_left(x) - 1]` | `--lower_bound(x)` |
| 后继 | 大于 x 的最小元素 | `sl[sl.bisect_right(x)]` | `upper_bound(x)` |
| 排名 | x 是第几小 | `sl.bisect_left(x)` | `distance(begin, find)` |
| 第 k 小 | 获取第 k 小元素 | `sl[k]` | 需要额外实现 |

## 应用场景一：动态维护区间

### 问题模式

很多问题需要动态维护一组区间，支持：
- 插入新区间
- 删除区间
- 查询某点被哪些区间覆盖

### 例题：日程安排表

考虑 LeetCode 729（我的日程安排表 I）：每次添加一个区间 `[start, end)`，如果与已有区间重叠则拒绝。

**有序集合解法**：

```python
from sortedcontainers import SortedList

class MyCalendar:
    def __init__(self):
        # 存储所有区间 (start, end)
        self.events = SortedList()
    
    def book(self, start: int, end: int) -> bool:
        # 找到第一个 start >= 新 start 的区间
        idx = self.events.bisect_left((start, end))
        
        # 检查与前一个区间是否重叠
        if idx > 0:
            prev_start, prev_end = self.events[idx - 1]
            if prev_end > start:
                return False
        
        # 检查与后一个区间是否重叠
        if idx < len(self.events):
            next_start, next_end = self.events[idx]
            if next_start < end:
                return False
        
        self.events.add((start, end))
        return True
```

**关键点**：
- 区间按起点排序
- 新区间只需与相邻区间比较（前一个和后一个）
- 时间复杂度 O(log n)

## 应用场景二：滑动窗口中的排名

### 问题模式

在滑动窗口中，需要动态维护：
- 当前窗口内的第 k 大/小元素
- 窗口内满足某条件的元素个数

### 例题：滑动窗口中位数（LeetCode 480）

**有序集合解法思路**：

```python
from sortedcontainers import SortedList

def medianSlidingWindow(nums: list[int], k: int) -> list[float]:
    window = SortedList()
    result = []
    
    for i, x in enumerate(nums):
        window.add(x)
        
        # 窗口超出大小时，移除最左边的元素
        if i >= k:
            window.remove(nums[i - k])
        
        # 窗口达到大小 k 时，计算中位数
        if i >= k - 1:
            if k % 2 == 1:
                median = window[k // 2]
            else:
                median = (window[k // 2 - 1] + window[k // 2]) / 2
            result.append(median)
    
    return result
```

**时间复杂度**：O(n log k)，每个元素的插入和删除都是 O(log k)。

## 应用场景三：前驱/后继查询

### 问题模式

给定一组数，对于新来的每个数，需要找到：
- 最接近它且比它小的数（前驱）
- 最接近它且比它大的数（后继）

### 例题：存在重复元素 III（LeetCode 220）

判断数组中是否存在两个元素，它们的索引差不超过 k，值差不超过 t。

**有序集合解法**：

```python
from sortedcontainers import SortedList

def containsNearbyAlmostDuplicate(nums: list[int], indexDiff: int, valueDiff: int) -> bool:
    window = SortedList()
    
    for i, x in enumerate(nums):
        # 查找 >= x - valueDiff 的最小元素
        idx = window.bisect_left(x - valueDiff)
        
        # 如果存在且 <= x + valueDiff，则找到了
        if idx < len(window) and window[idx] <= x + valueDiff:
            return True
        
        window.add(x)
        
        # 维护窗口大小
        if i >= indexDiff:
            window.remove(nums[i - indexDiff])
    
    return False
```

**关键点**：
- 使用 `bisect_left(x - valueDiff)` 找到可能满足条件的最小候选
- 只需检查这一个候选（如果存在的话）
- 时间复杂度 O(n log k)

## 应用场景四：动态最值维护

### 问题模式

数据动态变化，需要随时查询最大值或最小值。

### 例题：股票价格波动（LeetCode 2034）

实现一个数据结构，支持：
- `update(timestamp, price)`：更新某时刻的股价
- `current()`：返回最新时刻的股价
- `maximum()`：返回历史最高价
- `minimum()`：返回历史最低价

**有序集合解法**：

```python
from sortedcontainers import SortedList

class StockPrice:
    def __init__(self):
        self.prices = SortedList()  # 所有价格（可重复）
        self.time_price = {}         # timestamp -> price
        self.latest_time = 0
    
    def update(self, timestamp: int, price: int) -> None:
        # 如果该时刻已有记录，先移除旧价格
        if timestamp in self.time_price:
            old_price = self.time_price[timestamp]
            self.prices.remove(old_price)
        
        # 更新记录
        self.time_price[timestamp] = price
        self.prices.add(price)
        self.latest_time = max(self.latest_time, timestamp)
    
    def current(self) -> int:
        return self.time_price[self.latest_time]
    
    def maximum(self) -> int:
        return self.prices[-1]
    
    def minimum(self) -> int:
        return self.prices[0]
```

**时间复杂度**：
- `update`：O(log n)
- `current/maximum/minimum`：O(1)

## 应用场景五：贪心 + 有序集合

### 问题模式

贪心策略需要快速找到"最优"的候选，有序集合提供了高效的实现。

### 例题：避免洪水泛滥（LeetCode 1488）

某些天会下雨（填满某个湖），某些天是晴天（可以抽干一个湖）。安排抽水计划，避免任何湖连续被填满两次。

**有序集合解法思路**：

```python
from sortedcontainers import SortedList

def avoidFlood(rains: list[int]) -> list[int]:
    n = len(rains)
    result = [-1] * n
    
    sunny_days = SortedList()  # 可用的晴天
    last_rain = {}             # lake -> 上次下雨的日期
    
    for day in range(n):
        lake = rains[day]
        
        if lake == 0:
            # 晴天，先记录下来
            sunny_days.add(day)
            result[day] = 1  # 临时值，后续可能被覆盖
        else:
            # 雨天
            if lake in last_rain:
                # 这个湖之前下过雨，需要在两次雨之间安排抽水
                prev_day = last_rain[lake]
                
                # 找第一个 > prev_day 的晴天
                idx = sunny_days.bisect_right(prev_day)
                if idx == len(sunny_days):
                    # 没有合适的晴天，无解
                    return []
                
                # 使用这个晴天抽干这个湖
                dry_day = sunny_days[idx]
                result[dry_day] = lake
                sunny_days.remove(dry_day)
            
            last_rain[lake] = day
    
    return result
```

**关键点**：
- 晴天是"资源"，需要合理分配
- 贪心策略：使用**最早的**满足条件的晴天
- `bisect_right(prev_day)` 找到第一个可用的晴天

## 有序集合 vs 其他数据结构

### 与堆的对比

| 维度 | 有序集合 | 堆 |
|------|---------|-----|
| 获取最值 | O(1) | O(1) |
| 插入 | O(log n) | O(log n) |
| 删除任意元素 | O(log n) | O(n)（需要先查找） |
| 删除最值 | O(log n) | O(log n) |
| 查找元素 | O(log n) | O(n) |
| 第 k 大 | O(1) or O(log n) | O(k log n)（需要弹出 k-1 个） |

**选择建议**：
- 只需最值：用堆
- 需要删除任意元素或查找：用有序集合

### 与线段树的对比

| 维度 | 有序集合 | 线段树 |
|------|---------|--------|
| 区间查询 | 不支持 | O(log n) |
| 区间修改 | 不支持 | O(log n)（懒惰传播） |
| 点更新 | O(log n) | O(log n) |
| 索引访问 | O(1) 或 O(log n) | 不直接支持 |
| 排名查询 | O(log n) | O(log n)（权值线段树） |

**选择建议**：
- 需要区间操作：用线段树
- 需要动态排序结构：用有序集合

## Python 中的实践技巧

### 使用 SortedList

```python
from sortedcontainers import SortedList

sl = SortedList()

# 基本操作
sl.add(5)          # 插入
sl.remove(5)       # 删除（必须存在）
sl.discard(5)      # 删除（不存在也不报错）

# 二分查找
sl.bisect_left(5)  # 第一个 >= 5 的位置
sl.bisect_right(5) # 第一个 > 5 的位置

# 索引访问
sl[0]              # 最小值
sl[-1]             # 最大值
sl[k]              # 第 k 小（0-indexed）

# 范围操作
sl.irange(lo, hi)  # 迭代 [lo, hi] 范围内的元素
```

### 处理重复元素

`SortedList` 默认允许重复。如果需要去重，使用 `SortedSet`：

```python
from sortedcontainers import SortedSet

ss = SortedSet()
ss.add(5)
ss.add(5)  # 不会重复添加
len(ss)    # 1
```

### 自定义排序

```python
from sortedcontainers import SortedList

# 按绝对值排序
sl = SortedList(key=abs)
sl.add(-5)
sl.add(3)
sl.add(-1)
print(list(sl))  # [-1, 3, -5]
```

## 本章小结

有序集合是解决动态排序问题的利器。

**核心应用场景**：

1. **动态区间维护**：日程安排、区间合并
2. **滑动窗口排名**：窗口中位数、第 k 大
3. **前驱/后继查询**：最近邻搜索、范围查找
4. **动态最值**：实时最大/最小值
5. **贪心优化**：快速找到最优候选

**选择有序集合的信号**：
- 需要动态插入/删除
- 需要快速找最值或第 k 大
- 需要找前驱/后继
- 不能离线处理（必须在线）

在接下来的章节中，我们将通过具体的 LeetCode 题目，深入实践有序集合的各种应用技巧。
