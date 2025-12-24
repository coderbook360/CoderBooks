# 股票价格波动

本章我们来设计一个实时股票价格追踪系统——**股票价格波动**。这道题的独特之处在于：不仅要支持更新和查询，还要处理**时间戳乱序**和**历史数据修正**的情况。

## 问题描述

**LeetCode 2034. 股票价格波动 (Stock Price Fluctuation)**

给你一支股票的价格时间序列，其中第 `i` 个记录包含一个时间戳 `timestamp` 和一个价格 `price`。

设计一个算法支持以下操作：
- `update(timestamp, price)`：在给定时间戳更新股票价格。如果之前有相同时间戳的价格，则替换为新价格。
- `current()`：返回最新时间戳对应的股票价格。
- `maximum()`：返回当前记录中的**最高**股票价格。
- `minimum()`：返回当前记录中的**最低**股票价格。

**示例**：
```
StockPrice stockPrice = new StockPrice();
stockPrice.update(1, 10);  // 时间戳 = [1]，价格 = [10]
stockPrice.update(2, 5);   // 时间戳 = [1, 2]，价格 = [10, 5]
stockPrice.current();      // 返回 5，最新时间戳是 2
stockPrice.maximum();      // 返回 10
stockPrice.update(1, 3);   // 时间戳 = [1, 2]，价格 = [3, 5]（修正了时间戳 1 的价格）
stockPrice.maximum();      // 返回 5
stockPrice.update(4, 2);   // 时间戳 = [1, 2, 4]，价格 = [3, 5, 2]
stockPrice.minimum();      // 返回 2
```

**提示**：
- 1 <= timestamp, price <= 10^9
- 最多调用 10^5 次各操作
- `current`、`maximum` 和 `minimum` 调用时至少有一条记录

## 思路分析

### 核心挑战

1. **时间戳乱序**：更新可能不按时间顺序到来
2. **历史修正**：可以修改已有时间戳的价格
3. **动态最值**：价格可能被修改，最值也会变化

### 数据结构选择

我们需要维护两类信息：
1. **时间戳 → 价格的映射**：用于 `current()` 和更新
2. **所有价格的有序集合**：用于 `maximum()` 和 `minimum()`

当价格被修正时，需要从有序集合中**删除旧价格**，再**插入新价格**。

## 解法：哈希表 + 有序集合

```python
from sortedcontainers import SortedList

class StockPrice:
    def __init__(self):
        # 时间戳 → 价格
        self.time_price = {}
        
        # 所有价格（可重复）
        self.prices = SortedList()
        
        # 最新时间戳
        self.latest_time = 0
    
    def update(self, timestamp: int, price: int) -> None:
        # 如果该时间戳已有记录，先移除旧价格
        if timestamp in self.time_price:
            old_price = self.time_price[timestamp]
            self.prices.remove(old_price)
        
        # 更新记录
        self.time_price[timestamp] = price
        self.prices.add(price)
        
        # 更新最新时间戳
        self.latest_time = max(self.latest_time, timestamp)
    
    def current(self) -> int:
        return self.time_price[self.latest_time]
    
    def maximum(self) -> int:
        return self.prices[-1]
    
    def minimum(self) -> int:
        return self.prices[0]
```

## 执行过程演示

| 操作 | time_price | prices | latest_time | 结果 |
|------|------------|--------|-------------|------|
| update(1, 10) | {1:10} | [10] | 1 | - |
| update(2, 5) | {1:10, 2:5} | [5, 10] | 2 | - |
| current() | - | - | - | 5 |
| maximum() | - | - | - | 10 |
| update(1, 3) | {1:3, 2:5} | [3, 5] | 2 | - |
| maximum() | - | - | - | 5 |
| update(4, 2) | {1:3, 2:5, 4:2} | [2, 3, 5] | 4 | - |
| minimum() | - | - | - | 2 |

**关键步骤：update(1, 3)**
1. 时间戳 1 已存在，旧价格是 10
2. 从 `prices` 中移除 10
3. 添加新价格 3
4. `prices` 变为 [3, 5]

## 复杂度分析

**时间复杂度**：
- `update`：O(log n)，插入和删除有序集合
- `current`：O(1)，哈希表查询
- `maximum`：O(1)，有序集合最大值
- `minimum`：O(1)，有序集合最小值

**空间复杂度**：O(n)，存储所有时间戳和价格

## 解法二：哈希表 + 两个堆

如果不使用第三方库，可以用两个堆（最大堆和最小堆）配合懒惰删除：

```python
import heapq
from collections import defaultdict

class StockPrice:
    def __init__(self):
        self.time_price = {}
        self.latest_time = 0
        
        # 最小堆：(price, timestamp)
        self.min_heap = []
        # 最大堆：(-price, timestamp)
        self.max_heap = []
    
    def update(self, timestamp: int, price: int) -> None:
        self.time_price[timestamp] = price
        self.latest_time = max(self.latest_time, timestamp)
        
        heapq.heappush(self.min_heap, (price, timestamp))
        heapq.heappush(self.max_heap, (-price, timestamp))
    
    def current(self) -> int:
        return self.time_price[self.latest_time]
    
    def maximum(self) -> int:
        # 懒惰删除：检查堆顶是否过期
        while True:
            price, timestamp = self.max_heap[0]
            if self.time_price[timestamp] == -price:
                return -price
            heapq.heappop(self.max_heap)
    
    def minimum(self) -> int:
        while True:
            price, timestamp = self.min_heap[0]
            if self.time_price[timestamp] == price:
                return price
            heapq.heappop(self.min_heap)
```

### 懒惰删除的原理

当价格被修正时，旧的堆条目变成"过期"的。我们不立即删除，而是在访问堆顶时检查：
- 如果堆顶的价格与 `time_price[timestamp]` 一致，说明是有效的
- 否则是过期的，弹出并继续检查下一个

这种方法的均摊时间复杂度仍然是 O(log n)。

## 解法对比

| 维度 | 有序集合 | 双堆 + 懒惰删除 |
|------|---------|----------------|
| 代码复杂度 | 简洁 | 较复杂 |
| 时间复杂度 | O(log n) | O(log n) 均摊 |
| 空间复杂度 | O(n) | O(m)，m 是总操作数 |
| 库依赖 | sortedcontainers | 仅标准库 |

双堆方法的空间开销更大，因为过期条目不会被立即删除。

## 边界情况

### 重复价格

当多个时间戳有相同价格时，有序集合需要正确处理：

```python
# SortedList 允许重复
prices = SortedList([10, 10, 5])
prices.remove(10)  # 只移除一个 10
print(list(prices))  # [5, 10]
```

这正是我们需要的行为。

### 价格回到相同值

```python
update(1, 10)
update(1, 5)   # 移除 10，添加 5
update(1, 10)  # 移除 5，添加 10（回到 10）
```

每次更新都是完整的"删除旧值 + 添加新值"过程。

## 常见错误

### 错误一：忘记移除旧价格

```python
# 错误：只添加不删除
if timestamp in self.time_price:
    pass  # 没有移除旧价格
self.time_price[timestamp] = price
self.prices.add(price)
```

这会导致旧价格残留在有序集合中。

### 错误二：先删后判断

```python
# 错误：在检查之前就尝试删除
old_price = self.time_price[timestamp]  # 可能不存在
self.prices.remove(old_price)
```

**正确做法**：先检查 `timestamp in self.time_price`。

### 错误三：懒惰删除时的无限循环

```python
# 错误：没有正确处理堆为空的情况
def maximum(self):
    while True:
        price, timestamp = self.max_heap[0]  # 堆可能为空
        # ...
```

**正确做法**：题目保证调用时至少有一条记录，但防御性编程应检查堆是否为空。

## 扩展功能

### 支持删除时间戳

```python
def delete(self, timestamp: int) -> None:
    if timestamp in self.time_price:
        old_price = self.time_price[timestamp]
        self.prices.remove(old_price)
        del self.time_price[timestamp]
        
        # 如果删除的是最新时间戳，需要更新
        if timestamp == self.latest_time:
            self.latest_time = max(self.time_price.keys()) if self.time_price else 0
```

### 支持时间范围查询

```python
def range_max(self, start: int, end: int) -> int:
    """返回 [start, end] 时间范围内的最大价格"""
    max_price = float('-inf')
    for t, p in self.time_price.items():
        if start <= t <= end:
            max_price = max(max_price, p)
    return max_price
```

这种朴素实现是 O(n) 的。如果需要频繁范围查询，可以用线段树优化。

## 本章小结

股票价格波动展示了有序集合在**动态最值维护**中的应用。

**核心要点**：

1. **双重数据结构**：哈希表维护映射，有序集合维护排序
2. **更新时同步**：修改价格时要同步更新两个数据结构
3. **懒惰删除替代方案**：双堆可以不依赖第三方库
4. **允许重复**：`SortedList` 正确处理重复价格

**设计模式**：
- 需要同时支持 O(1) 查找和 O(log n) 最值 → 哈希表 + 有序集合
- 需要在堆中删除任意元素 → 懒惰删除

下一章我们将亲自动手实现一个"类平衡树"的数据结构——跳表。
