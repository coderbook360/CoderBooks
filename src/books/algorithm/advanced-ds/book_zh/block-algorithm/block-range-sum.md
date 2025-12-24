# 分块求区间和

上一章我们介绍了分块的核心思想。本章将深入探讨分块在区间求和问题中的应用，包括单点修改、区间修改等多种变体。虽然这些问题也可以用线段树或树状数组解决，但分块的实现更加直观，且在某些场景下具有独特优势。

---

## 问题定义

给定一个长度为 n 的数组 `arr`，需要支持以下操作：

1. **单点修改**：将 `arr[i]` 修改为 `x`
2. **区间修改**：将 `arr[l..r]` 中的每个元素都加上 `x`
3. **区间查询**：求 `arr[l..r]` 的和

我们将逐步实现这些功能，展示分块的灵活性。

---

## 方案一：仅支持单点修改

### 核心思路

最简单的情况：单点修改 + 区间查询。

**数据结构设计**：
- `arr[]`：原数组
- `block_sum[]`：每个块的和

**修改**：更新 `arr[i]` 和对应的 `block_sum`，O(1)。

**查询**：左右两端暴力求和，中间块直接累加 `block_sum`，O(√n)。

### 完整实现

```python
import math
from typing import List

class BlockSum:
    """支持单点修改、区间查询的分块数组"""
    
    def __init__(self, arr: List[int]):
        self.arr = arr[:]
        self.n = len(arr)
        if self.n == 0:
            self.block_size = 1
            self.block_count = 0
            self.block_sum = []
            return
        
        self.block_size = max(1, int(math.sqrt(self.n)))
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        self.block_sum = [0] * self.block_count
        
        # 预处理每个块的和
        for i in range(self.n):
            self.block_sum[i // self.block_size] += arr[i]
    
    def update(self, index: int, val: int) -> None:
        """单点修改：将 arr[index] 改为 val"""
        block_id = index // self.block_size
        diff = val - self.arr[index]
        self.arr[index] = val
        self.block_sum[block_id] += diff
    
    def query(self, left: int, right: int) -> int:
        """区间查询：求 arr[left..right] 的和"""
        if left > right:
            return 0
        
        left_block = left // self.block_size
        right_block = right // self.block_size
        total = 0
        
        if left_block == right_block:
            # 同一块内，直接暴力
            for i in range(left, right + 1):
                total += self.arr[i]
        else:
            # 左边零散部分
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                total += self.arr[i]
            
            # 中间完整块
            for bid in range(left_block + 1, right_block):
                total += self.block_sum[bid]
            
            # 右边零散部分
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                total += self.arr[i]
        
        return total
```

### 复杂度分析

- **预处理**：O(n)
- **单点修改**：O(1)
- **区间查询**：O(√n)

---

## 方案二：支持区间修改（懒标记）

### 问题升级

如果需要将 `arr[l..r]` 的每个元素都加上 `x`，暴力修改需要 O(r-l+1) 的时间。

**优化思路**：借鉴线段树的懒标记思想。

对于完整的块，不逐个修改元素，而是记录一个**增量标记**。只有当需要访问块内具体元素时，才将标记"下推"。

### 数据结构设计

- `arr[]`：原数组
- `block_sum[]`：每个块的和（已包含懒标记的影响）
- `add_tag[]`：懒标记，表示该块每个元素需要额外加上的值

### 完整实现

```python
import math
from typing import List

class BlockSumWithRangeAdd:
    """支持区间修改、区间查询的分块数组"""
    
    def __init__(self, arr: List[int]):
        self.arr = arr[:]
        self.n = len(arr)
        if self.n == 0:
            self.block_size = 1
            self.block_count = 0
            self.block_sum = []
            self.add_tag = []
            return
        
        self.block_size = max(1, int(math.sqrt(self.n)))
        self.block_count = (self.n + self.block_size - 1) // self.block_size
        self.block_sum = [0] * self.block_count
        self.add_tag = [0] * self.block_count  # 懒标记
        
        for i in range(self.n):
            self.block_sum[i // self.block_size] += arr[i]
    
    def _block_length(self, block_id: int) -> int:
        """获取块的实际长度"""
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        return end - start
    
    def _push_down(self, block_id: int) -> None:
        """将懒标记下推到块内元素"""
        if self.add_tag[block_id] == 0:
            return
        
        start = block_id * self.block_size
        end = min((block_id + 1) * self.block_size, self.n)
        
        for i in range(start, end):
            self.arr[i] += self.add_tag[block_id]
        
        self.add_tag[block_id] = 0
    
    def range_add(self, left: int, right: int, val: int) -> None:
        """区间修改：将 arr[left..right] 都加上 val"""
        if left > right:
            return
        
        left_block = left // self.block_size
        right_block = right // self.block_size
        
        if left_block == right_block:
            # 同一块内，暴力修改
            self._push_down(left_block)  # 先下推，保证 arr 是最新的
            for i in range(left, right + 1):
                self.arr[i] += val
                self.block_sum[left_block] += val
        else:
            # 左边零散部分
            self._push_down(left_block)
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                self.arr[i] += val
                self.block_sum[left_block] += val
            
            # 中间完整块，打懒标记
            for bid in range(left_block + 1, right_block):
                self.add_tag[bid] += val
                self.block_sum[bid] += val * self._block_length(bid)
            
            # 右边零散部分
            self._push_down(right_block)
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                self.arr[i] += val
                self.block_sum[right_block] += val
    
    def query(self, left: int, right: int) -> int:
        """区间查询：求 arr[left..right] 的和"""
        if left > right:
            return 0
        
        left_block = left // self.block_size
        right_block = right // self.block_size
        total = 0
        
        if left_block == right_block:
            # 同一块内
            # 每个元素的真实值 = arr[i] + add_tag[block]
            for i in range(left, right + 1):
                total += self.arr[i] + self.add_tag[left_block]
        else:
            # 左边零散部分
            left_end = (left_block + 1) * self.block_size
            for i in range(left, left_end):
                total += self.arr[i] + self.add_tag[left_block]
            
            # 中间完整块
            for bid in range(left_block + 1, right_block):
                total += self.block_sum[bid]
            
            # 右边零散部分
            right_start = right_block * self.block_size
            for i in range(right_start, right + 1):
                total += self.arr[i] + self.add_tag[right_block]
        
        return total
    
    def get(self, index: int) -> int:
        """获取单个元素的值"""
        block_id = index // self.block_size
        return self.arr[index] + self.add_tag[block_id]
```

### 关键设计决策

**为什么查询时不下推？**

查询时，我们可以直接计算 `arr[i] + add_tag[block]`，无需修改数据。这样可以：
1. 减少不必要的写操作
2. 保持懒标记的有效性
3. 提高缓存效率

**为什么修改零散元素前要下推？**

因为我们需要直接修改 `arr[i]`，必须先让 `arr[i]` 反映真实值。否则会出现：
- 原值：`arr[i] = 5`，`add_tag = 3`，真实值 = 8
- 错误操作：直接 `arr[i] += 2`，得到 `arr[i] = 7`，真实值变成 10
- 正确操作：先下推得到 `arr[i] = 8`，再加 2 得到 10

### 复杂度分析

- **预处理**：O(n)
- **区间修改**：O(√n)（最多修改两个不完整块 + 更新 O(√n) 个懒标记）
- **区间查询**：O(√n)

---

## 方案三：同时支持单点修改和区间修改

有时我们需要同时支持单点修改和区间修改。这只需要在方案二的基础上添加一个 `update` 方法：

```python
def update(self, index: int, val: int) -> None:
    """单点修改：将 arr[index] 改为 val"""
    block_id = index // self.block_size
    
    # 获取当前真实值
    old_val = self.arr[index] + self.add_tag[block_id]
    diff = val - old_val
    
    # 更新 arr 和 block_sum
    # 注意：不要下推，直接更新 arr（因为 add_tag 仍然有效）
    self.arr[index] += diff
    self.block_sum[block_id] += diff
```

**注意**：这里不需要下推懒标记。我们只需要保证 `block_sum` 的正确性，而 `arr[index] + add_tag[block_id]` 仍然能得到正确的值。

---

## 实战示例：区域和检索

让我们用分块解决 LeetCode 307 题的变体（支持区间修改）：

```python
class NumArray:
    def __init__(self, nums: List[int]):
        self.block = BlockSumWithRangeAdd(nums)
    
    def update(self, index: int, val: int) -> None:
        # 单点修改可以看作区间修改 [index, index]
        current = self.block.get(index)
        self.block.range_add(index, index, val - current)
    
    def sumRange(self, left: int, right: int) -> int:
        return self.block.query(left, right)
```

---

## 边界情况处理

在实现分块时，需要特别注意以下边界情况：

### 1. 空数组

```python
if self.n == 0:
    self.block_size = 1
    self.block_count = 0
    return
```

### 2. 最后一个块不完整

```python
def _block_length(self, block_id: int) -> int:
    start = block_id * self.block_size
    end = min((block_id + 1) * self.block_size, self.n)
    return end - start
```

### 3. 查询范围为空

```python
def query(self, left: int, right: int) -> int:
    if left > right:
        return 0
    # ...
```

### 4. 块大小的选择

```python
self.block_size = max(1, int(math.sqrt(self.n)))
```

使用 `max(1, ...)` 确保块大小至少为 1，避免除零错误。

---

## 性能对比

让我们比较分块与其他数据结构在区间求和问题上的表现：

| 操作 | 前缀和 | 线段树 | 树状数组 | 分块 |
|------|--------|--------|----------|------|
| 预处理 | O(n) | O(n) | O(n) | O(n) |
| 单点修改 | O(n) | O(log n) | O(log n) | O(1) |
| 区间修改 | O(n) | O(log n) | O(log n) | O(√n) |
| 区间查询 | O(1) | O(log n) | O(log n) | O(√n) |

**分块的优势**：
1. 实现简单，不易出错
2. 单点修改 O(1)
3. 常数因子小

**分块的劣势**：
1. 区间操作 O(√n) 比对数级别慢
2. 大规模数据时性能差距明显

---

## 本章小结

本章详细介绍了分块在区间求和问题中的应用：

1. **基础版本**：单点修改 O(1)，区间查询 O(√n)
2. **懒标记版本**：区间修改 O(√n)，区间查询 O(√n)
3. **关键技巧**：
   - 预处理每个块的和
   - 使用懒标记避免完整块的逐元素修改
   - 修改零散元素前需要下推懒标记

分块虽然在渐进复杂度上不如线段树，但在以下场景中仍是优秀选择：
- 实现时间有限
- 问题较为复杂，难以用线段树维护
- 需要支持多种不同类型的操作

下一章，我们将探讨分块在区间最值问题中的应用。
