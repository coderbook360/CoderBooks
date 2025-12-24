# 分块求区间最值

区间最值查询（Range Minimum/Maximum Query，简称 RMQ）是一类经典问题。与区间求和不同，最值不具有可减性：知道 `max(a, b, c)` 和 `max(b, c)`，无法直接推出 `max(a)`。这使得某些优化技巧失效，但分块依然能够优雅地处理这类问题。

---

## 问题定义

给定一个长度为 n 的数组 `arr`，需要支持以下操作：

1. **单点修改**：将 `arr[i]` 修改为 `x`
2. **区间查询**：求 `arr[l..r]` 的最大值（或最小值）

我们将以最大值为例进行讲解，最小值的处理完全对称。

---

## 核心思路

与区间求和类似，我们为每个块预处理一个**块内最大值**：

```
数组：[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8]
块大小 = 3

块0: [3, 1, 4]   max=4
块1: [1, 5, 9]   max=9
块2: [2, 6, 5]   max=6
块3: [3, 5, 8]   max=8
```

**查询策略**：
- 完整块：直接使用预处理的 `block_max`
- 不完整块：暴力遍历求最值

---

## 基础实现

```python
import math
from typing import List

class BlockMax:
    """支持单点修改、区间最大值查询的分块数组"""
    
    def __init__(self, arr: List[int]):
        self.arr = arr[:]
        self.n = len(arr)
        if self.n == 0:
            self.block_size = 1
            self.block_count = 0
            self.block_max = []
            return
        
        self.block_size = max(1, int(math.sqrt(self.n)))
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        self.block_max = [float('-inf')] * self.block_count
        
        # 预处理每个块的最大值
        for i in range(self.n):
            block_id = i // self.block_size
            self.block_max[block_id] = max(self.block_max[block_id], arr[i])
    
    def _rebuild_block(self, block_id: int) -> None:
        """重新计算某个块的最大值"""
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        self.block_max[block_id] = max(self.arr[start:end])
    
    def update(self, index: int, val: int) -> None:
        """单点修改：将 arr[index] 改为 val"""
        block_id = index // self.block_size
        self.arr[index] = val
        # 重建该块的最大值
        self._rebuild_block(block_id)
    
    def query_max(self, left: int, right: int) -> int:
        """区间查询：求 arr[left..right] 的最大值"""
        if left > right:
            return float('-inf')
        
        left_block = left // self.block_size
        right_block = right // self.block_size
        result = float('-inf')
        
        if left_block == right_block:
            # 同一块内，直接暴力
            for i in range(left, right + 1):
                result = max(result, self.arr[i])
        else:
            # 左边零散部分
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                result = max(result, self.arr[i])
            
            # 中间完整块
            for bid in range(left_block + 1, right_block):
                result = max(result, self.block_max[bid])
            
            # 右边零散部分
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                result = max(result, self.arr[i])
        
        return result
```

### 复杂度分析

- **预处理**：O(n)
- **单点修改**：O(√n)（需要重建整个块）
- **区间查询**：O(√n)

**注意**：与区间求和不同，单点修改需要 O(√n) 来重建块内最值。这是因为最值没有增量更新的简单方式——如果删除了当前最大值，必须遍历整个块才能找到新的最大值。

---

## 支持区间修改

如果需要将 `arr[l..r]` 的每个元素都加上 `x`，我们仍然可以使用懒标记。

### 核心思想

- 完整块：记录一个 `add_tag`，表示块内每个元素需要加上的值
- 不完整块：暴力修改每个元素，然后重建块内最值

**关键点**：块内最大值需要考虑懒标记的影响：

```
真实的块最大值 = block_max[bid] + add_tag[bid]
```

### 完整实现

```python
import math
from typing import List

class BlockMaxWithRangeAdd:
    """支持区间加、区间最大值查询的分块数组"""
    
    def __init__(self, arr: List[int]):
        self.arr = arr[:]
        self.n = len(arr)
        if self.n == 0:
            self.block_size = 1
            self.block_count = 0
            self.block_max = []
            self.add_tag = []
            return
        
        self.block_size = max(1, int(math.sqrt(self.n)))
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        self.block_max = [float('-inf')] * self.block_count
        self.add_tag = [0] * self.block_count
        
        for i in range(self.n):
            block_id = i // self.block_size
            self.block_max[block_id] = max(self.block_max[block_id], arr[i])
    
    def _push_down(self, block_id: int) -> None:
        """将懒标记下推到块内元素"""
        if self.add_tag[block_id] == 0:
            return
        
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        
        for i in range(start, end):
            self.arr[i] += self.add_tag[block_id]
        
        self.add_tag[block_id] = 0
    
    def _rebuild_block(self, block_id: int) -> None:
        """重新计算某个块的最大值（不含懒标记）"""
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        self.block_max[block_id] = max(self.arr[start:end])
    
    def range_add(self, left: int, right: int, val: int) -> None:
        """区间修改：将 arr[left..right] 都加上 val"""
        if left > right:
            return
        
        left_block = left // self.block_size
        right_block = right // self.block_size
        
        if left_block == right_block:
            # 同一块内，暴力修改
            self._push_down(left_block)
            for i in range(left, right + 1):
                self.arr[i] += val
            self._rebuild_block(left_block)
        else:
            # 左边零散部分
            self._push_down(left_block)
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                self.arr[i] += val
            self._rebuild_block(left_block)
            
            # 中间完整块，打懒标记
            for bid in range(left_block + 1, right_block):
                self.add_tag[bid] += val
            
            # 右边零散部分
            self._push_down(right_block)
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                self.arr[i] += val
            self._rebuild_block(right_block)
    
    def query_max(self, left: int, right: int) -> int:
        """区间查询：求 arr[left..right] 的最大值"""
        if left > right:
            return float('-inf')
        
        left_block = left // self.block_size
        right_block = right // self.block_size
        result = float('-inf')
        
        if left_block == right_block:
            # 同一块内，考虑懒标记
            tag = self.add_tag[left_block]
            for i in range(left, right + 1):
                result = max(result, self.arr[i] + tag)
        else:
            # 左边零散部分
            tag = self.add_tag[left_block]
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                result = max(result, self.arr[i] + tag)
            
            # 中间完整块
            for bid in range(left_block + 1, right_block):
                result = max(result, self.block_max[bid] + self.add_tag[bid])
            
            # 右边零散部分
            tag = self.add_tag[right_block]
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                result = max(result, self.arr[i] + tag)
        
        return result
    
    def get(self, index: int) -> int:
        """获取单个元素的值"""
        block_id = index // self.block_size
        return self.arr[index] + self.add_tag[block_id]
```

### 复杂度分析

- **预处理**：O(n)
- **区间修改**：O(√n)
- **区间查询**：O(√n)

---

## 同时支持最大值和最小值

在实际应用中，我们可能需要同时查询区间最大值和最小值。只需维护两组信息：

```python
class BlockMinMax:
    def __init__(self, arr: List[int]):
        # ... 初始化代码 ...
        self.block_max = [float('-inf')] * self.block_count
        self.block_min = [float('inf')] * self.block_count
        
        for i in range(self.n):
            block_id = i // self.block_size
            self.block_max[block_id] = max(self.block_max[block_id], arr[i])
            self.block_min[block_id] = min(self.block_min[block_id], arr[i])
    
    def query_range(self, left: int, right: int) -> tuple:
        """返回 (最小值, 最大值)"""
        # 类似的分块查询逻辑
        pass
```

---

## 区间赋值操作

有时我们需要将 `arr[l..r]` 的所有元素都设为 `x`。这比区间加更加复杂，因为它会**覆盖**之前的值。

### 实现思路

使用一个特殊的懒标记来表示"整个块被赋值"：

```python
class BlockMaxWithAssign:
    def __init__(self, arr: List[int]):
        # ... 初始化 ...
        self.assign_tag = [None] * self.block_count  # None 表示无赋值标记
    
    def range_assign(self, left: int, right: int, val: int) -> None:
        """区间赋值：将 arr[left..right] 都设为 val"""
        left_block = left // self.block_size
        right_block = right // self.block_size
        
        if left_block == right_block:
            self._push_down(left_block)
            for i in range(left, right + 1):
                self.arr[i] = val
            self._rebuild_block(left_block)
        else:
            # 左边零散
            self._push_down(left_block)
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                self.arr[i] = val
            self._rebuild_block(left_block)
            
            # 中间完整块，打赋值标记
            for bid in range(left_block + 1, right_block):
                self.assign_tag[bid] = val
                self.block_max[bid] = val
            
            # 右边零散
            self._push_down(right_block)
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                self.arr[i] = val
            self._rebuild_block(right_block)
    
    def _push_down(self, block_id: int) -> None:
        """下推赋值标记"""
        if self.assign_tag[block_id] is None:
            return
        
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        
        for i in range(start, end):
            self.arr[i] = self.assign_tag[block_id]
        
        self.assign_tag[block_id] = None
```

---

## 实战应用：区间最值与修改

让我们解决一个综合问题：

> 给定数组，支持以下操作：
> 1. 将 `arr[l..r]` 的每个元素加上 `x`
> 2. 查询 `arr[l..r]` 的最大值
> 3. 查询 `arr[l..r]` 的最小值

使用我们的分块数据结构可以轻松解决：

```python
class Solution:
    def __init__(self, arr: List[int]):
        self.n = len(arr)
        self.arr = arr[:]
        self.block_size = max(1, int(math.sqrt(self.n)))
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        
        self.block_max = [float('-inf')] * self.block_count
        self.block_min = [float('inf')] * self.block_count
        self.add_tag = [0] * self.block_count
        
        for i in range(self.n):
            bid = i // self.block_size
            self.block_max[bid] = max(self.block_max[bid], arr[i])
            self.block_min[bid] = min(self.block_min[bid], arr[i])
    
    def add(self, left: int, right: int, val: int) -> None:
        # 区间加操作
        left_block = left // self.block_size
        right_block = right // self.block_size
        
        if left_block == right_block:
            self._push_down(left_block)
            for i in range(left, right + 1):
                self.arr[i] += val
            self._rebuild_block(left_block)
        else:
            self._push_down(left_block)
            for i in range(left, (left_block + 1) * self.block_size):
                self.arr[i] += val
            self._rebuild_block(left_block)
            
            for bid in range(left_block + 1, right_block):
                self.add_tag[bid] += val
            
            self._push_down(right_block)
            for i in range(right_block * self.block_size, right + 1):
                self.arr[i] += val
            self._rebuild_block(right_block)
    
    def get_max(self, left: int, right: int) -> int:
        return self._query(left, right, is_max=True)
    
    def get_min(self, left: int, right: int) -> int:
        return self._query(left, right, is_max=False)
    
    def _query(self, left: int, right: int, is_max: bool) -> int:
        left_block = left // self.block_size
        right_block = right // self.block_size
        
        if is_max:
            result = float('-inf')
            compare = max
        else:
            result = float('inf')
            compare = min
        
        if left_block == right_block:
            tag = self.add_tag[left_block]
            for i in range(left, right + 1):
                result = compare(result, self.arr[i] + tag)
        else:
            tag = self.add_tag[left_block]
            for i in range(left, (left_block + 1) * self.block_size):
                result = compare(result, self.arr[i] + tag)
            
            for bid in range(left_block + 1, right_block):
                block_val = self.block_max[bid] if is_max else self.block_min[bid]
                result = compare(result, block_val + self.add_tag[bid])
            
            tag = self.add_tag[right_block]
            for i in range(right_block * self.block_size, right + 1):
                result = compare(result, self.arr[i] + tag)
        
        return result
    
    def _push_down(self, block_id: int) -> None:
        if self.add_tag[block_id] == 0:
            return
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        for i in range(start, end):
            self.arr[i] += self.add_tag[block_id]
        self.add_tag[block_id] = 0
    
    def _rebuild_block(self, block_id: int) -> None:
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        self.block_max[block_id] = max(self.arr[start:end])
        self.block_min[block_id] = min(self.arr[start:end])
```

---

## 与线段树的对比

在区间最值问题上，分块和线段树的对比：

| 特性 | 分块 | 线段树 |
|------|------|--------|
| 查询复杂度 | O(√n) | O(log n) |
| 修改复杂度 | O(√n) | O(log n) |
| 实现难度 | 简单 | 中等 |
| 代码量 | 少 | 多 |
| 适用场景 | 快速实现 | 追求性能 |

**选择建议**：
- 如果 n ≤ 10^5，分块通常足够快
- 如果 n > 10^5 且时间敏感，考虑线段树
- 如果问题复杂（如同时涉及多种操作），分块更易实现

---

## 本章小结

本章介绍了分块在区间最值问题中的应用：

1. **基础版本**：预处理每个块的最值，查询时分块处理
2. **懒标记版本**：区间加操作使用懒标记优化
3. **关键区别**：
   - 与区间和不同，单点修改需要 O(√n) 重建块
   - 最值查询需要考虑懒标记的影响
4. **扩展能力**：
   - 同时维护最大值和最小值
   - 支持区间赋值操作

分块的优雅之处在于：**无论问题多么复杂，核心模式不变——块内暴力，块间整体**。这种思维方式将在下一章的莫队算法中得到更充分的体现。
